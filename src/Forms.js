import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import PaperScan from './PaperScan';

// ─── SHARED AI HELPER ─────────────────────────────────────────────────────────
// All AI calls route through /api/ai-insight (Vercel serverless proxy).
// The Anthropic API key lives server-side only — never exposed to the browser.
// Used by: AIGeneratorModal (prestart + service sheets) and Depreciation.js
async function callAI(messages, maxTokens = 2000) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/ai-insight', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'AI request failed (' + response.status + ')');
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI error');
  return data.content.map(i => i.text || '').join('');
}

const INPUT_TYPES = [
  { id: 'check',       label: 'Check'    },
  { id: 'photo',       label: 'Photo'    },
  { id: 'temperature', label: 'Temp'     },
  { id: 'fluid',       label: 'Fluid'    },
  { id: 'pressure',    label: 'Pressure' },
  { id: 'measurement', label: 'Measure'  },
  { id: 'number',      label: 'Number'   },
  { id: 'text',        label: 'Text'     },
];

const CamIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00c2e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1200 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(file, companyId) {
  const compressed = await compressImage(file);
  const filename = companyId + '/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.jpg';
  const { error } = await supabase.storage.from('form-photos').upload(filename, compressed, { contentType: 'image/jpeg' });
  if (error) throw new Error('Photo upload failed: ' + error.message);
  const { data } = supabase.storage.from('form-photos').getPublicUrl(filename);
  return data.publicUrl;
}

async function extractPDFText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText.slice(0, 15000);
}

function formatValue(type, value) {
  if (!value) return '-';
  if (type === 'check') return value.status || '-';
  if (type === 'photo') return value.photo_url ? 'Photo taken' : '-';
  if (type === 'temperature') return value.temp ? value.temp + ' deg ' + (value.unit || 'C') : '-';
  if (type === 'fluid') return value.qty ? value.qty + ' ' + (value.unit || 'L') : '-';
  if (type === 'pressure') return value.pressure ? value.pressure + ' ' + (value.unit || 'bar') : '-';
  if (type === 'measurement') return value.measurement ? value.measurement + ' ' + (value.unit || 'mm') : '-';
  if (type === 'number') return value.num ? value.num + (value.unit ? ' ' + value.unit : '') : '-';
  if (type === 'text') return value.text || '-';
  return '-';
}

function normaliseItems(sections) {
  return (sections || []).map(s => ({
    ...s,
    items: (s.items || []).map(item => typeof item === 'string' ? { label: item, type: 'check' } : item)
  }));
}

function ItemInput({ item, value, onChange, companyId }) {
  const type = item.type || 'check';
  const [uploading, setUploading] = useState(false);
  const base = { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: '4px' };

  if (type === 'check') return (
    <select
      value={(value && value.status) || ''}
      onChange={e => onChange({ ...value, status: e.target.value })}
      style={{ ...base, backgroundColor: (value && value.status) === 'OK' ? '#0a2a1a' : (value && value.status) === 'Defect' ? '#2a0a0a' : '#0a0f0f', color: (value && value.status) === 'OK' ? '#00c264' : (value && value.status) === 'Defect' ? '#e94560' : 'white' }}
    >
      <option value="">Select</option>
      <option value="OK">OK</option>
      <option value="Defect">Defect</option>
      <option value="NA">N/A</option>
    </select>
  );

  if (type === 'photo') {
    const handlePhoto = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const url = await uploadPhoto(file, companyId);
        onChange({ ...value, photo_url: url });
      } catch (err) { alert(err.message); }
      setUploading(false);
    };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {value && value.photo_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={value.photo_url} alt="uploaded" style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
            <button onClick={() => onChange({ ...value, photo_url: null })} style={{ ...base, padding: '3px 8px', color: 'var(--red)', cursor: 'pointer' }}>X</button>
          </div>
        ) : (
          <label style={{ background: 'var(--accent-light)', border: '1px solid #00c2e040', color: 'var(--accent)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            {uploading ? 'Uploading...' : 'Take/Upload Photo'}
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          </label>
        )}
      </div>
    );
  }

  if (type === 'temperature') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0" value={(value && value.temp) || ''} onChange={e => onChange({ ...value, temp: e.target.value })} style={{ ...base, width: '80px' }} />
      <select value={(value && value.unit) || 'C'} onChange={e => onChange({ ...value, unit: e.target.value })} style={base}>
        <option value="C">deg C</option>
        <option value="F">deg F</option>
      </select>
    </div>
  );

  if (type === 'fluid') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0.0" step="0.1" value={(value && value.qty) || ''} onChange={e => onChange({ ...value, qty: e.target.value })} style={{ ...base, width: '80px' }} />
      <select value={(value && value.unit) || 'L'} onChange={e => onChange({ ...value, unit: e.target.value })} style={base}>
        <option value="L">L</option>
        <option value="mL">mL</option>
        <option value="gal">gal</option>
        <option value="qt">qt</option>
      </select>
    </div>
  );

  if (type === 'pressure') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0" step="0.1" value={(value && value.pressure) || ''} onChange={e => onChange({ ...value, pressure: e.target.value })} style={{ ...base, width: '80px' }} />
      <select value={(value && value.unit) || 'bar'} onChange={e => onChange({ ...value, unit: e.target.value })} style={base}>
        <option value="bar">bar</option>
        <option value="psi">psi</option>
        <option value="kPa">kPa</option>
        <option value="MPa">MPa</option>
      </select>
    </div>
  );

  if (type === 'measurement') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0.0" step="0.1" value={(value && value.measurement) || ''} onChange={e => onChange({ ...value, measurement: e.target.value })} style={{ ...base, width: '80px' }} />
      <select value={(value && value.unit) || 'mm'} onChange={e => onChange({ ...value, unit: e.target.value })} style={base}>
        <option value="mm">mm</option>
        <option value="cm">cm</option>
        <option value="m">m</option>
        <option value="in">in</option>
      </select>
    </div>
  );

  if (type === 'number') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0" value={(value && value.num) || ''} onChange={e => onChange({ ...value, num: e.target.value })} style={{ ...base, width: '100px' }} />
      <input type="text" placeholder="unit" value={(value && value.unit) || ''} onChange={e => onChange({ ...value, unit: e.target.value })} style={{ ...base, width: '70px', fontSize: '12px' }} />
    </div>
  );

  if (type === 'text') return (
    <input type="text" placeholder="Enter value..." value={(value && value.text) || ''} onChange={e => onChange({ ...value, text: e.target.value })} style={{ ...base, width: '200px' }} />
  );

  return null;
}

function FormRow({ item, formKey, responses, onResponse, companyId }) {
  const label = item.label || item;
  const type = item.type || 'check';
  const value = responses[formKey] || {};

  const handleRowPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadPhoto(file, companyId);
      onResponse(formKey, { ...value, row_photo_url: url });
    } catch (err) { alert(err.message); }
  };

  return (
    <tr>
      <td style={{ verticalAlign: 'middle' }}>{label}</td>
      <td style={{ color: '#a0b0b0', fontSize: '12px', verticalAlign: 'middle' }}>{type}</td>
      <td style={{ verticalAlign: 'middle' }}>
        <ItemInput item={item} value={value} onChange={val => onResponse(formKey, val)} companyId={companyId} />
      </td>
      <td style={{ verticalAlign: 'middle' }}>
        <input
          type="text"
          placeholder="Comment..."
          value={value.comment || ''}
          onChange={e => onResponse(formKey, { ...value, comment: e.target.value })}
          style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', width: '140px', fontSize: '12px' }}
        />
      </td>
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
        <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {value.row_photo_url
            ? <img src={value.row_photo_url} alt="" style={{ width: '36px', height: '28px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #00c2e0' }} />
            : <CamIcon />
          }
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleRowPhoto} />
        </label>
      </td>
    </tr>
  );
}


async function extractExcelText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  let text = '';
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) text += `Sheet: ${sheetName}\n${csv}\n\n`;
  });
  return text.trim();
}

