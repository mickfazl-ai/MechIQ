import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pulse-amber { 0%,100%{box-shadow:0 0 0 0 rgba(217,119,6,0.25)} 50%{box-shadow:0 0 0 6px transparent} }

  .parts-wrap { animation: fadeUp 0.3s ease; }

  .parts-filters {
    display: flex; gap: 8px; flex-wrap: wrap;
    align-items: center; margin-bottom: 16px;
  }
  .parts-filter-input {
    padding: 8px 12px; border: 1px solid var(--border);
    border-radius: 8px; background: var(--surface-2);
    color: var(--text-primary); font-size: 13px;
    font-family: inherit; outline: none;
    transition: border-color 0.15s; min-width: 0;
  }
  .parts-filter-input:focus { border-color: var(--accent); }
  .parts-filter-select {
    padding: 8px 12px; border: 1px solid var(--border);
    border-radius: 8px; background: var(--surface-2);
    color: var(--text-primary); font-size: 13px;
    font-family: inherit; outline: none; cursor: pointer;
  }

  .parts-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .parts-table { width: 100%; border-collapse: collapse; min-width: 700px; }
  .parts-table th {
    text-align: left; padding: 0 14px 10px 0;
    font-size: 10px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .parts-table td {
    padding: 11px 14px 11px 0;
    font-size: 13px; color: var(--text-secondary);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  .parts-table tr:last-child td { border-bottom: none; }
  .parts-table tr:hover td { background: var(--surface-2); }

  .stock-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
  }
  .stock-ok     { background: var(--green-bg);  color: var(--green);  border: 1px solid var(--green-border); }
  .stock-low    { background: var(--amber-bg);  color: var(--amber);  border: 1px solid var(--amber-border); animation: pulse-amber 2.5s infinite; }
  .stock-out    { background: var(--red-bg);    color: var(--red);    border: 1px solid var(--red-border); }

  .parts-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px; margin-bottom: 14px;
  }
  .parts-input {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface-2); color: var(--text-primary);
    font-size: 13px; font-family: inherit; outline: none;
    box-sizing: border-box; transition: border-color 0.15s;
  }
  .parts-input:focus { border-color: var(--accent); }
  .parts-label {
    display: block; font-size: 10px; font-weight: 700;
    color: var(--text-muted); text-transform: uppercase;
    letter-spacing: 0.5px; margin-bottom: 5px;
  }
  .parts-section-title {
    font-size: 12px; font-weight: 800; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1px;
    margin-bottom: 14px; padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px;
  }
  .parts-section-title::before {
    content: ''; width: 3px; height: 14px;
    background: var(--accent); border-radius: 2px; flex-shrink: 0;
  }

  .ai-drop-zone {
    border: 2px dashed var(--border); border-radius: 12px;
    padding: 32px 20px; text-align: center; cursor: pointer;
    transition: all 0.2s; background: var(--surface-2);
  }
  .ai-drop-zone:hover, .ai-drop-zone.drag-over {
    border-color: var(--accent); background: var(--accent-light);
  }
  .ai-progress {
    background: var(--surface-2); border-radius: 8px;
    overflow: hidden; height: 6px; margin-top: 10px;
  }
  .ai-progress-bar {
    height: 100%; background: var(--accent); border-radius: 8px;
    transition: width 0.4s ease;
  }

  .parts-action-btn {
    padding: 6px 12px; border-radius: 7px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    border: none; transition: all 0.15s; white-space: nowrap;
  }
  .tab-row {
    display: flex; gap: 3px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 10px;
    padding: 4px; width: fit-content; margin-bottom: 20px; flex-wrap: wrap;
  }
  .tab-btn-p {
    padding: 8px 16px; border-radius: 7px; border: none;
    cursor: pointer; font-size: 13px; font-weight: 600;
    transition: all 0.15s; font-family: inherit;
  }
  .tab-btn-p.active { background: var(--accent); color: #fff; box-shadow: 0 2px 8px rgba(14,165,233,0.3); }
  .tab-btn-p:not(.active) { background: transparent; color: var(--text-muted); }

  .low-stock-banner {
    background: var(--amber-bg); border: 1px solid var(--amber-border);
    border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px; animation: fadeUp 0.3s ease;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = '13px' }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: 'linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite linear', flexShrink: 0 }} />;
}

