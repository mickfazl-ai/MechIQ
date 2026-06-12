import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const CSS = `
  @keyframes ctFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes ctShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

  .ct-wrap { animation: ctFadeUp .35s ease both; font-family:'Inter',sans-serif; }
  .ct-sk { background:linear-gradient(90deg,#F8FAFC 25%,#E5E7EB 50%,#F8FAFC 75%); background-size:200% 100%; animation:ctShimmer 1.4s infinite linear; }

  .ct-kpi { background:var(--surface,#fff); border:1px solid var(--border,#E5E7EB); padding:12px 14px; position:relative; overflow:hidden; }
  .ct-kpi::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--accent,#1976D2); }
  .ct-kpi.g::after { background:#15803D; } .ct-kpi.a::after { background:#B45309; }
  .ct-kpi.r::after { background:#B91C1C; } .ct-kpi.ai::after { background:#6366F1; }
  .ct-kpi-l { font-size:9px; font-weight:700; color:var(--text-muted,#64748B); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
  .ct-kpi-v { font-size:20px; font-weight:700; color:var(--text-primary,#0F172A); font-family:'JetBrains Mono',monospace; }
  .ct-kpi-s { font-size:9px; color:var(--text-faint,#94A3B8); margin-top:2px; }

  .ct-card { background:var(--surface,#fff); border:1px solid var(--border,#E5E7EB); }
  .ct-card-h { padding:9px 14px; border-bottom:1px solid var(--surface-2,#F1F5F9); font-size:10px; font-weight:700; color:var(--text-muted,#64748B); text-transform:uppercase; letter-spacing:.5px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .ct-card-h::before { content:''; width:3px; height:11px; background:var(--accent,#1976D2); flex-shrink:0; }

  .ct-tab { padding:9px 16px; font-size:12px; font-weight:500; color:var(--text-muted,#64748B); cursor:pointer; border:none; background:none; border-bottom:2px solid transparent; font-family:inherit; transition:all .1s; }
  .ct-tab:hover { color:var(--text-secondary,#374151); }
  .ct-tab.on { color:var(--accent,#1976D2); border-bottom-color:var(--accent,#1976D2); font-weight:600; }

  .ct-tbm-btn { padding:6px 16px; font-size:12px; font-weight:600; border:1px solid var(--border,#E5E7EB); background:var(--surface,#fff); color:var(--text-muted,#64748B); cursor:pointer; font-family:inherit; transition:all .1s; }
  .ct-tbm-btn.on { background:var(--accent,#1976D2); color:#fff; border-color:var(--accent,#1976D2); }

  .ct-btn { padding:7px 14px; background:var(--accent,#1976D2); color:#fff; border:none; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
  .ct-btn:disabled { background:#94A3B8; cursor:not-allowed; }
  .ct-btn2 { padding:7px 12px; background:var(--surface,#fff); color:var(--text-secondary,#374151); border:1px solid var(--border,#CBD5E1); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; }

  .ct-tbl { width:100%; border-collapse:collapse; }
  .ct-tbl th { background:var(--surface-2,#F8FAFC); padding:8px 12px; font-size:9px; font-weight:700; color:var(--text-muted,#94A3B8); text-align:left; border-bottom:1px solid var(--border,#E5E7EB); text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
  .ct-tbl td { padding:8px 12px; font-size:11px; color:var(--text-secondary,#374151); border-bottom:1px solid var(--surface-2,#F1F5F9); }
  .ct-tbl tr:hover td { background:var(--surface-2,#F8FAFC); }
  .ct-tbl tr:last-child td { border-bottom:none; }

  .ct-badge { display:inline-block; padding:2px 7px; font-size:9px; font-weight:700; border:1px solid; white-space:nowrap; }
  .ct-b-r { background:#FEF2F2; color:#B91C1C; border-color:#FCA5A5; }
  .ct-b-a { background:#FFFBEB; color:#B45309; border-color:#FCD34D; }
  .ct-b-g { background:#F0FDF4; color:#15803D; border-color:#86EFAC; }
  .ct-b-ai { background:#EEF2FF; color:#4338CA; border-color:#C7D2FE; }
  .ct-b-n { background:#F8FAFC; color:#64748B; border-color:#E5E7EB; }

  .ct-pos-dot { cursor:pointer; }
  .ct-pos-dot:hover { stroke:#0F172A; stroke-width:1.5px; }

  .ct-input { width:100%; padding:8px 10px; border:1px solid var(--border,#E5E7EB); background:var(--surface-2,#F8FAFC); color:var(--text-primary,#0F172A); font-size:12px; font-family:'Inter',sans-serif; outline:none; box-sizing:border-box; }
  .ct-input:focus { border-color:var(--accent,#1976D2); background:var(--surface,#fff); }
  .ct-label { font-size:9px; font-weight:700; color:var(--text-muted,#64748B); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; display:block; }

  .ct-modal { position:fixed; inset:0; background:rgba(15,23,42,.4); z-index:600; display:flex; align-items:center; justify-content:center; padding:20px; }
  .ct-modal-card { background:var(--surface,#fff); border:1px solid var(--border,#E5E7EB); border-top:3px solid var(--accent,#1976D2); padding:22px; width:100%; max-width:560px; max-height:88vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,.15); }

  .ct-ai-banner { background:#EEF2FF; border:1px solid #C7D2FE; border-left:3px solid #6366F1; padding:9px 13px; display:flex; align-items:flex-start; gap:9px; }
`;

