import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import Depreciation from './Depreciation';
import { QRCodeCanvas } from 'qrcode.react';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toast-in  { from{opacity:0;transform:translateX(20px) scale(0.96)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes toast-out { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(20px)} }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }

  .asset-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
    position: relative;
  }
  .asset-card::before {
    content:''; position:absolute; top:0;left:0;right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(0,212,255,0.4),transparent);
    opacity:0; transition:opacity 0.2s;
  }
  .asset-card:hover { box-shadow:0 0 32px rgba(0,212,255,0.12); border-color:rgba(0,180,255,0.25); transform:translateY(-3px); }
  .asset-card:hover::before { opacity:1; }
  .asset-card:hover .card-actions { opacity:1 !important; }
  .card-actions { opacity:0; transition:opacity 0.18s; }

  .form-input {
    width:100%; padding:10px 13px;
    border:1px solid var(--border) !important;
    border-radius:8px !important; font-size:13px;
    color:var(--text-primary) !important;
    background:var(--surface-2) !important;
    outline:none; box-sizing:border-box;
    font-family:var(--font-display) !important;
    transition:border-color 0.15s, box-shadow 0.15s !important;
  }
  .form-input:focus {
    border-color:var(--accent-dark) !important;
    box-shadow:0 0 0 3px var(--accent-glow) !important;
  }
  .form-input::placeholder { color:var(--text-faint) !important; }
  .form-input option { background:var(--surface); color:var(--text-primary); }

  .step-line { transition:background-color 0.4s ease; }

  .nav-pill {
    padding:8px 18px; border-radius:8px;
    font-size:11px; font-weight:700; cursor:pointer;
    transition:all 0.15s; font-family:var(--font-display);
    letter-spacing:1px; text-transform:uppercase; border:none;
  }
  .nav-pill-primary {
    background:transparent; color:var(--accent);
    border:1px solid var(--accent-dark) !important;
  }
  .nav-pill-primary:hover { background:var(--accent-glow); box-shadow:0 0 16px var(--accent-glow); color:#fff; }
  .nav-pill-primary:disabled { opacity:0.3; cursor:default; }
  .nav-pill-ghost {
    background:transparent; color:var(--text-muted);
    border:1px solid var(--border) !important;
  }
  .nav-pill-ghost:hover { border-color:var(--accent-dark) !important; color:var(--accent); }
  .nav-pill-ghost:disabled { opacity:0.3; cursor:default; }
  .nav-pill-success {
    background:transparent; color:var(--green);
    border:1px solid var(--green-border) !important;
  }
  .nav-pill-success:hover { background:var(--green-bg); box-shadow:0 0 14px var(--green-bg); }
`;

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  Running:     { color: 'var(--green)', bg: 'var(--green-bg)', dot: true },
  Down:        { color: 'var(--red)', bg: 'var(--red-bg)', dot: true, pulse: true },
  Maintenance: { color: 'var(--amber)', bg: 'var(--amber-bg)', dot: true },
  Active:      { color: 'var(--green)', bg: 'var(--green-bg)', dot: true },
  Standby:     { color: 'var(--purple)', bg: 'var(--purple-bg)', dot: true },
};
function StatusPill({ status }) {
  const s = STATUS[status] || { color: 'var(--text-muted)', bg: 'var(--surface-2)', dot: true };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', backgroundColor: s.bg, color: s.color, fontSize: '11px', fontWeight: 700, letterSpacing: '0.2px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.color, flexShrink: 0, animation: s.pulse ? 'pulse-dot 1.8s ease-in-out infinite' : 'none' }} />
      {status}
    </span>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type, exiting: false }]);
    setTimeout(() => {
      setToasts(t => t.map(x => x.id === id ? { ...x, exiting: true } : x));
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 350);
    }, 4000);
  }, []);
  return { toasts, add };
}
function Toasts({ toasts }) {
  const P = { success: ['#00ff88','rgba(0,255,136,0.08)','✓'], error: ['#ff3366','rgba(255,51,102,0.08)','✕'], warning: ['#ffaa00','rgba(255,170,0,0.08)','⚠'], info: ['#00d4ff','rgba(0,212,255,0.08)','ℹ'] };
  return (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
      {toasts.map(t => {
        const [c, bg, icon] = P[t.type] || P.info;
        return (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: bg, border: `1px solid ${c}28`, borderLeft: `4px solid ${c}`, borderRadius: '10px', padding: '12px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', minWidth: '260px', animation: t.exiting ? 'toast-out 0.3s ease forwards' : 'toast-in 0.3s cubic-bezier(0.16,1,0.3,1)', pointerEvents: 'auto' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: c+'22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c, fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>{icon}</div>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = '13px', r = '6px', style = {} }) {
  return <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: 'linear-gradient(90deg,#edf2f8 25%,#f5f8fd 50%,#edf2f8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', ...style }} />;
}
function AssetCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,100,180,0.06)' }}>
      <div style={{ height: '5px', background: 'var(--surface-2)' }} />
      <div style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
          <Sk w="55%" h="14px" />
          <Sk w="60px" h="22px" r="20px" />
        </div>
        <Sk w="38%" h="11px" style={{ marginBottom: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          <Sk h="11px" /><Sk h="11px" /><Sk h="11px" /><Sk h="11px" />
        </div>
        <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <Sk w="70px" h="30px" r="8px" /><Sk w="50px" h="30px" r="8px" />
        </div>
      </div>
    </div>
  );
}

// ─── QR Print Modal ────────────────────────────────────────────────────────────
function QRModal({ asset, onClose }) {
  const ref = useRef(null);
  const qrVal = `https://maintain-iq.vercel.app/asset/${asset.id}`;

  const print = () => {
    const canvas = ref.current?.querySelector('canvas');
    if (!canvas) return;
    const qr = canvas.toDataURL('image/png');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>QR - ${asset.asset_number}</title><style>@page{size:85.6mm 54mm;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:85.6mm;height:54mm;background:#000!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.card{width:85.6mm;height:54mm;background:#000!important;display:flex;align-items:center;padding:5mm;gap:4mm}.qr{flex-shrink:0;width:36mm;height:36mm;background:#fff;padding:1.5mm;border-radius:1.5mm}.qr img{width:100%;height:100%}.txt{flex:1;display:flex;flex-direction:column;justify-content:space-between;height:36mm}.lc{font-family:Arial;font-size:6pt;color:#777;letter-spacing:.5px}.ln{font-family:Arial;font-size:22pt;font-weight:900;color:var(--accent);line-height:1}.lname{font-family:Arial;font-size:9.5pt;font-weight:700;color:#fff}.lmeta{font-family:Arial;font-size:6.5pt;color:#888}.lbrand{font-family:Arial;font-size:9pt;font-weight:900;color:#fff;letter-spacing:2px;text-align:right}.lbrand .iq{color:var(--accent)}</style></head><body><div class="card"><div class="qr"><img src="${qr}"/></div><div class="txt"><div><div class="lc">MECH IQ · ASSET TAG</div><div class="ln">${asset.asset_number||'AST-0000'}</div><div class="lname">${asset.name}</div><div class="lmeta">${asset.type}${asset.location?' · '+asset.location:''}</div></div><div class="lbrand">MECH<span class="iq">IQ</span></div></div></div><script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '16px', padding: '28px', width: '400px', boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,212,255,0.08)', animation: 'fadeUp 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>QR Label Preview</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>✕</button>
        </div>
        <div ref={ref} style={{ position: 'absolute', left: '-9999px' }}><QRCodeCanvas value={qrVal} size={300} level="H" /></div>
        <div style={{ background: '#0d1117', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '8px', padding: '6px', flexShrink: 0 }}><QRCodeCanvas value={qrVal} size={80} level="H" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.5px', marginBottom: '2px' }}>MECH IQ · ASSET TAG</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--accent)', lineHeight: 1.1 }}>{asset.asset_number}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{asset.name}</div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>{asset.type}{asset.location ? ' · ' + asset.location : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="nav-pill nav-pill-ghost">Cancel</button>
          <button onClick={print} className="nav-pill nav-pill-primary">Print Label</button>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Card ────────────────────────────────────────────────────────────────
const TYPE_ICON = { 'Mobile Plant': '🚜', 'Fixed Plant': '🏭', 'Drilling Plant': '⛏️', 'Small Machinery': '⚙️', 'Vehicle': '🚗', 'Truck': '🚛', 'Excavator': '🚜', 'Generator': '⚡', 'Compressor': '💨' };
function getIcon(type) { return TYPE_ICON[type] || '🔧'; }

function AssetCard({ asset, index, onView, onDelete, onQR, onQuickLog, onEdit, onServiceSheet, userRole }) {
  const [hovered, setHovered] = useState(false);
  const s = STATUS[asset.status] || { color: 'var(--text-muted)', bg: '#f1f5f9' };
  const canDelete = userRole?.role !== 'technician' && userRole?.role !== 'operator';

  return (
    <div
      className="asset-card"
      style={{ animation: `fadeUp 0.4s ease ${index * 45}ms both`, borderTop: `2px solid ${s.color}40` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card header */}
      <div style={{ padding: '16px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}18`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            {getIcon(asset.type)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.5px' }}>{asset.asset_number || '—'}</div>
          </div>
        </div>
        <StatusPill status={asset.status} />
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '14px 0 0' }} />

      {/* Meta grid */}
      <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {[
          ['Type', asset.type || '—'],
          ['Location', asset.location || '—'],
          ['Make', [asset.make, asset.model].filter(Boolean).join(' ') || '—'],
          ['Hours', asset.current_hours ? `${asset.current_hours.toLocaleString()} hrs` : '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="card-actions" style={{ padding: '0 18px 16px', display: 'flex', gap: '8px', flexWrap:'wrap' }}>
        <button onClick={() => onView(asset.id)} className="nav-pill nav-pill-primary" style={{ fontSize: '11px', padding: '6px 14px' }}>View →</button>



      </div>
    </div>
  );
}

// ─── Service Sheet Picker Modal ───────────────────────────────────────────────
function ServiceSheetPickerModal({ asset, templates, onClose, onSelect }) {
  const [selected, setSelected] = useState('');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg)', borderRadius:16, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden' }}>
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>📄 Service Sheet</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{asset.name}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ padding:20 }}>
          {templates.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>
              No service sheet templates found.<br/>Create one in Forms → Service Sheets first.
            </div>
          ) : (
            <>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>Choose a service sheet template:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {templates.map(t => (
                  <div key={t.id} onClick={() => setSelected(t.id)}
                    style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${selected===t.id?'var(--accent)':'var(--border)'}`, background:selected===t.id?'var(--accent-light)':'var(--surface)', cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{t.name}</div>
                    {t.service_type && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{t.service_type}</div>}
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={onClose} style={{ flex:1, padding:'10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}>Cancel</button>
                <button onClick={() => { if(selected) { const t=templates.find(x=>x.id===selected); onSelect(selected, t?.name||''); } }} disabled={!selected}
                  style={{ flex:2, padding:'10px', background:selected?'var(--accent)':'var(--surface-2)', color:selected?'#fff':'var(--text-muted)', border:'none', borderRadius:9, cursor:selected?'pointer':'not-allowed', fontSize:13, fontWeight:700 }}>
                  Open Service Sheet →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Units Tab ─────────────────────────────────────────────────────────────────
function UnitsTab({ userRole, onViewAsset, toast }) {
  const [assets, setAssets]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [printAsset, setPrintAsset] = useState(null);
  const [filter, setFilter]   = useState('All');
  const [search, setSearch]   = useState('');
  const [newAsset, setNewAsset] = useState({ name: '', type: '', location: '', status: 'Running', hourly_rate: '', target_hours: 8 });
  const [editAsset, setEditAsset] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [serviceSheetAsset, setServiceSheetAsset] = useState(null);
  const [serviceTemplates, setServiceTemplates] = useState([]);

  useEffect(() => { if (userRole?.company_id) { fetchAssets(); fetchTemplates(); } }, [userRole]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('service_sheet_templates').select('id,name,service_type').eq('company_id', userRole.company_id).order('name');
    setServiceTemplates(data || []);
  };

  const handleServiceSheet = (asset) => { setServiceSheetAsset(asset); };

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('assets').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    if (!error) setAssets(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newAsset.name || !newAsset.type || !newAsset.location) { toast('Please fill in Name, Type and Location', 'warning'); return; }
    const { error } = await supabase.from('assets').insert([{ ...newAsset, company_id: userRole.company_id }]);
    if (error) { toast('Error adding asset: ' + error.message, 'error'); }
    else { toast('Asset added successfully', 'success'); fetchAssets(); setNewAsset({ name: '', type: '', location: '', status: 'Running', hourly_rate: '', target_hours: 8 }); setShowForm(false); }
  };

  const handleEdit = async () => {
    if (!editAsset) return;
    setEditSaving(true);
    const { error } = await supabase.from('assets').update({
      name: editAsset.name, type: editAsset.type, location: editAsset.location,
      status: editAsset.status, make: editAsset.make, model: editAsset.model,
      year: editAsset.year ? parseInt(editAsset.year) : null,
      hours: editAsset.hours ? parseFloat(editAsset.hours) : null,
      target_hours: editAsset.target_hours ? parseFloat(editAsset.target_hours) : 8,
      hourly_rate: editAsset.hourly_rate ? parseFloat(editAsset.hourly_rate) : null,
      colour: editAsset.colour, serial_number: editAsset.serial_number,
      registration: editAsset.registration, notes: editAsset.notes,
      purchase_price: editAsset.purchase_price ? parseFloat(editAsset.purchase_price) : null,
      purchase_date: editAsset.purchase_date || null,
    }).eq('id', editAsset.id);
    setEditSaving(false);
    if (error) { toast('Error updating asset: ' + error.message, 'error'); return; }
    toast(`${editAsset.name} updated successfully`, 'success');
    setEditAsset(null);
    fetchAssets();
  };

  const handleQuickLog = async (asset, newStatus) => {
    try {
      let description = '';
      let category = newStatus === 'Maintenance' ? 'Scheduled Maintenance' : 'Unplanned';
      if (newStatus === 'Down' || newStatus === 'Maintenance') {
        const reason = window.prompt(
          newStatus === 'Down'
            ? `Why is ${asset.name} going down?\n(e.g. hydraulic leak, engine fault, tyre blowout)`
            : `What maintenance is being done on ${asset.name}?\n(e.g. 500hr service, track adjustment)`
        );
        if (reason === null) return; // user cancelled
        description = reason.trim() || (newStatus === 'Down' ? 'Machine reported down' : 'Machine placed in maintenance');
        // Auto-detect category from reason
        const r = description.toLowerCase();
        if (r.includes('service') || r.includes('oil') || r.includes('filter')) category = 'Scheduled Maintenance';
        else if (r.includes('hydraulic') || r.includes('hose') || r.includes('cylinder')) category = 'Hydraulic';
        else if (r.includes('electric') || r.includes('battery') || r.includes('starter')) category = 'Electrical';
        else if (r.includes('tyre') || r.includes('tire') || r.includes('track')) category = 'Mechanical';
      }
      await supabase.from('assets').update({ status: newStatus }).eq('id', asset.id);
      if (newStatus === 'Down' || newStatus === 'Maintenance') {
        const now = new Date();
        await supabase.from('downtime').insert({
          asset: asset.name,
          date: now.toISOString().split('T')[0],
          start_time: now.toTimeString().slice(0,5),
          end_time: '',
          category,
          description,
          reported_by: userRole?.name || userRole?.email || '',
          hours: 0,
          company_id: userRole.company_id,
          source: 'quick_log',
        });
      }
      if (newStatus === 'Running') {
        const { data: open } = await supabase.from('downtime')
          .select('id,date,start_time').eq('company_id', userRole.company_id)
          .eq('asset', asset.name).eq('end_time', '').order('created_at',{ascending:false}).limit(1);
        if (open?.[0]) {
          const now = new Date();
          const start = new Date(`${open[0].date}T${open[0].start_time||'00:00'}`);
          const hrs = Math.max(0, (now - start) / 3600000).toFixed(1);
          await supabase.from('downtime').update({ end_time: now.toTimeString().slice(0,5), hours: hrs }).eq('id', open[0].id);
        }
      }
      toast(newStatus === 'Running' ? `${asset.name} marked running` : `${asset.name} logged as ${newStatus}`, newStatus === 'Running' ? 'success' : 'warning');
      fetchAssets();
    } catch(e) { toast('Failed to update status: ' + e.message, 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) toast('Error deleting asset', 'error');
    else { toast(`${name} deleted`, 'info'); fetchAssets(); }
  };

  const FILTERS = ['All', 'Running', 'Down', 'Maintenance'];
  const filtered = assets.filter(a => {
    const matchFilter = filter === 'All' || a.status === filter;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.asset_number?.toLowerCase().includes(search.toLowerCase()) || a.location?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = { Running: assets.filter(a => a.status === 'Running').length, Down: assets.filter(a => a.status === 'Down').length, Maintenance: assets.filter(a => a.status === 'Maintenance').length };

  return (
    <div>
      {/* Edit Asset Modal */}
      {editAsset && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'85vh', overflowY:'auto', border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>Edit Asset — {editAsset.asset_number}</div>
              <button onClick={() => setEditAsset(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {[
                ['Name *','name','text'],['Type *','type','text'],
                ['Make','make','text'],['Model','model','text'],
                ['Year','year','number'],['Location','location','text'],
                ['Colour','colour','text'],['Serial Number','serial_number','text'],
                ['Current Hours','hours','number'],['Target Hrs/Day','target_hours','number'],
                ['Hourly Rate ($)','hourly_rate','number'],['Purchase Price ($)','purchase_price','number'],
                ['Purchase Date','purchase_date','date'],['Registration','registration','text'],
              ].map(([label,key,type]) => (
                <div key={key}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{label}</div>
                  <input style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                    type={type} value={editAsset[key]||''} onChange={e => setEditAsset(p=>({...p,[key]:e.target.value}))} />
                </div>
              ))}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Status</div>
                <select style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                  value={editAsset.status||'Running'} onChange={e => setEditAsset(p=>({...p,status:e.target.value}))}>
                  <option>Running</option><option>Down</option><option>Maintenance</option><option>Standby</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Notes</div>
              <textarea style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', resize:'vertical', minHeight:70 }}
                value={editAsset.notes||''} onChange={e => setEditAsset(p=>({...p,notes:e.target.value}))} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleEdit} disabled={editSaving} style={{ flex:1, padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:editSaving?0.6:1 }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditAsset(null)} style={{ padding:'10px 18px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {printAsset && <QRModal asset={printAsset} onClose={() => setPrintAsset(null)} />}

      {/* Service Sheet Picker Modal */}
      {serviceSheetAsset && (
        <ServiceSheetPickerModal
          asset={serviceSheetAsset}
          templates={serviceTemplates}
          onClose={() => setServiceSheetAsset(null)}
          onSelect={(templateId, templateName) => {
            setServiceSheetAsset(null);
            sessionStorage.setItem('mechiq_open_form', JSON.stringify({
              templateId, assetName: serviceSheetAsset.name, serviceType: templateName,
            }));
            window.dispatchEvent(new CustomEvent('mechiq-navigate', { detail: { page: 'forms', subPage: 'service_sheets' } }));
          }}
        />
      )}

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const active = filter === f;
            const cnt = f === 'All' ? assets.length : counts[f] || 0;
            const fc = f === 'Down' ? 'var(--red)' : f === 'Maintenance' ? 'var(--amber)' : f === 'Running' ? 'var(--green)' : 'var(--accent)';
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '7px 14px', borderRadius: '8px', border: `1px solid ${active ? fc+'60' : 'var(--border)'}`,
                background: active ? fc + '15' : 'var(--surface)', color: active ? fc : 'var(--text-muted)',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {f}
                <span style={{ background: active ? fc+'20' : 'var(--surface-2)', color: active ? fc : 'var(--text-muted)', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{cnt}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}>⌕</span>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" style={{ paddingLeft: '32px', width: '200px', background:'var(--surface-2)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, padding:'8px 12px 8px 30px', fontFamily:'var(--font-display)' }} />
          </div>
          {userRole?.role !== 'technician' && userRole?.role !== 'operator' && (
            <button onClick={() => setShowForm(!showForm)} className="nav-pill nav-pill-primary">Add Asset</button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px', marginBottom: '20px', boxShadow: '0 0 20px rgba(0,212,255,0.06)', animation: 'fadeUp 0.25s ease' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily:'var(--font-display)', letterSpacing:'1px', textTransform:'uppercase' }}>
            Quick Add Asset
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            {[
              ['Asset Name', 'name', 'text', 'e.g. CAT 320 Excavator'],
              ['Type', 'type', 'text', 'e.g. Excavator, Vehicle…'],
              ['Location / Site', 'location', 'text', 'e.g. Site A, Workshop'],
              ['Hourly Rate ($/hr)', 'hourly_rate', 'number', 'e.g. 185'],
              ['Target Hours/Day', 'target_hours', 'number', 'e.g. 8'],
            ].map(([lbl, key, type, ph]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '5px', fontFamily:'var(--font-display)' }}>{lbl}</label>
                <input className="form-input" type={type} placeholder={ph} value={newAsset[key]} onChange={e => setNewAsset(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '5px', fontFamily:'var(--font-display)' }}>Status</label>
              <select className="form-input" value={newAsset.status} onChange={e => setNewAsset(p => ({ ...p, status: e.target.value }))}>
                <option>Running</option><option>Down</option><option>Maintenance</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAdd} className="nav-pill nav-pill-primary">Save Asset</button>
            <button onClick={() => setShowForm(false)} className="nav-pill nav-pill-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {[0,1,2,3,4,5].map(i => <AssetCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>{search || filter !== 'All' ? '🔍' : '⚙️'}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', fontFamily:'var(--font-display)' }}>
            {search ? 'No assets match your search' : filter !== 'All' ? `No ${filter} assets` : 'No assets yet'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto' }}>
            {search || filter !== 'All' ? 'Try adjusting your filters or search term.' : 'Add your first asset or use Onboarding to register equipment.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map((asset, i) => (
            <AssetCard key={asset.id} asset={asset} index={i}
              onView={onViewAsset} onDelete={handleDelete} onQuickLog={handleQuickLog} onEdit={setEditAsset}
              onQR={setPrintAsset} onServiceSheet={handleServiceSheet} userRole={userRole} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step Indicator ────────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Specifications', 'Registration', 'Purchase Details', 'Service Intervals', 'Complete'];

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
      {STEPS.map((label, i) => {
        const done = i < current, active = i === current;
        const c = done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--surface-3)';
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: c, color: (done||active) ? 'var(--bg)' : 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', transition: 'all 0.3s', boxShadow: active ? `0 0 0 4px ${c}28` : 'none' }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '10px', marginTop: '5px', color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--text-faint)', fontWeight: active || done ? 700 : 500, whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>{label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="step-line" style={{ flex: 1, height: '2px', background: done ? 'var(--green)' : '#e2ecf5', margin: '0 6px', marginBottom: '18px', transition: 'background 0.4s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Field components ──────────────────────────────────────────────────────────
function FieldGroup({ title, optional, children }) {
  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily:'var(--font-display)' }}>{title}</span>
        {optional && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', background: '#e0f4ff', padding: '2px 8px', borderRadius: '10px' }}>Optional</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>{children}</div>
    </div>
  );
}
function Field({ label, required, fullWidth, children }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1/-1' : 'auto' }}>
      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '5px', fontFamily:'var(--font-display)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
    </div>
  );
}
function FInput({ value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <input className="form-input" type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
      style={readOnly ? { background: '#f5f8fc', color: 'var(--text-muted)', cursor: 'default' } : {}} />
  );
}

// ─── Depreciation calc ─────────────────────────────────────────────────────────
function calcDepr(price, date, year) {
  if (!price || price <= 0) return null;
  const now = new Date();
  let age = date ? (now - new Date(date)) / (1000*60*60*24*365.25) : year ? now.getFullYear() - parseInt(year) : 0;
  if (age < 0) age = 0;
  const life = 10, residRate = 0.1;
  const resid = price * residRate;
  const annual = (price - resid) / life;
  const accum = Math.min(annual * age, price - resid);
  const curr = Math.max(price - accum, resid);
  return { purchasePrice: price, currentValue: Math.round(curr), residualValue: Math.round(resid), accumulatedDepreciation: Math.round(accum), annualDepreciation: Math.round(annual), depreciationRate: Math.round(((price-curr)/price)*1000)/10, ageYears: Math.round(age*10)/10, yearsRemaining: Math.round(Math.max(life-age,0)*10)/10 };
}

// ─── Onboarding Tab ────────────────────────────────────────────────────────────
function OnboardingTab({ userRole, onComplete, toast }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAsset, setSavedAsset] = useState(null);
  const [hasRego, setHasRego] = useState(null);
  const qrRef = useRef(null);
  const isAdmin = ['admin', 'master'].includes(userRole?.role);

  const empty = { name:'', asset_number:'', type:'', make:'', model:'', location:'', status:'Active', year:'', colour:'', vin:'', serial_number:'', engine_number:'', engine_model:'', hours:'', target_hours:'8', hourly_rate:'', registration:'', registration_expiry:'', license_class:'', registration_state:'', tare_weight:'', gvm:'', insurance_policy:'', insurance_expiry:'', purchase_date:'', purchase_price:'', supplier:'', warranty_expiry:'', notes:'' };
  const [form, setForm] = useState(empty);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const DEFAULT_INTERVALS = [
    { id: 'i250',    name: '250hr Service',    interval_type: 'hours', interval_value: 250,  enabled: false },
    { id: 'i500',    name: '500hr Service',    interval_type: 'hours', interval_value: 500,  enabled: true  },
    { id: 'i1000',   name: '1000hr Service',   interval_type: 'hours', interval_value: 1000, enabled: true  },
    { id: 'annual',  name: 'Annual Inspection',interval_type: 'months',interval_value: 12,   enabled: true  },
    { id: 'custom1', name: '',                 interval_type: 'hours', interval_value: '',   enabled: false, custom: true },
  ];
  const [intervals, setIntervals] = useState(DEFAULT_INTERVALS);

  useEffect(() => {
    supabase.from('assets').select('asset_number').eq('company_id', userRole.company_id).then(({ data }) => {
      const nums = (data||[]).map(a => parseInt((a.asset_number||'').replace(/\D/g,''),10)).filter(n=>!isNaN(n));
      const next = nums.length ? Math.max(...nums)+1 : 1;
      setForm(f => ({ ...f, asset_number: `AST-${String(next).padStart(4,'0')}` }));
    });
  }, [userRole.company_id]);

  const depr = calcDepr(parseFloat(form.purchase_price), form.purchase_date, form.year);
  const canNext = step === 0 ? (form.name.trim() && form.type.trim() && form.asset_number.trim()) : step === 2 ? (hasRego !== null) : true;

  const save = async () => {
    setSaving(true);
    const payload = {
      company_id: userRole.company_id, name: form.name, asset_number: form.asset_number,
      type: form.type, make: form.make, model: form.model, location: form.location,
      status: form.status, year: parseInt(form.year)||null, colour: form.colour,
      vin: form.vin, serial_number: form.serial_number, engine_number: form.engine_number,
      engine_model: form.engine_model, hours: parseFloat(form.hours)||0,
      target_hours: parseFloat(form.target_hours)||8, hourly_rate: parseFloat(form.hourly_rate)||null,
      registration: hasRego ? form.registration : null,
      registration_expiry: hasRego && form.registration_expiry ? form.registration_expiry : null,
      license_class: hasRego ? form.license_class : null,
      registration_state: hasRego ? form.registration_state : null,
      tare_weight: hasRego && form.tare_weight ? parseFloat(form.tare_weight) : null,
      gvm: hasRego && form.gvm ? parseFloat(form.gvm) : null,
      insurance_policy: hasRego ? form.insurance_policy : null,
      insurance_expiry: hasRego && form.insurance_expiry ? form.insurance_expiry : null,
      notes: form.notes,
      ...(isAdmin ? { purchase_date: form.purchase_date||null, purchase_price: parseFloat(form.purchase_price)||null, supplier: form.supplier, warranty_expiry: form.warranty_expiry||null, depreciation_snapshot: depr ? JSON.stringify(depr) : null } : {}),
    };
    const { data, error } = await supabase.from('assets').insert([payload]).select().single();
    if (error) { setSaving(false); toast('Error saving asset: ' + error.message, 'error'); return; }
    
    // Save enabled service intervals
    const enabledIntervals = intervals.filter(i => i.enabled && (i.name || !i.custom) && (i.interval_value));
    if (enabledIntervals.length > 0) {
      const scheduleRows = enabledIntervals.map(i => ({
        company_id: userRole.company_id,
        asset_id: data.id,
        asset_name: data.name,
        service_name: i.name,
        interval_type: i.interval_type,
        interval_value: parseFloat(i.interval_value),
        last_service_value: parseFloat(form.hours) || 0,
        next_due_value: (parseFloat(form.hours) || 0) + parseFloat(i.interval_value),
        notes: '',
      }));
      await supabase.from('service_schedules').insert(scheduleRows);
    }
    setSaving(false);
    setSavedAsset(data); setStep(5);
    toast(`${data.asset_number} onboarded successfully! 🎉`, 'success');
  };

  const printQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const qr = canvas.toDataURL('image/png');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>QR - ${savedAsset.asset_number}</title><style>@page{size:85.6mm 54mm;margin:0}*{margin:0;padding:0;box-sizing:border-box}html,body{width:85.6mm;height:54mm;background:#000!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.card{width:85.6mm;height:54mm;background:#000!important;display:flex;align-items:center;padding:5mm;gap:4mm}.qr{flex-shrink:0;width:36mm;height:36mm;background:#fff;padding:1.5mm;border-radius:1.5mm}.qr img{width:100%;height:100%}.txt{flex:1;display:flex;flex-direction:column;justify-content:space-between;height:36mm}.lc{font-family:Arial;font-size:6pt;color:#777}.ln{font-family:Arial;font-size:22pt;font-weight:900;color:var(--accent);line-height:1}.lname{font-family:Arial;font-size:9.5pt;font-weight:700;color:#fff}.lmeta{font-family:Arial;font-size:6.5pt;color:#888}.lbrand{font-family:Arial;font-size:9pt;font-weight:900;color:#fff;letter-spacing:2px;text-align:right}.iq{color:var(--accent)}</style></head><body><div class="card"><div class="qr"><img src="${qr}"/></div><div class="txt"><div><div class="lc">MECH IQ · ASSET TAG</div><div class="ln">${savedAsset.asset_number}</div><div class="lname">${savedAsset.name}</div><div class="lmeta">${savedAsset.type}${savedAsset.make?' · '+savedAsset.make:''}</div></div><div class="lbrand">MECH<span class="iq">IQ</span></div></div></div><script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  };

  const again = () => {
    setForm(empty); setSavedAsset(null); setStep(0); setHasRego(null); setIntervals(DEFAULT_INTERVALS);
    supabase.from('assets').select('asset_number').eq('company_id', userRole.company_id).then(({ data }) => {
      const nums = (data||[]).map(a => parseInt((a.asset_number||'').replace(/\D/g,''),10)).filter(n=>!isNaN(n));
      const next = nums.length ? Math.max(...nums)+1 : 1;
      setForm(f => ({ ...f, asset_number: `AST-${String(next).padStart(4,'0')}` }));
    });
  };

  // ── Step renders (plain functions — NOT components — to avoid focus loss on re-render)
  const renderStep0 = () => (
    <>
      <FieldGroup title="Identity">
        <Field label="Asset Name" required><FInput value={form.name} onChange={set('name')} placeholder="e.g. CAT 320 Excavator, Ford Ranger" /></Field>
        <Field label="Asset Number" required><FInput value={form.asset_number} onChange={set('asset_number')} placeholder="AST-0001" /></Field>
        <Field label="Asset Type" required><FInput value={form.type} onChange={set('type')} placeholder="e.g. Excavator, Truck, Generator" /></Field>
        <Field label="Status"><FInput value={form.status} onChange={set('status')} placeholder="Active" /></Field>
      </FieldGroup>
      <FieldGroup title="Details" optional>
        <Field label="Make"><FInput value={form.make} onChange={set('make')} placeholder="e.g. CAT, Ford, Komatsu" /></Field>
        <Field label="Model"><FInput value={form.model} onChange={set('model')} placeholder="e.g. 320GC, Ranger XL" /></Field>
        <Field label="Year"><FInput value={form.year} onChange={set('year')} type="number" placeholder="e.g. 2021" /></Field>
        <Field label="Colour"><FInput value={form.colour} onChange={set('colour')} placeholder="e.g. Yellow, White" /></Field>
        <Field label="Location / Site" fullWidth><FInput value={form.location} onChange={set('location')} placeholder="e.g. Site A, Main Workshop" /></Field>
      </FieldGroup>
    </>
  );

  const renderStep1 = () => (
    <>
      <FieldGroup title="Identification Numbers" optional>
        <Field label="VIN / Chassis"><FInput value={form.vin} onChange={set('vin')} placeholder="1HGBH41JXMN109186" /></Field>
        <Field label="Serial Number"><FInput value={form.serial_number} onChange={set('serial_number')} placeholder="SN-XXXXXXXX" /></Field>
        <Field label="Engine Number"><FInput value={form.engine_number} onChange={set('engine_number')} placeholder="ENG-XXXXXXX" /></Field>
        <Field label="Engine Model"><FInput value={form.engine_model} onChange={set('engine_model')} placeholder="e.g. Cummins QSB6.7" /></Field>
      </FieldGroup>
      <FieldGroup title="Hours & Rates" optional>
        <Field label="Current Hours"><FInput value={form.hours} onChange={set('hours')} type="number" placeholder="e.g. 4250" /></Field>
        <Field label="Target Hours / Day"><FInput value={form.target_hours} onChange={set('target_hours')} type="number" placeholder="e.g. 8" /></Field>
        <Field label="Hourly Rate ($/hr)" fullWidth><FInput value={form.hourly_rate} onChange={set('hourly_rate')} type="number" placeholder="e.g. 185" /></Field>
      </FieldGroup>
    </>
  );

  const renderStep2 = () => (
    <>
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily:'var(--font-display)', marginBottom: '12px' }}>Does this asset have vehicle registration?</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => setHasRego(v)} style={{
              padding: '11px 32px', borderRadius: '10px', border: `1px solid ${hasRego === v ? 'var(--accent-dark)' : 'var(--border)'}`,
              background: hasRego === v ? 'var(--accent-glow)' : 'var(--surface-2)', color: hasRego === v ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s', fontFamily:'var(--font-display)',
            }}>{v ? '✅ Yes' : '❌ No'}</button>
          ))}
        </div>
      </div>
      {hasRego === true && (
        <>
          <FieldGroup title="Registration Details">
            <Field label="Rego Number" required><FInput value={form.registration} onChange={set('registration')} placeholder="e.g. ABC123" /></Field>
            <Field label="State"><FInput value={form.registration_state} onChange={set('registration_state')} placeholder="QLD, NSW, WA…" /></Field>
            <Field label="Expiry Date"><FInput value={form.registration_expiry} onChange={set('registration_expiry')} type="date" /></Field>
            <Field label="Licence Class"><FInput value={form.license_class} onChange={set('license_class')} placeholder="e.g. LR, MR, HR, HC" /></Field>
            <Field label="Tare (kg)"><FInput value={form.tare_weight} onChange={set('tare_weight')} type="number" placeholder="e.g. 2100" /></Field>
            <Field label="GVM (kg)"><FInput value={form.gvm} onChange={set('gvm')} type="number" placeholder="e.g. 3500" /></Field>
          </FieldGroup>
          <FieldGroup title="Insurance" optional>
            <Field label="Policy Number"><FInput value={form.insurance_policy} onChange={set('insurance_policy')} placeholder="POL-2024-XXXX" /></Field>
            <Field label="Expiry Date"><FInput value={form.insurance_expiry} onChange={set('insurance_expiry')} type="date" /></Field>
          </FieldGroup>
        </>
      )}
      {hasRego === false && (
        <div style={{ padding: '36px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
          
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily:'var(--font-display)' }}>No registration required</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Click Next to continue to purchase details.</div>
        </div>
      )}
      {hasRego === null && (
        <div style={{ padding: '36px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select Yes or No above to continue.</div>
        </div>
      )}
    </>
  );

  const renderStep3 = () => (
    <>
      {isAdmin ? (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(204,136,0,0.3)', borderRadius: '8px', marginBottom: '18px' }}>
            <span>🔒</span>
            <span style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 600, fontFamily:'var(--font-display)' }}>Admin Only — purchase price and depreciation not visible to technicians</span>
          </div>
          <FieldGroup title="Purchase Information" optional>
            <Field label="Purchase Date"><FInput value={form.purchase_date} onChange={set('purchase_date')} type="date" /></Field>
            <Field label="Purchase Price ($)"><FInput value={form.purchase_price} onChange={set('purchase_price')} type="number" placeholder="e.g. 320000" /></Field>
            <Field label="Supplier / Dealer" fullWidth><FInput value={form.supplier} onChange={set('supplier')} placeholder="e.g. WesTrac, Coates" /></Field>
            <Field label="Warranty Expiry" fullWidth><FInput value={form.warranty_expiry} onChange={set('warranty_expiry')} type="date" /></Field>
          </FieldGroup>
          {depr ? (
            <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '18px', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px', fontFamily:'var(--font-display)' }}>Depreciation Preview · Straight-Line · 10yr · 10% Residual</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                {[
                  ['Purchase Price', `$${depr.purchasePrice.toLocaleString()}`, false, false],
                  ['Current Value',  `$${depr.currentValue.toLocaleString()}`, true,  false],
                  ['Residual Value', `$${depr.residualValue.toLocaleString()}`, false, false],
                  ['Asset Age',      `${depr.ageYears} yrs`,                    false, false],
                  ['Annual Depr.',   `$${depr.annualDepreciation.toLocaleString()}/yr`, false, false],
                  ['Depreciated',    `${depr.depreciationRate}%`,               false, depr.depreciationRate > 70],
                ].map(([lbl, val, hi, warn]) => (
                  <div key={lbl} style={{ textAlign: 'center', background: 'var(--surface-3)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px', fontFamily:'var(--font-display)' }}>{lbl}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: warn ? 'var(--red)' : hi ? 'var(--accent)' : 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', fontFamily:'var(--font-display)' }}>
              Enter a purchase price above to see a live depreciation preview.
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,212,255,0.06)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '18px' }}>
          <span>🔒</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, fontFamily:'var(--font-display)' }}>Purchase and financial details are visible to admins only.</span>
        </div>
      )}
      <FieldGroup title="Notes" optional>
        <Field label="Additional Notes" fullWidth>
          <textarea className="form-input" value={form.notes} onChange={set('notes')} placeholder="Any additional notes about this asset…" style={{ minHeight: '80px', resize: 'vertical' }} />
        </Field>
      </FieldGroup>
    </>
  );

  const renderStep4 = () => (
    <div>
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>Service Intervals</h3>
      <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Set up maintenance schedules for {form.name}. These will appear on the calendar and asset profile.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        {intervals.map((interval, idx) => (
          <div key={interval.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background: interval.enabled ? 'var(--accent-light)' : 'var(--surface-2)', border:`1px solid ${interval.enabled ? 'rgba(14,165,233,0.3)' : 'var(--border)'}`, borderRadius:10, transition:'all 0.15s' }}>
            <div onClick={() => setIntervals(prev => prev.map((x,i) => i===idx ? {...x, enabled:!x.enabled} : x))}
              style={{ width:22, height:22, borderRadius:4, border:`2px solid ${interval.enabled ? 'var(--accent)' : 'var(--border)'}`, background: interval.enabled ? 'var(--accent)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}>
              {interval.enabled && <span style={{ color:'#fff', fontSize:12, fontWeight:800 }}>✓</span>}
            </div>
            {interval.custom ? (
              <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
                <input style={{ flex:2, minWidth:120, padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none' }}
                  placeholder="Service name (e.g. Grease & Lube)" value={interval.name}
                  onChange={e => setIntervals(prev => prev.map((x,i) => i===idx ? {...x, name:e.target.value, enabled: !!e.target.value} : x))} />
                <input style={{ width:80, padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none' }}
                  type="number" placeholder="Interval" value={interval.interval_value}
                  onChange={e => setIntervals(prev => prev.map((x,i) => i===idx ? {...x, interval_value:e.target.value} : x))} />
                <select style={{ padding:'7px 10px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none' }}
                  value={interval.interval_type}
                  onChange={e => setIntervals(prev => prev.map((x,i) => i===idx ? {...x, interval_type:e.target.value} : x))}>
                  <option value="hours">Hours</option>
                  <option value="km">Kilometres</option>
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                </select>
              </div>
            ) : (
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{interval.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Every {interval.interval_value} {interval.interval_type} · Next due at {(parseFloat(form.hours)||0) + parseFloat(interval.interval_value)} {interval.interval_type}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding:'12px 16px', background:'var(--surface-2)', borderRadius:8, border:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)' }}>
        💡 Starting from current hours: <strong style={{ color:'var(--text-primary)' }}>{form.hours || 0} hrs</strong>. You can edit these later from the asset's Service Schedule tab.
      </div>
    </div>
  );

  const renderStep5 = () => {
    if (!savedAsset) return null;
    const qrVal = `https://maintain-iq.vercel.app/asset/${savedAsset.id}`;
    return (
      <div style={{ textAlign: 'center', padding: '10px 0', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--green-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid var(--green-border)', boxShadow: '0 0 24px rgba(0,255,136,0.3)' }}><div style={{ width: '28px', height: '14px', borderLeft: '4px solid var(--green)', borderBottom: '4px solid var(--green)', transform: 'rotate(-45deg) translate(2px, -4px)' }} /></div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{savedAsset.asset_number} Onboarded!</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px', fontFamily:'var(--font-display)' }}>{savedAsset.name} has been registered in your fleet</div>
        <div style={{ display: 'inline-block', padding: '20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '18px', marginBottom: '24px', boxShadow: '0 0 20px rgba(0,212,255,0.08)' }}>
          <div ref={qrRef}><QRCodeCanvas value={qrVal} size={180} level="H" /></div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{qrVal.slice(0, 40)}…</div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', textAlign: 'left', border:'1px solid var(--border)' }}>
          {[['Asset No.', savedAsset.asset_number], ['Type', savedAsset.type], ['Make', [savedAsset.make, savedAsset.model].filter(Boolean).join(' ')||'—'], ['Location', savedAsset.location||'—'], ['Serial', savedAsset.serial_number||'—'], ['VIN', savedAsset.vin||'—']].map(([k, v]) => (
            <div key={k}><div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontFamily:'var(--font-display)' }}>{k}</div><div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily:'var(--font-display)' }}>{v}</div></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={printQR} className="nav-pill nav-pill-primary">Print QR Label</button>
          <button onClick={again} style={{ padding: '7px 18px', background: 'transparent', border: '1px solid var(--accent-dark)', color: 'var(--accent)', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily:'var(--font-display)', letterSpacing:'1px', textTransform:'uppercase', transition:'all 0.15s' }}>+ Onboard Another</button>
          {onComplete && <button onClick={onComplete} className="nav-pill nav-pill-ghost">View All Assets</button>}
        </div>
      </div>
    );
  };

  const [onboardList,   setOnboardList]   = React.useState([]);
  const [editAsset,     setEditAsset]     = React.useState(null);
  const [editSaving,    setEditSaving]    = React.useState(false);

  const handleEdit = async () => {
    if (!editAsset) return;
    setEditSaving(true);
    await supabase.from('assets').update({
      name: editAsset.name, type: editAsset.type, location: editAsset.location,
      status: editAsset.status, make: editAsset.make, model: editAsset.model,
      year: editAsset.year ? parseInt(editAsset.year) : null,
      hours: editAsset.hours ? parseFloat(editAsset.hours) : null,
      target_hours: editAsset.target_hours ? parseFloat(editAsset.target_hours) : 8,
      hourly_rate: editAsset.hourly_rate ? parseFloat(editAsset.hourly_rate) : null,
      colour: editAsset.colour, serial_number: editAsset.serial_number,
      registration: editAsset.registration, notes: editAsset.notes,
      purchase_price: editAsset.purchase_price ? parseFloat(editAsset.purchase_price) : null,
      purchase_date: editAsset.purchase_date || null,
    }).eq('id', editAsset.id);
    setEditSaving(false);
    toast && toast(`${editAsset.name} updated`, 'success');
    setEditAsset(null);
    // Refresh list
    supabase.from('assets').select('*').eq('company_id', userRole.company_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOnboardList(data || []));
  };
  const [showList, setShowList]       = React.useState(true);
  React.useEffect(() => {
    if (!userRole?.company_id) return;
    supabase.from('assets')
      .select('id,asset_number,name,type,status,make,model,hours,purchase_price,created_at')
      .eq('company_id', userRole.company_id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setOnboardList(data || []));
  }, [userRole?.company_id, savedAsset?.id]);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:10 }}>
        <div>

          <p style={{ fontSize:'13px', color:'var(--text-muted)', margin:0 }}>Register any asset, vehicle or equipment and generate its QR tag.</p>
        </div>
        <span style={{ padding:'5px 14px', borderRadius:20, background:'var(--accent-light)', color:'var(--accent)', fontSize:12, fontWeight:700 }}>
          {onboardList.length} Registered
        </span>
      </div>

      {/* Edit Asset Modal */}
      {editAsset && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'var(--surface)', borderRadius:16, padding:28, width:'100%', maxWidth:560, maxHeight:'85vh', overflowY:'auto', border:'1px solid var(--border)', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:17, fontWeight:800, color:'var(--text-primary)' }}>Edit Asset — {editAsset.asset_number}</div>
              <button onClick={() => setEditAsset(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {[
                ['Name *','name','text'],['Type *','type','text'],
                ['Make','make','text'],['Model','model','text'],
                ['Year','year','number'],['Location','location','text'],
                ['Colour','colour','text'],['Serial Number','serial_number','text'],
                ['Current Hours','hours','number'],['Target Hrs/Day','target_hours','number'],
                ['Hourly Rate ($)','hourly_rate','number'],['Purchase Price ($)','purchase_price','number'],
                ['Purchase Date','purchase_date','date'],['Registration','registration','text'],
              ].map(([label,key,type]) => (
                <div key={key}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{label}</div>
                  <input style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                    type={type} value={editAsset[key]||''} onChange={e => setEditAsset(p=>({...p,[key]:e.target.value}))} />
                </div>
              ))}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Status</div>
                <select style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                  value={editAsset.status||'Running'} onChange={e => setEditAsset(p=>({...p,status:e.target.value}))}>
                  <option>Running</option><option>Down</option><option>Maintenance</option><option>Standby</option><option>Active</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Notes</div>
              <textarea style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', resize:'vertical', minHeight:70 }}
                value={editAsset.notes||''} onChange={e => setEditAsset(p=>({...p,notes:e.target.value}))} />
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleEdit} disabled={editSaving} style={{ flex:1, padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:editSaving?0.6:1 }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setEditAsset(null)} style={{ padding:'10px 18px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Registered assets table */}
      {onboardList.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, marginBottom:24, overflow:'hidden' }}>
          <div onClick={() => setShowList(p=>!p)}
            style={{ padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer',
              borderBottom: showList ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:3, height:16, background:'var(--accent)', borderRadius:2 }} />
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Registered Assets</span>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{onboardList.length} total</span>
            </div>
            <span style={{ fontSize:12, color:'var(--text-muted)', userSelect:'none' }}>{showList ? '▲ Hide' : '▼ Show'}</span>
          </div>
          {showList && (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'var(--surface-2)' }}>
                    {['Asset No.','Name','Type','Make / Model','Status','Hours','Purchase Price','Date Added',''].map(h => (
                      <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700,
                        color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px',
                        borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {onboardList.map(a => {
                    const sc = a.status==='Down'?'var(--red)':a.status==='Maintenance'?'var(--amber)':'var(--green)';
                    return (
                      <tr key={a.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'9px 14px', fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:12 }}>{a.asset_number}</td>
                        <td style={{ padding:'9px 14px', fontWeight:600, color:'var(--text-primary)' }}>{a.name}</td>
                        <td style={{ padding:'9px 14px', color:'var(--text-secondary)' }}>{a.type||'—'}</td>
                        <td style={{ padding:'9px 14px', color:'var(--text-secondary)', fontSize:12 }}>{[a.make,a.model].filter(Boolean).join(' ')||'—'}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ padding:'2px 8px', borderRadius:20, background:sc+'18', color:sc, fontSize:11, fontWeight:700 }}>
                            {a.status||'Active'}
                          </span>
                        </td>
                        <td style={{ padding:'9px 14px', color:'var(--text-secondary)' }}>{a.hours?Number(a.hours).toLocaleString()+' hrs':'—'}</td>
                        <td style={{ padding:'9px 14px', color:'var(--text-secondary)' }}>{a.purchase_price?'$'+Number(a.purchase_price).toLocaleString():'—'}</td>
                        <td style={{ padding:'9px 14px', color:'var(--text-muted)', fontSize:12 }}>{a.created_at?new Date(a.created_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <button onClick={() => setEditAsset(a)}
                            style={{ padding:'4px 12px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <StepBar current={step} />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', boxShadow: '0 0 32px rgba(0,212,255,0.06)' }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step < 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <button className="nav-pill nav-pill-ghost" onClick={() => setStep(s => s-1)} disabled={step === 0}>← Back</button>
            {step < 4
              ? <button className="nav-pill nav-pill-primary" onClick={() => setStep(s => s+1)} disabled={!canNext}>Next →</button>
              : <button className="nav-pill nav-pill-success" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save & Generate QR'}</button>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tracker ──────────────────────────────────────────────────────────────────
function TrackerPlaceholder({ userRole }) {
  const [assets, setAssets]       = React.useState([]);
  const [selected, setSelected]   = React.useState(null);
  const [watching, setWatching]   = React.useState(false);
  const [userPos, setUserPos]     = React.useState(null);
  const [accuracy, setAccuracy]   = React.useState(null);
  const [gpsError, setGpsError]   = React.useState(null);
  const [lastUpdate, setLastUpdate] = React.useState(null);
  const [mapReady, setMapReady]   = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState('All');
  const mapRef      = React.useRef(null);
  const mapInst     = React.useRef(null);
  const markersRef  = React.useRef({});
  const userMarker  = React.useRef(null);
  const watchId     = React.useRef(null);

  // ── Load Leaflet once ───────────────────────────────────────────
  React.useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link');
      l.id = 'leaflet-css'; l.rel = 'stylesheet';
      l.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(l);
    }
    const load = () => {
      if (window.L) { initMap(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = () => { setMapReady(true); initMap(); };
      document.head.appendChild(s);
    };
    load();
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (mapInst.current) { try { mapInst.current.remove(); } catch(e){} mapInst.current = null; }
    };
  }, []);

  // ── Fetch assets ────────────────────────────────────────────────
  React.useEffect(() => {
    if (!userRole?.company_id) return;
    supabase.from('assets')
      .select('id,asset_number,name,type,make,model,status,location,hours,last_lat,last_lng,last_seen')
      .eq('company_id', userRole.company_id)
      .then(({ data }) => setAssets(data || []));
  }, [userRole?.company_id]);

  // ── Init map ────────────────────────────────────────────────────
  const initMap = () => {
    if (mapInst.current || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    map.setView([-25.2744, 133.7751], 5);
    mapInst.current = map;
    setMapReady(true);
  };

  // ── Render asset markers whenever assets or map changes ─────────
  React.useEffect(() => {
    if (!mapInst.current || !window.L) return;
    const L = window.L;
    Object.values(markersRef.current).forEach(m => { try { m.remove(); } catch(e){} });
    markersRef.current = {};
    const withGPS = assets.filter(a => a.last_lat && a.last_lng);
    if (withGPS.length === 0) return;
    withGPS.forEach(a => {
      const SC = { Running:'#16a34a', Down:'#dc2626', Maintenance:'#d97706', Active:'#16a34a' };
      const c = SC[a.status] || '#0ea5e9';
      const num = (a.asset_number||'').replace('AST-','');
      const icon = L.divIcon({
        html: `<div style="position:relative;width:36px;height:42px">
          <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:${c};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.4);transform:rotate(-45deg);position:absolute;top:0;left:0"></div>
          <span style="position:absolute;top:5px;left:0;width:36px;text-align:center;font-size:9px;font-weight:900;color:#fff;font-family:sans-serif;line-height:1">${num}</span>
        </div>`,
        iconSize: [36, 42], iconAnchor: [18, 42], popupAnchor: [0, -44], className: '',
      });
      const pop = `<div style="font-family:sans-serif;padding:4px;min-width:150px">
        <div style="font-size:14px;font-weight:700;margin-bottom:3px">${a.name}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">${a.asset_number} · ${a.type||''}</div>
        <div style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${c}20;color:${c}">${a.status}</div>
        ${a.last_seen ? `<div style="font-size:10px;color:#9ca3af;margin-top:4px">Updated: ${new Date(a.last_seen).toLocaleString('en-AU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>` : ''}
      </div>`;
      const marker = L.marker([a.last_lat, a.last_lng], { icon }).addTo(mapInst.current).bindPopup(pop);
      marker.on('click', () => setSelected(a));
      markersRef.current[a.id] = marker;
    });
    const group = L.featureGroup(Object.values(markersRef.current));
    if (group.getBounds().isValid()) mapInst.current.fitBounds(group.getBounds(), { padding: [50,50] });
  }, [assets, mapReady]);

  // ── Track user location ─────────────────────────────────────────
  const startTracking = () => {
    if (!navigator.geolocation) { setGpsError('Geolocation not supported by this browser'); return; }
    setGpsError(null); setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = coords;
        setUserPos({ lat, lng }); setAccuracy(Math.round(acc)); setLastUpdate(new Date());
        if (mapInst.current && window.L) {
          if (userMarker.current) { try { userMarker.current.remove(); } catch(e){} }
          const icon = window.L.divIcon({
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#0ea5e9;border:3px solid #fff;box-shadow:0 0 0 6px rgba(14,165,233,0.25)"></div>`,
            iconSize:[18,18], iconAnchor:[9,9], className:'',
          });
          userMarker.current = window.L.marker([lat,lng],{icon}).addTo(mapInst.current)
            .bindPopup(`<b>Your Location</b><br/>±${Math.round(acc)}m accuracy`);
          mapInst.current.flyTo([lat,lng], 13, { duration: 1.5 });
        }
      },
      (err) => { setGpsError(err.message); setWatching(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const stopTracking = () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    setWatching(false);
  };

  const flyTo = (a) => {
    setSelected(a);
    if (a.last_lat && mapInst.current) {
      mapInst.current.flyTo([a.last_lat, a.last_lng], 15, { duration: 1.2 });
      if (markersRef.current[a.id]) markersRef.current[a.id].openPopup();
    }
  };

  const SC = { Running:'var(--green)', Down:'var(--red)', Maintenance:'var(--amber)', Active:'var(--green)', Standby:'var(--purple)' };
  const withGPS    = assets.filter(a => a.last_lat && a.last_lng);
  const withoutGPS = assets.filter(a => !a.last_lat || !a.last_lng);
  const filtered   = filterStatus === 'All' ? assets : assets.filter(a => a.status === filterStatus);

  return (
    <div>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>

          <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>
            GPS · Wi‑Fi · Cell triangulation · {withGPS.length}/{assets.length} assets reporting live location
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {userPos && (
            <span style={{ fontSize:12, color:'var(--green)', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
              ±{accuracy}m · {lastUpdate?.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
          )}
          {gpsError && <span style={{ fontSize:12, color:'var(--red)' }}>⚠ {gpsError}</span>}
          <button onClick={watching ? stopTracking : startTracking}
            style={{ padding:'9px 18px', borderRadius:8, border: watching ? '1px solid var(--red-border)' : 'none',
              background: watching ? 'var(--red-bg)' : 'var(--accent)', color: watching ? 'var(--red)' : '#fff',
              fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
            {watching ? '⏹ Stop Tracking' : '📡 Track My Location'}
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {[['All', assets.length, 'var(--text-secondary)'],
          ['Running', assets.filter(a=>a.status==='Running'||a.status==='Active').length, 'var(--green)'],
          ['Maintenance', assets.filter(a=>a.status==='Maintenance').length, 'var(--amber)'],
          ['Down', assets.filter(a=>a.status==='Down').length, 'var(--red)'],
        ].map(([s,n,c]) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding:'8px 16px', borderRadius:20, border:`1px solid ${filterStatus===s ? c : 'var(--border)'}`,
              background: filterStatus===s ? c+'18' : 'var(--surface)', color: filterStatus===s ? c : 'var(--text-muted)',
              fontWeight: filterStatus===s ? 700 : 500, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            {s} <span style={{ fontWeight:800 }}>{n}</span>
          </button>
        ))}
      </div>

      {/* Main grid: sidebar + map */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,290px) 1fr', gap:16, alignItems:'start' }} className="tracker-grid">

        {/* Asset list */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', maxHeight:540, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
            Fleet Assets · {filtered.length}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding:28, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No assets found</div>
            ) : filtered.map(a => {
              const hasGPS = !!(a.last_lat && a.last_lng);
              const sc = SC[a.status] || 'var(--text-muted)';
              return (
                <div key={a.id} onClick={() => flyTo(a)}
                  style={{ padding:'11px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.1s',
                    background: selected?.id === a.id ? 'var(--accent-light)' : 'transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background: hasGPS ? 'var(--green)' : 'var(--border-strong)',
                      flexShrink:0, boxShadow: hasGPS ? '0 0 5px var(--green)' : 'none',
                      animation: hasGPS ? 'pulse-dot 2s infinite' : 'none' }} />
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span>
                    <span style={{ fontSize:11, color:sc, fontWeight:700 }}>{a.status}</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', paddingLeft:16, marginTop:2 }}>
                    {a.asset_number}{a.type ? ' · '+a.type : ''}{a.location ? ' · '+a.location : ''}
                  </div>
                  {hasGPS && a.last_seen && (
                    <div style={{ fontSize:10, color:'var(--text-faint)', paddingLeft:16, marginTop:2 }}>
                      {new Date(a.last_seen).toLocaleString('en-AU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  )}
                  {!hasGPS && (
                    <div style={{ fontSize:10, color:'var(--text-faint)', paddingLeft:16, marginTop:2 }}>No GPS signal</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Map container */}
        <div style={{ position:'relative', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div ref={mapRef} style={{ height:540, width:'100%', background:'var(--surface-2)' }} />
          {!mapReady && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              background:'var(--surface-2)', fontSize:13, color:'var(--text-muted)', gap:8 }}>
              <span style={{ display:'inline-block', width:14, height:14, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              Loading map…
            </div>
          )}
          {/* Selected asset overlay */}
          {selected && (
            <div style={{ position:'absolute', top:12, right:12, background:'var(--surface)', border:'1px solid var(--border)',
              borderRadius:10, padding:'12px 16px', boxShadow:'0 4px 20px rgba(0,0,0,0.12)', minWidth:200, zIndex:999 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', lineHeight:1.3 }}>{selected.name}</div>
                <button onClick={() => setSelected(null)}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:0, marginLeft:8 }}>✕</button>
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>{selected.asset_number} · {selected.type||'Asset'}</div>
              <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700,
                background:(SC[selected.status]||'var(--text-muted)')+'18', color:SC[selected.status]||'var(--text-muted)' }}>{selected.status}</span>
              {selected.last_lat ? (
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
                  📍 {selected.last_lat.toFixed(5)}, {selected.last_lng.toFixed(5)}
                </div>
              ) : (
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>📡 No GPS data — hardware needed</div>
              )}
            </div>
          )}
          {/* Legend */}
          <div style={{ position:'absolute', bottom:14, left:14, background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:8, padding:'7px 12px', fontSize:11, display:'flex', gap:12, zIndex:999,
            boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
            {[['Running','var(--green)'],['Maintenance','var(--amber)'],['Down','var(--red)']].map(([s,c]) => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:c }} />
                <span style={{ color:'var(--text-secondary)' }}>{s}</span>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#0ea5e9', border:'2px solid #fff' }} />
              <span style={{ color:'var(--text-secondary)' }}>You</span>
            </div>
          </div>
        </div>
      </div>

      {/* No GPS assets — assets without hardware */}
      {withoutGPS.length > 0 && (
        <div style={{ marginTop:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
            {withoutGPS.length} asset{withoutGPS.length!==1?'s':''} without GPS signal
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {withoutGPS.map(a => (
              <span key={a.id} style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:'var(--surface-2)',
                border:'1px solid var(--border)', color:'var(--text-muted)', fontWeight:600 }}>
                {a.asset_number} — {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hardware recommendations */}
      <div style={{ marginTop:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🛰️</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Recommended GPS Hardware</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>Works for fleet vehicles, heavy machinery and trailers — all compatible with MechIQ via API</div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:0 }}>
          {[
            { name:'Teltonika FMB920', badge:'Best All-Rounder', badgeC:'var(--green)', use:'Fleet vehicles & trucks',
              price:'~$120 AUD/unit', features:['4G LTE + GPS + Wi-Fi + Bluetooth','OBD-II plug-in (no install needed)','Ignition on/off & movement alerts','Aussie distributors available'] },
            { name:'Concox AT4',       badge:'Best for Machinery', badgeC:'var(--accent)', use:'Excavators, graders, generators',
              price:'~$90 AUD/unit', features:['Hardwired 9–100V DC input','IP67 waterproof rated','Geofence & tamper alerts','Works without OBD port'] },
            { name:'Queclink GL300',   badge:'Best for Trailers', badgeC:'var(--purple)', use:'Trailers, containers, tools',
              price:'~$80 AUD/unit', features:['Built-in rechargeable battery','Up to 3 years standby mode','IP67 + magnetic mount','Motion-activated reporting'] },
            { name:'Samsara VG34',     badge:'Enterprise', badgeC:'var(--amber)', use:'Full fleet management',
              price:'Subscription', features:['HD dashcam + real-time GPS','Driver behaviour scoring','ELD compliance built-in','Direct API integration to MechIQ'] },
          ].map((h, i) => (
            <div key={h.name} style={{ padding:'16px 20px', borderRight: i<3 ? '1px solid var(--border)' : 'none', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{h.name}</div>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                  background:h.badgeC+'22', color:h.badgeC, whiteSpace:'nowrap', marginLeft:8 }}>{h.badge}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>🔧 {h.use}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)', marginBottom:10 }}>{h.price}</div>
              <ul style={{ margin:0, paddingLeft:16, fontSize:12, color:'var(--text-secondary)', lineHeight:1.9 }}>
                {h.features.map(f => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ padding:'11px 20px', background:'var(--surface-2)', fontSize:12, color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
          💡 <strong>To activate tracking:</strong> Your chosen device pushes GPS coordinates to MechIQ via REST API, updating <code style={{fontFamily:'var(--font-mono)',background:'var(--surface-3)',padding:'1px 5px',borderRadius:4}}>last_lat</code>, <code style={{fontFamily:'var(--font-mono)',background:'var(--surface-3)',padding:'1px 5px',borderRadius:4}}>last_lng</code> and <code style={{fontFamily:'var(--font-mono)',background:'var(--surface-3)',padding:'1px 5px',borderRadius:4}}>last_seen</code> on each asset in real time.
        </div>
      </div>
    </div>
  );
}

// ─── Main Assets ───────────────────────────────────────────────────────────────
function Assets({ userRole, onViewAsset, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'units');
  const { toasts, add: toast } = useToast();

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  const renderTab = () => {
    switch (activeTab) {
      case 'units':        return <UnitsTab userRole={userRole} onViewAsset={onViewAsset} toast={toast} />;
      case 'onboarding':  return <OnboardingTab userRole={userRole} onComplete={() => setActiveTab('units')} toast={toast} />;
      case 'depreciation':return <DepreciationTab userRole={userRole} />;
      case 'tracker':     return <TrackerPlaceholder userRole={userRole} />;
      default:            return <UnitsTab userRole={userRole} onViewAsset={onViewAsset} toast={toast} />;
    }
  };

  useEffect(() => {
    if (!document.getElementById('assets-css')) {
      const s = document.createElement('style'); s.id = 'assets-css'; s.textContent = CSS; document.head.appendChild(s);
    }
  }, []);

  const TABS = [
    { id:'units',       label:'Fleet Units',  icon:'🚛' },
    { id:'onboarding',  label:'Onboarding',   icon:'➕' },
    { id:'depreciation',label:'Depreciation', icon:'📉' },
    { id:'tracker',     label:'Tracker',      icon:'📡' },
  ];

  return (
    <>
      <Toasts toasts={toasts} />
      <div>
        {renderTab()}
      </div>
    </>
  );
}

export default Assets;
// ─── Depreciation Tab ─────────────────────────────────────────────────────────
function DepreciationTab({ userRole }) {
  const [fleetAssets, setFleetAssets] = React.useState([]);
  const [loading, setLoading]         = React.useState(true);
  const [expanded, setExpanded]       = React.useState(true);

  React.useEffect(() => {
    if (!userRole?.company_id) return;
    supabase.from('assets')
      .select('id,asset_number,name,type,make,model,status,hours,purchase_price,purchase_date,year,depreciation_snapshot')
      .eq('company_id', userRole.company_id)
      .not('purchase_price', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setFleetAssets(data || []); setLoading(false); });
  }, [userRole?.company_id]);

  const SC = {
    Running:'var(--green)', Down:'var(--red)', Maintenance:'var(--amber)',
    Active:'var(--green)', Standby:'var(--purple)',
  };

  // Fleet totals
  const totals = fleetAssets.reduce((acc, a) => {
    let snap = null;
    try { snap = a.depreciation_snapshot ? JSON.parse(a.depreciation_snapshot) : null; } catch {}
    if (!snap) snap = calcDepr(a.purchase_price, a.purchase_date, a.year);
    return {
      purchase: acc.purchase + (a.purchase_price || 0),
      bookValue: acc.bookValue + (snap?.currentValue || 0),
      annualDepr: acc.annualDepr + (snap?.annualDepreciation || 0),
    };
  }, { purchase:0, bookValue:0, annualDepr:0 });

  return (
    <div>
      {/* Fleet summary */}
      {!loading && fleetAssets.length > 0 && (
        <div style={{ marginBottom:28 }}>
          {/* Stat cards row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Fleet Purchase Value',  val:`$${totals.purchase.toLocaleString()}`,  c:'var(--text-primary)' },
              { label:'Current Fleet Book Value', val:`$${totals.bookValue.toLocaleString()}`, c:'var(--accent)' },
              { label:'Annual Depreciation',    val:`$${totals.annualDepr.toLocaleString()}/yr`, c:'var(--red)' },
              { label:'Assets Tracked',         val:fleetAssets.length,                     c:'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:800, color:s.c }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Collapsible fleet table */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div onClick={() => setExpanded(p=>!p)}
              style={{ padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:3, height:18, background:'var(--accent)', borderRadius:2 }} />
                <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Fleet Depreciation Status</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{fleetAssets.length} assets with purchase data</span>
              </div>
              <span style={{ fontSize:12, color:'var(--text-muted)', userSelect:'none' }}>{expanded ? '▲ Hide' : '▼ Show'}</span>
            </div>
            {expanded && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'var(--surface-2)' }}>
                      {['Asset','Type','Status','Purchase Price','Book Value','Annual Depr.','Age','% Depreciated','Action'].map(h => (
                        <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700,
                          color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px',
                          borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fleetAssets.map(a => {
                      let snap = null;
                      try { snap = a.depreciation_snapshot ? JSON.parse(a.depreciation_snapshot) : null; } catch {}
                      if (!snap) snap = calcDepr(a.purchase_price, a.purchase_date, a.year);
                      const sc  = SC[a.status] || 'var(--text-muted)';
                      const rec = !snap ? '—' : snap.depreciationRate > 70 ? 'Replace' : snap.depreciationRate > 40 ? 'Monitor' : 'Keep';
                      const recC = rec==='Replace' ? 'var(--red)' : rec==='Monitor' ? 'var(--amber)' : 'var(--green)';
                      return (
                        <tr key={a.id} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'10px 14px' }}>
                            <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:13 }}>{a.name}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{a.asset_number}</div>
                          </td>
                          <td style={{ padding:'10px 14px', color:'var(--text-secondary)', fontSize:12 }}>{a.type||'—'}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ padding:'2px 8px', borderRadius:20, background:sc+'18', color:sc, fontSize:11, fontWeight:700 }}>{a.status}</span>
                          </td>
                          <td style={{ padding:'10px 14px', color:'var(--text-secondary)' }}>${(a.purchase_price||0).toLocaleString()}</td>
                          <td style={{ padding:'10px 14px', fontWeight:600, color:'var(--accent)' }}>
                            {snap ? '$'+snap.currentValue.toLocaleString() : '—'}
                          </td>
                          <td style={{ padding:'10px 14px', color:'var(--red)' }}>
                            {snap ? '$'+snap.annualDepreciation.toLocaleString()+'/yr' : '—'}
                          </td>
                          <td style={{ padding:'10px 14px', color:'var(--text-secondary)' }}>
                            {snap ? snap.ageYears+' yrs' : '—'}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            {snap ? (
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ flex:1, height:5, background:'var(--surface-3)', borderRadius:99, overflow:'hidden', minWidth:50 }}>
                                  <div style={{ width:snap.depreciationRate+'%', height:'100%', borderRadius:99,
                                    background: snap.depreciationRate>70?'var(--red)':snap.depreciationRate>40?'var(--amber)':'var(--green)' }} />
                                </div>
                                <span style={{ fontSize:12, fontWeight:700, whiteSpace:'nowrap',
                                  color: snap.depreciationRate>70?'var(--red)':snap.depreciationRate>40?'var(--amber)':'var(--green)' }}>
                                  {snap.depreciationRate}%
                                </span>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                              background:recC+'18', color:recC }}>{rec}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && fleetAssets.length === 0 && (
        <div style={{ marginBottom:24, padding:'20px 24px', background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:12, fontSize:13, color:'var(--text-muted)', textAlign:'center' }}>
          No assets with purchase price data yet. Onboard assets with purchase prices to see fleet depreciation here.
        </div>
      )}

      {/* Section divider */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:3, height:20, background:'var(--accent)', borderRadius:2 }} />
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Depreciation Calculator</span>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>AI-powered · PDF export · Calculation history</span>
      </div>

      {/* The full Depreciation calculator */}
      <Depreciation userRole={userRole} />
    </div>
  );
}


