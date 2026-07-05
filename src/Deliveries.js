import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { pythonAIFetch } from './pythonApi';

const CSS = `
  @keyframes dlFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  .dl-wrap { animation: dlFade .3s ease both; font-family:'Inter',sans-serif; }
  .dl-card-h { padding:9px 14px; border-bottom:1px solid var(--surface-2,#F1F5F9); font-size:10px; font-weight:700; color:var(--text-muted,#64748B); text-transform:uppercase; letter-spacing:.5px; display:flex; align-items:center; gap:6px; }
  .dl-card-h::before { content:''; width:3px; height:11px; background:var(--accent,#1976D2); flex-shrink:0; }
  .dl-btn { padding:7px 14px; background:var(--accent,#1976D2); color:#fff; border:none; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
  .dl-btn:disabled { background:#94A3B8; cursor:not-allowed; }
  .dl-btn2 { padding:7px 12px; background:var(--surface,#fff); color:var(--text-secondary,#374151); border:1px solid var(--border,#CBD5E1); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; }
  .dl-input { width:100%; padding:8px 10px; border:1px solid var(--border,#E5E7EB); background:var(--surface-2,#F8FAFC); color:var(--text-primary,#0F172A); font-size:12px; font-family:'Inter',sans-serif; outline:none; box-sizing:border-box; }
  .dl-input:focus { border-color:var(--accent,#1976D2); background:var(--surface,#fff); }
  .dl-label { font-size:9px; font-weight:700; color:var(--text-muted,#64748B); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; display:block; }
  .dl-lane { background:var(--surface-2,#F1F5F9); padding:8px; min-height:240px; }
  .dl-dcard { background:var(--surface,#fff); border:1px solid var(--border,#E5E7EB); border-left-width:3px; padding:9px 10px; margin-bottom:6px; cursor:pointer; transition:box-shadow .1s; }
  .dl-dcard:hover { box-shadow:0 2px 8px rgba(0,0,0,.08); }
  .dl-modal { position:fixed; inset:0; background:rgba(15,23,42,.4); z-index:600; display:flex; align-items:center; justify-content:center; padding:20px; }
  .dl-modal-card { background:var(--surface,#fff); border:1px solid var(--border,#E5E7EB); border-top:3px solid var(--accent,#1976D2); padding:22px; width:100%; max-width:560px; max-height:88vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,.15); }
  .dl-ai { background:#EEF2FF; border:1px solid #C7D2FE; border-left:3px solid #6366F1; padding:9px 12px; display:flex; gap:9px; align-items:flex-start; }
`;

const MONO = { fontFamily: "'JetBrains Mono',monospace" };
const LANES = [
  { id: 'ordered',    label: 'Ordered',    color: '#64748B', accent: '#94A3B8' },
  { id: 'expected',   label: 'Expected',   color: '#64748B', accent: '#94A3B8' },
  { id: 'in_transit', label: 'In transit', color: '#185FA5', accent: '#378ADD' },
  { id: 'arrived',    label: 'Arrived',    color: '#854F0B', accent: '#EF9F27' },
  { id: 'received',   label: 'Received',   color: '#0F6E56', accent: '#1D9E75' },
];
const fmtD = d => (d ? new Date(d).toLocaleDateString('en-AU') : '—');