function AIGeneratorModal({ mode, onClose, onGenerated }) {
  const [inputType, setInputType] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const modeLabel = mode === 'prestart' ? 'Prestart Checklist' : 'Service Sheet';

  const toBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const buildPrompt = () => {
    const typeInfo = 'Each item must have "label" and "type". Types: check, photo, temperature, fluid, pressure, measurement, number, text.';
    if (mode === 'prestart') {
      return 'Generate a prestart checklist. Return ONLY valid JSON:\n{"name":"Name","description":"Desc","sections":[{"title":"Section","items":[{"label":"Item","type":"check"}]}]}\n' + typeInfo;
    }
    return 'Generate a service sheet template. Return ONLY valid JSON:\n{"name":"Name","description":"Desc","service_type":"250hr Service","sections":[{"title":"Section","items":[{"label":"Item","type":"check"}]}],"parts_template":[],"labour_items":[]}\n' + typeInfo;
  };

  const handleGenerate = async () => {
    if (inputType === 'text' && !textInput.trim()) { setError('Please describe the machine or service'); return; }
    if ((inputType === 'pdf' || inputType === 'image' || inputType === 'excel') && !file) { setError('Please select a file'); return; }
    setLoading(true); setError('');
    try {
      let messages;
      if (inputType === 'text') {
        messages = [{ role: 'user', content: buildPrompt() + '\n\nInput: ' + textInput }];
      } else if (inputType === 'pdf') {
        setLoadingMsg('Extracting PDF text...');
        const pdfText = await extractPDFText(file);
        if (!pdfText.trim()) throw new Error('Could not extract text from PDF.');
        setLoadingMsg('Generating with AI...');
        messages = [{ role: 'user', content: buildPrompt() + '\n\nDocument:\n' + pdfText }];
      } else if (inputType === 'excel') {
        setLoadingMsg('Reading spreadsheet...');
        const xlText = await extractExcelText(file);
        if (!xlText.trim()) throw new Error('Could not extract data from spreadsheet.');
        setLoadingMsg('Generating with AI...');
        messages = [{ role: 'user', content: buildPrompt() + '\n\nSpreadsheet data:\n' + xlText }];
      } else if (inputType === 'image') {
        setLoadingMsg('Processing image...');
        const base64 = await toBase64(file);
        messages = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }, { type: 'text', text: buildPrompt() }] }];
      }
      setLoadingMsg('Generating with AI...');
      const text = await callAI(messages, 2000);
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      onGenerated(JSON.parse(clean));
    } catch (err) { setError('Error: ' + err.message); }
    setLoading(false); setLoadingMsg('');
  };

  const iStyle = { width: '100%', padding: '10px 14px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' };

  const FileUploadZone = ({ accept, hint }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '8px' }}>{hint}</label>
      <label style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '28px 16px', border: `2px dashed ${file ? 'var(--green)' : 'var(--border)'}`,
        borderRadius: '10px', cursor: 'pointer', background: file ? '#001a0d' : '#060c0c',
        transition: 'all 0.2s', gap: '8px',
      }}>
        {file ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>✓ {file.name}</div>
            <div style={{ color: '#4a7a6a', fontSize: '11px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#a0b0b0', fontSize: '13px', marginBottom: '4px' }}>Drop file here or click to browse</div>
            <div style={{ color: '#4a6a6a', fontSize: '11px' }}>Accepted: {accept}</div>
          </div>
        )}
        <input type="file" accept={accept} onChange={e => { setFile(e.target.files[0]); setError(''); }} style={{ display: 'none' }} />
      </label>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--accent)', margin: 0 }}>AI {modeLabel} Generator</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { id: 'text',  label: 'Text',  desc: 'Describe it' },
            { id: 'pdf',   label: 'PDF',   desc: 'Manual / doc' },
            { id: 'excel', label: 'Excel', desc: 'Spreadsheet' },
            { id: 'image', label: 'Image', desc: 'Photo / scan' },
          ].map(t => (
            <button key={t.id} onClick={() => { setInputType(t.id); setFile(null); setError(''); }} style={{
              padding: '10px 6px', background: inputType === t.id ? 'var(--accent-light)' : 'var(--surface-2)',
              border: '1px solid ' + (inputType === t.id ? '#00c2e0' : '#1a2f2f'),
              borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{ color: inputType === t.id ? '#00c2e0' : '#a0b0b0', fontSize: '13px', fontWeight: 700 }}>{t.label}</div>
              <div style={{ color: inputType === t.id ? '#4aa8b8' : '#4a6a6a', fontSize: '10px', marginTop: '2px' }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {inputType === 'text' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Describe the machine or service</label>
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
              placeholder={mode === 'prestart' ? 'e.g. CAT 320 excavator daily prestart...' : 'e.g. 250hr service Komatsu PC200...'}
              style={{ ...iStyle, minHeight: '100px', resize: 'vertical' }} />
          </div>
        )}

        {inputType === 'pdf' && <FileUploadZone accept=".pdf" hint="Upload a PDF manual or service document" />}
        {inputType === 'excel' && <FileUploadZone accept=".xlsx,.xls,.csv" hint="Upload an Excel spreadsheet or CSV checklist (.xlsx, .xls, .csv)" />}
        {inputType === 'image' && <FileUploadZone accept="image/*" hint="Upload a photo or scan of an existing form" />}

        {error && <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px', padding: '10px', background: 'var(--red-bg)', borderRadius: '6px', border: '1px solid var(--red-border)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border)', color: '#a0b0b0', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleGenerate} disabled={loading} style={{ flex: 2, padding: '12px', background: loading ? '#1a2f2f' : 'linear-gradient(135deg, #00c2e0, #0090a8)', border: 'none', color: loading ? '#a0b0b0' : '#000', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
            {loading ? (loadingMsg || 'Generating...') : 'Generate with AI'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BuilderItem({ item, si, ii, onUpdate, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', background: '#f4f7fb', padding: '8px 10px', borderRadius: '6px', border: '1px solid #dde2ea' }}>
      <input
        placeholder={'Item ' + (ii + 1)}
        value={item.label || ''}
        onChange={e => onUpdate(si, ii, { ...item, label: e.target.value })}
        style={{ flex: 1, padding: '7px 10px', backgroundColor: '#fff', color: '#1a2b3c', border: '1px solid #c8d4e0', borderRadius: '4px', fontSize: '13px' }}
      />
      <select
        value={item.type || 'check'}
        onChange={e => onUpdate(si, ii, { ...item, type: e.target.value })}
        style={{ width: '90px', flexShrink: 0, padding: '7px 6px', backgroundColor: '#fff', color: '#2d8cf0', border: '1px solid #c8d4e0', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}
      >
        {INPUT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <button onClick={() => onRemove(si, ii)} style={{ flexShrink: 0, backgroundColor: 'transparent', border: '1px solid #f0c0c0', color: '#e94560', padding: '5px 9px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>✕</button>
    </div>
  );
}


// ─── ASSET PICKER ─────────────────────────────────────────────────────────────
function AssetPicker({ assets, value = [], onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const selected = assets.filter(a => value.includes(a.id));

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: '42px', padding: '6px 10px', background: '#fff', border: '1px solid #c8d4e0',
          borderRadius: '6px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '6px',
          alignItems: 'center', userSelect: 'none',
        }}
      >
        {selected.length === 0 && <span style={{ color: '#a0b0b0', fontSize: '13px' }}>Assign to assets (optional)</span>}
        {selected.map(a => (
          <span key={a.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#e0f7fb', color: '#00a8c4',
            border: '1px solid rgba(0,194,224,0.35)', borderRadius: '20px',
            padding: '2px 8px 2px 10px', fontSize: '12px', fontWeight: 600,
          }}>
            {a.name}
            <button
              onClick={e => { e.stopPropagation(); toggle(a.id); }}
              style={{ background: 'none', border: 'none', color: '#00a8c4', cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 2px' }}
            >×</button>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: '#a0b0b0', fontSize: '11px' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #c8d4e0', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto',
        }}>
          {assets.length === 0 && <div style={{ padding: '12px 14px', color: '#a0b0b0', fontSize: '13px' }}>No assets found</div>}
          {assets.map(a => {
            const checked = value.includes(a.id);
            return (
              <div
                key={a.id}
                onClick={() => toggle(a.id)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                  background: checked ? '#eaf8fb' : 'transparent', fontSize: '13px',
                  borderBottom: '1px solid #f0f4f8', transition: 'background 0.1s',
                }}
              >
                <span style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  background: checked ? '#00c2e0' : '#fff',
                  border: '1.5px solid ' + (checked ? '#00c2e0' : '#c8d4e0'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '10px', fontWeight: 700,
                }}>
                  {checked ? '✓' : ''}
                </span>
                <span style={{ color: '#1a2b3c', fontWeight: checked ? 600 : 400 }}>{a.name}</span>
                {a.location && <span style={{ color: '#a0b0b0', fontSize: '11px', marginLeft: 'auto' }}>{a.location}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionTable({ sections, responses, onResponse, companyId }) {
  return sections.map((section, si) => (
    <div key={si} className="form-card" style={{ marginTop: '15px' }}>
      <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>{section.title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: '700px' }}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Value</th>
              <th>Comment</th>
              <th>Photo</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, ii) => (
              <FormRow
                key={ii}
                item={item}
                formKey={si + '_' + (item.label || item)}
                responses={responses}
                onResponse={onResponse}
                companyId={companyId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ));
}

function SignaturePad({ sigCanvas, isSigning, setIsSigning, setSignatureData }) {
  const startSigning = () => {
    setIsSigning(true);
    setTimeout(() => {
      const canvas = sigCanvas.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#00c2e0';
      ctx.lineWidth = 2;
      let drawing = false;
      canvas.onmousedown = (e) => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
      canvas.onmousemove = (e) => { if (drawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
      canvas.onmouseup = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
      canvas.ontouchstart = (e) => { drawing = true; const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(t.clientX - r.left, t.clientY - r.top); e.preventDefault(); };
      canvas.ontouchmove = (e) => { if (drawing) { const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.lineTo(t.clientX - r.left, t.clientY - r.top); ctx.stroke(); } e.preventDefault(); };
      canvas.ontouchend = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
    }, 100);
  };

  if (!isSigning) return <button className="btn-primary" onClick={startSigning}>Sign Here</button>;
  return (
    <div>
      <canvas ref={sigCanvas} width={400} height={100} style={{ border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface-2)', cursor: 'crosshair', display: 'block' }} />
      <button onClick={() => { if (sigCanvas.current) sigCanvas.current.getContext('2d').clearRect(0, 0, 400, 100); setSignatureData(''); }} style={{ marginTop: '8px', backgroundColor: 'transparent', color: '#a0b0b0', border: '1px solid var(--border)', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
    </div>
  );
}

// ─── PRESTART TAB ─────────────────────────────────────────────────────────────
function PrestartTab({ userRole, prestartAsset, prestartAssetId, prestartAssetNumber, onClearPreload }) {
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [sortCol, setSortCol]   = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');
  const [assignModal, setAssignModal] = useState(null); // template being assigned
  const [view, setView] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const sigCanvas = React.useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [form, setForm] = useState({ asset: '', operator_name: '', site_area: '', hrs_start: '', date: new Date().toISOString().split('T')[0], notes: '', responses: {} });
  const [builder, setBuilder] = useState({ name: '', description: '', sections: [], asset_ids: [] });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filters, setFilters] = useState({ search: '', asset: '', dateFrom: '', dateTo: '', status: 'all' });
  const isAdmin = userRole && (userRole.role === 'admin' || userRole.role === 'master');
  const assetLocked = !!prestartAsset;

  useEffect(() => {
    if (userRole && userRole.company_id) { fetchTemplates(); fetchSubmissions(); fetchAssets(); }
  }, [userRole]);

  // Pre-fill asset name when navigated from MachineProfile / Assets
  useEffect(() => {
    if (prestartAsset) setForm(f => ({ ...f, asset: prestartAsset }));
  }, [prestartAsset]);

  // Auto-open fill view — prefer templates assigned to this asset
  useEffect(() => {
    if (prestartAsset && !loading && templates.length > 0 && view === 'list') {
      const assetIdInt = parseInt(prestartAssetId);
      const assigned = prestartAssetId
        ? templates.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(assetIdInt))
        : [];
      const pool = assigned.length > 0 ? assigned : templates;
      if (pool.length === 1) { setSelectedTemplate(pool[0]); setView('fill'); }
    }
  }, [prestartAsset, loading, templates]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTemplates = async () => {
    const { data } = await supabase.from('form_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setTemplates(data || []); setLoading(false);
  };
  const fetchSubmissions = async () => {
    const { data } = await supabase.from('form_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setSubmissions(data || []);
  };
  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('id, name, asset_number, make, location').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const handleAIGenerated = (result) => {
    setAiPreview(result); setShowAI(false);
    setBuilder({ name: result.name || '', description: result.description || '', sections: normaliseItems(result.sections), asset_ids: [] });
    setView('builder');
  };

  const onResponse = (key, val) => setForm(prev => ({ ...prev, responses: { ...prev.responses, [key]: val } }));

  const handleSubmit = async () => {
    if (!form.asset || !form.operator_name) { alert('Please select an asset and enter operator name'); return; }
    const defects_found = Object.values(form.responses).some(r => r && r.status === 'Defect');
    const { data: submission, error } = await supabase.from('form_submissions').insert([{
      company_id: userRole.company_id, template_id: selectedTemplate.id, asset: form.asset,
      operator_name: form.operator_name, site_area: form.site_area, hrs_start: form.hrs_start,
      date: form.date, notes: form.notes, responses: form.responses, operator_signature: signatureData, defects_found
    }]).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    // ── Update asset hours from prestart ──
    if (form.hrs_start && parseFloat(form.hrs_start) > 0) {
      try {
        const newHours = parseFloat(form.hrs_start);
        // Find asset by name to get ID
        const { data: assetData } = await supabase
          .from('assets').select('id, hours').eq('name', form.asset).eq('company_id', userRole.company_id).single();
        if (assetData) {
          // Always update hours (keep full history)
          await supabase.from('assets').update({ hours: newHours }).eq('id', assetData.id);
          // Log to hours history
          await supabase.from('asset_hours_log').insert({
            company_id: userRole.company_id,
            asset_id: assetData.id,
            asset_name: form.asset,
            hours: newHours,
            source: 'prestart',
            recorded_by: form.operator_name,
            notes: 'Prestart submission on ' + form.date,
          });
        }
      } catch (e) { console.error('Hours update failed:', e); }
    }

    if (defects_found && submission) {
      const defectItems = [];
      selectedTemplate.sections.forEach((section, si) => {
        section.items.forEach(item => {
          const key = si + '_' + (item.label || item);
          if (form.responses[key] && form.responses[key].status === 'Defect') defectItems.push(item.label || item);
        });
      });
      if (defectItems.length > 0) {
        await supabase.from('work_orders').insert([{
          company_id: userRole.company_id, asset: form.asset, defect_description: defectItems.join('\n'),
          priority: 'High', status: 'Open', source: 'prestart', prestart_id: submission.id,
          comments: 'Auto-generated from prestart by ' + form.operator_name + ' on ' + form.date
        }]);
      }
    }
    fetchSubmissions(); setView('list');
    setForm({ asset: '', operator_name: '', site_area: '', hrs_start: '', date: new Date().toISOString().split('T')[0], notes: '', responses: {} });
    setSignatureData('');
    alert(defects_found ? 'Prestart submitted. Defects found - Work Order created!' : 'Prestart submitted!');
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    await supabase.from('form_templates').delete().eq('id', id);
    fetchTemplates();
  };
  const deleteSubmission = async (id) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    await supabase.from('form_submissions').delete().eq('id', id);
    fetchSubmissions();
  };

  const exportPDF = (submission) => {
    const doc = new jsPDF();
    doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('MECH IQ - PRESTART CHECKLIST', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Asset: ' + submission.asset + '   Operator: ' + submission.operator_name + '   Date: ' + submission.date, 14, 30);
    doc.text('Site: ' + (submission.site_area || '-') + '   Hrs: ' + (submission.hrs_start || '-'), 14, 36);
    const template = templates.find(t => t.id === submission.template_id);
    let y = 45;
    if (template) {
      template.sections.forEach((section, si) => {
        doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(section.title.toUpperCase(), 14, y); y += 6;
        const rows = section.items.map(item => {
          const label = item.label || item;
          const key = si + '_' + label;
          const v = submission.responses && submission.responses[key];
          return [label, formatValue(item.type || 'check', v), (v && v.comment) || ''];
        });
        autoTable(doc, { startY: y, head: [['Item', 'Value', 'Comment']], body: rows, theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
        y = doc.lastAutoTable.finalY + 8;
      });
    }
    doc.save('MechIQ-Prestart-' + submission.asset + '-' + submission.date + '.pdf');
  };

  const saveTemplate = async () => {
    if (!builder.name || builder.sections.length === 0) { alert('Please add a name and at least one section'); return; }
    const { error } = await supabase.from('form_templates').insert([{ ...builder, company_id: userRole.company_id }]);
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', sections: [], asset_ids: [] }); setAiPreview(null); }
  };

  const updateItem = (si, ii, v) => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.map((item, j) => j === ii ? v : item) } : sec) }));
  const removeItem = (si, ii) => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.filter((_, j) => j !== ii) } : sec) }));
  const addItem = (si) => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, items: [...sec.items, { label: '', type: 'check' }] } : sec) }));

  if (loading) return <p style={{ color: '#a0b0b0', padding: '20px' }}>Loading...</p>;

  if (view === 'fill' && selectedTemplate) {
    return (
      <div className="prestart">
        {showAI && <AIGeneratorModal mode="prestart" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
        <div className="page-header">
          <h2>{selectedTemplate.name}</h2>
          <button className="btn-primary" onClick={() => setView('list')}>Back</button>
        </div>
        <div className="form-card">
          <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Prestart Details</h3>
          <div className="form-grid">
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Asset {assetLocked && <span style={{ color: 'var(--accent)', fontSize: '10px', fontWeight: 700, marginLeft: '6px', padding: '1px 6px', background: 'var(--accent-light)', borderRadius: '4px', border: '1px solid rgba(0,194,224,0.3)' }}>PRE-FILLED</span>}
                {assetLocked && prestartAssetNumber && <span style={{ color: '#6b7a8d', fontSize: '10px', fontWeight: 700, marginLeft: '6px', padding: '1px 6px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #dde2ea' }}>#{prestartAssetNumber}</span>}
              </label>
              <select
                value={form.asset}
                onChange={e => !assetLocked && setForm({ ...form, asset: e.target.value })}
                disabled={assetLocked}
                style={{ width: '100%', padding: '10px', background: assetLocked ? '#f0f8ff' : 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid ' + (assetLocked ? 'rgba(0,194,224,0.4)' : 'var(--border)'), borderRadius: '4px', cursor: assetLocked ? 'not-allowed' : 'auto' }}
              >
                <option value="">Select Asset</option>
                {assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Operator Name</label>
              <input placeholder="Operator Name" value={form.operator_name} onChange={e => setForm({ ...form, operator_name: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Site / Location</label>
              <input placeholder="Site Area" value={form.site_area} onChange={e => setForm({ ...form, site_area: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Hours Start</label>
              <input type="number" placeholder="Hours" value={form.hrs_start} onChange={e => setForm({ ...form, hrs_start: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
        <SectionTable sections={selectedTemplate.sections} responses={form.responses} onResponse={onResponse} companyId={userRole.company_id} />
        <div className="form-card" style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>Notes</h3>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px', marginBottom: '15px' }} />
          <h3 style={{ marginBottom: '10px' }}>Operator Signature</h3>
          <SignaturePad sigCanvas={sigCanvas} isSigning={isSigning} setIsSigning={setIsSigning} setSignatureData={setSignatureData} />
        </div>
        <button className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '15px', fontSize: '16px' }} onClick={handleSubmit}>Submit Prestart</button>
      </div>
    );
  }

  if (view === 'builder') {
    return (
      <div className="prestart">
        {showAI && <AIGeneratorModal mode="prestart" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
        <div className="page-header">
          <h2>{aiPreview ? 'AI Generated - Review and Edit' : 'Form Builder'}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>Generate with AI</button>
            <button className="btn-primary" onClick={() => { setView('list'); setAiPreview(null); }}>Back</button>
          </div>
        </div>
        {aiPreview && <div style={{ background: 'var(--green-bg)', border: '1px solid #00c264', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}><p style={{ color: 'var(--green)', margin: 0, fontSize: '13px' }}>AI generated - review and edit before saving.</p></div>}
        <div className="form-card">
          <input placeholder="Form Name" value={builder.name} onChange={e => setBuilder({ ...builder, name: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          <input placeholder="Description (optional)" value={builder.description} onChange={e => setBuilder({ ...builder, description: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7a8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Assign to Units</label>
          <AssetPicker assets={assets} value={builder.asset_ids || []} onChange={ids => setBuilder(b => ({ ...b, asset_ids: ids }))} />
        </div>
        {builder.sections.map((section, si) => (
          <div key={si} className="form-card" style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <input placeholder="Section Title" value={section.title} onChange={e => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, title: e.target.value } : sec) }))} style={{ flex: 1, marginRight: '10px', padding: '8px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
              <button onClick={() => setBuilder(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== si) }))} className="btn-delete">Remove</button>
            </div>
            {section.items.map((item, ii) => <BuilderItem key={ii} item={item} si={si} ii={ii} onUpdate={updateItem} onRemove={removeItem} />)}
            <button onClick={() => addItem(si)} style={{ backgroundColor: 'transparent', color: 'var(--accent)', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px', width: '100%' }}>+ Add Item</button>
          </div>
        ))}
        <button onClick={() => setBuilder(prev => ({ ...prev, sections: [...prev.sections, { title: '', items: [] }] }))} style={{ marginTop: '15px', backgroundColor: 'transparent', color: 'var(--accent)', border: '1px dashed #00c2e0', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>+ Add Section</button>
        <button className="btn-primary" style={{ marginTop: '15px', width: '100%', padding: '14px' }} onClick={saveTemplate}>Save Template</button>
      </div>
    );
  }

  if (view === 'history') {
    // ── Filtered records ──────────────────────────────────────────────────────
    const filtered = submissions.filter(s => {
      if (filters.search && !s.asset?.toLowerCase().includes(filters.search.toLowerCase()) && !s.operator_name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.asset && s.asset !== filters.asset) return false;
      if (filters.dateFrom && s.date < filters.dateFrom) return false;
      if (filters.dateTo && s.date > filters.dateTo) return false;
      if (filters.status === 'defects' && !s.defects_found) return false;
      if (filters.status === 'clear' && s.defects_found) return false;
      return true;
    });
    const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
    const thisMonth = submissions.filter(s => s.date && s.date.startsWith(new Date().toISOString().slice(0,7))).length;
    const defectCount = submissions.filter(s => s.defects_found).length;

    const toggleAll = () => {
      if (allSelected) setSelectedIds(new Set());
      else setSelectedIds(new Set(filtered.map(s => s.id)));
    };
    const toggleOne = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const exportBulkPDF = () => {
      const sel = filtered.filter(s => selectedIds.has(s.id));
      if (sel.length === 0) return;
      sel.forEach(s => exportPDF(s));
    };
    const exportExcel = () => {
      const rows = filtered.filter(s => selectedIds.size === 0 || selectedIds.has(s.id));
      const ws = XLSX.utils.json_to_sheet(rows.map(s => ({
        Date: s.date, Asset: s.asset, Operator: s.operator_name,
        Site: s.site_area || '', Hours: s.hrs_start || '',
        Status: s.defects_found ? 'Defects Found' : 'Clear', Notes: s.notes || '',
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Prestart Records');
      XLSX.writeFile(wb, 'MechIQ-Prestarts-' + new Date().toISOString().slice(0,10) + '.xlsx');
    };

    const statBox = (val, lbl, col) => (
      <div style={{ background: '#fff', border: '1px solid #dde2ea', borderRadius: 10, padding: '12px 18px', minWidth: 100, textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: col, fontFamily: 'var(--font-display)' }}>{val}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7a8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{lbl}</div>
      </div>
    );

    return (
      <div className="prestart">
        {/* Header */}
        <div className="page-header">
          <h2>Prestart Records</h2>
          <button className="btn-primary" onClick={() => { setView('list'); setSelectedIds(new Set()); }}>Back</button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {statBox(submissions.length, 'Total', '#2d8cf0')}
          {statBox(defectCount, 'Defects', '#e94560')}
          {statBox(submissions.length - defectCount, 'Clear', '#00c264')}
          {statBox(thisMonth, 'This Month', '#f59e0b')}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', border: '1px solid #dde2ea', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Search asset or operator..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }}
          />
          <select value={filters.asset} onChange={e => setFilters(f => ({ ...f, asset: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }}>
            <option value="">All Assets</option>
            {assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }} />
          <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }} />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }}>
            <option value="all">All Status</option>
            <option value="clear">Clear</option>
            <option value="defects">Defects</option>
          </select>
          {(filters.search || filters.asset || filters.dateFrom || filters.dateTo || filters.status !== 'all') && (
            <button onClick={() => setFilters({ search: '', asset: '', dateFrom: '', dateTo: '', status: 'all' })} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 12, color: '#6b7a8d', cursor: 'pointer' }}>✕ Clear</button>
          )}
        </div>

        {/* Bulk action bar */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#6b7a8d' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''} shown</span>
            {selectedIds.size > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#2d8cf0' }}>{selectedIds.size} selected</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={exportExcel}
                style={{ padding: '7px 14px', background: '#fff', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#1a7a4a', cursor: 'pointer' }}
              >
                ⬇ Excel {selectedIds.size > 0 ? `(${selectedIds.size})` : '(All)'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={exportBulkPDF}
                  style={{ padding: '7px 14px', background: '#2d8cf0', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                >
                  ⬇ PDF ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a0b0b0', background: '#fff', borderRadius: 10, border: '1px solid #dde2ea' }}>
            {submissions.length === 0 ? 'No prestart records yet.' : 'No records match your filters.'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dde2ea', borderRadius: 10, overflow: 'hidden' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  </th>
                  <th>Date</th><th>Asset</th><th>Operator</th><th>Site</th><th>Hrs</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ background: selectedIds.has(s.id) ? '#f0f7ff' : 'transparent' }}>
                    <td><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleOne(s.id)} style={{ cursor: 'pointer' }} /></td>
                    <td style={{ fontWeight: 600, color: '#1a2b3c' }}>{s.date}</td>
                    <td style={{ fontWeight: 600 }}>{s.asset}</td>
                    <td>{s.operator_name}</td>
                    <td style={{ color: '#6b7a8d' }}>{s.site_area || '—'}</td>
                    <td style={{ color: '#2d8cf0', fontWeight: 600 }}>{s.hrs_start || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: s.defects_found ? '#fff1f2' : '#f0fdf4',
                        color: s.defects_found ? '#e94560' : '#00c264',
                        border: '1px solid ' + (s.defects_found ? '#fecdd3' : '#bbf7d0'),
                      }}>
                        {s.defects_found ? '⚠ Defects' : '✓ Clear'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => exportPDF(s)}>PDF</button>
                        {isAdmin && <button className="btn-delete" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => deleteSubmission(s.id)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="prestart" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header">
        <h2>Prestart Checklists</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => { setView('history'); setSelectedIds(new Set()); setFilters({ search: '', asset: '', dateFrom: '', dateTo: '', status: 'all' }); }}>📋 Records</button>
          {userRole && userRole.role !== 'technician' && (
            <>
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>Generate with AI</button>
              <button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button>
            </>
          )}
        </div>
      </div>
      {assetLocked && (
        <div style={{ background: 'var(--accent-light)', border: '1px solid rgba(0,194,224,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Starting prestart for: {prestartAsset}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {(() => {
                const assetIdInt = parseInt(prestartAssetId);
                const assigned = templates.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(assetIdInt));
                return assigned.length > 0
                  ? `${assigned.length} template${assigned.length > 1 ? 's' : ''} assigned to this unit`
                  : 'No templates assigned — showing all templates';
              })()}
            </div>
          </div>
        </div>
      )}
      {(() => {
        const assetIdInt = parseInt(prestartAssetId);
        const assignedTemplates = prestartAssetId
          ? templates.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(assetIdInt))
          : [];
        const displayTemplates = assignedTemplates.length > 0 ? assignedTemplates : templates;
        return (

      <>
      {displayTemplates.length === 0 && templates.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#a0b0b0', marginBottom: '20px' }}>No prestart templates yet.</p>
          {userRole && userRole.role !== 'technician' && <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000', padding: '12px 24px' }} onClick={() => setShowAI(true)}>Generate with AI</button>}
        </div>
      ) : (
        <>
        {/* Assign to Units Modal */}
        {assignModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={() => setAssignModal(null)}>
            <div style={{ background:'var(--bg)', borderRadius:16, padding:28, width:'100%', maxWidth:460, boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>Assign to Units</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{assignModal.name}</div>
              <AssetPicker assets={assets} value={assignModal.asset_ids || []} onChange={async (ids) => {
                await supabase.from('form_templates').update({ asset_ids: ids }).eq('id', assignModal.id);
                setAssignModal(m => ({ ...m, asset_ids: ids }));
                const { data } = await supabase.from('form_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
                setTemplates(data || []);
              }} />
              <button onClick={() => setAssignModal(null)}
                style={{ marginTop:16, width:'100%', padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Done
              </button>
            </div>
          </div>
        )}
        {/* Sortable list */}
        {(() => {
          const cols = [
            { id:'name', label:'Name' },
            { id:'asset', label:'Assigned Units' },
            { id:'sections', label:'Sections' },
            { id:'created_at', label:'Date Created' },
          ];
          const sorted = [...displayTemplates].sort((a, b) => {
            let av, bv;
            if (sortCol === 'name')       { av = (a.name||'').toLowerCase(); bv = (b.name||'').toLowerCase(); }
            else if (sortCol === 'sections') { av = (a.sections||[]).length; bv = (b.sections||[]).length; }
            else if (sortCol === 'asset') { av = (a.asset_ids||[]).length; bv = (b.asset_ids||[]).length; }
            else                          { av = a.created_at||''; bv = b.created_at||''; }
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
          const toggleSort = (col) => {
            if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
            else { setSortCol(col); setSortDir('asc'); }
          };
          const SortIcon = ({ col }) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
          return (
            <div style={{ marginTop:16, border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', background:'var(--surface)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'var(--surface-2)', borderBottom:'2px solid var(--border)' }}>
                    {cols.map(c => (
                      <th key={c.id} onClick={() => toggleSort(c.id)}
                        style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
                        {c.label}<SortIcon col={c.id} />
                      </th>
                    ))}
                    <th style={{ padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t, i) => {
                    const assignedAssets = (t.asset_ids||[]).map(id => assets.find(a => a.id === id)).filter(Boolean);
                    return (
                      <tr key={t.id} style={{ borderBottom: i < sorted.length-1 ? '1px solid var(--border)' : 'none', transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        {/* Name */}
                        <td style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
                          <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t.name}</div>
                          {t.description && <div style={{ fontSize:11, color:'var(--text-muted)', maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description}</div>}
                        </td>
                        {/* Assigned Units */}
                        <td style={{ padding:'12px 14px' }}>
                          {assignedAssets.length > 0 ? (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                              {assignedAssets.map(a => (
                                <span key={a.id} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(0,194,224,0.3)', whiteSpace:'nowrap' }}>
                                  {a.asset_number ? `${a.asset_number} · ` : ''}{a.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize:11, color:'var(--text-faint)', fontStyle:'italic' }}>Unassigned</span>
                          )}
                        </td>
                        {/* Sections */}
                        <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>
                          {(t.sections||[]).length} section{(t.sections||[]).length !== 1 ? 's' : ''}
                        </td>
                        {/* Date Created */}
                        <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12, whiteSpace:'nowrap' }}>
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                        </td>
                        {/* Actions */}
                        <td style={{ padding:'12px 14px', textAlign:'right' }}>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'nowrap' }}>
                            <button onClick={() => { setSelectedTemplate(t); setView('fill'); }}
                              style={{ padding:'5px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                              ▶ Start
                            </button>
                            {isAdmin && (
                              <button onClick={() => setAssignModal({ ...t })}
                                style={{ padding:'5px 12px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(0,194,224,0.3)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                                📌 Assign
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={e => deleteTemplate(t.id, e)}
                                style={{ padding:'5px 10px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                                🗑
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
        </>
      )}
      </>
        );
      })()}
    </div>
  );
}

// ─── SERVICE SHEETS TAB ───────────────────────────────────────────────────────
function ServiceSheetsTab({ userRole }) {
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [ssSortCol, setSsSortCol]       = useState('created_at');
  const [ssSortDir, setSsSortDir]       = useState('desc');
  const [ssAssignModal, setSsAssignModal] = useState(null);
  const [inventoryParts, setInventoryParts] = useState([]);
  const [view, setView] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [showPartScan, setShowPartScan] = useState(false);
  const [showPartQR, setShowPartQR] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const sigCanvas = React.useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [builder, setBuilder] = useState({ name: '', description: '', service_type: '', sections: [], parts_template: [], labour_items: [], asset_ids: [] });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filters, setFilters] = useState({ search: '', asset: '', dateFrom: '', dateTo: '', tech: '' });
  const [form, setForm] = useState({ asset: '', technician: '', date: new Date().toISOString().split('T')[0], odometer: '', service_type: '', notes: '', responses: {}, parts: [{ name: '', qty: '', cost: '', part_id: null }], labour: [{ description: '', hours: '' }] });
  const isAdmin = userRole && (userRole.role === 'admin' || userRole.role === 'master');

  useEffect(() => {
    if (userRole && userRole.company_id) { fetchTemplates(); fetchSubmissions(); fetchAssets(); fetchInventoryParts(); }
  }, [userRole]);

  const fetchInventoryParts = async () => {
    const { data } = await supabase.from('parts').select('id,name,part_number,unit_cost,quantity,unit').eq('company_id', userRole.company_id).order('name');
    setInventoryParts(data || []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('service_sheet_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    const allTemplates = data || [];
    setTemplates(allTemplates); setLoading(false);
    // Check if navigated here from Assets, Maintenance or MachineProfile
    const intent = sessionStorage.getItem('mechiq_open_form');
    if (intent) {
      try {
        const { templateId, assetName, serviceType, showPicker } = JSON.parse(intent);
        sessionStorage.removeItem('mechiq_open_form');
        if (showPicker || !templateId) {
          setForm(f => ({ ...f, asset: assetName || f.asset, service_type: serviceType || '' }));
          sessionStorage.setItem('mechiq_prefill', JSON.stringify({ assetName, serviceType }));
        } else {
          const tmpl = allTemplates.find(t => t.id === templateId);
          if (tmpl) {
            setSelectedTemplate(tmpl);
            setForm(f => ({ ...f, asset: assetName || f.asset, service_type: serviceType || tmpl.service_type || '', _assetLocked: !!assetName }));
            setView('fill');
          }
        }
      } catch(e) {}
    } else {
      // If sessionStorage has prefill (from mechiq_prefill set by earlier nav), check for single assigned template
      const prefill = (() => { try { const p = sessionStorage.getItem('mechiq_prefill'); return p ? JSON.parse(p) : null; } catch(e) { return null; } })();
      if (prefill?.assetName) {
        const assetObj = (assets.length > 0 ? assets : await supabase.from('assets').select('id,name').eq('company_id', userRole.company_id).then(r => r.data || [])).find(a => a.name === prefill.assetName);
        if (assetObj) {
          const assigned = allTemplates.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(assetObj.id));
          if (assigned.length === 1) {
            setSelectedTemplate(assigned[0]);
            setForm(f => ({ ...f, asset: prefill.assetName, service_type: prefill.serviceType || assigned[0].service_type || '', _assetLocked: true, _assetNumber: prefill.assetNumber || '' }));
            sessionStorage.removeItem('mechiq_prefill');
            setView('fill');
          }
        }
      }
    }
  };
  const fetchSubmissions = async () => {
    const { data } = await supabase.from('service_sheet_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setSubmissions(data || []);
  };
  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('id, name, asset_number, make, location').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const handleAIGenerated = (result) => {
    setAiPreview(result); setShowAI(false);
    setBuilder({ name: result.name || '', description: result.description || '', service_type: result.service_type || '', sections: normaliseItems(result.sections), parts_template: result.parts_template || [], labour_items: result.labour_items || [], asset_ids: [] });
    setView('builder');
  };

  const onResponse = (key, val) => setForm(prev => ({ ...prev, responses: { ...prev.responses, [key]: val } }));

  const totalPartsValue = form.parts.reduce((sum, p) => sum + (parseFloat(p.qty || 0) * parseFloat(p.cost || 0)), 0);
  const totalLabourHours = form.labour.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);

  const handleSubmit = async () => {
    if (!form.asset || !form.technician) { alert('Please select an asset and enter technician name'); return; }
    
    // Check which parts have inventory links and confirm deduction
    const linkedParts = form.parts.filter(p => p.part_id && p.name && parseFloat(p.qty) > 0);
    if (linkedParts.length > 0) {
      const list = linkedParts.map(p => `• ${p.name} × ${p.qty}`).join('\n');
      const confirm = window.confirm(`Deduct the following parts from inventory?\n\n${list}\n\nClick OK to confirm.`);
      if (confirm) {
        for (const p of linkedParts) {
          const invPart = inventoryParts.find(ip => ip.id === p.part_id);
          if (invPart) {
            const newQty = Math.max(0, (invPart.quantity || 0) - parseFloat(p.qty));
            await supabase.from('parts').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', p.part_id);
            await supabase.from('parts_transactions').insert({
              company_id: userRole.company_id, part_id: p.part_id, type: 'out',
              quantity: parseFloat(p.qty), asset_id: assets.find(a => a.name === form.asset)?.id || null,
              notes: `Used on service sheet: ${form.service_type || selectedTemplate.service_type}`,
              performed_by: form.technician,
            });
          }
        }
      }
    }

    const { error } = await supabase.from('service_sheet_submissions').insert([{
      company_id: userRole.company_id, template_id: selectedTemplate.id, asset: form.asset,
      technician: form.technician, date: form.date, odometer: form.odometer,
      service_type: form.service_type || selectedTemplate.service_type, notes: form.notes,
      responses: form.responses, parts: form.parts, labour: form.labour,
      operator_signature: signatureData, total_parts_cost: totalPartsValue, total_labour_hours: totalLabourHours
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    fetchSubmissions(); fetchInventoryParts(); setView('list');
    setForm({ asset: '', technician: '', date: new Date().toISOString().split('T')[0], odometer: '', service_type: '', notes: '', responses: {}, parts: [{ name: '', qty: '', cost: '', part_id: null }], labour: [{ description: '', hours: '' }] });
    setSignatureData('');
    alert('Service sheet submitted!');
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    await supabase.from('service_sheet_templates').delete().eq('id', id);
    fetchTemplates();
  };
  const deleteSubmission = async (id) => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    await supabase.from('service_sheet_submissions').delete().eq('id', id);
    fetchSubmissions();
  };

  const exportServicePDF = (submission) => {
    const doc = new jsPDF();
    doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('MECH IQ - SERVICE SHEET', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Asset: ' + submission.asset + '   Technician: ' + submission.technician + '   Date: ' + submission.date, 14, 30);
    doc.text('Service: ' + (submission.service_type || '-') + '   Odometer/Hrs: ' + (submission.odometer || '-'), 14, 36);
    const template = templates.find(t => t.id === submission.template_id);
    let y = 45;
    if (template && template.sections) {
      template.sections.forEach((section, si) => {
        doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(section.title.toUpperCase(), 14, y); y += 6;
        const rows = section.items.map(item => {
          const label = item.label || item;
          const key = si + '_' + label;
          const v = submission.responses && submission.responses[key];
          return [label, formatValue(item.type || 'check', v), (v && v.comment) || ''];
        });
        autoTable(doc, { startY: y, head: [['Item', 'Value', 'Comment']], body: rows, theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
        y = doc.lastAutoTable.finalY + 8;
      });
    }
    if (submission.parts && submission.parts.filter(p => p.name).length > 0) {
      doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('PARTS USED', 14, y); y += 6;
      autoTable(doc, { startY: y, head: [['Part', 'Qty', 'Unit Cost', 'Total']], body: submission.parts.filter(p => p.name).map(p => [p.name, p.qty, '$' + p.cost, '$' + (parseFloat(p.qty || 0) * parseFloat(p.cost || 0)).toFixed(2)]), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
      y = doc.lastAutoTable.finalY + 8;
    }
    if (submission.labour && submission.labour.filter(l => l.description).length > 0) {
      doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('LABOUR', 14, y); y += 6;
      autoTable(doc, { startY: y, head: [['Task', 'Hours']], body: submission.labour.filter(l => l.description).map(l => [l.description, l.hours + 'h']), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
    }
    doc.setTextColor(160, 176, 176); doc.setFontSize(8);
    doc.text('Generated by Mech IQ - mechiq.coastlinemm.com.au', 14, 285);
    doc.save('MechIQ-ServiceSheet-' + submission.asset + '-' + submission.date + '.pdf');
  };

  const saveTemplate = async () => {
    if (!builder.name) { alert('Please add a template name'); return; }
    const { error } = await supabase.from('service_sheet_templates').insert([{ ...builder, company_id: userRole.company_id }]);
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', service_type: '', sections: [], parts_template: [], labour_items: [], asset_ids: [] }); setAiPreview(null); }
    else alert('Error: ' + error.message);
  };

  const updateItem = (si, ii, v) => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.map((item, j) => j === ii ? v : item) } : sec) }));
  const removeItem = (si, ii) => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.filter((_, j) => j !== ii) } : sec) }));
  const addItem = (si) => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, items: [...sec.items, { label: '', type: 'check' }] } : sec) }));

  const iStyle = { width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '14px', boxSizing: 'border-box' };

  if (loading) return <p style={{ color: '#a0b0b0', padding: '20px' }}>Loading...</p>;

  if (view === 'fill' && selectedTemplate) {
    return (
      <div className="prestart">
        {showAI && <AIGeneratorModal mode="service" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
        <div className="page-header">
          <h2>{selectedTemplate.name}</h2>
          <button className="btn-primary" onClick={() => setView('list')}>Back</button>
        </div>
        <div className="form-card">
          <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Service Details</h3>
          <div className="form-grid">
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Asset {form.asset && form._assetLocked && <span style={{ color: 'var(--accent)', fontSize: '10px', fontWeight: 700, marginLeft: '6px', padding: '1px 6px', background: 'var(--accent-light)', borderRadius: '4px', border: '1px solid rgba(0,194,224,0.3)' }}>PRE-FILLED</span>}
                {form._assetLocked && form._assetNumber && <span style={{ color: '#6b7a8d', fontSize: '10px', fontWeight: 700, marginLeft: '6px', padding: '1px 6px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #dde2ea' }}>#{form._assetNumber}</span>}
              </label>
              <select
                value={form.asset}
                onChange={e => !form._assetLocked && setForm({ ...form, asset: e.target.value })}
                disabled={!!form._assetLocked}
                style={{ ...iStyle, background: form._assetLocked ? '#f0f8ff' : undefined, border: form._assetLocked ? '1px solid rgba(0,194,224,0.4)' : undefined, cursor: form._assetLocked ? 'not-allowed' : 'auto' }}
              >
                <option value="">Select Asset</option>
                {assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Technician</label>
              <input placeholder="Technician name" value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} style={iStyle} />
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={iStyle} />
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Odometer / Hours</label>
              <input placeholder="e.g. 2450 hrs" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })} style={iStyle} />
            </div>
            <div>
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Service Type</label>
              <input placeholder={selectedTemplate.service_type || 'e.g. 250hr Service'} value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} style={iStyle} />
            </div>
          </div>
        </div>
        <SectionTable sections={selectedTemplate.sections || []} responses={form.responses} onResponse={onResponse} companyId={userRole.company_id} />
        <div className="form-card" style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--accent)', margin: 0 }}>Parts Used</h3>
            <span style={{ color: '#ff6b00', fontWeight: 700 }}>Total: ${totalPartsValue.toFixed(2)}</span>
          </div>
          {/* Scan / Photo buttons */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <button onClick={() => setShowPartQR(true)} style={{ padding:'7px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
              📷 Scan QR Code
            </button>
            <button onClick={() => setShowPartScan(true)} style={{ padding:'7px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
              🤖 AI Photo Scan
            </button>
            <select onChange={e => {
              if (!e.target.value) return;
              const ip = inventoryParts.find(p => p.id === e.target.value);
              if (ip) {
                const newParts = [...form.parts];
                const emptyIdx = newParts.findIndex(p => !p.name);
                const entry = { name: ip.name, qty: '1', cost: String(ip.unit_cost || ''), part_id: ip.id };
                if (emptyIdx >= 0) newParts[emptyIdx] = entry; else newParts.push(entry);
                setForm({ ...form, parts: newParts });
              }
              e.target.value = '';
            }} defaultValue="" style={{ padding:'7px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:12, color:'var(--text-secondary)' }}>
              <option value="">+ Pick from inventory…</option>
              {inventoryParts.map(p => <option key={p.id} value={p.id}>{p.name} {p.part_number ? `(${p.part_number})` : ''} — {p.quantity} in stock</option>)}
            </select>
          </div>
          <table className="data-table">
            <thead><tr><th>Part Name</th><th>Qty</th><th>Unit Cost ($)</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {form.parts.map((part, i) => (
                <tr key={i} style={{ background: part.part_id ? 'rgba(14,165,233,0.05)' : 'transparent' }}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <input value={part.name} onChange={e => { const p = [...form.parts]; p[i] = { ...p[i], name: e.target.value, part_id: null }; setForm({ ...form, parts: p }); }} placeholder="Part name" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', width: '100%' }} />
                      {part.part_id && <span title="Linked to inventory" style={{ fontSize:14, flexShrink:0 }}>🔗</span>}
                    </div>
                  </td>
                  <td><input type="number" value={part.qty} onChange={e => { const p = [...form.parts]; p[i] = { ...p[i], qty: e.target.value }; setForm({ ...form, parts: p }); }} placeholder="1" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', width: '60px' }} /></td>
                  <td><input type="number" value={part.cost} onChange={e => { const p = [...form.parts]; p[i] = { ...p[i], cost: e.target.value }; setForm({ ...form, parts: p }); }} placeholder="0.00" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', width: '80px' }} /></td>
                  <td style={{ color: '#ff6b00', fontWeight: 700 }}>${(parseFloat(part.qty || 0) * parseFloat(part.cost || 0)).toFixed(2)}</td>
                  <td><button onClick={() => setForm({ ...form, parts: form.parts.filter((_, idx) => idx !== i) })} className="btn-delete">X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setForm({ ...form, parts: [...form.parts, { name: '', qty: '', cost: '', part_id: null }] })} style={{ marginTop: '10px', backgroundColor: 'transparent', color: 'var(--accent)', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>+ Add Part</button>

          {/* QR Scanner Modal */}
          {showPartQR && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
              <div style={{ background:'var(--bg)', borderRadius:16, width:'100%', maxWidth:420, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>📷 Scan Part QR Code</div>
                  <button onClick={() => { setShowPartQR(false); setScanResult(null); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)' }}>✕</button>
                </div>
                {!scanResult ? (
                  <>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Upload a photo of the QR sticker on the part.</div>
                    <input type="file" accept="image/*" capture="environment" onChange={async e => {
                      const file = e.target.files[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const b64 = ev.target.result.split(',')[1];
                        try {
                          const res = await fetch('/api/ai-insight', { method:'POST', headers:{'Content-Type':'application/json'},
                            body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:300,
                              messages:[{ role:'user', content:[
                                { type:'image', source:{ type:'base64', media_type:file.type, data:b64 }},
                                { type:'text', text:'This is a QR code sticker on a part. Extract the JSON data from the QR code if visible, or read the part name and number from the label. Return ONLY JSON: {"name":"","part_number":"","id":""}' }
                              ]}]
                            })
                          });
                          const data = await res.json();
                          const text = data.content?.find(c => c.type==='text')?.text || '';
                          const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
                          const match = inventoryParts.find(p => p.id === parsed.id || p.part_number?.toLowerCase() === parsed.part_number?.toLowerCase() || p.name?.toLowerCase() === parsed.name?.toLowerCase());
                          setScanResult({ parsed, match });
                        } catch(e) { alert('Could not read QR. Try a clearer photo.'); }
                      };
                      reader.readAsDataURL(file);
                    }} style={{ width:'100%', padding:'12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }} />
                  </>
                ) : (
                  <div>
                    {scanResult.match ? (
                      <div>
                        <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:14, marginBottom:14 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', marginBottom:4 }}>✓ Part Found</div>
                          <div style={{ fontSize:15, fontWeight:800 }}>{scanResult.match.name}</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Stock: {scanResult.match.quantity} {scanResult.match.unit} · ${scanResult.match.unit_cost}</div>
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:4 }}>Quantity used</label>
                          <input type="number" min="1" defaultValue="1" id="qr-qty" style={{ padding:'8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-primary)', fontSize:14, width:80 }} />
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => {
                            const qty = document.getElementById('qr-qty')?.value || '1';
                            const ip = scanResult.match;
                            const newParts = [...form.parts];
                            const emptyIdx = newParts.findIndex(p => !p.name);
                            const entry = { name: ip.name, qty, cost: String(ip.unit_cost || ''), part_id: ip.id };
                            if (emptyIdx >= 0) newParts[emptyIdx] = entry; else newParts.push(entry);
                            setForm({ ...form, parts: newParts });
                            setShowPartQR(false); setScanResult(null);
                          }} style={{ flex:1, padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:700 }}>Add to Sheet</button>
                          <button onClick={() => setScanResult(null)} style={{ flex:1, padding:'10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', fontSize:13 }}>Rescan</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'20px 0' }}>
                        <div style={{ fontSize:14, marginBottom:8 }}>Part not found in inventory</div>
                        <div style={{ fontSize:12 }}>"{scanResult.parsed?.name}"</div>
                        <button onClick={() => setScanResult(null)} style={{ marginTop:12, padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:13 }}>Try Again</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Photo Scan Modal */}
          {showPartScan && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
              <div style={{ background:'var(--bg)', borderRadius:16, width:'100%', maxWidth:420, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>🤖 AI Part Photo</div>
                  <button onClick={() => { setShowPartScan(false); setScanResult(null); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)' }}>✕</button>
                </div>
                {!scanResult ? (
                  <>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Take a photo of the part, its label, or box. AI will identify it and match to your inventory.</div>
                    <input type="file" accept="image/*" capture="environment" onChange={async e => {
                      const file = e.target.files[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const b64 = ev.target.result.split(',')[1];
                        try {
                          const res = await fetch('/api/ai-insight', { method:'POST', headers:{'Content-Type':'application/json'},
                            body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:400,
                              messages:[{ role:'user', content:[
                                { type:'image', source:{ type:'base64', media_type:file.type, data:b64 }},
                                { type:'text', text:'Identify this automotive/industrial part from the image. Return ONLY JSON: {"name":"","part_number":"","supplier":"","confidence":"high/medium/low"}' }
                              ]}]
                            })
                          });
                          const data = await res.json();
                          const text = data.content?.find(c => c.type==='text')?.text || '';
                          const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
                          const match = inventoryParts.find(p =>
                            (parsed.part_number && p.part_number?.toLowerCase() === parsed.part_number.toLowerCase()) ||
                            (parsed.name && p.name?.toLowerCase().includes(parsed.name.toLowerCase().split(' ')[0]))
                          );
                          setScanResult({ parsed, match });
                        } catch(e) { alert('Could not identify part. Try a clearer photo.'); }
                      };
                      reader.readAsDataURL(file);
                    }} style={{ width:'100%', padding:'12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 }} />
                  </>
                ) : (
                  <div>
                    <div style={{ background:'var(--surface)', borderRadius:10, padding:12, marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700, marginBottom:4 }}>AI Detected</div>
                      <div style={{ fontSize:14, fontWeight:800 }}>{scanResult.parsed?.name || 'Unknown'}</div>
                      {scanResult.parsed?.part_number && <div style={{ fontSize:12, color:'var(--accent)' }}>#{scanResult.parsed.part_number}</div>}
                      <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>Confidence: {scanResult.parsed?.confidence}</div>
                    </div>
                    {scanResult.match ? (
                      <div>
                        <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:12, marginBottom:12 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', marginBottom:4 }}>✓ Matched in Inventory</div>
                          <div style={{ fontSize:14, fontWeight:700 }}>{scanResult.match.name}</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Stock: {scanResult.match.quantity} · ${scanResult.match.unit_cost}</div>
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <label style={{ fontSize:12, color:'var(--text-muted)', display:'block', marginBottom:4 }}>Quantity used</label>
                          <input type="number" min="1" defaultValue="1" id="ai-qty" style={{ padding:'8px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-primary)', fontSize:14, width:80 }} />
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => {
                            const qty = document.getElementById('ai-qty')?.value || '1';
                            const ip = scanResult.match;
                            const newParts = [...form.parts];
                            const emptyIdx = newParts.findIndex(p => !p.name);
                            const entry = { name: ip.name, qty, cost: String(ip.unit_cost || ''), part_id: ip.id };
                            if (emptyIdx >= 0) newParts[emptyIdx] = entry; else newParts.push(entry);
                            setForm({ ...form, parts: newParts });
                            setShowPartScan(false); setScanResult(null);
                          }} style={{ flex:1, padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:700 }}>Add to Sheet</button>
                          <button onClick={() => setScanResult(null)} style={{ flex:1, padding:'10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', fontSize:13 }}>Rescan</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:12, marginBottom:12 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'var(--amber)', textTransform:'uppercase', marginBottom:4 }}>⚠ Not in inventory</div>
                          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>Add manually instead?</div>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => {
                            const entry = { name: scanResult.parsed?.name || '', qty: '1', cost: '', part_id: null };
                            const newParts = [...form.parts];
                            const emptyIdx = newParts.findIndex(p => !p.name);
                            if (emptyIdx >= 0) newParts[emptyIdx] = entry; else newParts.push(entry);
                            setForm({ ...form, parts: newParts });
                            setShowPartScan(false); setScanResult(null);
                          }} style={{ flex:1, padding:'10px', background:'var(--amber)', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:700 }}>Add Manually</button>
                          <button onClick={() => setScanResult(null)} style={{ flex:1, padding:'10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', fontSize:13 }}>Rescan</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="form-card" style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: 'var(--accent)', margin: 0 }}>Labour</h3>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{totalLabourHours.toFixed(1)} hrs total</span>
          </div>
          <table className="data-table">
            <thead><tr><th>Task Description</th><th>Hours</th><th></th></tr></thead>
            <tbody>
              {form.labour.map((l, i) => (
                <tr key={i}>
                  <td><input value={l.description} onChange={e => { const lb = [...form.labour]; lb[i] = { ...lb[i], description: e.target.value }; setForm({ ...form, labour: lb }); }} placeholder="e.g. Oil and filter change" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', width: '100%' }} /></td>
                  <td><input type="number" value={l.hours} onChange={e => { const lb = [...form.labour]; lb[i] = { ...lb[i], hours: e.target.value }; setForm({ ...form, labour: lb }); }} placeholder="0.5" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: '4px', width: '70px' }} /></td>
                  <td><button onClick={() => setForm({ ...form, labour: form.labour.filter((_, idx) => idx !== i) })} className="btn-delete">X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setForm({ ...form, labour: [...form.labour, { description: '', hours: '' }] })} style={{ marginTop: '10px', backgroundColor: 'transparent', color: 'var(--accent)', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>+ Add Labour</button>
        </div>
        <div className="form-card" style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '10px' }}>Notes</h3>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', minHeight: '80px', fontFamily: 'inherit', fontSize: '14px', marginBottom: '15px' }} />
          <h3 style={{ marginBottom: '10px' }}>Technician Signature</h3>
          <SignaturePad sigCanvas={sigCanvas} isSigning={isSigning} setIsSigning={setIsSigning} setSignatureData={setSignatureData} />
        </div>
        <div className="form-card" style={{ marginTop: '15px', backgroundColor: '#0a1a1a', border: '1px solid #00c2e030' }}>
          <h3 style={{ color: 'var(--accent)', marginBottom: '12px' }}>Summary</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div><span style={{ color: '#a0b0b0', fontSize: '12px' }}>PARTS TOTAL</span><div style={{ color: '#ff6b00', fontWeight: 700, fontSize: '20px' }}>${totalPartsValue.toFixed(2)}</div></div>
            <div><span style={{ color: '#a0b0b0', fontSize: '12px' }}>LABOUR HOURS</span><div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '20px' }}>{totalLabourHours.toFixed(1)}h</div></div>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '15px', fontSize: '16px' }} onClick={handleSubmit}>Submit Service Sheet</button>
      </div>
    );
  }

  if (view === 'builder') {
    return (
      <div className="prestart">
        {showAI && <AIGeneratorModal mode="service" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
        <div className="page-header">
          <h2>{aiPreview ? 'AI Generated - Review and Edit' : 'Service Sheet Builder'}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>Generate with AI</button>
            <button className="btn-primary" onClick={() => { setView('list'); setAiPreview(null); }}>Back</button>
          </div>
        </div>
        {aiPreview && <div style={{ background: 'var(--green-bg)', border: '1px solid #00c264', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}><p style={{ color: 'var(--green)', margin: 0, fontSize: '13px' }}>AI generated - review and edit before saving.</p></div>}
        <div className="form-card">
          <input placeholder="Template Name" value={builder.name} onChange={e => setBuilder({ ...builder, name: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          <input placeholder="Description" value={builder.description} onChange={e => setBuilder({ ...builder, description: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          <input placeholder="Service Type (e.g. 250hr Service)" value={builder.service_type} onChange={e => setBuilder({ ...builder, service_type: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6b7a8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Assign to Units</label>
          <AssetPicker assets={assets} value={builder.asset_ids || []} onChange={ids => setBuilder(b => ({ ...b, asset_ids: ids }))} />
        </div>
        {builder.sections.map((section, si) => (
          <div key={si} className="form-card" style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <input placeholder="Section Title" value={section.title} onChange={e => setBuilder(prev => ({ ...prev, sections: prev.sections.map((sec, i) => i === si ? { ...sec, title: e.target.value } : sec) }))} style={{ flex: 1, marginRight: '10px', padding: '8px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
              <button onClick={() => setBuilder(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== si) }))} className="btn-delete">Remove</button>
            </div>
            {section.items.map((item, ii) => <BuilderItem key={ii} item={item} si={si} ii={ii} onUpdate={updateItem} onRemove={removeItem} />)}
            <button onClick={() => addItem(si)} style={{ backgroundColor: 'transparent', color: 'var(--accent)', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px', width: '100%' }}>+ Add Item</button>
          </div>
        ))}
        <button onClick={() => setBuilder(prev => ({ ...prev, sections: [...prev.sections, { title: '', items: [] }] }))} style={{ marginTop: '15px', backgroundColor: 'transparent', color: 'var(--accent)', border: '1px dashed #00c2e0', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>+ Add Section</button>
        <button className="btn-primary" style={{ marginTop: '15px', width: '100%', padding: '14px' }} onClick={saveTemplate}>Save Template</button>
      </div>
    );
  }

  if (view === 'history') {
    // ── Filtered records ──────────────────────────────────────────────────────
    const filtered = submissions.filter(s => {
      if (filters.search && !s.asset?.toLowerCase().includes(filters.search.toLowerCase()) && !s.technician?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.asset && s.asset !== filters.asset) return false;
      if (filters.dateFrom && s.date < filters.dateFrom) return false;
      if (filters.dateTo && s.date > filters.dateTo) return false;
      if (filters.tech && !s.technician?.toLowerCase().includes(filters.tech.toLowerCase())) return false;
      return true;
    });
    const allSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
    const thisMonth = submissions.filter(s => s.date && s.date.startsWith(new Date().toISOString().slice(0,7))).length;
    const totalParts = submissions.reduce((sum, s) => sum + parseFloat(s.total_parts_cost || 0), 0);
    const totalLabour = submissions.reduce((sum, s) => sum + parseFloat(s.total_labour_hours || 0), 0);

    const toggleAll = () => {
      if (allSelected) setSelectedIds(new Set());
      else setSelectedIds(new Set(filtered.map(s => s.id)));
    };
    const toggleOne = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const exportBulkPDF = () => {
      const sel = filtered.filter(s => selectedIds.has(s.id));
      if (sel.length === 0) return;
      sel.forEach(s => exportServicePDF(s));
    };
    const exportExcel = () => {
      const rows = filtered.filter(s => selectedIds.size === 0 || selectedIds.has(s.id));
      const ws = XLSX.utils.json_to_sheet(rows.map(s => ({
        Date: s.date, Asset: s.asset, Technician: s.technician,
        'Service Type': s.service_type || '',
        'Parts Cost ($)': parseFloat(s.total_parts_cost || 0).toFixed(2),
        'Labour Hours': parseFloat(s.total_labour_hours || 0).toFixed(1),
        Notes: s.notes || '',
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Service Records');
      XLSX.writeFile(wb, 'MechIQ-ServiceSheets-' + new Date().toISOString().slice(0,10) + '.xlsx');
    };

    const statBox = (val, lbl, col) => (
      <div style={{ background: '#fff', border: '1px solid #dde2ea', borderRadius: 10, padding: '12px 18px', minWidth: 110, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: col, fontFamily: 'var(--font-display)' }}>{val}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7a8d', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{lbl}</div>
      </div>
    );

    return (
      <div className="prestart">
        {/* Header */}
        <div className="page-header">
          <h2>Service Sheet Records</h2>
          <button className="btn-primary" onClick={() => { setView('list'); setSelectedIds(new Set()); }}>Back</button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {statBox(submissions.length, 'Total', '#2d8cf0')}
          {statBox('$' + totalParts.toFixed(0), 'Parts Cost', '#ff6b00')}
          {statBox(totalLabour.toFixed(1) + 'h', 'Labour Hrs', '#00c2e0')}
          {statBox(thisMonth, 'This Month', '#f59e0b')}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', border: '1px solid #dde2ea', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            placeholder="Search asset or technician..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }}
          />
          <select value={filters.asset} onChange={e => setFilters(f => ({ ...f, asset: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }}>
            <option value="">All Assets</option>
            {assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }} />
          <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} style={{ padding: '8px 10px', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 13, color: '#1a2b3c', background: '#f8fafc' }} />
          {(filters.search || filters.asset || filters.dateFrom || filters.dateTo || filters.tech) && (
            <button onClick={() => setFilters({ search: '', asset: '', dateFrom: '', dateTo: '', tech: '' })} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 12, color: '#6b7a8d', cursor: 'pointer' }}>✕ Clear</button>
          )}
        </div>

        {/* Bulk action bar */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#6b7a8d' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''} shown</span>
            {selectedIds.size > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: '#2d8cf0' }}>{selectedIds.size} selected</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                onClick={exportExcel}
                style={{ padding: '7px 14px', background: '#fff', border: '1px solid #dde2ea', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#1a7a4a', cursor: 'pointer' }}
              >
                ⬇ Excel {selectedIds.size > 0 ? `(${selectedIds.size})` : '(All)'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={exportBulkPDF}
                  style={{ padding: '7px 14px', background: '#2d8cf0', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                >
                  ⬇ PDF ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#a0b0b0', background: '#fff', borderRadius: 10, border: '1px solid #dde2ea' }}>
            {submissions.length === 0 ? 'No service sheet records yet.' : 'No records match your filters.'}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #dde2ea', borderRadius: 10, overflow: 'hidden' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  </th>
                  <th>Date</th><th>Asset</th><th>Technician</th><th>Service Type</th><th>Parts</th><th>Labour</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ background: selectedIds.has(s.id) ? '#f0f7ff' : 'transparent' }}>
                    <td><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleOne(s.id)} style={{ cursor: 'pointer' }} /></td>
                    <td style={{ fontWeight: 600, color: '#1a2b3c' }}>{s.date}</td>
                    <td style={{ fontWeight: 600 }}>{s.asset}</td>
                    <td>{s.technician}</td>
                    <td style={{ color: '#6b7a8d' }}>{s.service_type || '—'}</td>
                    <td style={{ color: '#ff6b00', fontWeight: 600 }}>${parseFloat(s.total_parts_cost || 0).toFixed(2)}</td>
                    <td style={{ color: '#00c2e0', fontWeight: 600 }}>{parseFloat(s.total_labour_hours || 0).toFixed(1)}h</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => exportServicePDF(s)}>PDF</button>
                        {isAdmin && <button className="btn-delete" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => deleteSubmission(s.id)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="service" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header">
        <h2>Service Sheets</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => { setView('history'); setSelectedIds(new Set()); setFilters({ search: '', asset: '', dateFrom: '', dateTo: '', tech: '' }); }}>📋 Records</button>
          {userRole && userRole.role !== 'technician' && (
            <>
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>Generate with AI</button>
              <button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button>
            </>
          )}
        </div>
      </div>
      {(() => {
        // Determine which asset we're operating in context of (from asset page nav or sessionStorage)
        const ssIntent = (() => { try { const p = sessionStorage.getItem('mechiq_prefill'); return p ? JSON.parse(p) : null; } catch(e) { return null; } })();
        const contextAssetName = ssIntent?.assetName || '';
        const contextAssetId = contextAssetName ? (assets.find(a => a.name === contextAssetName)?.id || null) : null;
        // Filter templates: prefer assigned ones, fallback to all
        const assignedTemplates = contextAssetId
          ? templates.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(contextAssetId))
          : [];
        const displayTemplates = assignedTemplates.length > 0 ? assignedTemplates : templates;
        return (
          <>
            {/* Context banner */}
            {contextAssetName && (
              <div style={{ background:'var(--accent-light)', border:'1px solid rgba(0,194,224,0.3)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>🔧</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>
                    Service sheet for: {contextAssetName}
                    {ssIntent?.serviceType && <span style={{ fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>— {ssIntent.serviceType}</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                    {assignedTemplates.length > 0
                      ? `${assignedTemplates.length} template${assignedTemplates.length > 1 ? 's' : ''} assigned to this unit`
                      : 'No templates assigned — showing all templates'}
                  </div>
                </div>
              </div>
            )}
            {templates.length === 0 ? (
              <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#a0b0b0', marginBottom: '20px' }}>No service sheet templates yet.</p>
                {userRole && userRole.role !== 'technician' && <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000', padding: '12px 24px' }} onClick={() => setShowAI(true)}>Generate with AI</button>}
              </div>
            ) : (
              <>
              {/* Assign to Units Modal */}
              {ssAssignModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                  onClick={() => setSsAssignModal(null)}>
                  <div style={{ background:'var(--bg)', borderRadius:16, padding:28, width:'100%', maxWidth:460, boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>Assign to Units</div>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{ssAssignModal.name}</div>
                    <AssetPicker assets={assets} value={ssAssignModal.asset_ids || []} onChange={async (ids) => {
                      await supabase.from('service_sheet_templates').update({ asset_ids: ids }).eq('id', ssAssignModal.id);
                      setSsAssignModal(m => ({ ...m, asset_ids: ids }));
                      const { data } = await supabase.from('service_sheet_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
                      setTemplates(data || []);
                    }} />
                    <button onClick={() => setSsAssignModal(null)}
                      style={{ marginTop:16, width:'100%', padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      Done
                    </button>
                  </div>
                </div>
              )}
              {/* Sortable list */}
              {(() => {
                const cols = [
                  { id:'name', label:'Name' },
                  { id:'service_type', label:'Service Type' },
                  { id:'asset', label:'Assigned Units' },
                  { id:'sections', label:'Sections' },
                  { id:'created_at', label:'Date Created' },
                ];
                const sorted = [...displayTemplates].sort((a, b) => {
                  let av, bv;
                  if (ssSortCol === 'name')         { av = (a.name||'').toLowerCase(); bv = (b.name||'').toLowerCase(); }
                  else if (ssSortCol === 'service_type') { av = (a.service_type||'').toLowerCase(); bv = (b.service_type||'').toLowerCase(); }
                  else if (ssSortCol === 'sections') { av = (a.sections||[]).length; bv = (b.sections||[]).length; }
                  else if (ssSortCol === 'asset')   { av = (a.asset_ids||[]).length; bv = (b.asset_ids||[]).length; }
                  else                              { av = a.created_at||''; bv = b.created_at||''; }
                  if (av < bv) return ssSortDir === 'asc' ? -1 : 1;
                  if (av > bv) return ssSortDir === 'asc' ? 1 : -1;
                  return 0;
                });
                const toggleSort = (col) => {
                  if (ssSortCol === col) setSsSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSsSortCol(col); setSsSortDir('asc'); }
                };
                const SortIcon = ({ col }) => ssSortCol === col ? (ssSortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';
                return (
                  <div style={{ marginTop:16, border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', background:'var(--surface)' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'var(--surface-2)', borderBottom:'2px solid var(--border)' }}>
                          {cols.map(c => (
                            <th key={c.id} onClick={() => toggleSort(c.id)}
                              style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
                              {c.label}<SortIcon col={c.id} />
                            </th>
                          ))}
                          <th style={{ padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((t, i) => {
                          const assignedAssets = (t.asset_ids||[]).map(id => assets.find(a => a.id === id)).filter(Boolean);
                          return (
                            <tr key={t.id} style={{ borderBottom: i < sorted.length-1 ? '1px solid var(--border)' : 'none', transition:'background 0.1s' }}
                              onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                              {/* Name */}
                              <td style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => {
                                setSelectedTemplate(t);
                                if (contextAssetName) {
                                  setForm(f => ({ ...f, asset: contextAssetName, service_type: ssIntent?.serviceType || t.service_type || '', _assetLocked: true, _assetNumber: ssIntent?.assetNumber || '' }));
                                  sessionStorage.removeItem('mechiq_prefill');
                                }
                                setView('fill');
                              }}>
                                <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>{t.name}</div>
                                {t.description && <div style={{ fontSize:11, color:'var(--text-muted)', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description}</div>}
                              </td>
                              {/* Service Type */}
                              <td style={{ padding:'12px 14px' }}>
                                {t.service_type ? <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)' }}>{t.service_type}</span> : <span style={{ color:'var(--text-faint)', fontSize:12 }}>—</span>}
                              </td>
                              {/* Assigned Units */}
                              <td style={{ padding:'12px 14px' }}>
                                {assignedAssets.length > 0 ? (
                                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                    {assignedAssets.map(a => (
                                      <span key={a.id} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(0,194,224,0.3)', whiteSpace:'nowrap' }}>
                                        {a.asset_number ? `${a.asset_number} · ` : ''}{a.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize:11, color:'var(--text-faint)', fontStyle:'italic' }}>Unassigned</span>
                                )}
                              </td>
                              {/* Sections */}
                              <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>
                                {(t.sections||[]).length} section{(t.sections||[]).length !== 1 ? 's' : ''}
                              </td>
                              {/* Date Created */}
                              <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12, whiteSpace:'nowrap' }}>
                                {t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                              </td>
                              {/* Actions */}
                              <td style={{ padding:'12px 14px', textAlign:'right' }}>
                                <div style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'nowrap' }}>
                                  <button onClick={() => {
                                    setSelectedTemplate(t);
                                    if (contextAssetName) {
                                      setForm(f => ({ ...f, asset: contextAssetName, service_type: ssIntent?.serviceType || t.service_type || '', _assetLocked: true, _assetNumber: ssIntent?.assetNumber || '' }));
                                      sessionStorage.removeItem('mechiq_prefill');
                                    }
                                    setView('fill');
                                  }}
                                    style={{ padding:'5px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                                    ▶ Start
                                  </button>
                                  {isAdmin && (
                                    <button onClick={() => setSsAssignModal({ ...t })}
                                      style={{ padding:'5px 12px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(0,194,224,0.3)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                                      📌 Assign
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button onClick={e => deleteTemplate(t.id, e)}
                                      style={{ padding:'5px 10px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                                      🗑
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}


// ─── Asset Forms Tab ─────────────────────────────────────────────────────────
function AssetFormsTab({ userRole }) {
  const [assets,        setAssets]        = React.useState([]);
  const [prestartTmpls, setPrestartTmpls] = React.useState([]);
  const [ssTmpls,       setSsTmpls]       = React.useState([]);
  const [loading,       setLoading]       = React.useState(true);
  const [generating,    setGenerating]    = React.useState({}); // assetId -> 'prestart'|'ss'|null
  const [expanded,      setExpanded]      = React.useState({});
  const [toast,         setToast]         = React.useState(null);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  React.useEffect(() => {
    if (userRole?.company_id) load();
  }, [userRole]);

  const load = async () => {
    setLoading(true);
    const [{ data: aD }, { data: pD }, { data: sD }] = await Promise.all([
      supabase.from('assets').select('*').eq('company_id', userRole.company_id).order('asset_number'),
      supabase.from('form_templates').select('id,name,description,asset_ids,created_at').eq('company_id', userRole.company_id),
      supabase.from('service_sheet_templates').select('id,name,service_type,asset_ids,created_at').eq('company_id', userRole.company_id),
    ]);
    setAssets(aD || []);
    setPrestartTmpls(pD || []);
    setSsTmpls(sD || []);
    setLoading(false);
  };

  const getAssignedPrestarts = (asset) =>
    prestartTmpls.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(asset.id));

  const getAssignedSS = (asset) =>
    ssTmpls.filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(asset.id));

  const autoGenerate = async (asset, type) => {
    setGenerating(g => ({ ...g, [asset.id]: type }));

    const assetDesc = [
      asset.name, asset.asset_number,
      asset.type, asset.make, asset.model,
      asset.year ? `Year: ${asset.year}` : null,
      asset.engine_model ? `Engine: ${asset.engine_model}` : null,
      asset.location ? `Location: ${asset.location}` : null,
      asset.serial_number ? `Serial: ${asset.serial_number}` : null,
    ].filter(Boolean).join(', ');

    const isPrestart = type === 'prestart';

    const prompt = isPrestart
      ? `Generate a detailed prestart safety checklist for this piece of equipment: ${assetDesc}.
Include relevant sections for: engine/fluid checks, safety systems, controls, tyres/undercarriage if applicable, lights, attachments, and any type-specific items.
Return ONLY valid JSON:
{"name":"[Asset Name] Pre-Start Checklist","description":"Pre-operational safety and functionality inspection for ${asset.name}","sections":[{"title":"Section Name","items":[{"label":"Check item description","type":"check"}]}]}
Use types: check, photo, number, text. Include 4-8 sections with 4-8 items each. No markdown, no explanation.`
      : `Generate a detailed service sheet template for this piece of equipment: ${assetDesc}.
Include relevant sections for: fluids & filters, mechanical inspection, electrical systems, safety systems, and any type-specific service items. Include parts and labour sections.
Return ONLY valid JSON:
{"name":"${asset.name} Service Sheet","description":"Scheduled maintenance service sheet for ${asset.name}","service_type":"Scheduled Service","sections":[{"title":"Section Name","items":[{"label":"Item description","type":"check"}]}],"parts_template":[{"description":"Part name","part_number":"","quantity":1,"unit":"each"}],"labour_items":[{"description":"Labour task","estimated_hours":1}]}
No markdown, no explanation.`;

    try {
      const data = await callAI([{ role: 'user', content: prompt }], 2000);
      const text = (data.content || []).map(c => c.text || '').join('');
      let parsed;
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch {
        showToast('AI returned invalid JSON — try again', 'error');
        setGenerating(g => ({ ...g, [asset.id]: null }));
        return;
      }

      // Save template and assign to this asset
      const table = isPrestart ? 'form_templates' : 'service_sheet_templates';
      const payload = {
        ...parsed,
        company_id: userRole.company_id,
        asset_ids: [asset.id],
      };
      const { data: saved, error } = await supabase.from(table).insert([payload]).select().single();
      if (error) {
        showToast('Failed to save template: ' + error.message, 'error');
      } else {
        showToast(`✓ ${isPrestart ? 'Prestart' : 'Service sheet'} generated and assigned to ${asset.name}`);
        await load();
        setExpanded(e => ({ ...e, [asset.id]: true }));
      }
    } catch (err) {
      showToast('Generation failed: ' + err.message, 'error');
    }
    setGenerating(g => ({ ...g, [asset.id]: null }));
  };

  const unassign = async (asset, tmplId, type) => {
    const table = type === 'prestart' ? 'form_templates' : 'service_sheet_templates';
    const tmpl = (type === 'prestart' ? prestartTmpls : ssTmpls).find(t => t.id === tmplId);
    if (!tmpl) return;
    const newIds = (tmpl.asset_ids || []).filter(id => id !== asset.id);
    await supabase.from(table).update({ asset_ids: newIds }).eq('id', tmplId);
    await load();
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Loading assets…</div>;

  const sc = (s) => s === 'Down' ? 'var(--red)' : s === 'Maintenance' ? 'var(--amber)' : 'var(--green)';

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:3000, padding:'12px 20px', borderRadius:10, background: toast.type==='error'?'var(--red)':'#00c264', color:'#fff', fontSize:13, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,0.2)', animation:'fadeUp 0.2s ease' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom:16 }}>
        <h3 style={{ margin:'0 0 4px', fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>Asset Forms</h3>
        <p style={{ margin:0, fontSize:13, color:'var(--text-muted)' }}>
          Auto-generate prestart checklists and service sheet templates from each asset's information. Generated forms are immediately assigned to the asset.
        </p>
      </div>

      {assets.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>No assets registered yet.</div>
      ) : assets.map(asset => {
        const assignedPS  = getAssignedPrestarts(asset);
        const assignedSS  = getAssignedSS(asset);
        const isExpanded  = expanded[asset.id];
        const genState    = generating[asset.id];

        return (
          <div key={asset.id} style={{ border:'1px solid var(--border)', borderRadius:12, marginBottom:10, overflow:'hidden', background:'var(--surface)' }}>
            {/* Row header */}
            <div onClick={() => setExpanded(e => ({ ...e, [asset.id]: !e[asset.id] }))}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', cursor:'pointer', background: isExpanded ? 'var(--accent-light)' : 'var(--surface)' }}>
              <span style={{ fontSize:11, fontWeight:800, color:'var(--accent)', fontFamily:'var(--font-mono)', flexShrink:0 }}>{asset.asset_number||'—'}</span>
              <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', flex:1 }}>{asset.name}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{[asset.make, asset.model].filter(Boolean).join(' ') || asset.type || '—'}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:sc(asset.status)+'18', color:sc(asset.status), flexShrink:0 }}>{asset.status||'Active'}</span>
              {/* Summary badges */}
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: assignedPS.length>0?'#f0fdf4':'#f8fafc', color: assignedPS.length>0?'#16a34a':'var(--text-faint)', border:`1px solid ${assignedPS.length>0?'#bbf7d0':'var(--border)'}`, flexShrink:0 }}>
                {assignedPS.length} prestart{assignedPS.length!==1?'s':''}
              </span>
              <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: assignedSS.length>0?'#f0f7ff':'#f8fafc', color: assignedSS.length>0?'#2d8cf0':'var(--text-faint)', border:`1px solid ${assignedSS.length>0?'#93c5fd':'var(--border)'}`, flexShrink:0 }}>
                {assignedSS.length} service sheet{assignedSS.length!==1?'s':''}
              </span>
              <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {isExpanded && (
              <div style={{ padding:'16px', borderTop:'1px solid var(--border)' }}>
                {/* Asset info strip */}
                <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:16, padding:'10px 14px', background:'var(--surface-2)', borderRadius:8, fontSize:12, color:'var(--text-muted)' }}>
                  {[
                    ['Type', asset.type], ['Make', asset.make], ['Model', asset.model],
                    ['Year', asset.year], ['Engine', asset.engine_model], ['Location', asset.location],
                    ['Serial', asset.serial_number], ['Hours', asset.hours ? asset.hours+' hrs' : null],
                  ].filter(([,v]) => v).map(([k,v]) => (
                    <div key={k}><span style={{ fontWeight:700, color:'var(--text-secondary)' }}>{k}:</span> {v}</div>
                  ))}
                </div>

                {/* Two columns: Prestarts | Service Sheets */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

                  {/* Prestarts */}
                  <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>✅ Prestart Checklists</div>
                      <button onClick={() => autoGenerate(asset, 'prestart')} disabled={!!genState}
                        style={{ padding:'6px 14px', background: genState==='prestart'?'#a0b0b0':'linear-gradient(135deg,var(--accent),#0090a8)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor: genState?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
                        {genState==='prestart' ? '⏳ Generating…' : '✨ Auto-Generate'}
                      </button>
                    </div>
                    {assignedPS.length === 0 ? (
                      <div style={{ fontSize:12, color:'var(--text-faint)', fontStyle:'italic', padding:'8px 0' }}>No prestart forms assigned</div>
                    ) : assignedPS.map(t => (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--surface-2)', borderRadius:7, marginBottom:6 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'}) : ''}</div>
                        </div>
                        <button onClick={() => unassign(asset, t.id, 'prestart')}
                          style={{ flexShrink:0, padding:'3px 8px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:5, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Service Sheets */}
                  <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>📄 Service Sheet Templates</div>
                      <button onClick={() => autoGenerate(asset, 'ss')} disabled={!!genState}
                        style={{ padding:'6px 14px', background: genState==='ss'?'#a0b0b0':'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor: genState?'not-allowed':'pointer', whiteSpace:'nowrap' }}>
                        {genState==='ss' ? '⏳ Generating…' : '✨ Auto-Generate'}
                      </button>
                    </div>
                    {assignedSS.length === 0 ? (
                      <div style={{ fontSize:12, color:'var(--text-faint)', fontStyle:'italic', padding:'8px 0' }}>No service sheet templates assigned</div>
                    ) : assignedSS.map(t => (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--surface-2)', borderRadius:7, marginBottom:6 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                          {t.service_type && <div style={{ fontSize:10, color:'var(--accent)', fontWeight:600 }}>{t.service_type}</div>}
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'}) : ''}</div>
                        </div>
                        <button onClick={() => unassign(asset, t.id, 'ss')}
                          style={{ flexShrink:0, padding:'3px 8px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:5, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Forms({ userRole, initialTab, prestartAsset, prestartAssetId, prestartAssetNumber, onClearPreload }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'prestarts');
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  const TABS = [
    { id: 'prestarts',     label: 'Prestarts'        },
    { id: 'service-sheets',label: 'Service Sheets'   },
    { id: 'assets',        label: '🚛 Assets'         },
    { id: 'paper_scan',    label: 'Scan Paper Form'  },
  ];

  const tabStyle = (id) => ({
    padding: '8px 18px',
    border: 'none',
    borderBottom: activeTab === id ? '2px solid #2d8cf0' : '2px solid transparent',
    background: 'transparent',
    color: activeTab === id ? '#2d8cf0' : '#6b7a8d',
    fontWeight: activeTab === id ? 700 : 500,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'Barlow, sans-serif',
    transition: 'all 0.13s',
  });

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #dde2ea', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === 'prestarts'     && <PrestartTab userRole={userRole} prestartAsset={prestartAsset} prestartAssetId={prestartAssetId} prestartAssetNumber={prestartAssetNumber} onClearPreload={onClearPreload} />}
      {activeTab === 'service-sheets'&& <ServiceSheetsTab userRole={userRole} />}
      {activeTab === 'assets'        && <AssetFormsTab userRole={userRole} />}
      {activeTab === 'paper_scan'    && <PaperScan userRole={userRole} />}
    </div>
  );
}

export default Forms;
