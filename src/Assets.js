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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
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
          <h3 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>QR Label Preview</h3>
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

function AssetCard({ asset, index, onView, onDelete, onQR, userRole }) {
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
      <div className="card-actions" style={{ padding: '0 18px 16px', display: 'flex', gap: '8px' }}>
        <button onClick={() => onView(asset.id)} className="nav-pill nav-pill-primary" style={{ fontSize: '11px', padding: '6px 14px' }}>View →</button>
        <button onClick={() => onQR(asset)} className="nav-pill nav-pill-ghost" style={{ fontSize: '11px', padding: '6px 12px' }}>QR</button>
        {canDelete && (
          <button onClick={() => onDelete(asset.id, asset.name)} style={{ marginLeft: 'auto', padding: '6px 12px', background: 'transparent', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', fontFamily:'var(--font-display)', letterSpacing:'0.5px', textTransform:'uppercase' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            Delete
          </button>
        )}
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

  useEffect(() => { if (userRole?.company_id) fetchAssets(); }, [userRole]);

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
      {printAsset && <QRModal asset={printAsset} onClose={() => setPrintAsset(null)} />}

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
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
              onView={onViewAsset} onDelete={handleDelete}
              onQR={setPrintAsset} userRole={userRole} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step Indicator ────────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Specifications', 'Registration', 'Purchase Details', 'Complete'];

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{children}</div>
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
    setSaving(false);
    if (error) { toast('Error saving asset: ' + error.message, 'error'); return; }
    setSavedAsset(data); setStep(4);
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
    setForm(empty); setSavedAsset(null); setStep(0); setHasRego(null);
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

  const renderStep4 = () => {
    if (!savedAsset) return null;
    const qrVal = `https://maintain-iq.vercel.app/asset/${savedAsset.id}`;
    return (
      <div style={{ textAlign: 'center', padding: '10px 0', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--green-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid var(--green-border)', boxShadow: '0 0 24px rgba(0,255,136,0.3)' }}><div style={{ width: '28px', height: '14px', borderLeft: '4px solid var(--green)', borderBottom: '4px solid var(--green)', transform: 'rotate(-45deg) translate(2px, -4px)' }} /></div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{savedAsset.asset_number} Onboarded!</div>
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

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '2px' }}>Asset Onboarding</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontFamily:'var(--font-display)' }}>Register any asset, vehicle or equipment and generate its QR tag.</p>
      </div>
      <StepBar current={step} />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', boxShadow: '0 0 32px rgba(0,212,255,0.06)' }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <button className="nav-pill nav-pill-ghost" onClick={() => setStep(s => s-1)} disabled={step === 0}>← Back</button>
            {step < 3
              ? <button className="nav-pill nav-pill-primary" onClick={() => setStep(s => s+1)} disabled={!canNext}>Next →</button>
              : <button className="nav-pill nav-pill-success" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save & Generate QR'}</button>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tracker placeholder ───────────────────────────────────────────────────────
function TrackerPlaceholder() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
      <div style={{ fontSize: '48px', marginBottom: '14px' }}>📡</div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing:'1.5px' }}>GPS Tracker</div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '280px', margin: '0 auto' }}>Live asset tracking is coming soon. Connect telematics hardware to see real-time locations.</div>
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
      case 'depreciation':return <Depreciation userRole={userRole} />;
      case 'tracker':     return <TrackerPlaceholder />;
      default:            return <UnitsTab userRole={userRole} onViewAsset={onViewAsset} toast={toast} />;
    }
  };

  useEffect(() => {
    if (!document.getElementById('assets-css')) {
      const s = document.createElement('style'); s.id = 'assets-css'; s.textContent = CSS; document.head.appendChild(s);
    }
  }, []);

  return (
    <>
      <Toasts toasts={toasts} />
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '38px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>Assets</h2>
        </div>
        {renderTab()}
      </div>
    </>
  );
}

export default Assets;
