import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { QRCodeCanvas } from 'qrcode.react';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
  @keyframes spin { to{transform:rotate(360deg)} }

  .mp-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px 22px; box-shadow:var(--shadow-sm); }
  .mp-row { transition:background 0.1s; }
  .mp-row:hover { background:var(--surface-2); }
  .mp-start-btn { width:100%; padding:14px; background:linear-gradient(135deg,var(--accent),#0096cc); color:#fff; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; font-family:inherit; letter-spacing:0.5px; box-shadow:0 6px 20px rgba(0,171,228,0.35); transition:all 0.2s; margin-bottom:20px; }
  .mp-start-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,171,228,0.45); }

  .mp-tabs { display:flex; gap:3px; background:var(--surface-2); border-radius:12px; padding:4px; margin-bottom:20px; border:1px solid var(--border); flex-wrap:wrap; }
  .mp-tab { padding:8px 16px; border:none; border-radius:9px; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.15s; font-family:inherit; white-space:nowrap; }
  .mp-tab.active { background:var(--surface); color:var(--accent); box-shadow:0 1px 6px rgba(0,0,0,0.1); }
  .mp-tab:not(.active) { background:transparent; color:var(--text-muted); }
  .mp-tab:not(.active):hover { color:var(--text-secondary); }

  .mp-input { width:100%; padding:9px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface-2); color:var(--text-primary); font-size:13px; font-family:inherit; outline:none; box-sizing:border-box; transition:border-color 0.15s; }
  .mp-input:focus { border-color:var(--accent); }
  .mp-label { display:block; font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }
  .mp-section-title { font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; }
  .mp-section-title::before { content:''; width:3px; height:14px; background:var(--accent); border-radius:2px; flex-shrink:0; }

  .traffic-light { display:inline-flex; align-items:center; gap:6px; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .tl-ok    { background:var(--green-bg);  color:var(--green);  border:1px solid var(--green-border); }
  .tl-warn  { background:var(--amber-bg);  color:var(--amber);  border:1px solid var(--amber-border); }
  .tl-alert { background:var(--red-bg);    color:var(--red);    border:1px solid var(--red-border); }

  .mp-stat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; margin-bottom:16px; }
  .mp-stat { background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:12px 14px; }
  .mp-stat-val { font-size:22px; font-weight:800; color:var(--accent); font-family:var(--font-display); }
  .mp-stat-lbl { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:3px; }