const MONO = { fontFamily: "'JetBrains Mono',monospace" };
const HEAD_PROFILE_ID = 'a0000000-0000-0000-0000-000000006644';
const M_PER_RING = 1.7;
const ZONE_DEFAULT_M = { Centre: 2400, Face: 1450, Gauge: 480 };
const REASONS = ['Worn', 'Chipped', 'Blocked', 'Leaking', 'Flat spot', 'Preventive', 'Damaged housing'];

const wearColor = w => (w > 0.8 ? '#B91C1C' : w > 0.5 ? '#B45309' : '#15803D');
const fmtD = d => (d ? new Date(d).toLocaleDateString('en-AU') : '—');
const fmtN = (n, dp = 0) => (n === null || n === undefined || isNaN(n) ? '—' : Number(n).toLocaleString('en-AU', { maximumFractionDigits: dp, minimumFractionDigits: 0 }));

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ h = '60px' }) { return <div className="ct-sk" style={{ height: h, marginBottom: 10 }} />; }

// ─── Cutterhead SVG wear map ──────────────────────────────────────────────────
function HeadMap({ positions, wear, selected, onSelect }) {
  if (!positions.length) return <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: 'var(--text-faint,#94A3B8)' }}>No head profile loaded</div>;
  const maxR = Math.max(...positions.map(p => Number(p.track_radius_mm)));
  const scale = 132 / maxR;
  const zones = {};
  positions.forEach(p => { (zones[p.zone] = zones[p.zone] || []).push(p); });
  Object.values(zones).forEach(list => list.sort((a, b) => Number(a.track_radius_mm) - Number(b.track_radius_mm)));
  const dots = [];
  Object.entries(zones).forEach(([zone, list], zi) => {
    list.forEach((p, i) => {
      const ang = (i / list.length) * Math.PI * 2 - Math.PI / 2 + zi * 0.35;
      const r = Math.max(14, Number(p.track_radius_mm) * scale);
      dots.push({ ...p, x: 150 + Math.cos(ang) * r, y: 150 + Math.sin(ang) * r });
    });
  });
  return (
    <svg viewBox="0 0 300 304" width="100%" style={{ maxWidth: 320, display: 'block', margin: '0 auto' }}>
      <circle cx="150" cy="150" r="138" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
      {[40, 75, 105, 132].map(r => <circle key={r} cx="150" cy="150" r={r} fill="none" stroke="#E5E7EB" strokeWidth="0.5" />)}
      <line x1="150" y1="14" x2="150" y2="286" stroke="#E5E7EB" strokeWidth="0.5" />
      <line x1="14" y1="150" x2="286" y2="150" stroke="#E5E7EB" strokeWidth="0.5" />
      {dots.map(p => {
        const w = wear[p.position_no] ?? 0.1;
        const sel = selected === p.position_no;
        return (
          <g key={p.position_no} onClick={() => onSelect(p.position_no)} className="ct-pos-dot">
            <circle cx={p.x} cy={p.y} r={sel ? 10 : 8} fill={wearColor(w)} opacity="0.92" stroke={sel ? '#0F172A' : 'none'} strokeWidth={sel ? 1.5 : 0} />
            <text x={p.x} y={p.y + 2.8} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700" pointerEvents="none" fontFamily="Inter">{p.position_no}</text>
          </g>
        );
      })}
      <text x="150" y="300" textAnchor="middle" fontSize="8" fill="#94A3B8" fontFamily="Inter">Inner: Centre · Mid: Face · Outer: Gauge</text>
    </svg>
  );
}

