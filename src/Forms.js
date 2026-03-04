import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const WORKER_URL = 'https://mechiq-ai.mickfazl.workers.dev';

const INPUT_TYPES = [
  { id: 'check', label: '✓ OK/Defect/NA', icon: '✓' },
  { id: 'photo', label: '📷 Photo', icon: '📷' },
  { id: 'temperature', label: '🌡️ Temperature', icon: '🌡️' },
  { id: 'fluid', label: '💧 Fluid Qty', icon: '💧' },
  { id: 'pressure', label: '🔵 Pressure', icon: '🔵' },
  { id: 'measurement', label: '📏 Measurement', icon: '📏' },
  { id: 'number', label: '🔢 Number', icon: '🔢' },
  { id: 'text', label: '📝 Text', icon: '📝' },
];

// Compress image before upload
async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Upload photo to Supabase storage
async function uploadPhoto(file, companyId) {
  const compressed = await compressImage(file);
  const ext = 'jpg';
  const filename = `${companyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from('form-photos').upload(filename, compressed, { contentType: 'image/jpeg' });
  if (error) throw new Error('Photo upload failed: ' + error.message);
  const { data: urlData } = supabase.storage.from('form-photos').getPublicUrl(filename);
  return urlData.publicUrl;
}

// Extract text from PDF
async function extractPDFText(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
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

// ─── ITEM INPUT RENDERER (used when filling out a form) ──────────────────────
function ItemInput({ item, value, onChange, companyId }) {
  const type = item.type || 'check';
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file, companyId);
      onChange({ photo_url: url });
    } catch (err) {
      alert(err.message);
    }
    setUploading(false);
  };

  const inputBase = { backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 10px', borderRadius: '4px' };

  if (type === 'check') return (
    <select value={value?.status || ''} onChange={e => onChange({ status: e.target.value })}
      style={{ ...inputBase, backgroundColor: value?.status === 'OK' ? '#0a2a1a' : value?.status === 'Defect' ? '#2a0a0a' : '#0a0f0f', color: value?.status === 'OK' ? '#00c264' : value?.status === 'Defect' ? '#e94560' : 'white' }}>
      <option value="">Select</option>
      <option value="OK">✓ OK</option>
      <option value="Defect">✗ Defect</option>
      <option value="NA">N/A</option>
    </select>
  );

  if (type === 'photo') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {value?.photo_url ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={value.photo_url} alt="uploaded" style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #1a2f2f' }} />
          <button onClick={() => onChange({})} style={{ ...inputBase, padding: '3px 8px', color: '#e94560', cursor: 'pointer' }}>✕</button>
        </div>
      ) : (
        <label style={{ backgroundColor: '#0a2a2a', border: '1px solid #00c2e040', color: '#00c2e0', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
          {uploading ? 'Uploading...' : <span style={{fontSize:"16px"}}>: '📷 #128247;</span>Take/Upload Photo'}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );

  if (type === 'temperature') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0" value={value?.temp || ''} onChange={e => onChange({ temp: e.target.value, unit: value?.unit || '°C' })}
        style={{ ...inputBase, width: '80px' }} />
      <select value={value?.unit || '°C'} onChange={e => onChange({ temp: value?.temp || '', unit: e.target.value })}
        style={{ ...inputBase }}>
        <option value="°C">°C</option>
        <option value="°F">°F</option>
      </select>
      {value?.temp && <span style={{ color: parseFloat(value.temp) > 100 ? '#e94560' : '#00c264', fontSize: '12px', fontWeight: 700 }}>{value.temp}{value.unit || '°C'}</span>}
    </div>
  );

  if (type === 'fluid') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0.0" step="0.1" value={value?.qty || ''} onChange={e => onChange({ qty: e.target.value, unit: value?.unit || 'L' })}
        style={{ ...inputBase, width: '80px' }} />
      <select value={value?.unit || 'L'} onChange={e => onChange({ qty: value?.qty || '', unit: e.target.value })}
        style={{ ...inputBase }}>
        <option value="L">L</option>
        <option value="mL">mL</option>
        <option value="gal">gal</option>
        <option value="qt">qt</option>
      </select>
      {value?.qty && <span style={{ color: '#00c2e0', fontSize: '12px', fontWeight: 700 }}>{value.qty} {value.unit || 'L'}</span>}
    </div>
  );

  if (type === 'pressure') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0" step="0.1" value={value?.pressure || ''} onChange={e => onChange({ pressure: e.target.value, unit: value?.unit || 'bar' })}
        style={{ ...inputBase, width: '80px' }} />
      <select value={value?.unit || 'bar'} onChange={e => onChange({ pressure: value?.pressure || '', unit: e.target.value })}
        style={{ ...inputBase }}>
        <option value="bar">bar</option>
        <option value="psi">psi</option>
        <option value="kPa">kPa</option>
        <option value="MPa">MPa</option>
      </select>
      {value?.pressure && <span style={{ color: '#00c2e0', fontSize: '12px', fontWeight: 700 }}>{value.pressure} {value.unit || 'bar'}</span>}
    </div>
  );

  if (type === 'measurement') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0.0" step="0.1" value={value?.measurement || ''} onChange={e => onChange({ measurement: e.target.value, unit: value?.unit || 'mm' })}
        style={{ ...inputBase, width: '80px' }} />
      <select value={value?.unit || 'mm'} onChange={e => onChange({ measurement: value?.measurement || '', unit: e.target.value })}
        style={{ ...inputBase }}>
        <option value="mm">mm</option>
        <option value="cm">cm</option>
        <option value="m">m</option>
        <option value="in">in</option>
      </select>
      {value?.measurement && <span style={{ color: '#00c2e0', fontSize: '12px', fontWeight: 700 }}>{value.measurement} {value.unit || 'mm'}</span>}
    </div>
  );

  if (type === 'number') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="number" placeholder="0" value={value?.num || ''} onChange={e => onChange({ num: e.target.value, unit: value?.unit || '' })}
        style={{ ...inputBase, width: '100px' }} />
      <input type="text" placeholder="unit (optional)" value={value?.unit || ''} onChange={e => onChange({ num: value?.num || '', unit: e.target.value })}
        style={{ ...inputBase, width: '90px', fontSize: '12px' }} />
    </div>
  );

  if (type === 'text') return (
    <input type="text" placeholder="Enter value..." value={value?.text || ''} onChange={e => onChange({ text: e.target.value })}
      style={{ ...inputBase, width: '200px' }} />
  );

  return null;
}

// ─── ITEM VALUE DISPLAY (for history/PDF) ────────────────────────────────────
function formatItemValue(type, value) {
  if (!value) return '-';
  if (type === 'check') return value.status || '-';
  if (type === 'photo') return value.photo_url ? 'Photo taken' : '-';
  if (type === 'temperature') return value.temp ? `${value.temp}${value.unit || '°C'}` : '-';
  if (type === 'fluid') return value.qty ? `${value.qty} ${value.unit || 'L'}` : '-';
  if (type === 'pressure') return value.pressure ? `${value.pressure} ${value.unit || 'bar'}` : '-';
  if (type === 'measurement') return value.measurement ? `${value.measurement} ${value.unit || 'mm'}` : '-';
  if (type === 'number') return value.num ? `${value.num}${value.unit ? ' ' + value.unit : ''}` : '-';
  if (type === 'text') return value.text || '-';
  return '-';
}

// ─── AI GENERATOR MODAL ───────────────────────────────────────────────────────
function AIGeneratorModal({ mode, onClose, onGenerated }) {
  const [inputType, setInputType] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');

  const modeLabel = mode === 'prestart' ? 'Prestart Checklist' : 'Service Sheet';

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const buildPrompt = () => {
    const typeInfo = `Each item should have a "type" field: "check" (OK/Defect/NA), "photo" (photo upload), "temperature" (temp reading), "fluid" (fluid qty), "pressure" (pressure reading in bar/psi/kPa), "measurement" (dimension in mm/cm/m), "number" (numeric input), or "text" (free text). Choose the most appropriate type for each item.`;
    if (mode === 'prestart') {
      return `You are a heavy equipment maintenance expert. Generate a prestart checklist template.
Return ONLY valid JSON, no markdown:
{
  "name": "Template name",
  "description": "Brief description",
  "sections": [
    {
      "title": "Section Name",
      "items": [
        { "label": "Item name", "type": "check" }
      ]
    }
  ]
}
${typeInfo}`;
    } else {
      return `You are a heavy equipment service expert. Generate a service sheet template.
Return ONLY valid JSON, no markdown:
{
  "name": "Template name",
  "description": "Brief description",
  "service_type": "e.g. 250hr Service",
  "sections": [
    {
      "title": "Section Name",
      "items": [
        { "label": "Item name", "type": "check" }
      ]
    }
  ],
  "parts_template": ["Part 1"],
  "labour_items": ["Task 1"]
}
${typeInfo}`;
    }
  };

  const handleGenerate = async () => {
    if (inputType === 'text' && !textInput.trim()) { setError('Please describe the machine or service'); return; }
    if (inputType !== 'text' && !file) { setError('Please select a file'); return; }
    setLoading(true); setError('');
    try {
      let messages;
      if (inputType === 'text' || inputType === 'excel') {
        messages = [{ role: 'user', content: buildPrompt() + '\n\nInput: ' + (textInput || file?.name) }];
      } else if (inputType === 'pdf') {
        setLoadingMsg('Extracting text from PDF...');
        const pdfText = await extractPDFText(file);
        if (!pdfText.trim()) throw new Error('Could not extract text. Try Text option instead.');
        setLoadingMsg('Generating with AI...');
        messages = [{ role: 'user', content: buildPrompt() + '\n\nDocument:\n' + pdfText }];
      } else if (inputType === 'image') {
        setLoadingMsg('Processing image...');
        const base64 = await toBase64(file);
        messages = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }, { type: 'text', text: buildPrompt() }] }];
      }
      setLoadingMsg('Generating with AI...');
      const response = await fetch(WORKER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages }) });
      if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error || 'Status ' + response.status); }
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      if (!data.content?.length) throw new Error('No content from AI');
      const text = data.content.map(i => i.text || '').join('');
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      onGenerated(JSON.parse(clean));
    } catch (err) { setError('Error: ' + err.message); }
    setLoading(false); setLoadingMsg('');
  };

  const inputStyle = { width: '100%', padding: '10px 14px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '6px', fontSize: '14px', fontFamily: 'Barlow, sans-serif', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ background: '#0d1515', border: '1px solid #1a3a3a', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ color: '#00c2e0', margin: 0 }}>✨ AI {modeLabel} Generator</h3>
            <p style={{ color: '#a0b0b0', fontSize: '12px', margin: '4px 0 0' }}>Upload a file or describe your machine</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[{ id: 'text', label: '✏️', sub: 'Text' }, { id: 'pdf', label: '📄', sub: 'PDF' }, { id: 'image', label: '🖼️', sub: 'JPG/PNG' }, { id: 'excel', label: '📊', sub: 'Excel/CSV' }].map(t => (
            <button key={t.id} onClick={() => { setInputType(t.id); setFile(null); setError(''); }}
              style={{ padding: '10px 6px', backgroundColor: inputType === t.id ? '#0a2a2a' : '#0a0f0f', border: `1px solid ${inputType === t.id ? '#00c2e0' : '#1a2f2f'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '18px' }}>{t.label}</div>
              <div style={{ color: inputType === t.id ? '#00c2e0' : '#a0b0b0', fontSize: '11px', marginTop: '2px' }}>{t.sub}</div>
            </button>
          ))}
        </div>
        {inputType === 'text' && <div style={{ marginBottom: '16px' }}><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Describe the machine or service</label><textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder={mode === 'prestart' ? 'e.g. CAT 320 excavator daily prestart...' : 'e.g. 250hr service Komatsu PC200...'} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} /></div>}
        {inputType === 'pdf' && <div style={{ marginBottom: '16px' }}><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Upload PDF manual or service document</label><input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} style={{ ...inputStyle, padding: '8px' }} />{file && <p style={{ color: '#00c264', fontSize: '12px', marginTop: '6px' }}>✓ {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</p>}<p style={{ color: '#a0b0b0', fontSize: '11px', marginTop: '6px' }}>Text extracted — any size supported</p></div>}
        {inputType === 'image' && <div style={{ marginBottom: '16px' }}><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Upload image of existing form</label><input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ ...inputStyle, padding: '8px' }} />{file && <p style={{ color: '#00c264', fontSize: '12px', marginTop: '6px' }}>✓ {file.name}</p>}</div>}
        {inputType === 'excel' && <div style={{ marginBottom: '16px' }}><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Upload spreadsheet + describe machine</label><input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files[0])} style={{ ...inputStyle, padding: '8px', marginBottom: '8px' }} />{file && <p style={{ color: '#00c264', fontSize: '12px', marginBottom: '8px' }}>✓ {file.name}</p>}<textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Describe the machine..." style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} /></div>}
        {error && <p style={{ color: '#e94560', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a2f2f', color: '#a0b0b0', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleGenerate} disabled={loading} style={{ flex: 2, padding: '12px', background: loading ? '#1a2f2f' : 'linear-gradient(135deg, #00c2e0, #0090a8)', border: 'none', color: loading ? '#a0b0b0' : '#000', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px' }}>
            {loading ? (loadingMsg || '✨ Generating...') : '✨ Generate with AI'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FORM BUILDER ITEM ROW ────────────────────────────────────────────────────
function BuilderItem({ item, si, ii, onUpdate, onRemove }) {
  const type = item.type || 'check';
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', backgroundColor: '#0a0f0f', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1a2f2f' }}>
      <span style={{ fontSize: '16px', minWidth: '20px' }}>{INPUT_TYPES.find(t => t.id === type)?.icon || '✓'}</span>
      <input placeholder={`Item ${ii + 1}`} value={item.label || ''} onChange={e => onUpdate(si, ii, { ...item, label: e.target.value })}
        style={{ flex: 1, padding: '7px 10px', backgroundColor: '#060c0c', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px', fontSize: '13px' }} />
      <select value={type} onChange={e => onUpdate(si, ii, { ...item, type: e.target.value })}
        style={{ padding: '7px 8px', backgroundColor: '#060c0c', color: '#00c2e0', border: '1px solid #1a2f2f', borderRadius: '4px', fontSize: '12px' }}>
        {INPUT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <button onClick={() => onRemove(si, ii)} style={{ backgroundColor: 'transparent', border: '1px solid #2a1a1a', color: '#e94560', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
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

  useEffect(() => { if (userRole?.company_id) { fetchTemplates(); fetchSubmissions(); fetchAssets(); } }, [userRole]);
  const fetchTemplates = async () => { const { data } = await supabase.from('form_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setTemplates(data || []); setLoading(false); };
  const fetchSubmissions = async () => { const { data } = await supabase.from('form_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setSubmissions(data || []); };
  const fetchAssets = async () => { const { data } = await supabase.from('assets').select('id, name, location').eq('company_id', userRole.company_id); setAssets(data || []); };

  const handleAIGenerated = (result) => {
    setAiPreview(result); setShowAI(false);
    setBuilder({ name: result.name || '', description: result.description || '', sections: (result.sections || []).map(s => ({ ...s, items: s.items.map(item => typeof item === 'string' ? { label: item, type: 'check' } : item) })) });
    setView('builder');
  };

  const handleResponse = (key, value) => setForm(prev => ({ ...prev, responses: { ...prev.responses, [key]: value } }));

  const startSigning = () => {
    setIsSigning(true);
    setTimeout(() => {
      const canvas = sigCanvas.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); ctx.strokeStyle = '#00c2e0'; ctx.lineWidth = 2;
      let drawing = false;
      canvas.onmousedown = (e) => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
      canvas.onmousemove = (e) => { if (drawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
      canvas.onmouseup = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
      canvas.ontouchstart = (e) => { drawing = true; const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(t.clientX - r.left, t.clientY - r.top); e.preventDefault(); };
      canvas.ontouchmove = (e) => { if (drawing) { const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.lineTo(t.clientX - r.left, t.clientY - r.top); ctx.stroke(); } e.preventDefault(); };
      canvas.ontouchend = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
    }, 100);
  };

  const handleSubmit = async () => {
    if (!form.asset || !form.operator_name) { alert('Please select an asset and enter operator name'); return; }
    const defects_found = Object.entries(form.responses).some(([k, v]) => v?.status === 'Defect');
    const { data: submission, error } = await supabase.from('form_submissions').insert([{ company_id: userRole.company_id, template_id: selectedTemplate.id, asset: form.asset, operator_name: form.operator_name, site_area: form.site_area, hrs_start: form.hrs_start, date: form.date, notes: form.notes, responses: form.responses, operator_signature: signatureData, defects_found }]).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    if (defects_found && submission) {
      const defectItems = [];
      selectedTemplate.sections.forEach((section, si) => { section.items.forEach(item => { const key = `${si}_${item.label || item}`; const resp = form.responses[key]; if (resp?.status === 'Defect') defectItems.push(item.label || item); }); });
      if (defectItems.length > 0) await supabase.from('work_orders').insert([{ company_id: userRole.company_id, asset: form.asset, defect_description: defectItems.join('\n'), priority: 'High', status: 'Open', source: 'prestart', prestart_id: submission.id, comments: `Auto-generated from prestart by ${form.operator_name} on ${form.date}` }]);
    }
    fetchSubmissions(); setView('list');
    setForm({ asset: '', operator_name: '', site_area: '', hrs_start: '', date: new Date().toISOString().split('T')[0], notes: '', responses: {} }); setSignatureData('');
    if (defects_found) alert('Prestart submitted. ⚠️ Defects found — Work Order created!'); else alert('Prestart submitted! ✓');
  };

  const exportPDF = (submission) => {
    const doc = new jsPDF(); doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text('MECH IQ — PRESTART CHECKLIST', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Asset: ${submission.asset}   Operator: ${submission.operator_name}   Date: ${submission.date}`, 14, 30);
    doc.text(`Site: ${submission.site_area || '-'}   Hrs: ${submission.hrs_start || '-'}`, 14, 36);
    const template = templates.find(t => t.id === submission.template_id);
    let y = 45;
    if (template) {
      template.sections.forEach((section, si) => {
        doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(section.title.toUpperCase(), 14, y); y += 6;
        const rows = section.items.map(item => { const label = item.label || item; const key = `${si}_${label}`; const v = submission.responses?.[key]; return [label, INPUT_TYPES.find(t => t.id === (item.type || 'check'))?.icon || '', formatItemValue(item.type || 'check', v)]; });
        autoTable(doc, { startY: y, head: [['Item', 'Type', 'Value']], body: rows, theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
        y = doc.lastAutoTable.finalY + 8;
      });
    }
    if (submission.notes) { doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text('Notes: ' + submission.notes, 14, y); }
    doc.save(`MechIQ-Prestart-${submission.asset}-${submission.date}.pdf`);
  };

  const isAdmin = userRole?.role === 'admin' || userRole?.role === 'master';

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

  const saveTemplate = async () => {
    if (!builder.name || builder.sections.length === 0) { alert('Please add a name and at least one section'); return; }
    const { error } = await supabase.from('form_templates').insert([{ ...builder, company_id: userRole.company_id }]);
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', sections: [] }); setAiPreview(null); }
  };

  const updateItem = (si, ii, newItem) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.map((item, j) => j === ii ? newItem : item) } : sec); return { ...prev, sections: s }; });
  const removeItem = (si, ii) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.filter((_, j) => j !== ii) } : sec); return { ...prev, sections: s }; });
  const addItem = (si) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, items: [...sec.items, { label: '', type: 'check' }] } : sec); return { ...prev, sections: s }; });
  const updateSectionTitle = (si, val) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, title: val } : sec); return { ...prev, sections: s }; });
  const removeSection = (si) => setBuilder(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== si) }));

  if (loading) return <p style={{ color: '#a0b0b0', padding: '20px' }}>Loading...</p>;

  if (view === 'fill' && selectedTemplate) return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="prestart" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header"><h2>{selectedTemplate.name}</h2><button className="btn-primary" onClick={() => setView('list')}>← Back</button></div>
      <div className="form-card">
        <h3 style={{ color: '#00c2e0', marginBottom: '15px' }}>Prestart Details</h3>
        <div className="form-grid">
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset</label><select value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }}><option value="">Select Asset</option>{assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Operator Name</label><input placeholder="Operator Name" value={form.operator_name} onChange={e => setForm({ ...form, operator_name: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} /></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Site / Location</label><input placeholder="Site Area" value={form.site_area} onChange={e => setForm({ ...form, site_area: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} /></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Hours Start</label><input type="number" placeholder="Hours" value={form.hrs_start} onChange={e => setForm({ ...form, hrs_start: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} /></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} /></div>
        </div>
      </div>
      {selectedTemplate.sections.map((section, si) => (
        <div key={si} className="form-card" style={{ marginTop: '15px' }}>
          <h3 style={{ color: '#00c2e0', marginBottom: '15px' }}>{section.title}</h3>
          <table className="data-table"><thead><tr><th>Item</th><th>Type</th><th>Value</th><th>Comment</th><th>Photo</th></tr></thead>
            <tbody>{section.items.map((item, ii) => {
              const label = item.label || item; const type = item.type || 'check'; const key = `${si}_${label}`;
              return (<tr key={ii}><td>{label}</td><td style={{ color: '#a0b0b0', fontSize: '12px' }}>{INPUT_TYPES.find(t => t.id === type)?.icon} {type}</td><td><ItemInput item={item} value={form.responses[key] || {}} onChange={val => handleResponse(key, { ...form.responses[key], ...val })} companyId={userRole.company_id} /></td><td><input placeholder="Comment..." value={form.responses[key]?.comment || ''} onChange={e => handleResponse(key, { ...form.responses[key], comment: e.target.value })} style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '140px', fontSize: '12px' }} /></td><td><label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.responses[key]?.photo_url ? <img src={form.responses[key].photo_url} alt="" style={{ width: '36px', height: '28px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #00c2e0' }} /> : (<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c2e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>)}<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { const file = e.target.files[0]; if (!file) return; try { const url = await uploadPhoto(file, userRole.company_id); handleResponse(key, { ...form.responses[key], photo_url: url }); } catch(err) { alert(err.message); } }} /></label></td></tr>);
            })}</tbody>
          </table>
        {!isSigning ? <button className="btn-primary" onClick={startSigning}>Sign Here</button> : (
          <div><canvas ref={sigCanvas} width={400} height={100} style={{ border: '1px solid #1a2f2f', borderRadius: '4px', backgroundColor: '#0a0f0f', cursor: 'crosshair', display: 'block' }} /><button onClick={() => { sigCanvas.current?.getContext('2d').clearRect(0, 0, 400, 100); setSignatureData(''); }} style={{ marginTop: '8px', backgroundColor: 'transparent', color: '#a0b0b0', border: '1px solid #1a2f2f', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button></div>
        )}
      </div>
      <button className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '15px', fontSize: '16px' }} onClick={handleSubmit}>Submit Prestart</button>
    </div>
  );

  if (view === 'builder') return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="prestart" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header">
        <h2>{aiPreview ? '✨ AI Generated — Review & Edit' : 'Form Builder'}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>✨ AI Generate</button>
          <button className="btn-primary" onClick={() => { setView('list'); setAiPreview(null); }}>← Back</button>
        </div>
      </div>
      {aiPreview && <div style={{ backgroundColor: '#0a2a1a', border: '1px solid #00c264', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}><p style={{ color: '#00c264', margin: 0, fontSize: '13px' }}>✨ AI generated — review and edit before saving.</p></div>}
      <div style={{ backgroundColor: '#0a1a2a', border: '1px solid #1a3a4a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <p style={{ color: '#00c2e0', margin: 0, fontSize: '12px' }}>💡 Input types: <strong>✓ Check</strong> · <strong>📷 Photo</strong> · <strong>🌡️ Temperature</strong> · <strong>💧 Fluid</strong> · <strong>🔵 Pressure</strong> · <strong>📏 Measurement</strong> · <strong>🔢 Number</strong> · <strong>📝 Text</strong></p>
      </div>
      <div className="form-card">
        <input placeholder="Form Name" value={builder.name} onChange={e => setBuilder({ ...builder, name: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
        <input placeholder="Description (optional)" value={builder.description} onChange={e => setBuilder({ ...builder, description: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
      </div>
      {builder.sections.map((section, si) => (
        <div key={si} className="form-card" style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <input placeholder="Section Title" value={section.title} onChange={e => updateSectionTitle(si, e.target.value)} style={{ flex: 1, marginRight: '10px', padding: '8px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
            <button onClick={() => removeSection(si)} className="btn-delete">Remove Section</button>
          </div>
          {section.items.map((item, ii) => <BuilderItem key={ii} item={item} si={si} ii={ii} onUpdate={updateItem} onRemove={removeItem} />)}
          <button onClick={() => addItem(si)} style={{ backgroundColor: 'transparent', color: '#00c2e0', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px', width: '100%' }}>+ Add Item</button>
        </div>
      ))}
      <button onClick={() => setBuilder(prev => ({ ...prev, sections: [...prev.sections, { title: '', items: [] }] }))} style={{ marginTop: '15px', backgroundColor: 'transparent', color: '#00c2e0', border: '1px dashed #00c2e0', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>+ Add Section</button>
      <button className="btn-primary" style={{ marginTop: '15px', width: '100%', padding: '14px' }} onClick={saveTemplate}>Save Template</button>
    </div>
  );

  if (view === 'history') return (
    <div className="prestart">
      <div className="page-header"><h2>Prestart History</h2><button className="btn-primary" onClick={() => setView('list')}>← Back</button></div>
      {submissions.length === 0 ? <p style={{ color: '#a0b0b0' }}>No submissions yet</p> : (
        <table className="data-table">
          <thead><tr><th>Date</th><th>Asset</th><th>Operator</th><th>Site</th><th>Defects</th><th>PDF</th></tr></thead>
          <tbody>{submissions.map(s => (<tr key={s.id}><td>{s.date}</td><td>{s.asset}</td><td>{s.operator_name}</td><td>{s.site_area || '-'}</td><td><span style={{ color: s.defects_found ? '#e94560' : '#00c264' }}>{s.defects_found ? '⚠ Defects' : '✓ Clear'}</span></td><td><button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => exportPDF(s)}>PDF</button></td>{isAdmin && <td><button className="btn-delete" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => deleteSubmission(s.id)}>Delete</button></td>}</tr>))}</tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="prestart" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header">
        <h2>Prestart Checklists</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => setView('history')}>History</button>
          {userRole?.role !== 'technician' && (<><button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>✨ Generate with AI</button><button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button></>)}
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ color: '#a0b0b0', marginBottom: '20px' }}>No prestart templates yet.</p>
          {userRole?.role !== 'technician' && <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000', padding: '12px 24px' }} onClick={() => setShowAI(true)}>✨ Generate with AI</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
          {templates.map(t => (
            <div key={t.id} className="form-card" style={{ cursor: 'pointer' }} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
              <h3 style={{ color: '#00c2e0', marginBottom: '8px' }}>{t.name}</h3>
              <p style={{ color: '#a0b0b0', fontSize: '13px', marginBottom: '12px' }}>{t.description}</p>
              <p style={{ color: '#a0b0b0', fontSize: '12px' }}>{t.sections?.length || 0} sections · {t.sections?.reduce((sum, s) => sum + s.items.length, 0) || 0} items</p>
              <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>Start Prestart →</button>
              {isAdmin && <button className="btn-delete" style={{ marginTop: '8px', width: '100%', padding: '6px' }} onClick={(e) => deleteTemplate(t.id, e)}>🗑 Delete Template</button>}
            </div>
          ))}
          {userRole?.role !== 'technician' && (
            <div className="form-card" style={{ cursor: 'pointer', border: '1px dashed #00c2e040', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px', gap: '10px' }} onClick={() => setShowAI(true)}>
              <p style={{ color: '#00c2e0', fontSize: '24px', margin: 0 }}>✨</p>
              <p style={{ color: '#00c2e0', fontSize: '14px', margin: 0 }}>Generate with AI</p>
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
  const [view, setView] = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const sigCanvas = React.useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [builder, setBuilder] = useState({ name: '', description: '', service_type: '', sections: [], parts_template: [], labour_items: [] });
  const [form, setForm] = useState({ asset: '', technician: '', date: new Date().toISOString().split('T')[0], odometer: '', service_type: '', notes: '', responses: {}, parts: [{ name: '', qty: '', cost: '' }], labour: [{ description: '', hours: '' }] });

  useEffect(() => { if (userRole?.company_id) { fetchTemplates(); fetchSubmissions(); fetchAssets(); } }, [userRole]);
  const fetchTemplates = async () => { const { data } = await supabase.from('service_sheet_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setTemplates(data || []); setLoading(false); };
  const fetchSubmissions = async () => { const { data } = await supabase.from('service_sheet_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setSubmissions(data || []); };
  const fetchAssets = async () => { const { data } = await supabase.from('assets').select('id, name, location').eq('company_id', userRole.company_id); setAssets(data || []); };

  const handleAIGenerated = (result) => {
    setAiPreview(result); setShowAI(false);
    setBuilder({ name: result.name || '', description: result.description || '', service_type: result.service_type || '', sections: (result.sections || []).map(s => ({ ...s, items: s.items.map(item => typeof item === 'string' ? { label: item, type: 'check' } : item) })), parts_template: result.parts_template || [], labour_items: result.labour_items || [] });
    setView('builder');
  };

  const handleResponse = (key, value) => setForm(prev => ({ ...prev, responses: { ...prev.responses, [key]: value } }));

  const startSigning = () => {
    setIsSigning(true);
    setTimeout(() => {
      const canvas = sigCanvas.current; if (!canvas) return;
      const ctx = canvas.getContext('2d'); ctx.strokeStyle = '#00c2e0'; ctx.lineWidth = 2;
      let drawing = false;
      canvas.onmousedown = (e) => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
      canvas.onmousemove = (e) => { if (drawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
      canvas.onmouseup = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
      canvas.ontouchstart = (e) => { drawing = true; const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(t.clientX - r.left, t.clientY - r.top); e.preventDefault(); };
      canvas.ontouchmove = (e) => { if (drawing) { const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.lineTo(t.clientX - r.left, t.clientY - r.top); ctx.stroke(); } e.preventDefault(); };
      canvas.ontouchend = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
    }, 100);
  };

  const totalPartsValue = form.parts.reduce((sum, p) => sum + (parseFloat(p.qty || 0) * parseFloat(p.cost || 0)), 0);
  const totalLabourHours = form.labour.reduce((sum, l) => sum + parseFloat(l.hours || 0), 0);

  const handleSubmit = async () => {
    if (!form.asset || !form.technician) { alert('Please select an asset and enter technician name'); return; }
    const { error } = await supabase.from('service_sheet_submissions').insert([{ company_id: userRole.company_id, template_id: selectedTemplate.id, asset: form.asset, technician: form.technician, date: form.date, odometer: form.odometer, service_type: form.service_type || selectedTemplate.service_type, notes: form.notes, responses: form.responses, parts: form.parts, labour: form.labour, operator_signature: signatureData, total_parts_cost: totalPartsValue, total_labour_hours: totalLabourHours }]);
    if (error) { alert('Error: ' + error.message); return; }
    fetchSubmissions(); setView('list');
    setForm({ asset: '', technician: '', date: new Date().toISOString().split('T')[0], odometer: '', service_type: '', notes: '', responses: {}, parts: [{ name: '', qty: '', cost: '' }], labour: [{ description: '', hours: '' }] }); setSignatureData('');
    alert('Service sheet submitted! ✓');
  };

  const exportServicePDF = (submission) => {
    const doc = new jsPDF(); doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text('MECH IQ — SERVICE SHEET', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Asset: ${submission.asset}   Technician: ${submission.technician}   Date: ${submission.date}`, 14, 30);
    doc.text(`Service Type: ${submission.service_type || '-'}   Odometer/Hrs: ${submission.odometer || '-'}`, 14, 36);
    const template = templates.find(t => t.id === submission.template_id);
    let y = 45;
    if (template?.sections) {
      template.sections.forEach((section, si) => {
        doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(section.title.toUpperCase(), 14, y); y += 6;
        const rows = section.items.map(item => { const label = item.label || item; const key = `${si}_${label}`; const v = submission.responses?.[key]; return [label, formatItemValue(item.type || 'check', v)]; });
        autoTable(doc, { startY: y, head: [['Item', 'Value']], body: rows, theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
        y = doc.lastAutoTable.finalY + 8;
      });
    }
    if (submission.parts?.filter(p => p.name).length > 0) {
      doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('PARTS USED', 14, y); y += 6;
      autoTable(doc, { startY: y, head: [['Part', 'Qty', 'Unit Cost', 'Total']], body: submission.parts.filter(p => p.name).map(p => [p.name, p.qty, '$' + p.cost, '$' + (parseFloat(p.qty || 0) * parseFloat(p.cost || 0)).toFixed(2)]), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
      y = doc.lastAutoTable.finalY + 8;
    }
    if (submission.labour?.filter(l => l.description).length > 0) {
      doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('LABOUR', 14, y); y += 6;
      autoTable(doc, { startY: y, head: [['Task', 'Hours']], body: submission.labour.filter(l => l.description).map(l => [l.description, l.hours + 'h']), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
    }
    doc.setTextColor(160, 176, 176); doc.setFontSize(8); doc.text('Generated by Mech IQ - mechiq.coastlinemm.com.au', 14, 285);
    doc.save(`MechIQ-ServiceSheet-${submission.asset}-${submission.date}.pdf`);
  };

  const isAdmin = userRole?.role === 'admin' || userRole?.role === 'master';

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

  const saveTemplate = async () => {
    if (!builder.name) { alert('Please add a template name'); return; }
    const { error } = await supabase.from('service_sheet_templates').insert([{ ...builder, company_id: userRole.company_id }]);
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', service_type: '', sections: [], parts_template: [], labour_items: [] }); setAiPreview(null); }
    else alert('Error: ' + error.message);
  };

  const updateItem = (si, ii, newItem) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.map((item, j) => j === ii ? newItem : item) } : sec); return { ...prev, sections: s }; });
  const removeItem = (si, ii) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, items: sec.items.filter((_, j) => j !== ii) } : sec); return { ...prev, sections: s }; });
  const addItem = (si) => setBuilder(prev => { const s = prev.sections.map((sec, i) => i === si ? { ...sec, items: [...sec.items, { label: '', type: 'check' }] } : sec); return { ...prev, sections: s }; });

  const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px', fontFamily: 'Barlow, sans-serif', fontSize: '14px', boxSizing: 'border-box' };

  if (loading) return <p style={{ color: '#a0b0b0', padding: '20px' }}>Loading...</p>;

  if (view === 'fill' && selectedTemplate) return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="service" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header"><h2>{selectedTemplate.name}</h2><button className="btn-primary" onClick={() => setView('list')}>← Back</button></div>
      <div className="form-card">
        <h3 style={{ color: '#00c2e0', marginBottom: '15px' }}>Service Details</h3>
        <div className="form-grid">
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Asset</label><select value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} style={inputStyle}><option value="">Select Asset</option>{assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Technician</label><input placeholder="Technician name" value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Odometer / Hours</label><input placeholder="e.g. 2450 hrs" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })} style={inputStyle} /></div>
          <div><label style={{ color: '#a0b0b0', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Service Type</label><input placeholder={selectedTemplate.service_type || 'e.g. 250hr Service'} value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} style={inputStyle} /></div>
        </div>
      </div>
      {selectedTemplate.sections?.map((section, si) => (
        <div key={si} className="form-card" style={{ marginTop: '15px' }}>
          <h3 style={{ color: '#00c2e0', marginBottom: '15px' }}>{section.title}</h3>
          <table className="data-table"><thead><tr><th>Item</th><th>Type</th><th>Value</th><th>Comment</th><th>Photo</th></tr></thead>
            <tbody>{section.items.map((item, ii) => {
              const label = item.label || item; const type = item.type || 'check'; const key = `${si}_${label}`;
              return (<tr key={ii}><td>{label}</td><td style={{ color: '#a0b0b0', fontSize: '12px' }}>{INPUT_TYPES.find(t => t.id === type)?.icon} {type}</td><td><ItemInput item={item} value={form.responses[key] || {}} onChange={val => handleResponse(key, { ...form.responses[key], ...val })} companyId={userRole.company_id} /></td><td><input placeholder="Comment..." value={form.responses[key]?.comment || ''} onChange={e => handleResponse(key, { ...form.responses[key], comment: e.target.value })} style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '140px', fontSize: '12px' }} /></td><td><label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.responses[key]?.photo_url ? <img src={form.responses[key].photo_url} alt="" style={{ width: '36px', height: '28px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #00c2e0' }} /> : (<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00c2e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>)}<input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { const file = e.target.files[0]; if (!file) return; try { const url = await uploadPhoto(file, userRole.company_id); handleResponse(key, { ...form.responses[key], photo_url: url }); } catch(err) { alert(err.message); } }} /></label></td></tr>);
            })}</tbody>
          </table>
        </div>
      ))}
      <div className="form-card" style={{ marginTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: '#00c2e0', margin: 0 }}>Parts Used</h3>
          <span style={{ color: '#ff6b00', fontWeight: 700 }}>Total: ${totalPartsValue.toFixed(2)}</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Part Name</th><th>Qty</th><th>Unit Cost ($)</th><th>Total</th><th></th></tr></thead>
          <tbody>{form.parts.map((part, i) => (<tr key={i}><td><input value={part.name} onChange={e => { const p = [...form.parts]; p[i].name = e.target.value; setForm({ ...form, parts: p }); }} placeholder="Part name" style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '100%' }} /></td><td><input type="number" value={part.qty} onChange={e => { const p = [...form.parts]; p[i].qty = e.target.value; setForm({ ...form, parts: p }); }} placeholder="1" style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '60px' }} /></td><td><input type="number" value={part.cost} onChange={e => { const p = [...form.parts]; p[i].cost = e.target.value; setForm({ ...form, parts: p }); }} placeholder="0.00" style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '80px' }} /></td><td style={{ color: '#ff6b00', fontWeight: 700 }}>${(parseFloat(part.qty || 0) * parseFloat(part.cost || 0)).toFixed(2)}</td><td><button onClick={() => { const p = form.parts.filter((_, idx) => idx !== i); setForm({ ...form, parts: p }); }} className="btn-delete">✕</button></td></tr>))}</tbody>
        </table>
        <button onClick={() => setForm({ ...form, parts: [...form.parts, { name: '', qty: '', cost: '' }] })} style={{ marginTop: '10px', backgroundColor: 'transparent', color: '#00c2e0', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>+ Add Part</button>
      </div>
      <div className="form-card" style={{ marginTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ color: '#00c2e0', margin: 0 }}>Labour</h3>
          <span style={{ color: '#00c2e0', fontWeight: 700 }}>{totalLabourHours.toFixed(1)} hrs total</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Task Description</th><th>Hours</th><th></th></tr></thead>
          <tbody>{form.labour.map((l, i) => (<tr key={i}><td><input value={l.description} onChange={e => { const lb = [...form.labour]; lb[i].description = e.target.value; setForm({ ...form, labour: lb }); }} placeholder="e.g. Oil and filter change" style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '100%' }} /></td><td><input type="number" value={l.hours} onChange={e => { const lb = [...form.labour]; lb[i].hours = e.target.value; setForm({ ...form, labour: lb }); }} placeholder="0.5" style={{ backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', padding: '5px 8px', borderRadius: '4px', width: '70px' }} /></td><td><button onClick={() => { const lb = form.labour.filter((_, idx) => idx !== i); setForm({ ...form, labour: lb }); }} className="btn-delete">✕</button></td></tr>))}</tbody>
        </table>
        <button onClick={() => setForm({ ...form, labour: [...form.labour, { description: '', hours: '' }] })} style={{ marginTop: '10px', backgroundColor: 'transparent', color: '#00c2e0', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>+ Add Labour</button>
      </div>
      <div className="form-card" style={{ marginTop: '15px' }}>
        <h3 style={{ marginBottom: '10px' }}>Notes</h3>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #1a2f2f', backgroundColor: '#0a0f0f', color: 'white', minHeight: '80px', fontFamily: 'Barlow, sans-serif', fontSize: '14px', marginBottom: '15px' }} />
        <h3 style={{ marginBottom: '10px' }}>Technician Signature</h3>
        {!isSigning ? <button className="btn-primary" onClick={startSigning}>Sign Here</button> : (
          <div><canvas ref={sigCanvas} width={400} height={100} style={{ border: '1px solid #1a2f2f', borderRadius: '4px', backgroundColor: '#0a0f0f', cursor: 'crosshair', display: 'block' }} /><button onClick={() => { sigCanvas.current?.getContext('2d').clearRect(0, 0, 400, 100); setSignatureData(''); }} style={{ marginTop: '8px', backgroundColor: 'transparent', color: '#a0b0b0', border: '1px solid #1a2f2f', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button></div>
        )}
      </div>
      <div className="form-card" style={{ marginTop: '15px', backgroundColor: '#0a1a1a', border: '1px solid #00c2e030' }}>
        <h3 style={{ color: '#00c2e0', marginBottom: '12px' }}>Summary</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div><span style={{ color: '#a0b0b0', fontSize: '12px' }}>PARTS TOTAL</span><div style={{ color: '#ff6b00', fontWeight: 700, fontSize: '20px' }}>${totalPartsValue.toFixed(2)}</div></div>
          <div><span style={{ color: '#a0b0b0', fontSize: '12px' }}>LABOUR HOURS</span><div style={{ color: '#00c2e0', fontWeight: 700, fontSize: '20px' }}>{totalLabourHours.toFixed(1)}h</div></div>
        </div>
      </div>
      <button className="btn-primary" style={{ marginTop: '20px', width: '100%', padding: '15px', fontSize: '16px' }} onClick={handleSubmit}>Submit Service Sheet</button>
    </div>
  );

  if (view === 'builder') return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="service" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header">
        <h2>{aiPreview ? '✨ AI Generated — Review & Edit' : 'Service Sheet Builder'}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>✨ AI Generate</button>
          <button className="btn-primary" onClick={() => { setView('list'); setAiPreview(null); }}>← Back</button>
        </div>
      </div>
      {aiPreview && <div style={{ backgroundColor: '#0a2a1a', border: '1px solid #00c264', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}><p style={{ color: '#00c264', margin: 0, fontSize: '13px' }}>✨ AI generated — review and edit before saving.</p></div>}
      <div style={{ backgroundColor: '#0a1a2a', border: '1px solid #1a3a4a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
        <p style={{ color: '#00c2e0', margin: 0, fontSize: '12px' }}>💡 Input types: <strong>✓ Check</strong> · <strong>📷 Photo</strong> · <strong>🌡️ Temperature</strong> · <strong>💧 Fluid</strong> · <strong>🔵 Pressure</strong> · <strong>📏 Measurement</strong> · <strong>🔢 Number</strong> · <strong>📝 Text</strong></p>
      </div>
      <div className="form-card">
        <input placeholder="Template Name" value={builder.name} onChange={e => setBuilder({ ...builder, name: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
        <input placeholder="Description" value={builder.description} onChange={e => setBuilder({ ...builder, description: e.target.value })} style={{ width: '100%', marginBottom: '10px', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
        <input placeholder="Service Type (e.g. 250hr Service)" value={builder.service_type} onChange={e => setBuilder({ ...builder, service_type: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
      </div>
      {builder.sections.map((section, si) => (
        <div key={si} className="form-card" style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <input placeholder="Section Title" value={section.title} onChange={e => { const s = builder.sections.map((sec, i) => i === si ? { ...sec, title: e.target.value } : sec); setBuilder({ ...builder, sections: s }); }} style={{ flex: 1, marginRight: '10px', padding: '8px', backgroundColor: '#0a0f0f', color: 'white', border: '1px solid #1a2f2f', borderRadius: '4px' }} />
            <button onClick={() => setBuilder({ ...builder, sections: builder.sections.filter((_, i) => i !== si) })} className="btn-delete">Remove</button>
          </div>
          {section.items.map((item, ii) => <BuilderItem key={ii} item={item} si={si} ii={ii} onUpdate={updateItem} onRemove={removeItem} />)}
          <button onClick={() => addItem(si)} style={{ backgroundColor: 'transparent', color: '#00c2e0', border: '1px dashed #00c2e0', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', marginTop: '5px', width: '100%' }}>+ Add Item</button>
        </div>
      ))}
      <button onClick={() => setBuilder({ ...builder, sections: [...builder.sections, { title: '', items: [] }] })} style={{ marginTop: '15px', backgroundColor: 'transparent', color: '#00c2e0', border: '1px dashed #00c2e0', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>+ Add Section</button>
      <button className="btn-primary" style={{ marginTop: '15px', width: '100%', padding: '14px' }} onClick={saveTemplate}>Save Template</button>
    </div>
  );

  if (view === 'history') return (
    <div className="prestart">
      <div className="page-header"><h2>Service Sheet History</h2><button className="btn-primary" onClick={() => setView('list')}>← Back</button></div>
      {submissions.length === 0 ? <p style={{ color: '#a0b0b0' }}>No submissions yet</p> : (
        <table className="data-table">
          <thead><tr><th>Date</th><th>Asset</th><th>Technician</th><th>Service Type</th><th>Parts</th><th>Labour</th><th>PDF</th></tr></thead>
          <tbody>{submissions.map(s => (<tr key={s.id}><td>{s.date}</td><td>{s.asset}</td><td>{s.technician}</td><td>{s.service_type || '-'}</td><td style={{ color: '#ff6b00' }}>${parseFloat(s.total_parts_cost || 0).toFixed(2)}</td><td style={{ color: '#00c2e0' }}>{parseFloat(s.total_labour_hours || 0).toFixed(1)}h</td><td><button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => exportServicePDF(s)}>PDF</button></td>{isAdmin && <td><button className="btn-delete" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => deleteSubmission(s.id)}>Delete</button></td>}</tr>))}</tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="prestart">
      {showAI && <AIGeneratorModal mode="service" onClose={() => setShowAI(false)} onGenerated={handleAIGenerated} />}
      <div className="page-header">
        <h2>Service Sheets</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => setView('history')}>History</button>
          {userRole?.role !== 'technician' && (<><button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000' }} onClick={() => setShowAI(true)}>✨ Generate with AI</button><button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button></>)}
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
          <p style={{ color: '#a0b0b0', marginBottom: '20px' }}>No service sheet templates yet.</p>
          {userRole?.role !== 'technician' && <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #00c2e0, #0090a8)', color: '#000', padding: '12px 24px' }} onClick={() => setShowAI(true)}>✨ Generate with AI</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
          {templates.map(t => (
            <div key={t.id} className="form-card" style={{ cursor: 'pointer' }} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
              <h3 style={{ color: '#00c2e0', marginBottom: '4px' }}>{t.name}</h3>
              {t.service_type && <p style={{ color: '#ff6b00', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>{t.service_type}</p>}
              <p style={{ color: '#a0b0b0', fontSize: '13px', marginBottom: '12px' }}>{t.description}</p>
              <p style={{ color: '#a0b0b0', fontSize: '12px' }}>{t.sections?.length || 0} sections</p>
              <button className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>Start Service Sheet →</button>
              {isAdmin && <button className="btn-delete" style={{ marginTop: '8px', width: '100%', padding: '6px' }} onClick={(e) => deleteTemplate(t.id, e)}>🗑 Delete Template</button>}
            </div>
          ))}
          {userRole?.role !== 'technician' && (
            <div className="form-card" style={{ cursor: 'pointer', border: '1px dashed #00c2e040', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '120px', gap: '10px' }} onClick={() => setShowAI(true)}>
              <p style={{ color: '#00c2e0', fontSize: '24px', margin: 0 }}>✨</p>
              <p style={{ color: '#00c2e0', fontSize: '14px', margin: 0 }}>Generate with AI</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN FORMS COMPONENT ─────────────────────────────────────────────────────
function Forms({ userRole }) {
  const [activeTab, setActiveTab] = useState('prestarts');
  return (
    <div>
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #1a2f2f', marginBottom: '24px' }}>
        {[{ id: 'prestarts', label: '📋 Prestarts' }, { id: 'service-sheets', label: '🔧 Service Sheets' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 28px', backgroundColor: 'transparent', color: activeTab === tab.id ? '#00c2e0' : '#a0b0b0', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #00c2e0' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === tab.id ? 'bold' : 'normal', fontSize: '15px', marginBottom: '-2px', fontFamily: 'Barlow, sans-serif', letterSpacing: '0.5px' }}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'prestarts' && <PrestartTab userRole={userRole} />}
      {activeTab === 'service-sheets' && <ServiceSheetsTab userRole={userRole} />}
    </div>
  );
}

export default Forms;