const UNITS = ['ea', 'pcs', 'set', 'kg', 'L', 'm', 'box', 'roll', 'pair'];

// ─── AI Import Modal ──────────────────────────────────────────────────────────
function AIImportModal({ userRole, assets, onClose, onImported }) {
  const [step, setStep]         = useState('upload'); // upload | preview | done
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState('');
  const [selected, setSelected] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const processFile = async (f) => {
    setFile(f);
    setStep('processing');
    setProgress(10);
    setStatus('Reading file…');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let prompt = '';

      if (f.type.startsWith('image/')) {
        // Convert image to base64
        setStatus('Analysing image…');
        setProgress(30);
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(f);
        });

        const resp = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: f.type, data: base64 } },
                { type: 'text', text: `Extract all parts/items from this image. Return ONLY a JSON array, no markdown, no explanation. Each item: {"name":"","part_number":"","supplier":"","quantity":0,"unit":"ea","unit_cost":0,"category":"","description":""}. Use 0 for unknown numbers, empty string for unknown text.` }
              ]
            }]
          })
        });
        setProgress(70);
        const data = await resp.json();
        const text = data.content?.[0]?.text || '[]';
        const clean = text.replace(/```json|```/g, '').trim();
        setPreview(JSON.parse(clean));

      } else if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        setStatus('Parsing spreadsheet…');
        setProgress(30);
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setProgress(50);
        setStatus('Mapping columns with AI…');

        const resp = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 3000,
            messages: [{
              role: 'user',
              content: `Map these spreadsheet rows to parts data. Return ONLY a JSON array, no markdown. Each item: {"name":"","part_number":"","supplier":"","quantity":0,"unit":"ea","unit_cost":0,"category":"","description":""}. Rows: ${JSON.stringify(rows.slice(0, 50))}`
            }]
          })
        });
        setProgress(70);
        const data = await resp.json();
        const text = data.content?.[0]?.text || '[]';
        const clean = text.replace(/```json|```/g, '').trim();
        setPreview(JSON.parse(clean));

      } else if (f.type === 'application/pdf') {
        setStatus('Extracting text from PDF…');
        setProgress(30);
        // Read PDF as base64 and send to AI
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        setProgress(50);
        setStatus('Analysing PDF with AI…');

        const resp = await fetch('/api/ai-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 3000,
            messages: [{
              role: 'user',
              content: [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
                { type: 'text', text: `Extract all parts/items from this document. Return ONLY a JSON array, no markdown. Each item: {"name":"","part_number":"","supplier":"","quantity":0,"unit":"ea","unit_cost":0,"category":"","description":""}. Use 0 for unknown numbers, empty string for unknown text.` }
              ]
            }]
          })
        });
        setProgress(70);
        const data = await resp.json();
        const text = data.content?.[0]?.text || '[]';
        const clean = text.replace(/```json|```/g, '').trim();
        setPreview(JSON.parse(clean));
      }

      setProgress(100);
      setStatus('Done!');
      setSelected(preview => (preview || []).map((_, i) => i));
      setStep('preview');
    } catch (err) {
      setStatus('Error: ' + (err.message || 'Could not process file'));
      setStep('upload');
    }
  };

  // After preview is set, select all
  useEffect(() => {
    if (preview) setSelected(preview.map((_, i) => i));
  }, [preview]);

  const importSelected = async () => {
    const toImport = preview.filter((_, i) => selected.includes(i));
    const rows = toImport.map(p => ({
      company_id: userRole.company_id,
      name: p.name || 'Unknown Part',
      part_number: p.part_number || '',
      supplier: p.supplier || '',
      quantity: parseInt(p.quantity) || 0,
      unit: p.unit || 'ea',
      unit_cost: parseFloat(p.unit_cost) || 0,
      category: p.category || '',
      description: p.description || '',
      min_quantity: 5,
    }));
    await supabase.from('parts').insert(rows);
    onImported(rows.length);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'auto', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>🤖 AI Parts Import</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {step === 'upload' && (
          <>
            <div className={`ai-drop-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
              onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Drop file here or tap to browse</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports Excel (.xlsx), PDF, or a photo of a parts list / invoice</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf,image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) processFile(f); }} />
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['📊 Excel Spreadsheet', '📄 PDF Parts List', '📷 Photo / Invoice'].map(t => (
                <span key={t} style={{ padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)' }}>{t}</span>
              ))}
            </div>
          </>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{status}</div>
            <div className="ai-progress"><div className="ai-progress-bar" style={{ width: `${progress}%` }} /></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{progress}%</div>
          </div>
        )}

        {step === 'preview' && preview && (
          <>
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Found <strong style={{ color: 'var(--text-primary)' }}>{preview.length}</strong> parts — select which to import
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setSelected(preview.map((_, i) => i))} style={{ fontSize: 11, padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>All</button>
                <button onClick={() => setSelected([])} style={{ fontSize: 11, padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>None</button>
              </div>
            </div>
            <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
              {preview.map((p, i) => (
                <div key={i} onClick={() => setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected.includes(i) ? 'var(--accent-light)' : 'transparent', transition: 'background 0.12s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected.includes(i) ? 'var(--accent)' : 'var(--border)'}`, background: selected.includes(i) ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected.includes(i) && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {[p.part_number && `#${p.part_number}`, p.supplier, p.quantity && `Qty: ${p.quantity}`, p.unit_cost && `$${p.unit_cost}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={importSelected} disabled={selected.length === 0}
                style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: selected.length === 0 ? 0.4 : 1 }}>
                Import {selected.length} Part{selected.length !== 1 ? 's' : ''}
              </button>
              <button onClick={onClose} style={{ padding: '10px 18px', background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stock Transaction Modal ──────────────────────────────────────────────────
function TransactionModal({ part, userRole, assets, workOrders, onClose, onDone }) {
  const [type, setType]   = useState('out');
  const [qty, setQty]     = useState(1);
  const [asset, setAsset] = useState('');
  const [wo, setWo]       = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!qty || qty < 1) return;
    setSaving(true);
    try {
      await supabase.from('parts_transactions').insert({
        company_id: userRole.company_id,
        part_id: part.id,
        type,
        quantity: parseInt(qty),
        asset_id: asset || null,
        work_order_id: wo || null,
        notes,
        performed_by: userRole.name || userRole.email,
      });
      const delta = type === 'out' ? -parseInt(qty) : parseInt(qty);
      await supabase.from('parts').update({ quantity: Math.max(0, (part.quantity || 0) + delta), updated_at: new Date().toISOString() }).eq('id', part.id);
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Stock Movement</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{part.name} · Current: {part.quantity} {part.unit}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['out','📤 Use / Issue'],['in','📥 Receive'],['adjustment','⚙ Adjust']].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} style={{ flex: 1, padding: '8px', border: `1px solid ${type === v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, background: type === v ? 'var(--accent)' : 'var(--surface-2)', color: type === v ? '#fff' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="parts-label">Quantity *</label>
          <input className="parts-input" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="parts-label">Asset (optional)</label>
          <select className="parts-input" value={asset} onChange={e => setAsset(e.target.value)}>
            <option value="">Select asset…</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="parts-label">Work Order (optional)</label>
          <select className="parts-input" value={wo} onChange={e => setWo(e.target.value)}>
            <option value="">Select work order…</option>
            {workOrders.map(w => <option key={w.id} value={w.id}>{w.title || w.defect_description?.slice(0, 40) || w.id.slice(0, 8)}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="parts-label">Notes</label>
          <input className="parts-input" placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Confirm'}
          </button>
          <button onClick={onClose} style={{ padding: '10px 18px', background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Part Form ────────────────────────────────────────────────────────────────
function PartForm({ part, assets, onSave, onCancel, userRole }) {
  const blank = { name: '', part_number: '', category: '', supplier: '', supplier_contact: '', unit_cost: '', quantity: '', min_quantity: 5, unit: 'ea', location: '', linked_asset_id: '', description: '', notes: '' };
  const [form, setForm] = useState(part || blank);
  const [saving, setSaving] = useState(false);
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) return alert('Part name is required');
    setSaving(true);
    try {
      const payload = { ...form, company_id: userRole.company_id, unit_cost: parseFloat(form.unit_cost) || 0, quantity: parseInt(form.quantity) || 0, min_quantity: parseInt(form.min_quantity) || 5, linked_asset_id: form.linked_asset_id || null, updated_at: new Date().toISOString() };
      if (part?.id) { await supabase.from('parts').update(payload).eq('id', part.id); }
      else { await supabase.from('parts').insert(payload); }
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 20, animation: 'fadeUp 0.2s ease' }}>
      <div className="parts-section-title">{part?.id ? 'Edit Part' : 'Add New Part'}</div>
      <div className="parts-form-grid">
        <div><label className="parts-label">Part Name *</label><input className="parts-input" placeholder="e.g. Oil Filter" value={form.name} onChange={e => F('name', e.target.value)} /></div>
        <div><label className="parts-label">Part Number</label><input className="parts-input" placeholder="e.g. OF-1234" value={form.part_number} onChange={e => F('part_number', e.target.value)} /></div>
        <div><label className="parts-label">Category</label><input className="parts-input" placeholder="e.g. Filters, Belts, Hydraulic" value={form.category} onChange={e => F('category', e.target.value)} /></div>
        <div><label className="parts-label">Supplier</label><input className="parts-input" placeholder="e.g. Hydraulink" value={form.supplier} onChange={e => F('supplier', e.target.value)} /></div>
        <div><label className="parts-label">Supplier Contact</label><input className="parts-input" placeholder="Phone or email" value={form.supplier_contact} onChange={e => F('supplier_contact', e.target.value)} /></div>
        <div><label className="parts-label">Unit Cost ($)</label><input className="parts-input" type="number" placeholder="0.00" value={form.unit_cost} onChange={e => F('unit_cost', e.target.value)} /></div>
        <div><label className="parts-label">Quantity</label><input className="parts-input" type="number" placeholder="0" value={form.quantity} onChange={e => F('quantity', e.target.value)} /></div>
        <div><label className="parts-label">Min Stock Level</label><input className="parts-input" type="number" placeholder="5" value={form.min_quantity} onChange={e => F('min_quantity', e.target.value)} /></div>
        <div><label className="parts-label">Unit</label>
          <select className="parts-input" value={form.unit} onChange={e => F('unit', e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div><label className="parts-label">Storage Location</label><input className="parts-input" placeholder="e.g. Shelf A3, Workshop" value={form.location} onChange={e => F('location', e.target.value)} /></div>
        <div><label className="parts-label">Linked Asset</label>
          <select className="parts-input" value={form.linked_asset_id} onChange={e => F('linked_asset_id', e.target.value)}>
            <option value="">No specific asset</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="parts-label">Description</label>
        <textarea className="parts-input" rows={2} value={form.description} onChange={e => F('description', e.target.value)} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ padding: '9px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : part?.id ? 'Save Changes' : 'Add Part'}
        </button>
        <button onClick={onCancel} style={{ padding: '9px 16px', background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Main Parts Component ──────────────────────────────────────────────────────
export default function Parts({ userRole }) {
  const [parts, setParts]           = useState([]);
  const [assets, setAssets]         = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('parts');
  const [showForm, setShowForm]     = useState(false);
  const [editPart, setEditPart]     = useState(null);
  const [txPart, setTxPart]         = useState(null);
  const [showAI, setShowAI]         = useState(false);

  // Filters
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterAsset, setFilterAsset]       = useState('');
  const [filterStock, setFilterStock]       = useState('');

  const isAdmin = ['admin','supervisor'].includes(userRole?.role);

  useEffect(() => {
    if (!document.getElementById('parts-css')) {
      const s = document.createElement('style'); s.id = 'parts-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (userRole?.company_id) { load(); }
  }, [userRole]);

  const load = useCallback(async () => {
    setLoading(true);
    const cid = userRole.company_id;
    try {
      const { data: p, error: pe } = await supabase.from('parts').select('*').eq('company_id', cid).order('name');
      if (pe) console.error('parts error:', pe);
      setParts(p || []);

      const { data: a } = await supabase.from('assets').select('id,name,asset_number').eq('company_id', cid).order('name');
      setAssets(a || []);

      const { data: w } = await supabase.from('work_orders').select('id,title,defect_description').eq('company_id', cid).neq('status','Complete').order('created_at',{ascending:false}).limit(50);
      setWorkOrders(w || []);

      const { data: t, error: te } = await supabase.from('parts_transactions').select('id,type,quantity,asset_id,work_order_id,notes,performed_by,created_at,part_id').eq('company_id', cid).order('created_at',{ascending:false}).limit(100);
      if (te) console.error('transactions error:', te);
      setTransactions(t || []);
    } catch (err) {
      console.error('Parts load error:', err);
    }
    setLoading(false);
  }, [userRole]);

  const deletePart = async (id) => {
    if (!window.confirm('Delete this part?')) return;
    await supabase.from('parts').delete().eq('id', id);
    load();
  };

  // Derived filter options
  const categories = [...new Set(parts.map(p => p.category).filter(Boolean))].sort();
  const suppliers  = [...new Set(parts.map(p => p.supplier).filter(Boolean))].sort();

  const filtered = parts.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !p.part_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterSupplier && p.supplier !== filterSupplier) return false;
    if (filterAsset && String(p.linked_asset_id) !== filterAsset) return false;
    if (filterStock === 'low'  && !(p.quantity > 0 && p.quantity <= p.min_quantity)) return false;
    if (filterStock === 'out'  && p.quantity !== 0) return false;
    if (filterStock === 'ok'   && !(p.quantity > p.min_quantity)) return false;
    return true;
  });

  const lowStockParts = parts.filter(p => p.quantity <= p.min_quantity);

  const stockStatus = (p) => {
    if (p.quantity === 0) return 'out';
    if (p.quantity <= p.min_quantity) return 'low';
    return 'ok';
  };

  const stockLabel = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };
  const stockClass = { ok: 'stock-ok', low: 'stock-low', out: 'stock-out' };

  const fmt = (n) => n == null || n === '' ? '—' : `$${parseFloat(n).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;

  return (
    <div className="parts-wrap">

      {/* Low stock banner */}
      {!loading && lowStockParts.length > 0 && (
        <div className="low-stock-banner">
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{lowStockParts.length} part{lowStockParts.length !== 1 ? 's' : ''} low or out of stock</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lowStockParts.slice(0, 3).map(p => p.name).join(', ')}{lowStockParts.length > 3 ? ` +${lowStockParts.length - 3} more` : ''}</div>
          </div>
          <button onClick={() => { setFilterStock('low'); setTab('parts'); }} style={{ padding: '6px 14px', background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View All</button>
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tab-row" style={{ marginBottom: 0 }}>
          {[['parts','🔩 Parts Register'],['transactions','📋 Stock Log'],['reorder','🛒 Reorder List']].map(([v, l]) => (
            <button key={v} className={`tab-btn-p${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isAdmin && <button onClick={() => setShowAI(true)} style={{ padding: '9px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>🤖 AI Import</button>}
          {isAdmin && <button onClick={() => { setEditPart(null); setShowForm(s => !s); }} style={{ padding: '9px 16px', background: showForm ? 'var(--surface-2)' : 'var(--accent)', color: showForm ? 'var(--text-secondary)' : '#fff', border: '1px solid ' + (showForm ? 'var(--border)' : 'var(--accent)'), borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? '✕ Close' : '+ Add Part'}
          </button>}
        </div>
      </div>

      {/* Add/Edit form */}
      {showForm && isAdmin && (
        <PartForm part={editPart} assets={assets} userRole={userRole} onSave={() => { setShowForm(false); setEditPart(null); load(); }} onCancel={() => { setShowForm(false); setEditPart(null); }} />
      )}

      {/* Parts Register Tab */}
      {tab === 'parts' && (
        <>
          {/* Filters */}
          <div className="parts-filters">
            <input className="parts-filter-input" placeholder="🔍 Search parts…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <select className="parts-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="parts-filter-select" value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="parts-filter-select" value={filterAsset} onChange={e => setFilterAsset(e.target.value)}>
              <option value="">All Assets</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="parts-filter-select" value={filterStock} onChange={e => setFilterStock(e.target.value)}>
              <option value="">All Stock</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            {(search || filterCat || filterSupplier || filterAsset || filterStock) && (
              <button onClick={() => { setSearch(''); setFilterCat(''); setFilterSupplier(''); setFilterAsset(''); setFilterStock(''); }} style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600 }}>✕ Clear</button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="parts-section-title" style={{ marginBottom: 0 }}>Parts Register</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} of {parts.length} parts</div>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ display: 'flex', gap: 14 }}>{[0,1,2,3,4].map(j => <Sk key={j} w="20%" h="14px" />)}</div>)}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontSize: 13 }}>
                {parts.length === 0 ? 'No parts yet — add one or use AI Import.' : 'No parts match your filters.'}
              </div>
            ) : (
              <div className="parts-table-wrap">
                <table className="parts-table">
                  <thead><tr>
                    {['Part','Part #','Category','Supplier','Stock','Location','Unit Cost','Asset','Actions'].map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const ss = stockStatus(p);
                      return (
                        <tr key={p.id} style={{ opacity: 0, animation: `fadeUp 0.25s ease ${i * 25}ms forwards` }}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                            {p.description && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{p.description.slice(0, 50)}</div>}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{p.part_number || '—'}</td>
                          <td>{p.category ? <span style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11 }}>{p.category}</span> : '—'}</td>
                          <td>
                            <div style={{ fontSize: 13 }}>{p.supplier || '—'}</div>
                            {p.supplier_contact && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.supplier_contact}</div>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`stock-badge ${stockClass[ss]}`}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                                {p.quantity} {p.unit}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>Min: {p.min_quantity}</div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.location || '—'}</td>
                          <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(p.unit_cost)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assets.find(a => a.id === p.linked_asset_id)?.name || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <button onClick={() => setTxPart(p)} className="parts-action-btn" style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(14,165,233,0.25)' }}>Stock ±</button>
                              {isAdmin && <button onClick={() => { setEditPart(p); setShowForm(true); }} className="parts-action-btn" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Edit</button>}
                              {isAdmin && <button onClick={() => deletePart(p.id)} className="parts-action-btn" style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>Delete</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Stock Log Tab */}
      {tab === 'transactions' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div className="parts-section-title">Stock Movement Log</div>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontSize: 13 }}>No stock movements yet.</div>
          ) : (
            <div className="parts-table-wrap">
              <table className="parts-table">
                <thead><tr>{['Part','Type','Qty','Asset','Work Order','By','When','Notes'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {transactions.map((t, i) => {
                    const typeMap = { out: ['📤 Used', 'var(--red)', 'var(--red-bg)'], in: ['📥 Received', 'var(--green)', 'var(--green-bg)'], adjustment: ['⚙ Adjusted', 'var(--accent)', 'var(--accent-light)'] };
                    const [label, color, bg] = typeMap[t.type] || ['—', 'var(--text-muted)', 'var(--surface-2)'];
                    return (
                      <tr key={t.id} style={{ opacity: 0, animation: `fadeUp 0.25s ease ${i * 20}ms forwards` }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.parts?.name || '—'}</td>
                        <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${color}33` }}>{label}</span></td>
                        <td style={{ fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{t.type === 'out' ? '-' : '+'}{t.quantity} {t.parts?.unit || ''}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assets.find(a => a.id === t.asset_id)?.name || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{workOrders.find(w => w.id === t.work_order_id)?.title?.slice(0, 25) || (t.work_order_id ? 'WO' : '—')}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.performed_by || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reorder List Tab */}
      {tab === 'reorder' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="parts-section-title" style={{ marginBottom: 0 }}>Reorder List</div>
            <button onClick={() => {
              const rows = lowStockParts.map(p => ({ 'Part Name': p.name, 'Part #': p.part_number, 'Supplier': p.supplier, 'Contact': p.supplier_contact, 'Current Stock': p.quantity, 'Min Stock': p.min_quantity, 'Unit': p.unit, 'Unit Cost': p.unit_cost, 'Notes': p.notes }));
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Reorder List');
              XLSX.writeFile(wb, `MechIQ_Reorder_${new Date().toISOString().split('T')[0]}.xlsx`);
            }} style={{ padding: '7px 16px', background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              📊 Export Excel
            </button>
          </div>
          {lowStockParts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-faint)', fontSize: 13 }}>✅ All parts are adequately stocked.</div>
          ) : (
            <div className="parts-table-wrap">
              <table className="parts-table">
                <thead><tr>{['Part','Part #','Supplier','Contact','Current','Min','Need','Unit Cost','Est. Cost'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {lowStockParts.map((p, i) => {
                    const need = Math.max(0, (p.min_quantity * 2) - p.quantity);
                    const estCost = need * (parseFloat(p.unit_cost) || 0);
                    return (
                      <tr key={p.id} style={{ opacity: 0, animation: `fadeUp 0.25s ease ${i * 25}ms forwards` }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{p.part_number || '—'}</td>
                        <td>{p.supplier || '—'}</td>
                        <td style={{ fontSize: 12 }}>{p.supplier_contact ? <a href={`tel:${p.supplier_contact}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{p.supplier_contact}</a> : '—'}</td>
                        <td><span className={`stock-badge ${p.quantity === 0 ? 'stock-out' : 'stock-low'}`}>{p.quantity} {p.unit}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.min_quantity}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{need} {p.unit}</td>
                        <td>{fmt(p.unit_cost)}</td>
                        <td style={{ fontWeight: 700, color: estCost > 0 ? 'var(--text-primary)' : 'var(--text-faint)' }}>{estCost > 0 ? fmt(estCost) : '—'}</td>
                      </tr>
                    );
                  })}
                  {lowStockParts.some(p => p.unit_cost) && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', paddingTop: 14, fontSize: 13 }}>Estimated Total:</td>
                      <td style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>
                        {fmt(lowStockParts.reduce((sum, p) => {
                          const need = Math.max(0, (p.min_quantity * 2) - p.quantity);
                          return sum + need * (parseFloat(p.unit_cost) || 0);
                        }, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {txPart && <TransactionModal part={txPart} userRole={userRole} assets={assets} workOrders={workOrders} onClose={() => setTxPart(null)} onDone={() => { setTxPart(null); load(); }} />}
      {showAI && <AIImportModal userRole={userRole} assets={assets} onClose={() => setShowAI(false)} onImported={(n) => { setShowAI(false); load(); alert(`✓ Imported ${n} parts successfully!`); }} />}
    </div>
  );
}