`;

const STATUS_COLOR = {
  Running:     { c:'var(--green)', bg:'var(--green-bg)', pulse:false },
  Down:        { c:'var(--red)',   bg:'var(--red-bg)',   pulse:true  },
  Maintenance: { c:'var(--amber)', bg:'var(--amber-bg)', pulse:false },
  Active:      { c:'var(--green)', bg:'var(--green-bg)', pulse:false },
  Standby:     { c:'var(--purple)',bg:'var(--surface-2)',pulse:false },
};
const PRIORITY_COLOR = { Critical:'var(--red)', High:'#ea580c', Medium:'var(--amber)', Low:'var(--green)' };

function Sk({ w='100%', h='13px' }) {
  return <div style={{ width:w, height:h, borderRadius:6, background:'linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite linear' }} />;
}

function StatusPill({ status }) {
  const s = STATUS_COLOR[status] || { c:'var(--text-muted)', bg:'#f1f5f9', pulse:false };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:s.bg, color:s.c, fontSize:12, fontWeight:700 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.c, animation:s.pulse?'pulse-dot 1.8s ease-in-out infinite':'none' }} />
      {status}
    </span>
  );
}

function SectionHead({ title, count, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:14, paddingBottom:12, borderBottom:'1.5px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text-primary)' }}>{title}</span>
        {count !== undefined && <span style={{ background:'var(--accent-light)', color:'var(--accent)', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{count}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ asset, recentPrestarts, recentMaintenance }) {
  const fields = [
    ['Make / Model', [asset.make, asset.model].filter(Boolean).join(' ') || '—'],
    ['Year', asset.year || '—'],
    ['Type', asset.type || '—'],
    ['Location', asset.location || '—'],
    ['Serial Number', asset.serial_number || '—'],
    ['Engine Number', asset.engine_number || '—'],
    ['Registration', asset.registration || '—'],
    ['Reg Expiry', asset.registration_expiry || '—'],
    ['Insurance', asset.insurance_policy || '—'],
    ['Ins Expiry', asset.insurance_expiry || '—'],
    ['Purchase Date', asset.purchase_date || '—'],
    ['Purchase Price', asset.purchase_price ? `$${Number(asset.purchase_price).toLocaleString()}` : '—'],
    ['Current Hours', asset.hours ? `${asset.hours.toLocaleString()} hrs` : '—'],
    ['Target Hrs/Day', asset.target_hours ? `${asset.target_hours}h` : '—'],
    ['Hourly Rate', asset.hourly_rate ? `$${asset.hourly_rate}/hr` : '—'],
    ['Colour', asset.colour || '—'],
    ['GVM', asset.gvm ? `${asset.gvm} kg` : '—'],
    ['Tare Weight', asset.tare_weight ? `${asset.tare_weight} kg` : '—'],
  ];

  return (
    <div>
      <div className="mp-card" style={{ marginBottom:14 }}>
        <div className="mp-section-title">Asset Details</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'8px 20px' }}>
          {fields.map(([k, v]) => (
            <div key={k} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{k}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{v}</div>
            </div>
          ))}
        </div>
        {asset.notes && (
          <div style={{ marginTop:14, padding:'12px 14px', background:'var(--surface-2)', borderRadius:8, border:'1px solid var(--border)', fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>Notes</div>
            {asset.notes}
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div className="mp-card">
          <SectionHead title="Recent Prestarts" count={recentPrestarts.length} />
          {recentPrestarts.length === 0 ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>No prestarts yet</div>
          : recentPrestarts.map(p => (
            <div key={p.id} className="mp-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{p.date}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{p.operator_name}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:p.defects_found?'var(--red-bg)':'var(--green-bg)', color:p.defects_found?'var(--red)':'var(--green)' }}>
                {p.defects_found ? 'Defects' : 'Clear'}
              </span>
            </div>
          ))}
        </div>
        <div className="mp-card">
          <SectionHead title="Recent Maintenance" count={recentMaintenance.length} />
          {recentMaintenance.length === 0 ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>No maintenance records</div>
          : recentMaintenance.map(m => {
            const sc = { Overdue:['var(--red)','var(--red-bg)'], 'Due Soon':['var(--amber)','var(--amber-bg)'], Upcoming:['var(--accent)','var(--accent-light)'], Completed:['var(--green)','var(--green-bg)'] };
            const [c, bg] = sc[m.status] || ['var(--text-muted)','var(--surface-2)'];
            return (
              <div key={m.id} className="mp-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{m.task}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{m.next_due}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:bg, color:c, whiteSpace:'nowrap' }}>{m.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Work Orders ─────────────────────────────────────────────────────────
function WorkOrdersTab({ asset, userRole }) {
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ defect_description:'', priority:'Medium', assigned_to:'', due_date:'', comments:'' });

  useEffect(() => { load(); }, [asset]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('work_orders').select('*').eq('asset', asset.name).eq('company_id', asset.company_id).order('created_at', { ascending: false });
    setWos(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!form.defect_description) return;
    await supabase.from('work_orders').insert({ ...form, asset: asset.name, company_id: asset.company_id, status: 'Open', source: 'manual' });
    setForm({ defect_description:'', priority:'Medium', assigned_to:'', due_date:'', comments:'' });
    setShowForm(false);
    load();
  };

  const updateStatus = async (id, status) => {
    await supabase.from('work_orders').update({ status }).eq('id', id);
    load();
  };

  const open   = wos.filter(w => w.status !== 'Complete');
  const closed = wos.filter(w => w.status === 'Complete');

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', gap:10 }}>
          {[['Open', open.length, 'var(--red)'], ['Complete', closed.length, 'var(--green)']].map(([l, v, c]) => (
            <div key={l} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 18px', textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:800, color:c, fontFamily:'var(--font-display)' }}>{v}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowForm(s=>!s)} style={{ padding:'9px 18px', background:showForm?'var(--surface-2)':'var(--accent)', color:showForm?'var(--text-secondary)':'#fff', border:'1px solid '+(showForm?'var(--border)':'var(--accent)'), borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          {showForm ? '✕ Close' : '+ New Work Order'}
        </button>
      </div>

      {showForm && (
        <div className="mp-card" style={{ marginBottom:16, borderLeft:'3px solid var(--accent)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:12 }}>
            <div><label className="mp-label">Priority</label>
              <select className="mp-input" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>
                {['Low','Medium','High','Critical'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="mp-label">Assigned To</label><input className="mp-input" value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})} /></div>
            <div><label className="mp-label">Due Date</label><input className="mp-input" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label className="mp-label">Defect Description *</label>
            <textarea className="mp-input" rows={3} value={form.defect_description} onChange={e=>setForm({...form,defect_description:e.target.value})} style={{ resize:'vertical' }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} style={{ padding:'8px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding:'8px 14px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Sk h="60px" /> : open.length === 0 && closed.length === 0 ? (
        <div className="mp-card" style={{ textAlign:'center', padding:40, color:'var(--text-faint)' }}>No work orders for this asset.</div>
      ) : (
        <>
          {open.map(w => {
            const pc = PRIORITY_COLOR[w.priority] || 'var(--text-muted)';
            const nextStatus = { Open:'Assigned', Assigned:'In Progress', 'In Progress':'Complete' }[w.status];
            return (
              <div key={w.id} className="mp-card" style={{ marginBottom:10, borderLeft:`3px solid ${pc}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:pc, padding:'2px 8px', background:pc+'18', borderRadius:20 }}>{w.priority}</span>
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{w.status}</span>
                      {w.due_date && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Due: {w.due_date}</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{w.defect_description}</div>
                    {w.assigned_to && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Assigned: {w.assigned_to}</div>}
                  </div>
                  {nextStatus && (
                    <button onClick={() => updateStatus(w.id, nextStatus)} style={{ padding:'6px 14px', background:'var(--green-bg)', color:'var(--green)', border:'1px solid var(--green-border)', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                      → {nextStatus}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {closed.length > 0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Completed ({closed.length})</div>
              {closed.map(w => (
                <div key={w.id} style={{ padding:'10px 14px', background:'var(--surface-2)', borderRadius:8, marginBottom:6, opacity:0.7 }}>
                  <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{w.defect_description}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{w.assigned_to} · Completed</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab: Service Schedule ────────────────────────────────────────────────────
function ServiceTab({ asset }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentHours, setCurrentHours] = useState(asset.hours || 0);
  const [saving, setSaving] = useState(false);
  const [serviceTemplates, setServiceTemplates] = useState([]);

  useEffect(() => { load(); loadTemplates(); }, [asset]);

  const loadTemplates = async () => {
    const { data } = await supabase.from('form_templates')
      .select('id, name').eq('company_id', asset.company_id);
    setServiceTemplates(data || []);
  };

  // Match a service name to a form template by keyword
  const findTemplate = (serviceName) => {
    if (!serviceName) return null;
    const keywords = serviceName.toLowerCase().split(/[\s\-\/]+/);
    return serviceTemplates.find(t => {
      const tName = t.name.toLowerCase();
      return keywords.some(k => k.length > 2 && tName.includes(k));
    }) || null;
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('service_schedules').select('*').eq('asset_name', asset.name).eq('company_id', asset.company_id).order('next_due_value');
    setSchedules(data || []);
    setLoading(false);
  };

  const [hoursHistory, setHoursHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [manualNote, setManualNote] = useState('');

  const loadHistory = async () => {
    const { data } = await supabase.from('asset_hours_log')
      .select('*').eq('asset_id', asset.id)
      .order('created_at', { ascending: false }).limit(20);
    setHoursHistory(data || []);
    setShowHistory(true);
  };

  const updateHours = async () => {
    if (!currentHours) return;
    setSaving(true);
    const newHours = parseFloat(currentHours);
    await supabase.from('assets').update({ hours: newHours }).eq('id', asset.id);
    // Log to history
    await supabase.from('asset_hours_log').insert({
      company_id: asset.company_id,
      asset_id: asset.id,
      asset_name: asset.name,
      hours: newHours,
      source: 'manual',
      recorded_by: 'Admin',
      notes: manualNote || 'Manual update',
    });
    setSaving(false);
    setManualNote('');
    alert('Hours updated ✓');
    load();
  };

  const markDone = async (s) => {
    const newLast = parseFloat(currentHours) || s.next_due_value;
    const nextVal = newLast + s.interval_value;
    await supabase.from('service_schedules').update({ last_service_value: newLast, last_service_date: new Date().toISOString().split('T')[0], next_due_value: nextVal }).eq('id', s.id);
    load();
  };

  const getStatus = (s) => {
    if (s.interval_type === 'hours' || s.interval_type === 'km') {
      const remaining = (s.next_due_value || 0) - currentHours;
      if (remaining <= 0) return { label:'Overdue', cls:'tl-alert', remaining: Math.abs(remaining).toFixed(0) + ' overdue' };
      if (remaining <= s.interval_value * 0.1) return { label:'Due Soon', cls:'tl-warn', remaining: remaining.toFixed(0) + ' to go' };
      return { label:'OK', cls:'tl-ok', remaining: remaining.toFixed(0) + ' to go' };
    }
    const today = new Date().toISOString().split('T')[0];
    if (s.next_due_date && s.next_due_date < today) return { label:'Overdue', cls:'tl-alert', remaining: 'Past due' };
    if (s.next_due_date) {
      const days = Math.round((new Date(s.next_due_date) - new Date()) / 86400000);
      if (days <= 14) return { label:'Due Soon', cls:'tl-warn', remaining: `${days} days` };
      return { label:'OK', cls:'tl-ok', remaining: `${days} days` };
    }
    return { label:'Unknown', cls:'', remaining: '—' };
  };

  const overdue = schedules.filter(s => getStatus(s).label === 'Overdue');
  const dueSoon = schedules.filter(s => getStatus(s).label === 'Due Soon');

  return (
    <div>
      {/* Hours update */}
      <div className="mp-card" style={{ marginBottom:14 }}>
        <div className="mp-section-title">Current Reading</div>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:180 }}>
            <label className="mp-label">Current {asset.type?.toLowerCase().includes('truck')||asset.type?.toLowerCase().includes('ute')||asset.type?.toLowerCase().includes('vehicle') ? 'Kilometres' : 'Hours'}</label>
            <input className="mp-input" type="number" value={currentHours} onChange={e=>setCurrentHours(e.target.value)} />
          </div>
          <button onClick={updateHours} disabled={saving} style={{ padding:'9px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
            {saving ? 'Saving…' : 'Update'}
          </button>
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          <label className="mp-label">Notes (optional)</label>
          <input className="mp-input" placeholder="e.g. Post-service reading" value={manualNote} onChange={e=>setManualNote(e.target.value)} />
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>Hours update automatically from prestart submissions.</div>
        <button onClick={loadHistory} style={{ marginTop:8, padding:'6px 14px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' }}>
          📋 View Hours History
        </button>
        {showHistory && hoursHistory.length > 0 && (
          <div style={{ marginTop:12, border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
            <div style={{ padding:'8px 14px', background:'var(--surface-2)', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', justifyContent:'space-between' }}>
              <span>Hours Log</span>
              <button onClick={() => setShowHistory(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', fontSize:14 }}>✕</button>
            </div>
            {hoursHistory.map((h,i) => (
              <div key={h.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 14px', borderBottom: i < hoursHistory.length-1 ? '1px solid var(--border)' : 'none', background: i%2===0 ? 'transparent' : 'var(--surface-2)' }}>
                <div>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>{h.hours.toLocaleString()} hrs</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:10 }}>{h.recorded_by}</span>
                  {h.notes && <span style={{ fontSize:11, color:'var(--text-faint)', marginLeft:8, fontStyle:'italic' }}>{h.notes}</span>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(h.created_at).toLocaleDateString('en-AU')}</div>
                  <span style={{ fontSize:10, padding:'1px 6px', borderRadius:3, background: h.source==='prestart' ? 'var(--accent-light)' : 'var(--surface-2)', color: h.source==='prestart' ? 'var(--accent)' : 'var(--text-muted)', border:'1px solid '+(h.source==='prestart' ? 'rgba(14,165,233,0.2)' : 'var(--border)') }}>{h.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status summary */}
      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          {overdue.length > 0 && <div style={{ flex:1, padding:'12px 16px', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:10, fontSize:13, fontWeight:700, color:'var(--red)' }}>⚠️ {overdue.length} service{overdue.length>1?'s':''} overdue</div>}
          {dueSoon.length > 0 && <div style={{ flex:1, padding:'12px 16px', background:'var(--amber-bg)', border:'1px solid var(--amber-border)', borderRadius:10, fontSize:13, fontWeight:700, color:'var(--amber)' }}>🔔 {dueSoon.length} service{dueSoon.length>1?'s':''} due soon</div>}
        </div>
      )}

      {loading ? <Sk h="80px" /> : schedules.length === 0 ? (
        <div className="mp-card" style={{ textAlign:'center', padding:40, color:'var(--text-faint)' }}>
          No service schedules set up for this asset.<br />
          <span style={{ fontSize:12 }}>Go to Maintenance → Service Schedules to add them.</span>
        </div>
      ) : (
        <div className="mp-card">
          <div className="mp-section-title">Service Schedules ({schedules.length})</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
              <thead><tr>
                {['Service','Interval','Last Done','Next Due','Status',''].map(h=><th key={h} style={{ textAlign:'left', padding:'0 14px 10px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {schedules.map(s => {
                  const st = getStatus(s);
                  return (
                    <tr key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'11px 14px 11px 0', fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{s.service_name}</td>
                      <td style={{ padding:'11px 14px 11px 0', fontSize:13, color:'var(--text-secondary)' }}>Every {s.interval_value} {s.interval_type}</td>
                      <td style={{ padding:'11px 14px 11px 0', fontSize:13, color:'var(--text-muted)' }}>{s.last_service_date || (s.last_service_value ? `${s.last_service_value} ${s.interval_type}` : '—')}</td>
                      <td style={{ padding:'11px 14px 11px 0', fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>
                        {s.interval_type==='hours'||s.interval_type==='km' ? `${s.next_due_value} ${s.interval_type}` : s.next_due_date || '—'}
                        <div style={{ fontSize:11, color:st.cls==='tl-alert'?'var(--red)':st.cls==='tl-warn'?'var(--amber)':'var(--green)', fontWeight:600, marginTop:2 }}>{st.remaining}</div>
                      </td>
                      <td style={{ padding:'11px 14px 11px 0' }}><span className={`traffic-light ${st.cls}`}><span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor' }} />{st.label}</span></td>
                      <td style={{ padding:'11px 0' }}>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <button onClick={() => markDone(s)} style={{ padding:'4px 10px', background:'var(--green-bg)', color:'var(--green)', border:'1px solid var(--green-border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>✓ Done</button>
                          {(() => {
                            const tmpl = findTemplate(s.service_name);
                            return tmpl ? (
                              <button onClick={() => {
                                sessionStorage.setItem('mechiq_open_form', JSON.stringify({ templateId: tmpl.id, assetName: asset.name }));
                                window.dispatchEvent(new CustomEvent('mechiq-navigate', { detail: { page: 'forms', subPage: 'service_sheets' } }));
                              }} style={{ padding:'4px 10px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                                📋 Service Sheet
                              </button>
                            ) : null;
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Oil Sampling ────────────────────────────────────────────────────────
function OilTab({ asset, userRole }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const blankForm = { component:'Engine', sample_date: new Date().toISOString().split('T')[0], oil_hours:'', unit_hours: asset.hours||'', viscosity_40:'', viscosity_100:'', water_ppm:'', soot_percent:'', wear_metals:{ iron:'', copper:'', aluminium:'', silicon:'', sodium:'', lead:'', tin:'' } };
  const [form, setForm] = useState(blankForm);

  useEffect(() => { load(); }, [asset]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('oil_samples').select('*').eq('asset_name', asset.name).eq('company_id', asset.company_id).order('sample_date', { ascending: false });
    setSamples(data || []);
    setLoading(false);
  };

  const save = async () => {
    await supabase.from('oil_samples').insert({
      asset_id: asset.id, asset_name: asset.name, company_id: asset.company_id,
      component: form.component, sample_date: form.sample_date,
      oil_hours: parseFloat(form.oil_hours)||null, unit_hours: parseFloat(form.unit_hours)||null,
      viscosity_40: parseFloat(form.viscosity_40)||null, viscosity_100: parseFloat(form.viscosity_100)||null,
      water_ppm: parseFloat(form.water_ppm)||null, soot_percent: parseFloat(form.soot_percent)||null,
      wear_metals: form.wear_metals,
    });
    setShowForm(false); setForm(blankForm); load();
  };

  const analyseWithAI = async (sample) => {
    setSelected(sample);
    // If AI analysis already stored, show it directly
    if (sample.ai_analysis) { setAiAnalysis(sample.ai_analysis); return; }
    setAiLoading(true); setAiAnalysis('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const wm = sample.wear_metals || {};
      const resp = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5', max_tokens: 600,
          messages: [{ role: 'user', content: `You are a heavy equipment oil analysis expert. Analyse this sample and give a practical assessment for a fleet manager.

Asset: ${asset.name} (${asset.type})
Component: ${sample.component}
Oil hours: ${sample.oil_hours || 'unknown'} | Unit hours: ${sample.unit_hours || 'unknown'}
Date: ${sample.sample_date}

Wear metals (ppm): Iron ${wm.iron||'—'}, Copper ${wm.copper||'—'}, Aluminium ${wm.aluminium||'—'}, Silicon ${wm.silicon||'—'}, Sodium ${wm.sodium||'—'}, Lead ${wm.lead||'—'}, Tin ${wm.tin||'—'}
Viscosity 40°C: ${sample.viscosity_40||'—'} cSt | Viscosity 100°C: ${sample.viscosity_100||'—'} cSt
Water: ${sample.water_ppm||'—'} ppm | Soot: ${sample.soot_percent||'—'}%

Rate overall: NORMAL / CAUTION / CRITICAL. Explain which readings are concerning, what component wear is indicated, and give one specific action. Max 150 words.` }]
        })
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text || 'Unable to analyse.';
      setAiAnalysis(text);
      // Save analysis back to record
      await supabase.from('oil_samples').update({ ai_analysis: text }).eq('id', sample.id);
    } catch(e) { setAiAnalysis('AI error: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const getTrafficLight = (val, metal) => {
    if (!val && val !== 0) return null;
    const v = parseFloat(val);
    const limits = { iron:[100,200], copper:[30,60], aluminium:[25,50], silicon:[20,40], sodium:[20,40], lead:[20,40], tin:[10,20] };
    const [warn, crit] = limits[metal] || [50,100];
    if (v >= crit) return 'tl-alert';
    if (v >= warn) return 'tl-warn';
    return 'tl-ok';
  };

  const condColor = { NORMAL:'var(--green)', CAUTION:'var(--amber)', CRITICAL:'var(--red)' };
  const condBg    = { NORMAL:'var(--green-bg)', CAUTION:'var(--amber-bg)', CRITICAL:'var(--red-bg)' };
  const METALS = ['iron','copper','aluminium','silicon','sodium','lead','tin'];
  const METAL_LABELS = { iron:'Fe', copper:'Cu', aluminium:'Al', silicon:'Si', sodium:'Na', lead:'Pb', tin:'Sn' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, alignItems:'center' }}>
        <div style={{ fontSize:13, color:'var(--text-muted)' }}>{samples.length} sample{samples.length!==1?'s':''} recorded</div>
        <button onClick={() => setShowForm(s=>!s)} style={{ padding:'9px 18px', background:showForm?'var(--surface-2)':'var(--accent)', color:showForm?'var(--text-secondary)':'#fff', border:'1px solid '+(showForm?'var(--border)':'var(--accent)'), borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          {showForm ? '✕ Close' : '+ Log Sample'}
        </button>
      </div>

      {showForm && (
        <div className="mp-card" style={{ marginBottom:16, borderLeft:'3px solid var(--accent)' }}>
          <div className="mp-section-title">Log Oil Sample</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10, marginBottom:12 }}>
            <div><label className="mp-label">Component</label>
              <select className="mp-input" value={form.component} onChange={e=>setForm({...form,component:e.target.value})}>
                {['Engine','Hydraulic System','Transmission','Differential','Final Drive','Coolant'].map(comp=><option key={comp}>{comp}</option>)}
              </select>
            </div>
            <div><label className="mp-label">Sample Date</label><input className="mp-input" type="date" value={form.sample_date} onChange={e=>setForm({...form,sample_date:e.target.value})} /></div>
            <div><label className="mp-label">Hours on Oil</label><input className="mp-input" type="number" placeholder="0" value={form.oil_hours} onChange={e=>setForm({...form,oil_hours:e.target.value})} /></div>
            <div><label className="mp-label">Unit Hours</label><input className="mp-input" type="number" placeholder="0" value={form.unit_hours} onChange={e=>setForm({...form,unit_hours:e.target.value})} /></div>
            {METALS.map(m => (
              <div key={m}><label className="mp-label">{METAL_LABELS[m]} (ppm)</label><input className="mp-input" type="number" placeholder="0" value={form.wear_metals[m]} onChange={e=>setForm({...form,wear_metals:{...form.wear_metals,[m]:e.target.value}})} /></div>
            ))}
            <div><label className="mp-label">Viscosity 40°C</label><input className="mp-input" type="number" placeholder="0" value={form.viscosity_40} onChange={e=>setForm({...form,viscosity_40:e.target.value})} /></div>
            <div><label className="mp-label">Water (ppm)</label><input className="mp-input" type="number" placeholder="0" value={form.water_ppm} onChange={e=>setForm({...form,water_ppm:e.target.value})} /></div>
            <div><label className="mp-label">Soot (%)</label><input className="mp-input" type="number" placeholder="0" value={form.soot_percent} onChange={e=>setForm({...form,soot_percent:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} style={{ padding:'8px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Save Sample</button>
            <button onClick={() => setShowForm(false)} style={{ padding:'8px 14px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Sk h="80px" /> : samples.length === 0 ? (
        <div className="mp-card" style={{ textAlign:'center', padding:40, color:'var(--text-faint)' }}>No oil samples recorded yet.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {samples.map(s => {
            const wm = s.wear_metals || {};
            const cond = s.ai_condition || 'NORMAL';
            return (
              <div key={s.id} className="mp-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                      <span style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>{s.component}</span>
                      <span style={{ padding:'3px 10px', borderRadius:20, background:condBg[cond]||'var(--surface-2)', color:condColor[cond]||'var(--text-muted)', fontSize:11, fontWeight:700, border:`1px solid ${condColor[cond]||'var(--border)'}40` }}>{cond}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.sample_date} · {s.oil_hours ? `${s.oil_hours} hrs on oil` : ''}{s.unit_hours ? ` · ${s.unit_hours} unit hrs` : ''}</div>
                  </div>
                  <button onClick={() => analyseWithAI(s)} style={{ padding:'6px 14px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    🤖 AI Analysis
                  </button>
                </div>

                {/* Wear metals traffic lights */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                  {METALS.map(m => {
                    if (!wm[m] && wm[m] !== 0) return null;
                    const cls = getTrafficLight(wm[m], m);
                    return (
                      <div key={m} className={`traffic-light ${cls}`}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }} />
                        {METAL_LABELS[m]}: {wm[m]}
                      </div>
                    );
                  })}
                  {s.water_ppm && <div className={`traffic-light ${s.water_ppm > 500 ? 'tl-alert' : s.water_ppm > 200 ? 'tl-warn' : 'tl-ok'}`}><span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor' }} />H₂O: {s.water_ppm}ppm</div>}
                </div>

                {/* AI Analysis panel */}
                {selected?.id === s.id && (
                  <div style={{ marginTop:10, padding:'14px', background:'var(--surface-2)', borderRadius:10, border:'1px solid var(--border)' }}>
                    {aiLoading ? (
                      <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--accent)', fontSize:13 }}>
                        <span style={{ animation:'spin 0.8s linear infinite', display:'inline-block' }}>⟳</span> Analysing…
                      </div>
                    ) : (
                      <>
                        {s.ai_recommendations && <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', marginBottom:8, padding:'6px 10px', background:'var(--accent-light)', borderRadius:6 }}>📋 {s.ai_recommendations}</div>}
                        <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{aiAnalysis}</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Downtime History ────────────────────────────────────────────────────
function DowntimeTab({ asset }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [asset]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('downtime').select('*').eq('asset', asset.name).eq('company_id', asset.company_id).order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  const totalHours = records.reduce((sum, d) => sum + parseFloat(d.hours || 0), 0);
  const byCategory = records.reduce((acc, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div className="mp-stat-grid" style={{ marginBottom:16 }}>
        <div className="mp-stat"><div className="mp-stat-val">{records.length}</div><div className="mp-stat-lbl">Total Events</div></div>
        <div className="mp-stat"><div className="mp-stat-val">{totalHours.toFixed(1)}h</div><div className="mp-stat-lbl">Total Hours Down</div></div>
        <div className="mp-stat"><div className="mp-stat-val">{records.length > 0 ? (totalHours / records.length).toFixed(1) : 0}h</div><div className="mp-stat-lbl">Avg Per Event</div></div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="mp-card" style={{ marginBottom:14 }}>
          <div className="mp-section-title">By Category</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat, count]) => (
              <div key={cat} style={{ padding:'6px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>
                {cat} <span style={{ color:'var(--accent)', fontWeight:800 }}>({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <Sk h="80px" /> : records.length === 0 ? (
        <div className="mp-card" style={{ textAlign:'center', padding:40, color:'var(--text-faint)' }}>No downtime recorded for this asset.</div>
      ) : (
        <div className="mp-card">
          <div className="mp-section-title">All Records ({records.length})</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
              <thead><tr>
                {['Date','Start','End','Hours','Category','Description','Reported By'].map(h=><th key={h} style={{ textAlign:'left', padding:'0 14px 10px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {records.map((d,i) => (
                  <tr key={d.id} style={{ borderBottom:'1px solid var(--border)', opacity:0, animation:`fadeUp 0.25s ease ${i*20}ms forwards` }}>
                    <td style={{ padding:'10px 14px 10px 0', fontSize:13, fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap' }}>{d.date}</td>
                    <td style={{ padding:'10px 14px 10px 0', fontSize:13, color:'var(--text-secondary)' }}>{d.start_time||'—'}</td>
                    <td style={{ padding:'10px 14px 10px 0', fontSize:13, color:'var(--text-secondary)' }}>{d.end_time||<span style={{ color:'var(--red)', fontWeight:600, fontSize:11 }}>Open</span>}</td>
                    <td style={{ padding:'10px 14px 10px 0' }}><span style={{ padding:'2px 8px', borderRadius:4, background:'var(--amber-bg)', color:'var(--amber)', fontSize:12, fontWeight:700, border:'1px solid var(--amber-border)' }}>{parseFloat(d.hours||0).toFixed(1)}h</span></td>
                    <td style={{ padding:'10px 14px 10px 0' }}><span style={{ padding:'2px 8px', borderRadius:4, background:'var(--surface-2)', color:'var(--text-secondary)', fontSize:11, border:'1px solid var(--border)' }}>{d.category||'—'}</span></td>
                    <td style={{ padding:'10px 14px 10px 0', fontSize:12, color:'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.description}</td>
                    <td style={{ padding:'10px 0', fontSize:12, color:'var(--text-muted)' }}>{d.reported_by||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Documents & Manuals ────────────────────────────────────────────────
function DocumentsTab({ asset, userRole }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [form, setForm]         = useState({ name: '', category: 'Manual' });
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef(null);
  const isAdmin = ['admin','supervisor'].includes(userRole?.role);

  const CATEGORIES = ['Manual', 'Schematic', 'Wiring Diagram', 'Parts Catalogue', 'Safety Data Sheet', 'Photo', 'Other'];
  const CAT_ICONS  = { Manual:'📖', Schematic:'📐', 'Wiring Diagram':'⚡', 'Parts Catalogue':'🔩', 'Safety Data Sheet':'⚠️', Photo:'📷', Other:'📎' };

  useEffect(() => { load(); }, [asset]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('asset_documents').select('*')
      .eq('asset_id', asset.id).order('category').order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `${asset.company_id}/${asset.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('asset-documents').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('asset-documents').getPublicUrl(path);
      await supabase.from('asset_documents').insert({
        company_id: asset.company_id,
        asset_id:   asset.id,
        asset_name: asset.name,
        name:       form.name || file.name.replace(/\.[^/.]+$/, ''),
        category:   form.category,
        file_url:   publicUrl,
        file_name:  file.name,
        file_size:  file.size,
        file_type:  file.type,
        uploaded_by: userRole.name || userRole.email,
      });
      setForm({ name: '', category: 'Manual' });
      setShowForm(false);
      load();
    } catch (e) { alert('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  };

  const deleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    await supabase.from('asset_documents').delete().eq('id', doc.id);
    load();
  };

  const fmtSize = (b) => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : b > 1024 ? `${(b/1024).toFixed(0)} KB` : `${b} B`;
  const isImage = (type) => type?.startsWith('image/');
  const isPDF   = (type) => type === 'application/pdf';

  // Group by category
  const grouped = docs.reduce((g, d) => { (g[d.category] = g[d.category] || []).push(d); return g; }, {});

  return (
    <div>
      {/* Upload bar */}
      {isAdmin && (
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={{ padding:'9px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              + Upload Document
            </button>
          ) : (
            <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap', alignItems:'flex-end', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ flex:2, minWidth:160 }}>
                <div className="mp-label">Document Name</div>
                <input className="mp-input" placeholder="e.g. Engine Service Manual" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <div className="mp-label">Category</div>
                <select className="mp-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ padding:'9px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', opacity:uploading?0.6:1 }}>
                {uploading ? '⟳ Uploading…' : '📁 Choose File'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding:'9px 14px', background:'var(--surface)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.dwg,.dxf" style={{ display:'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) upload(f); e.target.value=''; }} />
            </div>
          )}
        </div>
      )}

      {loading ? <Sk h="80px" /> : docs.length === 0 ? (
        <div className="mp-card" style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-faint)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-muted)', marginBottom:6 }}>No documents uploaded yet</div>
          {isAdmin && <div style={{ fontSize:13, color:'var(--text-faint)' }}>Upload manuals, schematics and diagrams for this asset.</div>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mp-card">
              <div className="mp-section-title">
                {CAT_ICONS[category] || '📎'} {category} <span style={{ fontSize:11, fontWeight:600, color:'var(--accent)', background:'var(--accent-light)', padding:'2px 8px', borderRadius:20, marginLeft:4 }}>{items.length}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                {items.map(doc => (
                  <div key={doc.id} style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', background:'var(--surface-2)', transition:'box-shadow 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>

                    {/* Preview */}
                    {isImage(doc.file_type) ? (
                      <div style={{ height:120, overflow:'hidden', cursor:'zoom-in', background:'#000' }} onClick={() => setLightbox(doc.file_url)}>
                        <img src={doc.file_url} alt={doc.name} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.9 }} />
                      </div>
                    ) : (
                      <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', background: isPDF(doc.file_type) ? '#fee2e2' : 'var(--surface-3)', fontSize:36 }}>
                        {isPDF(doc.file_type) ? '📄' : CAT_ICONS[doc.category] || '📎'}
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ padding:'10px 12px' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={doc.name}>{doc.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:8 }}>
                        {doc.file_size ? fmtSize(doc.file_size) : ''}{doc.uploaded_by ? ` · ${doc.uploaded_by}` : ''}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          style={{ flex:1, padding:'6px 0', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', textAlign:'center', textDecoration:'none', display:'block' }}>
                          👁 View
                        </a>
                        <a href={doc.file_url} download={doc.file_name}
                          style={{ flex:1, padding:'6px 0', background:'var(--surface)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', textAlign:'center', textDecoration:'none', display:'block' }}>
                          ⬇ Save
                        </a>
                        {isAdmin && (
                          <button onClick={() => deleteDoc(doc)}
                            style={{ padding:'6px 8px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, cursor:'zoom-out' }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="full size" style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:8 }} onClick={e=>e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Depreciation (Admin only) ──────────────────────────────────────────
function DepreciationTab({ asset, userRole }) {
  const [inputs, setInputs] = useState({
    assetName: asset.name || '',
    purchaseYear: asset.year || new Date().getFullYear() - 3,
    yearPurchased: asset.purchase_date ? new Date(asset.purchase_date).getFullYear() : new Date().getFullYear() - 3,
    assetConditionType: 'used',
    purchasePrice: asset.purchase_price || '',
    currentUsage: asset.hours || '',
    annualUsage: asset.target_hours ? asset.target_hours * 250 : '',
    usageUnit: 'hrs',
    condition: 'Good',
    salvageValue: '',
    expectedLifeUsage: '',
    depreciationMethod: 'declining_balance',
  });
  const [results, setResults] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPredicting, setAiPredicting] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');

  const calculate = () => {
    const price = parseFloat(inputs.purchasePrice) || 0;
    const salvage = parseFloat(inputs.salvageValue) || price * 0.1;
    const life = parseFloat(inputs.expectedLifeUsage) || 10000;
    const current = parseFloat(inputs.currentUsage) || 0;
    const annual = parseFloat(inputs.annualUsage) || 1000;
    const depreciable = price - salvage;
    const usedPct = Math.min(current / life, 1);
    const currentValue = Math.max(salvage, price - depreciable * usedPct);
    const condFactor = { Poor:-0.15, Fair:-0.05, Good:0, 'Very Good':0.08, Excellent:0.15 }[inputs.condition] || 0;
    const marketValue = currentValue * (0.9 + condFactor * 0.2);
    const totalDep = price - currentValue;
    const remaining = Math.max(0, life - current);
    const yearsRemaining = annual > 0 ? remaining / annual : 0;
    const costPerUnit = current > 0 ? totalDep / current : 0;
    const recLabel = currentValue < price * 0.3 ? 'Replace' : yearsRemaining < 2 ? 'Plan Replacement' : 'Continue Operating';
    setResults({ currentValue, marketValue, totalDep, costPerUnit, yearsRemaining, recLabel, remaining, depreciable, price, salvage });
    setCalculated(true);
  };

  const aiPredict = async () => {
    if (!inputs.assetName) return;
    setAiPredicting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5', max_tokens: 800,
          messages: [{ role: 'user', content: `You are an expert Australian heavy equipment valuation analyst. Using real market data from Machines4U, IronPlanet, Ritchie Bros and dealer networks:

Asset: "${inputs.assetName}"
Year: ${inputs.purchaseYear} | Purchased: ${inputs.yearPurchased} | Condition when bought: ${inputs.assetConditionType}
Purchase Price: AUD $${inputs.purchasePrice} | Current ${inputs.usageUnit}: ${inputs.currentUsage}
Annual ${inputs.usageUnit}: ${inputs.annualUsage} | Condition: ${inputs.condition}

Respond ONLY with JSON, no markdown:
{"expectedLifeUsage":0,"salvageValue":0,"recommendedMethod":"declining_balance","currentMarketValue":0,"purchasePriceNote":"","marketNote":""}` }]
        })
      });
      const data = await resp.json();
      const text = (data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (parsed.expectedLifeUsage) setInputs(p => ({ ...p, expectedLifeUsage: String(parsed.expectedLifeUsage), salvageValue: String(parsed.salvageValue || ''), depreciationMethod: parsed.recommendedMethod || p.depreciationMethod }));
      if (parsed.marketNote) {
        let insight = '';
        if (parsed.purchasePriceNote) insight += '💰 ' + parsed.purchasePriceNote + '\n\n';
        if (parsed.currentMarketValue) insight += `📈 Est. current market value: ${fmt(parsed.currentMarketValue)}\n\n`;
        insight += '📊 ' + parsed.marketNote;
        setAiInsight(insight);
      }
    } catch (e) { alert('AI error: ' + e.message); }
    finally { setAiPredicting(false); }
  };

  const iStyle = { width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  return (
    <div>
      <div className="mp-card" style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div className="mp-section-title" style={{ marginBottom:0 }}>Asset Details</div>
          <button onClick={aiPredict} disabled={aiPredicting} style={{ padding:'8px 16px', background:'var(--surface-2)', color:'var(--accent)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, opacity:aiPredicting?0.6:1 }}>
            {aiPredicting ? '⟳ Loading…' : '🤖 AI Predict Values'}
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:14 }}>
          {[
            ['Asset Name', 'assetName', 'text'],
            ['Purchase Price ($)', 'purchasePrice', 'number'],
            ['Year of Manufacture', 'purchaseYear', 'number'],
            ['Year Purchased', 'yearPurchased', 'number'],
            [`Current ${inputs.usageUnit}`, 'currentUsage', 'number'],
            [`Annual ${inputs.usageUnit}`, 'annualUsage', 'number'],
            [`Expected Life (${inputs.usageUnit})`, 'expectedLifeUsage', 'number'],
            ['Salvage Value ($)', 'salvageValue', 'number'],
          ].map(([label, key, type]) => (
            <div key={key}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{label}</label>
              <input style={iStyle} type={type} value={inputs[key]} onChange={e=>setInputs(p=>({...p,[key]:e.target.value}))} />
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Usage Unit</label>
            <select style={iStyle} value={inputs.usageUnit} onChange={e=>setInputs(p=>({...p,usageUnit:e.target.value}))}>
              <option value="hrs">Hours</option><option value="kms">Kilometres</option>
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Condition</label>
            <select style={iStyle} value={inputs.condition} onChange={e=>setInputs(p=>({...p,condition:e.target.value}))}>
              {['Poor','Fair','Good','Very Good','Excellent'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button onClick={calculate} style={{ padding:'10px 28px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          Calculate Depreciation
        </button>
      </div>

      {aiInsight && (
        <div className="mp-card" style={{ marginBottom:14, borderLeft:'3px solid var(--accent)' }}>
          <div className="mp-section-title">AI Market Analysis</div>
          <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{aiInsight}</div>
        </div>
      )}

      {results && (
        <div className="mp-card">
          <div className="mp-section-title">Results</div>
          <div className="mp-stat-grid">
            <div className="mp-stat"><div className="mp-stat-val" style={{ fontSize:18 }}>{fmt(results.currentValue)}</div><div className="mp-stat-lbl">Book Value</div></div>
            <div className="mp-stat"><div className="mp-stat-val" style={{ fontSize:18, color:'var(--green)' }}>{fmt(results.marketValue)}</div><div className="mp-stat-lbl">Est. Market Value</div></div>
            <div className="mp-stat"><div className="mp-stat-val" style={{ fontSize:18, color:'var(--red)' }}>{fmt(results.totalDep)}</div><div className="mp-stat-lbl">Total Depreciation</div></div>
            <div className="mp-stat"><div className="mp-stat-val" style={{ fontSize:18, color:'var(--amber)' }}>${results.costPerUnit.toFixed(2)}</div><div className="mp-stat-lbl">Cost / {inputs.usageUnit}</div></div>
            <div className="mp-stat"><div className="mp-stat-val" style={{ fontSize:18 }}>{results.yearsRemaining.toFixed(1)}y</div><div className="mp-stat-lbl">Years Remaining</div></div>
            <div className="mp-stat"><div className="mp-stat-val" style={{ fontSize:16, color: results.recLabel==='Replace'?'var(--red)':results.recLabel==='Plan Replacement'?'var(--amber)':'var(--green)' }}>{results.recLabel}</div><div className="mp-stat-lbl">Recommendation</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AssetPage ───────────────────────────────────────────────────────────
function AssetPage({ assetId, userRole, onStartPrestart, initialTab }) {
  const [asset, setAsset]             = useState(null);
  const [recentPrestarts, setRecentPrestarts] = useState([]);
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [openWorkOrders, setOpenWorkOrders] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState(initialTab || 'overview');

  const isAdmin = ['admin','supervisor'].includes(userRole?.role);

  useEffect(() => {
    if (!document.getElementById('mp-css')) {
      const s = document.createElement('style'); s.id='mp-css'; s.textContent=CSS;
      document.head.appendChild(s);
    }
    if (assetId) fetchAssetData();
    // Check if navigated here from calendar with a specific tab
    const navIntent = sessionStorage.getItem('mechiq_open_asset');
    if (navIntent) {
      try {
        const { assetId: intentId, tab } = JSON.parse(navIntent);
        if (String(intentId) === String(assetId) && tab) {
          setActiveTab(tab);
        }
      } catch(e) {}
      sessionStorage.removeItem('mechiq_open_asset');
    }
  }, [assetId]);

  const fetchAssetData = async () => {
    setLoading(true);
    const { data: assetData } = await supabase.from('assets').select('*').eq('id', assetId).single();
    setAsset(assetData);
    if (assetData) {
      const [prestarts, maintenance, workorders] = await Promise.all([
        supabase.from('form_submissions').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('date',{ascending:false}).limit(5),
        supabase.from('maintenance').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('created_at',{ascending:false}).limit(5),
        supabase.from('work_orders').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).neq('status','Complete').order('created_at',{ascending:false}),
      ]);
      setRecentPrestarts(prestarts.data||[]);
      setRecentMaintenance(maintenance.data||[]);
      setOpenWorkOrders(workorders.data||[]);
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ animation:'fadeUp 0.4s ease both', padding:'8px 0' }}>
      <div className="mp-card" style={{ marginBottom:16 }}>
        <Sk w="30%" h="14px" /><div style={{ height:10 }} /><Sk w="50%" h="28px" />
      </div>
    </div>
  );

  if (!asset) return <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontSize:14 }}>Asset not found</div>;

  const qrUrl = `${window.location.origin}?asset=${assetId}`;

  const TABS = [
    { id:'overview',     label:'Overview' },
    { id:'workorders',   label:`Work Orders${openWorkOrders.length > 0 ? ` (${openWorkOrders.length})` : ''}` },
    { id:'service',      label:'Service Schedule' },
    { id:'oil',          label:'Oil Sampling' },
    { id:'downtime',     label:'Downtime' },
    { id:'documents', label:'📂 Documents' },
    ...(isAdmin ? [{ id:'depreciation', label:'💰 Depreciation' }] : []),
  ];

  return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>

      {/* ── Hero card ── */}
      <div className="mp-card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20 }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', letterSpacing:'1px', marginBottom:4 }}>{asset.asset_number||'AST-0000'}</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px', letterSpacing:'0.5px', textTransform:'uppercase' }}>{asset.name}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 12px' }}>{asset.type}{asset.location ? ` · ${asset.location}` : ''}</p>
            <StatusPill status={asset.status} />
            <div style={{ display:'flex', gap:24, marginTop:16, flexWrap:'wrap' }}>
              {[
                { label:'Hours', value: asset.hours ? `${Number(asset.hours).toLocaleString()} hrs` : '—', color:'var(--accent)' },
                { label:'Open WOs', value: openWorkOrders.length, color: openWorkOrders.length>0?'var(--red)':'var(--green)' },
                { label:'Last Prestart', value: recentPrestarts[0]?.date||'None', color:'var(--text-secondary)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ padding:10, background:'var(--surface)', borderRadius:10, border:'1px solid var(--border)' }}>
              <QRCodeCanvas value={qrUrl} size={90} bgColor="#ffffff" fgColor="#1a2b3c" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Prestart button ── */}
      <button className="mp-start-btn" onClick={() => onStartPrestart(asset.name)}>
        Start Prestart for {asset.name} →
      </button>

      {/* ── Tabs ── */}
      <div className="mp-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`mp-tab${activeTab===t.id?' active':''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'overview'     && <OverviewTab asset={asset} recentPrestarts={recentPrestarts} recentMaintenance={recentMaintenance} />}
      {activeTab === 'workorders'   && <WorkOrdersTab asset={asset} userRole={userRole} />}
      {activeTab === 'service'      && <ServiceTab asset={asset} />}
      {activeTab === 'oil'          && <OilTab asset={asset} userRole={userRole} />}
      {activeTab === 'downtime'     && <DowntimeTab asset={asset} />}
      {activeTab === 'documents'    && <DocumentsTab asset={asset} userRole={userRole} />}
      {activeTab === 'depreciation' && isAdmin && <DepreciationTab asset={asset} userRole={userRole} />}
    </div>
  );
}

export default AssetPage;
