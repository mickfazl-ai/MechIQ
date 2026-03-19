import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  { id: 'check', label: 'OK/Defect/NA' },
  { id: 'photo', label: 'Photo' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'fluid', label: 'Fluid Qty' },
  { id: 'pressure', label: 'Pressure' },
  { id: 'measurement', label: 'Measurement' },
  { id: 'number', label: 'Number' },
  { id: 'text', label: 'Text' },
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
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', background: 'var(--surface-2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
      <input
        placeholder={'Item ' + (ii + 1)}
        value={item.label || ''}
        onChange={e => onUpdate(si, ii, { ...item, label: e.target.value })}
        style={{ flex: 1, padding: '7px 10px', backgroundColor: '#060c0c', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px' }}
      />
      <select
        value={item.type || 'check'}
        onChange={e => onUpdate(si, ii, { ...item, type: e.target.value })}
        style={{ padding: '7px 8px', backgroundColor: '#060c0c', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
      >
        {INPUT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <button onClick={() => onRemove(si, ii)} style={{ backgroundColor: 'transparent', border: '1px solid #2a1a1a', color: 'var(--red)', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>X</button>
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
function PrestartTab({ userRole }) {
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [view, setView] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const sigCanvas = React.useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [form, setForm] = useState({ asset: '', operator_name: '', site_area: '', hrs_start: '', date: new Date().toISOString().split('T')[0], notes: '', responses: {} });
  const [builder, setBuilder] = useState({ name: '', description: '', sections: [] });
  const isAdmin = userRole && (userRole.role === 'admin' || userRole.role === 'master');

  useEffect(() => {
    if (userRole && userRole.company_id) { fetchTemplates(); fetchSubmissions(); fetchAssets(); }
  }, [userRole]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('form_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setTemplates(data || []); setLoading(false);
  };
  const fetchSubmissions = async () => {
    const { data } = await supabase.from('form_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setSubmissions(data || []);
  };
  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('id, name, location').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const handleAIGenerated = (result) => {
    setAiPreview(result); setShowAI(false);
    setBuilder({ name: result.name || '', description: result.description || '', sections: normaliseItems(result.sections) });
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
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', sections: [] }); setAiPreview(null); }
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
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset</label>
              <select value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }}>
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
          <input placeholder="Description (optional)" value={builder.description} onChange={e => setBuilder({ ...builder, description: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
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
    return (
      <div className="prestart">
        <div className="page-header"><h2>Prestart History</h2><button className="btn-primary" onClick={() => setView('list')}>Back</button></div>
        {submissions.length === 0 ? <p style={{ color: '#a0b0b0' }}>No submissions yet</p> : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Asset</th><th>Operator</th><th>Site</th><th>Defects</th><th>PDF</th>{isAdmin && <th>Delete</th>}</tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td><td>{s.asset}</td><td>{s.operator_name}</td><td>{s.site_area || '-'}</td>
                  <td><span style={{ color: s.defects_found ? '#e94560' : '#00c264' }}>{s.defects_found ? 'Defects' : 'Clear'}</span></td>
                  <td><button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => exportPDF(s)}>PDF</button></td>
                  {isAdmin && <td><button className="btn-delete" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => deleteSubmission(s.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
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
          <button className="btn-primary" onClick={() => setView('history')}>History</button>
          {userRole && userRole.role !== 'technician' && (
            <>
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>Generate with AI</button>
              <button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button>
            </>
          )}
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#a0b0b0', marginBottom: '20px' }}>No prestart templates yet.</p>
          {userRole && userRole.role !== 'technician' && <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000', padding: '12px 24px' }} onClick={() => setShowAI(true)}>Generate with AI</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
          {templates.map(t => (
            <div key={t.id} className="form-card" style={{ cursor: 'pointer' }} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>{t.name}</h3>
              <p style={{ color: '#a0b0b0', fontSize: '13px', marginBottom: '12px' }}>{t.description}</p>
              <p style={{ color: '#a0b0b0', fontSize: '12px' }}>{(t.sections || []).length} sections</p>
              <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>Start Prestart</button>
              {isAdmin && <button className="btn-delete" style={{ marginTop: '8px', width: '100%', padding: '6px' }} onClick={e => deleteTemplate(t.id, e)}>Delete Template</button>}
            </div>
          ))}
          {userRole && userRole.role !== 'technician' && (
            <div className="form-card" style={{ cursor: 'pointer', border: '1px dashed #00c2e040', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }} onClick={() => setShowAI(true)}>
              <p style={{ color: 'var(--accent)', fontSize: '14px', margin: 0 }}>Generate with AI</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SERVICE SHEETS TAB ───────────────────────────────────────────────────────
function ServiceSheetsTab({ userRole }) {
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assets, setAssets] = useState([]);
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
  const [builder, setBuilder] = useState({ name: '', description: '', service_type: '', sections: [], parts_template: [], labour_items: [] });
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
    setTemplates(data || []); setLoading(false);
    // Check if navigated here from Assets or Maintenance with a pre-selected template
    const intent = sessionStorage.getItem('mechiq_open_form');
    if (intent) {
      try {
        const { templateId, assetName, serviceType } = JSON.parse(intent);
        sessionStorage.removeItem('mechiq_open_form');
        const tmpl = (data || []).find(t => t.id === templateId);
        if (tmpl) {
          setSelectedTemplate(tmpl);
          setForm(f => ({
            ...f,
            asset: assetName || f.asset,
            service_type: serviceType || tmpl.service_type || '',
          }));
          setView('fill');
        }
      } catch(e) {}
    }
  };
  const fetchSubmissions = async () => {
    const { data } = await supabase.from('service_sheet_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setSubmissions(data || []);
  };
  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('id, name, location').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const handleAIGenerated = (result) => {
    setAiPreview(result); setShowAI(false);
    setBuilder({ name: result.name || '', description: result.description || '', service_type: result.service_type || '', sections: normaliseItems(result.sections), parts_template: result.parts_template || [], labour_items: result.labour_items || [] });
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
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', service_type: '', sections: [], parts_template: [], labour_items: [] }); setAiPreview(null); }
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
              <label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset</label>
              <select value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} style={iStyle}>
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
          <input placeholder="Service Type (e.g. 250hr Service)" value={builder.service_type} onChange={e => setBuilder({ ...builder, service_type: e.target.value })} style={{ width: '100%', padding: '10px', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px' }} />
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
    return (
      <div className="prestart">
        <div className="page-header"><h2>Service Sheet History</h2><button className="btn-primary" onClick={() => setView('list')}>Back</button></div>
        {submissions.length === 0 ? <p style={{ color: '#a0b0b0' }}>No submissions yet</p> : (
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Asset</th><th>Technician</th><th>Service Type</th><th>Parts</th><th>Labour</th><th>PDF</th>{isAdmin && <th>Delete</th>}</tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td><td>{s.asset}</td><td>{s.technician}</td><td>{s.service_type || '-'}</td>
                  <td style={{ color: '#ff6b00' }}>${parseFloat(s.total_parts_cost || 0).toFixed(2)}</td>
                  <td style={{ color: 'var(--accent)' }}>{parseFloat(s.total_labour_hours || 0).toFixed(1)}h</td>
                  <td><button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => exportServicePDF(s)}>PDF</button></td>
                  {isAdmin && <td><button className="btn-delete" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => deleteSubmission(s.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
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
          <button className="btn-primary" onClick={() => setView('history')}>History</button>
          {userRole && userRole.role !== 'technician' && (
            <>
              <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>Generate with AI</button>
              <button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button>
            </>
          )}
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#a0b0b0', marginBottom: '20px' }}>No service sheet templates yet.</p>
          {userRole && userRole.role !== 'technician' && <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000', padding: '12px 24px' }} onClick={() => setShowAI(true)}>Generate with AI</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
          {templates.map(t => (
            <div key={t.id} className="form-card" style={{ cursor: 'pointer' }} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{t.name}</h3>
              {t.service_type && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>{t.service_type}</p>}
              <p style={{ color: '#a0b0b0', fontSize: '13px', marginBottom: '12px' }}>{t.description}</p>
              <p style={{ color: '#a0b0b0', fontSize: '12px' }}>{(t.sections || []).length} sections</p>
              <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>Start Service Sheet</button>
              {isAdmin && <button className="btn-delete" style={{ marginTop: '8px', width: '100%', padding: '6px' }} onClick={e => deleteTemplate(t.id, e)}>Delete Template</button>}
            </div>
          ))}
          {userRole && userRole.role !== 'technician' && (
            <div className="form-card" style={{ cursor: 'pointer', border: '1px dashed #00c2e040', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }} onClick={() => setShowAI(true)}>
              <p style={{ color: 'var(--accent)', fontSize: '14px', margin: 0 }}>Generate with AI</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Forms({ userRole, initialTab }) {
const [activeTab, setActiveTab] = useState(initialTab || 'prestarts');
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  return (
    <div>
      
      {activeTab === 'prestarts' && <PrestartTab userRole={userRole} />}
      {activeTab === 'service-sheets' && <ServiceSheetsTab userRole={userRole} />}
    </div>
  );
}

export default Forms;