// ─── Log Change Modal ─────────────────────────────────────────────────────────
function LogChangeModal({ tbm, positions, latest, companyId, prefillPos, onClose, onSaved }) {
  const blank = {
    change_date: new Date().toISOString().split('T')[0], shift: 'DS',
    ring_no: latest?.ring_no || '', chainage_m: latest?.chainage_m || '', metres_excavated: latest?.metres_excavated || '',
    position_no: prefillPos || '', cutter_out: '', cutter_in: '', cutter_type: 'TCI',
    cutter_size_in: 19, reason: 'Worn', wear_mm: '', fitter: '', notes: '',
  };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.position_no) { alert('Position is required'); return; }
    setBusy(true);
    try {
      const payload = {
        company_id: companyId, tbm_name: tbm,
        change_date: form.change_date, shift: form.shift,
        ring_no: form.ring_no ? parseInt(form.ring_no) : null,
        chainage_m: form.chainage_m ? parseFloat(form.chainage_m) : null,
        metres_excavated: form.metres_excavated ? parseFloat(form.metres_excavated) : null,
        position_no: String(form.position_no),
        cutter_out: form.cutter_out || null, cutter_in: form.cutter_in || null,
        cutter_type: form.cutter_type, cutter_size_in: parseFloat(form.cutter_size_in) || 19,
        reason: form.reason, wear_mm: form.wear_mm ? parseFloat(form.wear_mm) : null,
        fitter: form.fitter || null, notes: form.notes || null,
      };
      const { error } = await supabase.from('tbm_cutter_changes').insert([payload]);
      if (error) { alert('Save failed: ' + error.message); return; }
      // Update cutter inventory statuses (best-effort)
      if (form.cutter_out) {
        try { await supabase.from('tbm_cutters').update({ status: 'used', current_tbm: null, current_position: null }).eq('company_id', companyId).eq('cutter_id', form.cutter_out); } catch (e) {}
      }
      if (form.cutter_in) {
        try {
          const { data: existing } = await supabase.from('tbm_cutters').select('id').eq('company_id', companyId).eq('cutter_id', form.cutter_in).maybeSingle();
          if (existing) {
            await supabase.from('tbm_cutters').update({ status: 'installed', current_tbm: tbm, current_position: String(form.position_no) }).eq('id', existing.id);
          } else {
            await supabase.from('tbm_cutters').insert([{ company_id: companyId, cutter_id: form.cutter_in, cutter_type: form.cutter_type, size_in: parseFloat(form.cutter_size_in) || 19, status: 'installed', current_tbm: tbm, current_position: String(form.position_no) }]);
          }
        } catch (e) {}
      }
      onSaved();
      onClose();
    } catch (err) {
      alert('Save failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  const posInfo = positions.find(p => p.position_no === String(form.position_no));

  return (
    <div className="ct-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ct-modal-card">
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary,#0F172A)', marginBottom: 2, letterSpacing: '-0.3px' }}>Log cutter change — {tbm}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted,#64748B)', marginBottom: 18 }}>Mirrors the CTP cutter change record</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label className="ct-label">Date</label><input type="date" className="ct-input" value={form.change_date} onChange={e => F('change_date', e.target.value)} /></div>
          <div><label className="ct-label">Shift</label>
            <select className="ct-input" value={form.shift} onChange={e => F('shift', e.target.value)}>
              <option value="DS">Day shift</option><option value="NS">Night shift</option>
            </select>
          </div>
          <div><label className="ct-label">Fitter</label><input className="ct-input" value={form.fitter} onChange={e => F('fitter', e.target.value)} placeholder="Name" /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label className="ct-label">Ring no</label><input type="number" className="ct-input" value={form.ring_no} onChange={e => F('ring_no', e.target.value)} /></div>
          <div><label className="ct-label">Chainage (m)</label><input type="number" step="0.01" className="ct-input" value={form.chainage_m} onChange={e => F('chainage_m', e.target.value)} /></div>
          <div><label className="ct-label">Metres exc (cum.)</label><input type="number" step="0.01" className="ct-input" value={form.metres_excavated} onChange={e => F('metres_excavated', e.target.value)} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label className="ct-label">Position</label>
            <select className="ct-input" value={form.position_no} onChange={e => F('position_no', e.target.value)}>
              <option value="">Select…</option>
              {positions.map(p => <option key={p.position_no} value={p.position_no}>{p.position_no} — {p.zone}</option>)}
            </select>
          </div>
          <div>
            <label className="ct-label">Type</label>
            <select className="ct-input" value={form.cutter_type} onChange={e => F('cutter_type', e.target.value)}>
              <option value="TCI">TCI (tungsten)</option><option value="HD">HD disc</option>
            </select>
          </div>
          <div>
            <label className="ct-label">Cutter size</label>
            <select className="ct-input" value={form.cutter_size_in} onChange={e => F('cutter_size_in', e.target.value)}>
              <option value="17">17"</option><option value="18">18"</option><option value="19">19"</option><option value="20">20"</option>
            </select>
          </div>
        </div>

        {posInfo && (
          <div style={{ background: 'var(--surface-2,#F8FAFC)', border: '1px solid var(--border,#E5E7EB)', padding: '7px 11px', marginBottom: 12, fontSize: 10, color: 'var(--text-muted,#64748B)' }}>
            Position {posInfo.position_no}: track radius <strong style={MONO}>{fmtN(posInfo.track_radius_mm)} mm</strong> · rolls <strong style={MONO}>{(2 * Math.PI * posInfo.track_radius_mm / 1000).toFixed(2)} m</strong> per head rev
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label className="ct-label">Cutter out (ID)</label><input className="ct-input" value={form.cutter_out} onChange={e => F('cutter_out', e.target.value)} placeholder="e.g. C-0884" /></div>
          <div><label className="ct-label">Cutter in (ID)</label><input className="ct-input" value={form.cutter_in} onChange={e => F('cutter_in', e.target.value)} placeholder="e.g. C-1042" /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label className="ct-label">Reason</label>
            <select className="ct-input" value={form.reason} onChange={e => F('reason', e.target.value)}>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="ct-label">Measured wear (mm)</label><input type="number" step="0.1" className="ct-input" value={form.wear_mm} onChange={e => F('wear_mm', e.target.value)} /></div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="ct-label">Notes</label>
          <textarea className="ct-input" rows={2} value={form.notes} onChange={e => F('notes', e.target.value)} placeholder="Ground conditions, housing condition, etc." />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ct-btn2" onClick={onClose}>Cancel</button>
          <button className="ct-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Log change'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Advance Update Modal ─────────────────────────────────────────────────────
function AdvanceModal({ tbm, latest, companyId, onClose, onSaved }) {
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split('T')[0], shift: 'DS',
    ring_no: latest?.ring_no || '', chainage_m: latest?.chainage_m || '',
    metres_advanced: '', md_hours: '', advance_hours: '',
  });
  const [busy, setBusy] = useState(false);
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from('tbm_advance_log').upsert([{
        company_id: companyId, tbm_name: tbm, log_date: form.log_date, shift: form.shift,
        ring_no: form.ring_no ? parseInt(form.ring_no) : null,
        chainage_m: form.chainage_m ? parseFloat(form.chainage_m) : null,
        metres_advanced: form.metres_advanced ? parseFloat(form.metres_advanced) : null,
        md_hours: form.md_hours ? parseFloat(form.md_hours) : null,
        advance_hours: form.advance_hours ? parseFloat(form.advance_hours) : null,
      }], { onConflict: 'company_id,tbm_name,log_date,shift' });
      if (error) { alert('Save failed: ' + error.message); return; }
      onSaved(); onClose();
    } catch (err) { alert('Save failed: ' + (err?.message || 'Unknown')); }
    finally { setBusy(false); }
  };
  return (
    <div className="ct-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ct-modal-card" style={{ maxWidth: 460 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary,#0F172A)', marginBottom: 14, letterSpacing: '-0.3px' }}>Update advance — {tbm}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label className="ct-label">Date</label><input type="date" className="ct-input" value={form.log_date} onChange={e => F('log_date', e.target.value)} /></div>
          <div><label className="ct-label">Shift</label>
            <select className="ct-input" value={form.shift} onChange={e => F('shift', e.target.value)}>
              <option value="DS">Day shift</option><option value="NS">Night shift</option>
            </select>
          </div>
          <div><label className="ct-label">Current ring</label><input type="number" className="ct-input" value={form.ring_no} onChange={e => F('ring_no', e.target.value)} /></div>
          <div><label className="ct-label">Chainage (m)</label><input type="number" step="0.01" className="ct-input" value={form.chainage_m} onChange={e => F('chainage_m', e.target.value)} /></div>
          <div><label className="ct-label">Metres this shift</label><input type="number" step="0.01" className="ct-input" value={form.metres_advanced} onChange={e => F('metres_advanced', e.target.value)} /></div>
          <div><label className="ct-label">MD hours</label><input type="number" step="0.1" className="ct-input" value={form.md_hours} onChange={e => F('md_hours', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ct-btn2" onClick={onClose}>Cancel</button>
          <button className="ct-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function CutterTracker({ userRole }) {
  const [companyId, setCompanyId] = useState(null);
  const [tbms, setTbms] = useState(['TBM 3', 'TBM 4']);
  const [tbm, setTbm] = useState('TBM 3');
  const [tab, setTab] = useState('overview');
  const [positions, setPositions] = useState([]);
  const [changes, setChanges] = useState([]);
  const [cutters, setCutters] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPos, setSelectedPos] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [filterPos, setFilterPos] = useState('');
  const isAdmin = userRole === 'admin';

  // ── Resolve company ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const { data: prof } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
            if (prof?.company_id) { setCompanyId(prof.company_id); return; }
          } catch (e) {}
          try {
            const { data: prof2 } = await supabase.from('users').select('company_id').eq('id', user.id).maybeSingle();
            if (prof2?.company_id) { setCompanyId(prof2.company_id); return; }
          } catch (e) {}
        }
      } catch (e) {}
      setCompanyId(null);
    })();
  }, []);

  // ── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pos } = await supabase.from('tbm_cutter_positions').select('*').eq('head_profile_id', HEAD_PROFILE_ID).order('track_radius_mm');
      setPositions(pos || []);

      let chQ = supabase.from('tbm_cutter_changes').select('*').eq('tbm_name', tbm).order('change_date', { ascending: false }).order('created_at', { ascending: false }).limit(500);
      if (companyId) chQ = chQ.eq('company_id', companyId);
      const { data: ch } = await chQ;
      setChanges(ch || []);

      let cuQ = supabase.from('tbm_cutters').select('*').order('cutter_id');
      if (companyId) cuQ = cuQ.eq('company_id', companyId);
      const { data: cu } = await cuQ;
      setCutters(cu || []);

      let advQ = supabase.from('tbm_advance_log').select('*').eq('tbm_name', tbm).order('log_date', { ascending: false }).limit(1);
      if (companyId) advQ = advQ.eq('company_id', companyId);
      const { data: adv } = await advQ;
      const a = adv && adv[0];
      const c = ch && ch[0];
      setLatest({
        ring_no: a?.ring_no ?? c?.ring_no ?? null,
        chainage_m: a?.chainage_m ?? c?.chainage_m ?? null,
        metres_excavated: c?.metres_excavated ?? null,
      });
    } catch (e) {}
    setLoading(false);
  }, [tbm, companyId]);

  useEffect(() => { load(); }, [load]);

  // ── Derived: per-position stats + wear ────────────────────────────────────
  const posStats = {};
  positions.forEach(p => {
    const list = changes.filter(c => String(c.position_no) === String(p.position_no)).sort((a, b) => (a.metres_excavated || 0) - (b.metres_excavated || 0));
    const diffs = [];
    for (let i = 1; i < list.length; i++) {
      const d = (list[i].metres_excavated || 0) - (list[i - 1].metres_excavated || 0);
      if (d > 0) diffs.push(d);
    }
    const avgBetween = diffs.length ? diffs.reduce((s, x) => s + x, 0) / diffs.length : ZONE_DEFAULT_M[p.zone] || 1400;
    const last = list[list.length - 1];
    const currentM = latest?.metres_excavated || (last?.metres_excavated || 0);
    const mSince = last ? Math.max(0, currentM - (last.metres_excavated || 0)) : currentM * 0.3;
    posStats[p.position_no] = {
      last, avgBetween, mSince,
      wear: Math.min(0.98, avgBetween > 0 ? mSince / avgBetween : 0.1),
      changeCount: list.length,
    };
  });
  const wearMap = {};
  Object.entries(posStats).forEach(([k, v]) => { wearMap[k] = v.wear; });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalChanges = changes.length;
  const currentM = latest?.metres_excavated || 0;
  const lmPerCutter = totalChanges > 0 ? currentM / totalChanges : null;
  const repairSpend = cutters.reduce((s, c) => s + (parseFloat(c.repair_cost_total) || 0), 0);
  const dueCount = Object.values(posStats).filter(s => s.wear > 0.8).length;

  // ── AI insight (rule-based v1) ────────────────────────────────────────────
  const worst = positions
    .map(p => ({ ...p, ...posStats[p.position_no] }))
    .filter(p => p.changeCount > 0)
    .sort((a, b) => a.avgBetween - b.avgBetween)
    .slice(0, 3);
  const due = positions.map(p => ({ ...p, ...posStats[p.position_no] })).filter(p => p.wear > 0.8);
  let aiText = 'Log cutter changes and advance data to activate wear predictions.';
  if (totalChanges > 0) {
    const parts = [];
    if (due.length) parts.push(`${due.length} position${due.length > 1 ? 's' : ''} (${due.slice(0, 4).map(p => p.position_no).join(', ')}) past 80% of historical change interval — plan intervention${latest?.ring_no ? ` near ring ${fmtN(latest.ring_no + 35)}` : ''}.`);
    if (worst.length) parts.push(`Lowest-life positions: ${worst.map(w => `${w.position_no} (${fmtN(w.avgBetween)}m avg)`).join(', ')}.`);
    aiText = parts.join(' ') || 'All positions within normal change intervals.';
  }

  const exportLog = () => {
    const rows = changes.map(c => `<tr><td>${fmtD(c.change_date)}</td><td>${c.shift || ''}</td><td>${fmtN(c.ring_no)}</td><td>${fmtN(c.chainage_m, 1)}</td><td>${c.position_no}</td><td>${c.cutter_out || '—'}</td><td>${c.cutter_in || '—'}</td><td>${c.cutter_type || ''} ${c.cutter_size_in ? c.cutter_size_in + '"' : ''}</td><td>${c.reason || ''}</td><td>${c.fitter || ''}</td></tr>`).join('');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Cutter change log — ${tbm}</title><style>body{font-family:Inter,sans-serif;padding:30px;}h2{font-size:18px;margin-bottom:4px;}p{color:#64748b;font-size:12px;margin-bottom:18px;}table{width:100%;border-collapse:collapse;font-size:11px;}th{background:#f1f5f9;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.4px;color:#64748b;border-bottom:2px solid #e5e7eb;}td{padding:7px 10px;border-bottom:1px solid #f1f5f9;}</style></head><body><h2>Cutter change log — ${tbm}</h2><p>${changes.length} records · Ring ${fmtN(latest?.ring_no)} · CH ${fmtN(latest?.chainage_m, 1)} · Exported ${new Date().toLocaleDateString('en-AU')} · MechIQ</p><table><thead><tr><th>Date</th><th>Shift</th><th>Ring</th><th>Chainage</th><th>Pos</th><th>Out</th><th>In</th><th>Type</th><th>Reason</th><th>Fitter</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const filteredChanges = filterPos ? changes.filter(c => String(c.position_no) === String(filterPos)) : changes;
  const selStat = selectedPos ? posStats[selectedPos] : null;
  const selPos = selectedPos ? positions.find(p => p.position_no === selectedPos) : null;

  const invCounts = { fresh: 0, installed: 0, used: 0, at_repair: 0, with_vendor: 0 };
  cutters.forEach(c => { if (invCounts[c.status] !== undefined) invCounts[c.status]++; });

  return (
    <div className="ct-wrap">
      <style>{CSS}</style>

      {showLog && <LogChangeModal tbm={tbm} positions={positions} latest={latest} companyId={companyId} prefillPos={selectedPos} onClose={() => setShowLog(false)} onSaved={load} />}
      {showAdvance && <AdvanceModal tbm={tbm} latest={latest} companyId={companyId} onClose={() => setShowAdvance(false)} onSaved={load} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary,#0F172A)', letterSpacing: '-0.4px', marginBottom: 2 }}>Cutter tracker</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted,#64748B)' }}>Ø{fmtN(7010)}mm head · 19" disc cutters · drawing 6644A-002-000-00</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tbms.map(t => <button key={t} className={`ct-tbm-btn${tbm === t ? ' on' : ''}`} onClick={() => { setTbm(t); setSelectedPos(null); }}>{t}</button>)}
          <button className="ct-btn2" onClick={() => setShowAdvance(true)}>Update advance</button>
          <button className="ct-btn" onClick={() => setShowLog(true)}>+ Log cutter change</button>
        </div>
      </div>

      {loading ? <><Sk h="70px" /><Sk h="280px" /></> : <>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 12 }}>
          <div className="ct-kpi"><div className="ct-kpi-l">Current ring</div><div className="ct-kpi-v">{fmtN(latest?.ring_no)}</div><div className="ct-kpi-s">latest logged</div></div>
          <div className="ct-kpi"><div className="ct-kpi-l">Chainage</div><div className="ct-kpi-v" style={{ fontSize: 16 }}>{fmtN(latest?.chainage_m, 1)}</div><div className="ct-kpi-s">metres</div></div>
          <div className="ct-kpi g"><div className="ct-kpi-l">Metres excavated</div><div className="ct-kpi-v">{fmtN(currentM)}</div><div className="ct-kpi-s">cumulative</div></div>
          <div className="ct-kpi a"><div className="ct-kpi-l">Total changes</div><div className="ct-kpi-v">{fmtN(totalChanges)}</div><div className="ct-kpi-s">{tbm}</div></div>
          <div className="ct-kpi ai"><div className="ct-kpi-l">M per cutter</div><div className="ct-kpi-v">{lmPerCutter ? fmtN(lmPerCutter, 1) : '—'}</div><div className="ct-kpi-s">avg interval</div></div>
          <div className="ct-kpi r"><div className="ct-kpi-l">Changes due</div><div className="ct-kpi-v" style={{ color: dueCount > 0 ? '#B91C1C' : undefined }}>{dueCount}</div><div className="ct-kpi-s">positions &gt;80%</div></div>
        </div>

        {/* AI banner */}
        <div className="ct-ai-banner" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 8, fontWeight: 800, background: '#6366F1', color: '#fff', padding: '2px 6px', letterSpacing: '.4px', flexShrink: 0, marginTop: 1 }}>AI</span>
          <span style={{ fontSize: 11, color: '#4338CA', lineHeight: 1.5 }}>{aiText}</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border,#E5E7EB)', marginBottom: 14 }}>
          {[['overview', 'Wear map'], ['log', `Change log (${totalChanges})`], ['inventory', `Inventory (${cutters.length})`], ['profile', 'Head profile']].map(([id, label]) => (
            <button key={id} className={`ct-tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 12, alignItems: 'start' }}>
            <div className="ct-card">
              <div className="ct-card-h">Cutterhead wear map
                <span style={{ display: 'flex', gap: 8, fontSize: 9, color: 'var(--text-muted,#64748B)', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
                  <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#15803D', marginRight: 3 }} />Fresh</span>
                  <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#B45309', marginRight: 3 }} />Mid</span>
                  <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#B91C1C', marginRight: 3 }} />Due</span>
                </span>
              </div>
              <div style={{ padding: 10 }}>
                <HeadMap positions={positions} wear={wearMap} selected={selectedPos} onSelect={setSelectedPos} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ct-card">
                <div className="ct-card-h">Position detail</div>
                <div style={{ padding: '12px 14px' }}>
                  {!selPos ? (
                    <div style={{ fontSize: 12, color: 'var(--text-faint,#94A3B8)', textAlign: 'center', padding: '18px 0' }}>Click a position on the wear map</div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div><span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary,#0F172A)' }}>Position {selPos.position_no}</span> <span style={{ fontSize: 11, color: 'var(--text-muted,#64748B)' }}>· {selPos.zone} · {selPos.cutter_size_in || 19}"</span></div>
                        <span className={`ct-badge ${selStat.wear > 0.8 ? 'ct-b-r' : selStat.wear > 0.5 ? 'ct-b-a' : 'ct-b-g'}`}>{selStat.wear > 0.8 ? 'Change due' : selStat.wear > 0.5 ? 'Mid-life' : 'Fresh'}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-2,#F1F5F9)', marginBottom: 10 }}>
                        <div style={{ height: '100%', width: `${Math.round(selStat.wear * 100)}%`, background: wearColor(selStat.wear) }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--surface-2,#F1F5F9)' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>Track radius</span><span style={MONO}>{fmtN(selPos.track_radius_mm)} mm</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--surface-2,#F1F5F9)' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>Rolls per head rev</span><span style={MONO}>{(2 * Math.PI * selPos.track_radius_mm / 1000).toFixed(2)} m</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--surface-2,#F1F5F9)' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>Installed cutter</span><span style={MONO}>{selStat.last?.cutter_in || '—'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--surface-2,#F1F5F9)' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>Installed at ring</span><span style={MONO}>{fmtN(selStat.last?.ring_no)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--surface-2,#F1F5F9)' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>M since change</span><span style={MONO}>{fmtN(selStat.mSince)} m</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--surface-2,#F1F5F9)' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>Avg between changes</span><span style={MONO}>{fmtN(selStat.avgBetween)} m</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: 'var(--text-faint,#94A3B8)' }}>Changes at position</span><span style={MONO}>{selStat.changeCount}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ color: '#6366F1', fontWeight: 600 }}>Predicted change</span><span style={{ ...MONO, color: '#6366F1', fontWeight: 700 }}>{latest?.ring_no ? `Ring ${fmtN(latest.ring_no + Math.max(0, Math.round((selStat.avgBetween - selStat.mSince) / M_PER_RING)))}` : '—'}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <button className="ct-btn" style={{ flex: 1 }} onClick={() => setShowLog(true)}>Log change here</button>
                        <button className="ct-btn2" style={{ flex: 1 }} onClick={() => { setFilterPos(selPos.position_no); setTab('log'); }}>Position history</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ct-card">
                <div className="ct-card-h">Lowest-life positions (avg m between changes)</div>
                <div style={{ padding: '10px 14px' }}>
                  {worst.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--text-faint,#94A3B8)' }}>Needs at least 2 changes per position to compute.</div>
                  ) : worst.map(w => (
                    <div key={w.position_no} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary,#374151)', width: 120, flexShrink: 0 }}>Pos {w.position_no} · {w.zone}</span>
                      <div style={{ flex: 1, height: 10, background: 'var(--surface-2,#F8FAFC)' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.round(w.avgBetween / 2400 * 100))}%`, background: '#B91C1C', opacity: .65 }} />
                      </div>
                      <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: '#B91C1C', width: 56, textAlign: 'right' }}>{fmtN(w.avgBetween)} m</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Change log ── */}
        {tab === 'log' && (
          <div className="ct-card">
            <div className="ct-card-h">
              Cutter change log
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
                <select className="ct-input" style={{ width: 150, padding: '5px 8px' }} value={filterPos} onChange={e => setFilterPos(e.target.value)}>
                  <option value="">All positions</option>
                  {positions.map(p => <option key={p.position_no} value={p.position_no}>Position {p.position_no}</option>)}
                </select>
                <button className="ct-btn2" style={{ padding: '5px 10px' }} onClick={exportLog}>Export PDF</button>
              </span>
            </div>
            {filteredChanges.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', fontSize: 12, color: 'var(--text-faint,#94A3B8)' }}>No changes logged yet — hit "+ Log cutter change" to record the first one.</div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                <table className="ct-tbl">
                  <thead><tr><th>Date</th><th>Shift</th><th>Ring</th><th>Chainage</th><th>Pos</th><th>Out</th><th>In</th><th>Type</th><th>Reason</th><th>Wear</th><th>Fitter</th></tr></thead>
                  <tbody>
                    {filteredChanges.map(c => (
                      <tr key={c.id}>
                        <td style={MONO}>{fmtD(c.change_date)}</td>
                        <td>{c.shift || '—'}</td>
                        <td style={MONO}>{fmtN(c.ring_no)}</td>
                        <td style={MONO}>{fmtN(c.chainage_m, 1)}</td>
                        <td style={{ fontWeight: 700 }}>{c.position_no}</td>
                        <td style={MONO}>{c.cutter_out || '—'}</td>
                        <td style={MONO}>{c.cutter_in || '—'}</td>
                        <td><span className={`ct-badge ${c.cutter_type === 'TCI' ? 'ct-b-ai' : 'ct-b-g'}`}>{c.cutter_type || '—'}{c.cutter_size_in ? ` ${c.cutter_size_in}"` : ''}</span></td>
                        <td><span className={`ct-badge ${['Worn', 'Flat spot'].includes(c.reason) ? 'ct-b-r' : ['Chipped', 'Blocked', 'Leaking'].includes(c.reason) ? 'ct-b-a' : 'ct-b-n'}`}>{c.reason || '—'}</span></td>
                        <td style={MONO}>{c.wear_mm ? c.wear_mm + ' mm' : '—'}</td>
                        <td>{c.fitter || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Inventory ── */}
        {tab === 'inventory' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
              <div className="ct-kpi g"><div className="ct-kpi-l">Fresh on site</div><div className="ct-kpi-v">{invCounts.fresh}</div></div>
              <div className="ct-kpi"><div className="ct-kpi-l">Installed</div><div className="ct-kpi-v">{invCounts.installed}</div></div>
              <div className="ct-kpi a"><div className="ct-kpi-l">Used on site</div><div className="ct-kpi-v">{invCounts.used}</div></div>
              <div className="ct-kpi ai"><div className="ct-kpi-l">At repair</div><div className="ct-kpi-v">{invCounts.at_repair}</div></div>
              <div className="ct-kpi r"><div className="ct-kpi-l">Repair spend</div><div className="ct-kpi-v" style={{ fontSize: 15 }}>${fmtN(repairSpend)}</div></div>
            </div>
            <div className="ct-card">
              <div className="ct-card-h">Cutter register</div>
              {cutters.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', fontSize: 12, color: 'var(--text-faint,#94A3B8)' }}>No cutters registered. Cutters are auto-created when you log a change with a new ID.</div>
              ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  <table className="ct-tbl">
                    <thead><tr><th>Cutter ID</th><th>Type</th><th>Size</th><th>Status</th><th>Location</th><th>Repairs</th><th>Repair cost</th></tr></thead>
                    <tbody>
                      {cutters.map(c => (
                        <tr key={c.id}>
                          <td style={{ ...MONO, fontWeight: 600 }}>{c.cutter_id}</td>
                          <td><span className={`ct-badge ${c.cutter_type === 'TCI' ? 'ct-b-ai' : 'ct-b-g'}`}>{c.cutter_type}</span></td>
                          <td style={MONO}>{c.size_in}"</td>
                          <td><span className={`ct-badge ${c.status === 'fresh' ? 'ct-b-g' : c.status === 'installed' ? 'ct-b-ai' : c.status === 'at_repair' ? 'ct-b-a' : 'ct-b-n'}`}>{(c.status || '').replace('_', ' ')}</span></td>
                          <td>{c.status === 'installed' ? `${c.current_tbm} · Pos ${c.current_position}` : '—'}</td>
                          <td style={MONO}>{c.repair_count || 0}</td>
                          <td style={MONO}>${fmtN(c.repair_cost_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Head profile ── */}
        {tab === 'profile' && (
          <div className="ct-card">
            <div className="ct-card-h">Head profile — 6644A-002-000-00 · Ø7,010mm bore · extracted by AI drawing scan</div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              <table className="ct-tbl">
                <thead><tr><th>Position</th><th>Zone</th><th>Track radius</th><th>Rolls per head rev</th><th>Cutter rotations per head rev (19")</th><th>Cutter size</th></tr></thead>
                <tbody>
                  {positions.map(p => {
                    const lmRev = 2 * Math.PI * p.track_radius_mm / 1000;
                    const tipCirc = Math.PI * (p.cutter_size_in || 19) * 25.4 / 1000;
                    return (
                      <tr key={p.position_no}>
                        <td style={{ fontWeight: 700 }}>{p.position_no}</td>
                        <td><span className={`ct-badge ${p.zone === 'Gauge' ? 'ct-b-a' : p.zone === 'Centre' ? 'ct-b-ai' : 'ct-b-n'}`}>{p.zone}</span></td>
                        <td style={MONO}>{fmtN(p.track_radius_mm, 2)} mm</td>
                        <td style={MONO}>{lmRev.toFixed(3)} m</td>
                        <td style={MONO}>{(lmRev / tipCirc).toFixed(2)}</td>
                        <td style={MONO}>{p.cutter_size_in || 19}"</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

export default CutterTracker;