// ─── Add / Edit Delivery Modal ────────────────────────────────────────────────
function DeliveryModal({ delivery, companyId, parts, onClose, onSaved }) {
  const editing = !!delivery?.id;
  const [form, setForm] = useState({
    supplier: delivery?.supplier || '', po_number: delivery?.po_number || '',
    docket_number: delivery?.docket_number || '', carrier: delivery?.carrier || '',
    status: delivery?.status || 'ordered', eta: delivery?.eta || '',
    ordered_date: delivery?.ordered_date || '', notes: delivery?.notes || '',
  });
  const [items, setItems] = useState(delivery?.items || [{ description: '', quantity: 1, unit: 'ea', part_id: null }]);
  const [busy, setBusy] = useState(false);
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (i, k, v) => setItems(arr => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems(arr => [...arr, { description: '', quantity: 1, unit: 'ea', part_id: null }]);
  const rmItem = (i) => setItems(arr => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.supplier && !form.po_number) { alert('Enter at least a supplier or PO number'); return; }
    setBusy(true);
    try {
      const payload = {
        company_id: companyId, supplier: form.supplier || null, po_number: form.po_number || null,
        docket_number: form.docket_number || null, carrier: form.carrier || null,
        status: form.status, eta: form.eta || null, ordered_date: form.ordered_date || null,
        notes: form.notes || null,
        received_date: form.status === 'received' ? (delivery?.received_date || new Date().toISOString().split('T')[0]) : null,
      };
      let deliveryId = delivery?.id;
      if (editing) {
        const { error } = await supabase.from('deliveries').update(payload).eq('id', deliveryId);
        if (error) { alert('Save failed: ' + error.message); return; }
        await supabase.from('delivery_items').delete().eq('delivery_id', deliveryId);
      } else {
        const { data, error } = await supabase.from('deliveries').insert([payload]).select().single();
        if (error) { alert('Save failed: ' + error.message); return; }
        deliveryId = data.id;
      }
      const itemRows = items.filter(it => it.description.trim()).map(it => ({
        delivery_id: deliveryId, description: it.description, quantity: parseFloat(it.quantity) || 1,
        unit: it.unit || 'ea', part_id: it.part_id || null,
      }));
      if (itemRows.length) await supabase.from('delivery_items').insert(itemRows);
      onSaved(); onClose();
    } catch (e) { alert('Save failed: ' + (e?.message || 'Unknown')); }
    finally { setBusy(false); }
  };

  return (
    <div className="dl-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dl-modal-card">
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary,#0F172A)', marginBottom: 14, letterSpacing: '-0.3px' }}>{editing ? 'Edit delivery' : 'Add delivery'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label className="dl-label">Supplier</label><input className="dl-input" value={form.supplier} onChange={e => F('supplier', e.target.value)} /></div>
          <div><label className="dl-label">PO number</label><input className="dl-input" value={form.po_number} onChange={e => F('po_number', e.target.value)} /></div>
          <div><label className="dl-label">Docket number</label><input className="dl-input" value={form.docket_number} onChange={e => F('docket_number', e.target.value)} /></div>
          <div><label className="dl-label">Carrier</label><input className="dl-input" value={form.carrier} onChange={e => F('carrier', e.target.value)} /></div>
          <div>
            <label className="dl-label">Status</label>
            <select className="dl-input" value={form.status} onChange={e => F('status', e.target.value)}>
              {LANES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div><label className="dl-label">ETA</label><input type="date" className="dl-input" value={form.eta} onChange={e => F('eta', e.target.value)} /></div>
        </div>

        <label className="dl-label">Items</label>
        <div style={{ border: '1px solid var(--border,#E5E7EB)', marginBottom: 12 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 24px', gap: 6, padding: '6px 8px', borderBottom: i < items.length - 1 ? '1px solid var(--surface-2,#F1F5F9)' : 'none', alignItems: 'center' }}>
              <input className="dl-input" style={{ padding: '5px 7px' }} placeholder="Description" value={it.description} onChange={e => setItem(i, 'description', e.target.value)} list="dl-parts" />
              <input className="dl-input" type="number" style={{ padding: '5px 7px' }} value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
              <select className="dl-input" style={{ padding: '5px 4px' }} value={it.part_id || ''} onChange={e => setItem(i, 'part_id', e.target.value || null)}>
                <option value="">No link</option>
                {parts.map(p => <option key={p.id} value={p.id}>{p.name?.slice(0, 18)}</option>)}
              </select>
              <button className="dl-btn2" style={{ padding: '3px 6px', color: '#B91C1C', borderColor: '#FCA5A5' }} onClick={() => rmItem(i)}>×</button>
            </div>
          ))}
        </div>
        <button className="dl-btn2" onClick={addItem} style={{ marginBottom: 14 }}>+ Add item</button>

        <div style={{ marginBottom: 16 }}>
          <label className="dl-label">Notes</label>
          <textarea className="dl-input" rows={2} value={form.notes} onChange={e => F('notes', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {editing ? <button className="dl-btn2" style={{ color: '#B91C1C', borderColor: '#FCA5A5' }} onClick={async () => { if (window.confirm('Delete this delivery?')) { await supabase.from('deliveries').delete().eq('id', delivery.id); onSaved(); onClose(); } }}>Delete</button> : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="dl-btn2" onClick={onClose}>Cancel</button>
            <button className="dl-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function Deliveries({ userRole }) {
  const [companyId, setCompanyId] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // null | {} | delivery
  const [paste, setPaste] = useState('');
  const [parsing, setParsing] = useState(false);
  const [pasteMsg, setPasteMsg] = useState('');
  const [waImporting, setWaImporting] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [waReview, setWaReview] = useState(null);   // array of parsed deliveries for review

  useEffect(() => {
    const cid = (userRole && typeof userRole === 'object') ? userRole.company_id : null;
    setCompanyId(cid || null);
  }, [userRole]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let dq = supabase.from('deliveries').select('*').order('eta', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      if (companyId) dq = dq.eq('company_id', companyId);
      const { data: dels } = await dq;
      // attach items
      const ids = (dels || []).map(d => d.id);
      let itemsByDel = {};
      if (ids.length) {
        const { data: items } = await supabase.from('delivery_items').select('*').in('delivery_id', ids);
        (items || []).forEach(it => { (itemsByDel[it.delivery_id] = itemsByDel[it.delivery_id] || []).push(it); });
      }
      setDeliveries((dels || []).map(d => ({ ...d, items: itemsByDel[d.id] || [] })));

      let pq = supabase.from('parts').select('id, name, part_number, quantity');
      if (companyId) pq = pq.eq('company_id', companyId);
      const { data: pts } = await pq;
      setParts(pts || []);
    } catch (e) {}
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // Move a delivery to a new lane; if received, bump linked parts stock
  const moveTo = async (delivery, status) => {
    try {
      const patch = { status };
      if (status === 'received') patch.received_date = new Date().toISOString().split('T')[0];
      await supabase.from('deliveries').update(patch).eq('id', delivery.id);
      if (status === 'received') {
        for (const it of (delivery.items || [])) {
          if (it.part_id) {
            const part = parts.find(p => p.id === it.part_id);
            if (part) {
              await supabase.from('parts').update({ quantity: (part.quantity || 0) + (it.quantity || 0) }).eq('id', it.part_id);
            }
          }
        }
      }
      load();
    } catch (e) { alert('Update failed: ' + (e?.message || 'Unknown')); }
  };

  const importWhatsApp = async (file) => {
    if (!file) return;
    setWaImporting(true); setWaMsg('Reading chat export\u2026');
    try {
      const raw = await file.text();
      // WhatsApp exports get large; only send the most recent ~1500 lines to stay under limits
      const lines = raw.split('\n');
      const recent = lines.slice(-1500).join('\n');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const prompt = `This is an exported WhatsApp chat. Find EVERY message that refers to a delivery, order, dispatch, or goods arriving. For each, extract a delivery. Return ONLY a JSON array, no markdown: [{"supplier":"","po_number":"","docket_number":"","carrier":"","eta":"YYYY-MM-DD or empty","status":"ordered|expected|in_transit|arrived|received","items":[{"description":"","quantity":1,"unit":"ea"}],"notes":"date or sender context"}]. Infer status from wording. Ignore non-delivery chatter. If none found return []. Chat:\n${recent}`;
      const resp = await pythonAIFetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!resp.ok) { setWaMsg('AI service error ' + resp.status + ' \u2014 try a smaller export.'); return; }
      const data = await resp.json();
      let text = '';
      if (typeof data === 'string') text = data;
      else if (data.content && Array.isArray(data.content)) text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
      else text = data.text || data.reply || JSON.stringify(data);
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      if (!Array.isArray(parsed) || parsed.length === 0) { setWaMsg('No deliveries found in this chat export.'); return; }
      setWaReview(parsed);
      setWaMsg(parsed.length + ' deliveries found \u2014 review and import below.');
    } catch (e) { setWaMsg('Could not read export: ' + (e?.message || 'Unknown')); }
    finally { setWaImporting(false); }
  };

  const importReviewed = async () => {
    if (!waReview || !waReview.length) return;
    setWaImporting(true);
    try {
      // Dedupe against existing PO numbers
      const existingPOs = new Set(deliveries.map(d => (d.po_number || '').toLowerCase()).filter(Boolean));
      let added = 0, skipped = 0;
      for (const d of waReview) {
        const po = (d.po_number || '').toLowerCase();
        if (po && existingPOs.has(po)) { skipped++; continue; }
        const { data: ins, error } = await supabase.from('deliveries').insert([{
          company_id: companyId, supplier: d.supplier || null, po_number: d.po_number || null,
          docket_number: d.docket_number || null, carrier: d.carrier || null,
          status: d.status || 'expected', eta: /^\d{4}-\d{2}-\d{2}$/.test(d.eta) ? d.eta : null,
          notes: d.notes || null, source: 'whatsapp',
        }]).select().single();
        if (!error && ins) {
          const items = (d.items || []).filter(it => it.description).map(it => ({ delivery_id: ins.id, description: it.description, quantity: it.quantity || 1, unit: it.unit || 'ea' }));
          if (items.length) await supabase.from('delivery_items').insert(items);
          if (po) existingPOs.add(po);
          added++;
        }
      }
      setWaMsg(`Imported ${added} deliveries${skipped ? `, skipped ${skipped} duplicates` : ''}.`);
      setWaReview(null);
      load();
    } catch (e) { setWaMsg('Import failed: ' + (e?.message || 'Unknown')); }
    finally { setWaImporting(false); }
  };

  const parsePaste = async () => {
    if (!paste.trim()) return;
    setParsing(true); setPasteMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const prompt = `Extract delivery details from this message. Return ONLY JSON, no markdown: {"supplier":"","po_number":"","docket_number":"","carrier":"","eta":"YYYY-MM-DD or empty","status":"ordered|expected|in_transit|arrived|received","items":[{"description":"","quantity":1,"unit":"ea"}],"notes":""}. Infer status from wording (e.g. "leaving depot"=in_transit, "arrived"/"on site"=arrived, "ordered"=ordered, else expected). If a relative date like "Thursday" is given, leave eta empty and note it. Message: ${paste}`;
      const resp = await pythonAIFetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!resp.ok) { setPasteMsg('AI service error ' + resp.status + ' — add the delivery manually.'); return; }
      const data = await resp.json();
      let text = '';
      if (typeof data === 'string') text = data;
      else if (data.content && Array.isArray(data.content)) text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
      else text = data.text || data.reply || JSON.stringify(data);
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      // Open the modal pre-filled for review (don't blind-save)
      setModal({
        supplier: parsed.supplier || '', po_number: parsed.po_number || '', docket_number: parsed.docket_number || '',
        carrier: parsed.carrier || '', status: parsed.status || 'expected', eta: /^\d{4}-\d{2}-\d{2}$/.test(parsed.eta) ? parsed.eta : '',
        notes: parsed.notes || '', items: (parsed.items || []).map(it => ({ description: it.description || '', quantity: it.quantity || 1, unit: it.unit || 'ea', part_id: null })),
        raw_message: paste,
      });
      setPaste(''); setPasteMsg('');
    } catch (e) { setPasteMsg('Could not parse — try adding the delivery manually.'); }
    finally { setParsing(false); }
  };

  const byLane = id => deliveries.filter(d => (d.status || 'ordered') === id);
  const nextLane = cur => { const i = LANES.findIndex(l => l.id === cur); return i >= 0 && i < LANES.length - 1 ? LANES[i + 1] : null; };

  return (
    <div className="dl-wrap">
      <style>{CSS}</style>
      {modal !== null && <DeliveryModal delivery={modal.id ? modal : modal} companyId={companyId} parts={parts} onClose={() => setModal(null)} onSaved={load} />}
      <datalist id="dl-parts">{parts.map(p => <option key={p.id} value={p.name} />)}</datalist>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary,#0F172A)', letterSpacing: '-0.4px', marginBottom: 2 }}>Deliveries</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted,#64748B)' }}>{deliveries.length} tracked · received items auto-update linked parts stock</p>
        </div>
        <button className="dl-btn" onClick={() => setModal({})}>+ Add delivery</button>
      </div>

      {/* Paste-to-parse */}
      <div style={{ background: 'var(--surface,#fff)', border: '1px solid var(--border,#E5E7EB)', marginBottom: 14 }}>
        <div className="dl-card-h">Quick add from message</div>
        <div style={{ padding: 12 }}>
          <div className="dl-ai" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 8, fontWeight: 800, background: '#6366F1', color: '#fff', padding: '2px 6px', flexShrink: 0, marginTop: 1 }}>AI</span>
            <span style={{ fontSize: 11, color: '#4338CA', lineHeight: 1.5 }}>Paste a delivery email or WhatsApp message — Claude extracts supplier, PO, items and ETA, then opens it for you to review before saving.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea className="dl-input" rows={2} style={{ resize: 'vertical' }} value={paste} onChange={e => setPaste(e.target.value)} placeholder="e.g. Hi mate, 6x 19in disc cutters PO-4471 leaving depot tomorrow, docket 88231" />
            <button className="dl-btn" style={{ flexShrink: 0 }} onClick={parsePaste} disabled={parsing}>{parsing ? 'Reading…' : 'Parse'}</button>
          </div>
          {pasteMsg && <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 8 }}>{pasteMsg}</div>}
        </div>
      </div>

      {/* WhatsApp import */}
      <div style={{ background: 'var(--surface,#fff)', border: '1px solid var(--border,#E5E7EB)', marginBottom: 14 }}>
        <div className="dl-card-h">Import WhatsApp export</div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted,#64748B)', lineHeight: 1.5, marginBottom: 10 }}>
            In WhatsApp: open the supplier/driver chat → ⋮ menu → More → Export chat → <strong>Without media</strong>. Upload the .txt here and Claude pulls every delivery out of the conversation.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input id="dl-wa-input" type="file" accept=".txt" style={{ display: 'none' }} onChange={e => importWhatsApp(e.target.files[0])} />
            <button className="dl-btn2" onClick={() => document.getElementById('dl-wa-input').click()} disabled={waImporting}>{waImporting ? 'Reading…' : 'Choose chat export (.txt)'}</button>
            {waMsg && <span style={{ fontSize: 11, color: waMsg.includes('Imported') || waMsg.includes('found') ? '#15803D' : '#B91C1C' }}>{waMsg}</span>}
          </div>

          {waReview && (
            <div style={{ border: '1px solid var(--border,#E5E7EB)', marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-2,#F8FAFC)', borderBottom: '1px solid var(--border,#E5E7EB)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted,#64748B)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Review ({waReview.length})</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="dl-btn2" onClick={() => setWaReview(null)}>Discard</button>
                  <button className="dl-btn" onClick={importReviewed} disabled={waImporting}>{waImporting ? 'Importing…' : `Import all ${waReview.length}`}</button>
                </span>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {waReview.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < waReview.length - 1 ? '1px solid var(--surface-2,#F1F5F9)' : 'none', fontSize: 11 }}>
                    <span style={{ color: 'var(--text-primary,#0F172A)', fontWeight: 600 }}>{d.supplier || 'Unknown'}{d.po_number ? ` · ${d.po_number}` : ''}</span>
                    <span style={{ color: 'var(--text-muted,#64748B)' }}>{(d.items || []).map(it => it.description).slice(0, 2).join(', ') || '—'} · {d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint,#94A3B8)', fontSize: 13 }}>Loading deliveries…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {LANES.map(lane => {
            const cards = byLane(lane.id);
            return (
              <div key={lane.id} className="dl-lane">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 8px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: lane.color }}>{lane.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted,#64748B)', background: 'var(--surface,#fff)', borderRadius: 10, padding: '1px 7px' }}>{cards.length}</span>
                </div>
                {cards.length === 0 ? (
                  <div style={{ fontSize: 10, color: 'var(--text-faint,#94A3B8)', textAlign: 'center', padding: '16px 4px' }}>—</div>
                ) : cards.map(d => {
                  const nl = nextLane(d.status || 'ordered');
                  return (
                    <div key={d.id} className="dl-dcard" style={{ borderLeftColor: lane.accent }} onClick={() => setModal(d)}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary,#0F172A)', marginBottom: 2 }}>{d.supplier || 'Unknown supplier'}</div>
                      {d.po_number && <div style={{ ...MONO, fontSize: 10, color: 'var(--text-muted,#64748B)', marginBottom: 5 }}>{d.po_number}</div>}
                      {d.items && d.items.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary,#374151)', lineHeight: 1.4, marginBottom: 6 }}>
                          {d.items.slice(0, 2).map(it => `${it.quantity || ''}× ${it.description}`).join(', ')}{d.items.length > 2 ? ` +${d.items.length - 2}` : ''}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted,#64748B)' }}>{d.status === 'received' ? `Recv'd ${fmtD(d.received_date)}` : d.eta ? `ETA ${fmtD(d.eta)}` : 'No ETA'}</span>
                        {nl && (
                          <button onClick={e => { e.stopPropagation(); moveTo(d, nl.id); }}
                            style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', background: 'var(--surface-2,#F8FAFC)', border: '1px solid var(--border,#E5E7EB)', color: lane.color, cursor: 'pointer', fontFamily: 'inherit' }}>
                            → {nl.label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Deliveries;
