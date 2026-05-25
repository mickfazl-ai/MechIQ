import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const MASTER_PIN = '4900';
const FEATURES = [
  { key:'dashboard',    label:'Dashboard' },
  { key:'assets',       label:'Assets' },
  { key:'downtime',     label:'Downtime' },
  { key:'maintenance',  label:'Maintenance' },
  { key:'prestart',     label:'Prestarts' },
  { key:'scanner',      label:'Scanner' },
  { key:'reports',      label:'Reports' },
  { key:'users',        label:'Users' },
  { key:'form_builder', label:'Form Builder' },
];

const CSS = `
  @keyframes scan { 0%{top:-1px;opacity:0.7} 100%{top:100%;opacity:0} }
  @keyframes flicker { 0%,98%{opacity:1} 99%{opacity:0.6} 100%{opacity:1} }
  .ma-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .ma-card:hover { border-color: rgba(0,180,255,0.22); }
  .ma-card.selected { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 24px rgba(0,212,255,0.1); }
  .ma-card::before {
    content:''; position:absolute; top:0;left:0;right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(0,212,255,0.35),transparent);
    opacity:0; transition:opacity 0.2s;
  }
  .ma-card:hover::before, .ma-card.selected::before { opacity:1; }
  .ma-row { cursor:pointer; padding:18px 20px; transition:background 0.12s; }
  .ma-row:hover { background:var(--surface-2); }
  .feat-toggle {
    padding:4px 11px; border-radius:4px; border:none; cursor:pointer;
    font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    transition:all 0.15s; font-family:var(--font-display);
  }
  .feat-on  { background:rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .feat-off { background:rgba(255,51,102,0.08); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .feat-on:hover  { background:rgba(0,255,136,0.2); box-shadow:0 0 10px rgba(0,255,136,0.2); }
  .feat-off:hover { background:rgba(255,51,102,0.15); box-shadow:0 0 10px rgba(255,51,102,0.15); }
  .status-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 9px; border-radius:4px;
    font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    font-family:var(--font-display);
  }
  .pill-active    { background:rgba(0,255,136,0.1);  color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .pill-pending   { background:rgba(255,170,0,0.1);  color:#ffaa00; border:1px solid rgba(204,136,0,0.4); }
  .pill-suspended { background:rgba(255,51,102,0.1); color:#ff3366; border:1px solid rgba(204,34,68,0.4); }
  .tab-btn {
    padding:7px 16px; border-radius:6px; border:1px solid var(--border);
    background:transparent; color:var(--text-muted); cursor:pointer;
    font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
    transition:all 0.15s; font-family:var(--font-display);
  }
  .tab-btn.active { background:var(--accent-glow); color:var(--accent); border-color:var(--accent-dark); }
  .tab-btn:hover:not(.active) { color:var(--text-secondary); border-color:rgba(0,180,255,0.2); }
  .ma-action {
    padding:7px 14px; border-radius:6px; border:none; cursor:pointer;
    font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    transition:all 0.15s; font-family:var(--font-display);
  }
  .ma-action.approve  { background:rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .ma-action.reject   { background:rgba(255,51,102,0.1); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .ma-action.suspend  { background:rgba(255,51,102,0.1); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .ma-action.activate { background:rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .ma-action.pending  { background:rgba(255,170,0,0.1);  color:#ffaa00; border:1px solid rgba(204,136,0,0.3); }
  .ma-action.export   { background:rgba(0,212,255,0.08); color:var(--accent); border:1px solid var(--accent-dark); }
  .ma-action.danger   { background:rgba(255,51,102,0.08); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .ma-action.restore  { background:rgba(170,85,255,0.1); color:#aa55ff; border:1px solid rgba(136,68,204,0.3); }
  .ma-action:hover { filter:brightness(1.2); transform:translateY(-1px); }
  .ma-action:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

  /* ── New Company Form ── */
  .nc-wrap { max-width:680px; }
  .nc-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:28px; margin-bottom:20px; }
  .nc-title { font-family:var(--font-display); font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:4px; }
  .nc-sub { font-size:13px; color:var(--text-muted); margin-bottom:22px; }
  .nc-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .nc-field { display:flex; flex-direction:column; gap:5px; }
  .nc-field.full { grid-column:1/-1; }
  .nc-lbl { font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:1px; text-transform:uppercase; }
  .nc-inp { padding:9px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text-primary); font-size:14px; font-family:inherit; outline:none; transition:border-color 0.15s; }
  .nc-inp:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,179,237,0.15); }
  .nc-sel { padding:9px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text-primary); font-size:14px; font-family:inherit; outline:none; }
  .nc-feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:8px; }
  .nc-feat { display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--border); border-radius:8px; cursor:pointer; transition:all 0.13s; font-size:13px; color:var(--text-secondary); background:var(--bg); }
  .nc-feat.on { border-color:var(--accent); background:var(--accent-light); color:var(--accent); font-weight:600; }
  .nc-feat input { accent-color:var(--accent); width:14px; height:14px; }
  .nc-tmpw { background:var(--accent-light); border:1px solid var(--accent); border-radius:8px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .nc-tmpw-pass { font-family:monospace; font-size:16px; font-weight:700; color:var(--accent); letter-spacing:2px; }
  .nc-tmpw-lbl { font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .nc-submit { width:100%; padding:14px; border-radius:10px; background:var(--accent); border:none; color:#fff; font-size:15px; font-weight:800; cursor:pointer; font-family:inherit; transition:all 0.15s; margin-top:8px; }
  .nc-submit:hover { opacity:0.9; transform:translateY(-1px); }
  .nc-submit:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .nc-success { text-align:center; padding:40px 20px; }
  .nc-success-icon { font-size:52px; margin-bottom:16px; }
  .nc-success-title { font-size:22px; font-weight:800; color:var(--text-primary); margin-bottom:8px; }
  .nc-success-sub { font-size:14px; color:var(--text-muted); margin-bottom:24px; line-height:1.7; }
  .nc-success-items { display:flex; flex-direction:column; gap:8px; max-width:360px; margin:0 auto 24px; }
  .nc-success-item { display:flex; align-items:center; gap:10px; padding:10px 16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; font-size:13px; color:#166534; font-weight:600; }
  .nc-err { padding:10px 14px; background:#fff5f5; border:1px solid #fecaca; border-radius:8px; color:#991b1b; font-size:13px; margin-bottom:14px; }
`;

function PinModal({ onConfirm, onCancel, actionLabel }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const confirm = () => {
    if (pin === MASTER_PIN) onConfirm();
    else { setErr('Invalid authorization code'); setPin(''); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, backdropFilter:'blur(8px)' }}>
      <div style={{ background:'var(--surface)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:16, padding:36, width:360, textAlign:'center', boxShadow:'0 0 60px rgba(0,212,255,0.15)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,var(--accent),transparent)' }} />
        <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:'3px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:8 }}>Authorization Required</div>
        <div style={{ fontSize:15, color:'var(--text-secondary)', marginBottom:24, fontFamily:'var(--font-display)', lineHeight:1.5 }}>{actionLabel}</div>
        <input type="password" placeholder="Enter PIN" value={pin}
          onChange={e => { setPin(e.target.value); setErr(''); }}
          onKeyDown={e => e.key==='Enter' && confirm()}
          autoFocus
          style={{ width:'100%', padding:'14px', background:'var(--surface-2)', color:'var(--text-primary)', border:`1px solid ${err?'var(--red-border)':'rgba(0,212,255,0.25)'}`, borderRadius:8, fontSize:22, textAlign:'center', letterSpacing:'10px', fontFamily:'var(--font-mono)', boxSizing:'border-box', marginBottom:8 }}
        />
        {err && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8, fontFamily:'var(--font-display)' }}>{err}</div>}
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <button onClick={onCancel} className="ma-action pending" style={{ flex:1 }}>Cancel</button>
          <button onClick={confirm} className="ma-action approve" style={{ flex:1 }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Supabase Usage Widget ────────────────────────────────────────────────────
function UsageWidget() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        // Fetch DB size from Supabase
        const { data: dbSize } = await supabase.rpc('get_db_size').single().catch(() => ({ data: null }));

        // Fetch storage usage
        const { data: buckets } = await supabase.storage.listBuckets();
        let totalStorageBytes = 0;
        if (buckets) {
          for (const bucket of buckets) {
            const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000, offset: 0 });
            if (files) {
              // Recursively get sizes - approximate from file count
              totalStorageBytes += files.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
            }
          }
        }

        // Count rows across main tables as proxy for DB usage
        const tables = ['assets','maintenance','work_orders','downtime','form_submissions','messages','oil_samples'];
        let totalRows = 0;
        for (const t of tables) {
          const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
          totalRows += count || 0;
        }

        // Rough DB size estimate: ~2KB per row average
        const estimatedDbBytes = totalRows * 2048;

        setUsage({
          dbBytes: estimatedDbBytes,
          storageBytes: totalStorageBytes,
          rows: totalRows,
          buckets: buckets?.length || 0,
        });
      } catch (e) {
        setUsage({ error: true });
      }
      setLoading(false);
    };
    fetchUsage();
  }, []);

  const fmt = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const pct = (used, total) => Math.min(100, Math.round((used / total) * 100));

  const Bar = ({ used, total, color }) => {
    const p = pct(used, total);
    const c = p > 85 ? 'var(--red)' : p > 65 ? 'var(--amber)' : color;
    return (
      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
        <div style={{ height: '100%', width: `${p}%`, background: c, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    );
  };

  // Supabase free tier limits
  const DB_LIMIT    = 500 * 1024 * 1024;   // 500 MB
  const STORE_LIMIT = 1024 * 1024 * 1024;  // 1 GB

  if (loading) return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 22px', marginBottom:24, display:'flex', alignItems:'center', gap:10, color:'var(--text-muted)', fontSize:13 }}>
      <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Loading usage data…
    </div>
  );

  if (usage?.error) return null;

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 22px', marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:3, height:14, background:'var(--purple)', borderRadius:2, display:'inline-block' }} />
          Supabase Usage — Free Tier
        </div>
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>View Dashboard ↗</a>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16 }}>

        {/* Database */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>Database</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{fmt(usage.dbBytes)} / 500 MB</span>
          </div>
          <Bar used={usage.dbBytes} total={DB_LIMIT} color="var(--accent)" />
          <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>{pct(usage.dbBytes, DB_LIMIT)}% used · ~{usage.rows.toLocaleString()} rows</div>
        </div>

        {/* Storage */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>File Storage</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{fmt(usage.storageBytes)} / 1 GB</span>
          </div>
          <Bar used={usage.storageBytes} total={STORE_LIMIT} color="var(--green)" />
          <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>{pct(usage.storageBytes, STORE_LIMIT)}% used · {usage.buckets} bucket{usage.buckets !== 1 ? 's' : ''}</div>
        </div>

        {/* Warning if getting close */}
        {(pct(usage.dbBytes, DB_LIMIT) > 70 || pct(usage.storageBytes, STORE_LIMIT) > 70) && (
          <div style={{ background:'var(--amber-bg)', border:'1px solid var(--amber-border)', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>⚠️</span>
            <div style={{ fontSize:12, color:'var(--amber)', fontWeight:600 }}>Approaching free tier limit — consider upgrading Supabase plan</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Requests Kanban ──────────────────────────────────────
function AppRequestsKanban({ requests, loading, onStatusChange, onAddNote, companies }) {
  const [noteModal, setNoteModal] = useState(null); // { request }
  const [noteText, setNoteText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');

  const COLUMNS = [
    { id: 'Pending',     label: '⏳ Pending',     color: 'var(--amber)' },
    { id: 'Approved',    label: '✓ Approved',     color: 'var(--accent)' },
    { id: 'In Progress', label: '⚡ In Progress',  color: 'var(--purple)' },
    { id: 'Complete',    label: '✅ Complete',     color: 'var(--green)' },
    { id: 'Rejected',    label: '✗ Rejected',     color: 'var(--red)' },
  ];

  const PRIORITY_COLOR = { Low:'var(--green)', Medium:'var(--amber)', High:'var(--red)', Critical:'#ff0040' };

  const filtered = requests.filter(r => {
    if (filterCompany && r.company_id !== filterCompany) return false;
    if (filterType && r.type !== filterType) return false;
    return true;
  });

  const getCompanyName = (id) => companies.find(c => c.id === id)?.name || id?.slice(0,8) || '—';

  const generateAIResponse = async (req) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 400,
          messages: [{ role: 'user', content: `You are a senior React developer reviewing a feature request for a fleet maintenance app called MechIQ. Write a brief admin response (2-3 sentences) acknowledging the request and explaining the implementation approach or timeline. Be helpful and specific.\n\nRequest: "${req.title}"\nDescription: ${req.description || 'None'}\nAI Draft: ${req.ai_draft || 'None'}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(c => c.type === 'text')?.text || '';
      setNoteText(text);
    } catch(e) { setNoteText('Could not generate response.'); }
    setAiLoading(false);
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit' }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-primary)', fontSize:12, fontFamily:'inherit' }}>
          <option value="">All Types</option>
          <option value="feature">Feature Request</option>
          <option value="bug">Bug Report</option>
          <option value="improvement">Improvement</option>
          <option value="question">Question</option>
        </select>
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)' }}>
          {filtered.length} request{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Loading requests…</div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, overflowX:'auto' }}>
          {COLUMNS.map(col => {
            const colRequests = filtered.filter(r => r.status === col.id);
            return (
              <div key={col.id} style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderRadius:12, minHeight:300, display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', borderTop:`3px solid ${col.color}`, borderRadius:'12px 12px 0 0' }}>
                  <div style={{ fontSize:12, fontWeight:800, color:col.color }}>{col.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{colRequests.length} item{colRequests.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding:10, flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                  {colRequests.map(r => (
                    <div key={r.id} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', marginBottom:4 }}>{getCompanyName(r.company_id)}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:4, lineHeight:1.4 }}>{r.title}</div>
                      <div style={{ display:'flex', gap:4, marginBottom:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4, background:PRIORITY_COLOR[r.priority]+'20', color:PRIORITY_COLOR[r.priority] }}>{r.priority}</span>
                        <span style={{ fontSize:10, color:'var(--text-muted)', padding:'1px 6px', borderRadius:4, background:'var(--surface)', border:'1px solid var(--border)' }}>{r.type}</span>
                        <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700 }}>👍 {r.votes || 0}</span>
                      </div>
                      {r.admin_notes && (
                        <div style={{ fontSize:10, color:'var(--accent)', background:'var(--accent-light)', borderRadius:6, padding:'4px 8px', marginBottom:8, lineHeight:1.4 }}>📝 {r.admin_notes.slice(0,80)}{r.admin_notes.length > 80 ? '…' : ''}</div>
                      )}
                      {/* Move to status buttons */}
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {COLUMNS.filter(c => c.id !== col.id).slice(0,2).map(c => (
                          <button key={c.id} onClick={() => onStatusChange(r.id, c.id)}
                            style={{ fontSize:9, padding:'3px 7px', borderRadius:5, border:`1px solid ${c.color}`, background:'transparent', color:c.color, cursor:'pointer', fontWeight:700 }}>
                            → {c.id}
                          </button>
                        ))}
                        <button onClick={() => { setNoteModal(r); setNoteText(r.admin_notes || ''); }}
                          style={{ fontSize:9, padding:'3px 7px', borderRadius:5, border:'1px solid var(--border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer' }}>
                          📝 Note
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note / AI Response Modal */}
      {noteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg)', borderRadius:16, width:'100%', maxWidth:520, boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>📝 Admin Note — {noteModal.title}</div>
              <button onClick={() => setNoteModal(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ background:'var(--surface)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'var(--text-secondary)' }}>
                <strong>{noteModal.submitted_by}</strong> · {noteModal.type} · {noteModal.priority} priority<br/>
                {noteModal.description && <span style={{ color:'var(--text-muted)' }}>{noteModal.description}</span>}
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add admin note or response..." rows={4}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-primary)', fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', marginBottom:10 }} />
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => generateAIResponse(noteModal)} disabled={aiLoading}
                  style={{ padding:'9px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', color:'var(--text-secondary)' }}>
                  {aiLoading ? '⏳…' : '🤖 AI Response'}
                </button>
                <button onClick={async () => { await onAddNote(noteModal.id, noteText); setNoteModal(null); }}
                  style={{ flex:1, padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                  Save Note
                </button>
                {/* Quick status update */}
                <select onChange={e => { if(e.target.value) { onStatusChange(noteModal.id, e.target.value); setNoteModal(null); } }} defaultValue=""
                  style={{ padding:'9px 10px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-secondary)', fontSize:12, fontFamily:'inherit' }}>
                  <option value="">Move to…</option>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Temp password generator ── */
function genPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let p = '';
  for (let i=0; i<12; i++) p += chars[Math.floor(Math.random()*chars.length)];
  return p;
}

/* ── New Company Registration Form ── */
function NewCompanyForm({ onCreated }) {
  const INDUSTRY_OPTIONS = ['Mining','Civil Construction','Tunnelling','Marine','Defence','Agriculture','Forestry','Alpine / Snow','Transport & Logistics','Government','Other'];
  const ALL_FEATURES = [
    { key:'dashboard',    label:'Dashboard' },
    { key:'assets',       label:'Assets' },
    { key:'downtime',     label:'Downtime' },
    { key:'maintenance',  label:'Maintenance' },
    { key:'prestart',     label:'Prestarts' },
    { key:'scanner',      label:'Scanner' },
    { key:'reports',      label:'Reports' },
    { key:'users',        label:'Users' },
    { key:'form_builder', label:'Form Builder' },
    { key:'parts',        label:'Parts' },
    { key:'oil_sampling', label:'Oil Sampling' },
    { key:'chat',         label:'AI Chat' },
  ];

  const [step, setStep]     = useState('form'); // 'form' | 'done'
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  const [result, setResult] = useState(null);
  const [tmpPass]           = useState(genPassword);

  const [form, setForm] = useState({
    company_name: '',
    industry: 'Mining',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    asset_limit: 50,
    plan: 'standard',
    features: Object.fromEntries(ALL_FEATURES.map(f => [f.key, true])),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleFeat = (k) => setForm(p => ({ ...p, features: { ...p.features, [k]: !p.features[k] } }));

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { setErr('Company name is required.'); return; }
    if (!form.contact_email.trim()) { setErr('Admin email is required.'); return; }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.contact_email)) { setErr('Enter a valid email address.'); return; }
    setBusy(true); setErr('');

    try {
      // Call the Supabase Edge Function — runs server-side with service_role key
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-company-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            company_name:  form.company_name.trim(),
            industry:      form.industry,
            contact_name:  form.contact_name.trim(),
            contact_email: form.contact_email.trim().toLowerCase(),
            contact_phone: form.contact_phone.trim(),
            address:       form.address.trim(),
            asset_limit:   parseInt(form.asset_limit) || 50,
            plan:          form.plan,
            features:      form.features,
            temp_password: tmpPass,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create company');

      const { company } = result;

      setBusy(false);
      setResult({ company, email: form.contact_email, tmpPass });
      setStep('done');

    } catch(e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  if (step === 'done' && result) return (
    <div className="nc-wrap">
      <div className="nc-card">
        <div className="nc-success">
          <div className="nc-success-icon">✓</div>
          <div className="nc-success-title">{result.company.name} is live</div>
          <div className="nc-success-sub">
            Company account created and admin access provisioned.<br />
            Share the credentials below with the company admin.
          </div>
          <div className="nc-success-items">
            <div className="nc-success-item">✓ Company record created</div>
            <div className="nc-success-item">✓ Admin user account created</div>
            <div className="nc-success-item">✓ Role assigned: Company Admin</div>
            <div className="nc-success-item">✓ Welcome email sent to {result.email}</div>
          </div>

          {/* Credentials card */}
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:20, marginBottom:24, textAlign:'left' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#92400e', letterSpacing:'1px', textTransform:'uppercase', marginBottom:12 }}>
              Login Credentials — Share Securely
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div className="nc-tmpw-lbl">Login URL</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a2433' }}>mechiq.com.au</div>
              </div>
              <div>
                <div className="nc-tmpw-lbl">Email</div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1a2433' }}>{result.email}</div>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <div className="nc-tmpw-lbl">Temporary Password</div>
                <div className="nc-tmpw">
                  <div className="nc-tmpw-pass">{result.tmpPass}</div>
                  <button onClick={() => navigator.clipboard?.writeText(result.tmpPass)}
                    style={{ padding:'5px 12px', border:'1px solid #f5c842', borderRadius:6, background:'transparent', color:'#92400e', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    Copy
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#92400e', marginTop:6 }}>
                  Admin will be prompted to set a new password on first login.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button className="nc-submit" style={{ maxWidth:200 }} onClick={() => { setStep('form'); setResult(null); setForm({ company_name:'', industry:'Mining', contact_name:'', contact_email:'', contact_phone:'', address:'', asset_limit:50, plan:'standard', features:Object.fromEntries(ALL_FEATURES.map(f=>[f.key,true])) }); }}>
              Register Another
            </button>
            <button className="nc-submit" style={{ maxWidth:200, background:'var(--surface)', color:'var(--accent)', border:'2px solid var(--accent)' }} onClick={onCreated}>
              View Companies
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="nc-wrap">
      <div className="nc-card">
        <div className="nc-title">Register New Company</div>
        <div className="nc-sub">Creates the company account, provisions an admin user and sends login credentials to the admin email.</div>

        {err && <div className="nc-err">{err}</div>}

        {/* Company details */}
        <div style={{ marginBottom:20 }}>
          <div className="nc-lbl" style={{ marginBottom:10 }}>Company Details</div>
          <div className="nc-grid">
            <div className="nc-field full">
              <label className="nc-lbl">Company Name *</label>
              <input className="nc-inp" value={form.company_name} onChange={e=>set('company_name',e.target.value)} placeholder="e.g. Coastline Mechanical" />
            </div>
            <div className="nc-field">
              <label className="nc-lbl">Industry</label>
              <select className="nc-sel" value={form.industry} onChange={e=>set('industry',e.target.value)}>
                {INDUSTRY_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="nc-field">
              <label className="nc-lbl">Plan</label>
              <select className="nc-sel" value={form.plan} onChange={e=>set('plan',e.target.value)}>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="nc-field">
              <label className="nc-lbl">Asset Limit</label>
              <input className="nc-inp" type="number" min={1} max={9999} value={form.asset_limit} onChange={e=>set('asset_limit',e.target.value)} />
            </div>
            <div className="nc-field">
              <label className="nc-lbl">Address</label>
              <input className="nc-inp" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="City, State" />
            </div>
          </div>
        </div>

        {/* Admin contact */}
        <div style={{ marginBottom:20 }}>
          <div className="nc-lbl" style={{ marginBottom:10 }}>Company Admin Contact</div>
          <div className="nc-grid">
            <div className="nc-field">
              <label className="nc-lbl">Admin Name</label>
              <input className="nc-inp" value={form.contact_name} onChange={e=>set('contact_name',e.target.value)} placeholder="Full name" />
            </div>
            <div className="nc-field">
              <label className="nc-lbl">Admin Email *</label>
              <input className="nc-inp" type="email" value={form.contact_email} onChange={e=>set('contact_email',e.target.value)} placeholder="admin@company.com" />
            </div>
            <div className="nc-field">
              <label className="nc-lbl">Phone</label>
              <input className="nc-inp" value={form.contact_phone} onChange={e=>set('contact_phone',e.target.value)} placeholder="+61 4xx xxx xxx" />
            </div>
          </div>
        </div>

        {/* Feature access */}
        <div style={{ marginBottom:24 }}>
          <div className="nc-lbl" style={{ marginBottom:4 }}>Module Access</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Select which modules this company can access.</div>
          <div className="nc-feat-grid">
            {ALL_FEATURES.map(f => (
              <label key={f.key} className={`nc-feat${form.features[f.key] ? ' on' : ''}`}>
                <input type="checkbox" checked={!!form.features[f.key]} onChange={()=>toggleFeat(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* Temp password preview */}
        <div style={{ marginBottom:20 }}>
          <div className="nc-lbl" style={{ marginBottom:8 }}>Generated Temporary Password</div>
          <div className="nc-tmpw">
            <div>
              <div className="nc-tmpw-lbl">Will be sent to admin email</div>
              <div className="nc-tmpw-pass">{tmpPass}</div>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(tmpPass)}
              style={{ padding:'6px 14px', border:'1px solid var(--accent)', borderRadius:6, background:'transparent', color:'var(--accent)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              Copy
            </button>
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>
            Admin must change this password on first login.
          </div>
        </div>

        <button className="nc-submit" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Creating Account…' : 'Create Company & Send Access →'}
        </button>
      </div>
    </div>
  );
}

function MasterAdmin({ initialTab }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('all');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pinAction, setPinAction] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [masterTab, setMasterTab] = useState(initialTab || 'companies');
  useEffect(() => { if (initialTab) setMasterTab(initialTab); }, [initialTab]);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    if (!document.getElementById('ma-css')) {
      const s = document.createElement('style'); s.id='ma-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (masterTab === 'requests') fetchRequests();
  }, [masterTab]);

  const fetchRequests = async () => {
    setRequestsLoading(true);
    const { data } = await supabase.from('app_requests').select('*').order('created_at', { ascending: false });
    setRequests(data || []);
    setRequestsLoading(false);
  };

  const updateRequestStatus = async (id, status) => {
    await supabase.from('app_requests').update({ status }).eq('id', id);
    fetchRequests();
  };

  const addAdminNote = async (id, note) => {
    await supabase.from('app_requests').update({ admin_notes: note }).eq('id', id);
    fetchRequests();
  };

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending:false });
    setCompanies(data || []);
    setLoading(false);
  };

  const requirePin = (label, action) => setPinAction({ label, onConfirm:() => { setPinAction(null); action(); } });

  const updateCompany = async (id, updates) => {
    setSaving(true);
    const { error } = await supabase.from('companies').update(updates).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
      await fetchCompanies();
      if (selected?.id === id) setSelected(prev => ({ ...prev, ...updates }));
    }
    setSaving(false);
  };

  const setStatus = (id, status) => {
    const labels = { active:'Activate this company', suspended:'Suspend this company', pending:'Set to pending review' };
    requirePin(labels[status]||'Change status', () => updateCompany(id, { status }));
  };

  const toggleFeature = (company, key) => {
    const current = company.features?.[key] !== false;
    const feat = FEATURES.find(f => f.key===key)?.label;
    requirePin(`${current?'Disable':'Enable'} "${feat}" for ${company.name}`, () => {
      const updated = { ...company.features, [key]: !current };
      updateCompany(company.id, { features:updated });
      if (selected?.id === company.id) setSelected(prev => ({ ...prev, features:updated }));
    });
  };

  const saveAssetLimit = (company) => requirePin(`Set asset limit to ${company.asset_limit}`, () => updateCompany(company.id, { asset_limit:company.asset_limit }));

  const exportProfile = async (company) => {
    try {
      const cid = company.id;
      const q = async (t) => { try { const { data } = await supabase.from(t).select('*').eq('company_id', cid); return data||[]; } catch { return []; } };
      const [users,assets,maint,wos,downtime,formT,formS,svcT,svcS,oil] = await Promise.all([
        q('user_roles'),q('assets'),q('maintenance'),q('work_orders'),q('downtime'),
        q('form_templates'),q('form_submissions'),q('service_sheet_templates'),q('service_sheet_submissions'),q('oil_samples'),
      ]);
      const profile = { exported_at:new Date().toISOString(), company, users, assets, maintenance:maint, work_orders:wos, downtime, form_templates:formT, form_submissions:formS, service_templates:svcT, service_submissions:svcS, oil_samples:oil };
      const blob = new Blob([JSON.stringify(profile,null,2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url;
      a.download=`MechIQ_${company.name.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      return true;
    } catch(e) { alert('Export failed: '+e.message); return false; }
  };

  const handleRestore = () => requirePin('Restore / re-create your Master Admin record', async () => {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { alert('Not logged in'); return; }
    const { error } = await supabase.from('user_roles').upsert(
      { email:user.email, name:user.email.split('@')[0], role:'master', company_id:null },
      { onConflict:'email' }
    );
    if (error) alert('Error: '+error.message);
    else alert('Master admin restored — refresh to continue.');
  });

  const handleDelete = (company) => requirePin(`PERMANENTLY DELETE "${company.name}" — cannot be undone`, async () => {
    setDeleting(true);
    const exported = await exportProfile(company);
    if (!exported) { setDeleting(false); return; }
    const cid = company.id;
    const tables = ['oil_samples','service_sheet_submissions','service_sheet_templates','form_submissions','form_templates','downtime','work_orders','maintenance','assets'];
    for (const t of tables) await supabase.from(t).delete().eq('company_id', cid);
    await supabase.from('user_roles').delete().eq('company_id', cid).neq('role','master');
    const { error } = await supabase.from('companies').delete().eq('id', cid);
    if (error) { alert('Error: '+error.message); setDeleting(false); return; }
    setDeleting(false); setSelected(null); await fetchCompanies();
    alert(`"${company.name}" deleted. Profile downloaded.`);
  });

  const filtered = companies.filter(c => {
    const matchTab = tab==='all' || c.status===tab;
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.contact_name?.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = { all:companies.length, pending:companies.filter(c=>c.status==='pending').length, active:companies.filter(c=>c.status==='active').length, suspended:companies.filter(c=>c.status==='suspended').length };

  const pillClass = (s) => `status-pill pill-${s||'pending'}`;
  const statusDot = (s) => ({ active:'#00ff88', pending:'#ffaa00', suspended:'#ff3366' }[s]||'#7ab8e8');

  return (
    <div style={{ maxWidth:1200, margin:'0 auto' }}>
      {pinAction && <PinModal actionLabel={pinAction.label} onConfirm={pinAction.onConfirm} onCancel={() => setPinAction(null)} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--purple)', letterSpacing:'3px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:4 }}>◈ MASTER CONTROL</div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:38, fontWeight:900, color:'var(--text-primary)', letterSpacing:'2px', textTransform:'uppercase', margin:0, lineHeight:1 }}>Command Panel</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6, fontFamily:'var(--font-display)' }}>Manage company registrations, access levels and platform features</div>
        </div>
        <button className="ma-action restore" onClick={handleRestore} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px' }}>
          <span style={{ fontSize:14 }}>⬡</span> Restore Master Admin
        </button>
      </div>



      {/* App Requests Kanban */}
      {masterTab === 'requests' && (
        <AppRequestsKanban requests={requests} loading={requestsLoading} onStatusChange={updateRequestStatus} onAddNote={addAdminNote} companies={companies} />
      )}

      {masterTab === 'register' && (
        <NewCompanyForm onCreated={() => { setMasterTab('companies'); fetchCompanies(); }} />
      )}

      {masterTab === 'companies' && (<>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Companies',  value:counts.all,       color:'var(--accent)',   glow:'rgba(0,212,255,0.15)' },
          { label:'Pending Approval', value:counts.pending,   color:'var(--amber)',  glow:'rgba(255,170,0,0.15)' },
          { label:'Active',           value:counts.active,    color:'var(--green)',  glow:'rgba(0,255,136,0.15)' },
          { label:'Suspended',        value:counts.suspended, color:'var(--red)',    glow:'rgba(255,51,102,0.15)' },
        ].map(s => (
          <div key={s.label} className="ma-card" style={{ padding:'20px 22px', boxShadow:`0 0 20px ${s.glow}`, borderColor:s.glow.replace('0.15','0.3') }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color, opacity:0.6 }} />
            <div style={{ fontFamily:"var(--font-display)", fontSize:48, fontWeight:800, color:s.color, lineHeight:1, textShadow:`0 0 20px ${s.glow.replace('0.15','0.5')}` }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Usage Widget */}
      <UsageWidget />

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'1fr', gap:20 }}>

        {/* Left — company list */}
        <div>
          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            {['all','pending','active','suspended'].map(t => (
              <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)} ({counts[t]})
              </button>
            ))}
            <div style={{ marginLeft:'auto', position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-muted)' }}>⌕</span>
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft:32, width:200, background:'var(--surface-2)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, padding:'8px 12px 8px 30px', fontFamily:'var(--font-display)' }}
              />
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[0,1,2].map(i => <div key={i} className="ma-card" style={{ height:90, animation:'shimmer 1.5s infinite linear', background:'linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%)', backgroundSize:'200% 100%' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontFamily:'var(--font-display)' }}>No companies found matching the current filter.</div>
          ) : filtered.map((c,i) => (
            <div key={c.id} className={`ma-card${selected?.id===c.id?' selected':''}`}
              style={{ marginBottom:10, opacity:0, animation:`fadeUp 0.35s ease ${i*40}ms forwards` }}
              onClick={() => setSelected(c)}>
              <div className="ma-row">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:statusDot(c.status), boxShadow:`0 0 6px ${statusDot(c.status)}`, flexShrink:0 }} />
                      <span style={{ color:'var(--text-primary)', fontWeight:700, fontSize:15, fontFamily:'var(--font-display)', letterSpacing:'0.3px' }}>{c.name}</span>
                      <span className={pillClass(c.status)}>{c.status||'pending'}</span>
                      {c.plan && <span style={{ padding:'2px 8px', borderRadius:4, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:10, fontWeight:600, border:'1px solid var(--border)', fontFamily:'var(--font-display)', letterSpacing:'0.5px', textTransform:'uppercase' }}>{c.plan}</span>}
                    </div>
                    <div style={{ color:'var(--text-muted)', fontSize:12, fontFamily:'var(--font-display)', display:'flex', gap:12, flexWrap:'wrap' }}>
                      {c.industry && <span>{c.industry}</span>}
                      {c.contact_name && <span>· {c.contact_name}</span>}
                      {c.phone && <span>· {c.phone}</span>}
                      {c.abn && <span style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>· ABN {c.abn}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                    {c.status==='pending' && (<>
                      <button className="ma-action approve" onClick={() => setStatus(c.id,'active')}>✓ Approve</button>
                      <button className="ma-action reject"  onClick={() => setStatus(c.id,'suspended')}>✕ Reject</button>
                    </>)}
                    {c.status==='active'    && <button className="ma-action suspend"  onClick={() => setStatus(c.id,'suspended')}>Suspend</button>}
                    {c.status==='suspended' && <button className="ma-action activate" onClick={() => setStatus(c.id,'active')}>Reactivate</button>}
                  </div>
                </div>
                {/* Feature pills */}
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
                  {FEATURES.map(f => {
                    const on = c.features?.[f.key] !== false;
                    return (
                      <span key={f.key} style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'0.5px', background:on?'rgba(0,212,255,0.07)':'var(--surface-2)', color:on?'var(--accent)':'var(--text-faint)', border:`1px solid ${on?'rgba(0,212,255,0.2)':'var(--border)'}` }}>
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right — detail panel */}
        {selected && (
          <div className="ma-card" style={{ height:'fit-content', position:'sticky', top:20 }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,var(--accent),transparent)' }} />
            <div style={{ padding:'20px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--accent)', letterSpacing:'2px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:4 }}>Company Detail</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px' }}>{selected.name}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', width:32, height:32, borderRadius:6, cursor:'pointer', fontSize:14, transition:'all 0.15s' }}>✕</button>
              </div>
            </div>

            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
              {[
                { label:'Status',     value:selected.status,     color:statusDot(selected.status) },
                { label:'Plan',       value:selected.plan||'—' },
                { label:'Industry',   value:selected.industry },
                { label:'Contact',    value:selected.contact_name },
                { label:'Phone',      value:selected.phone },
                { label:'ABN',        value:selected.abn||'—',   mono:true },
                { label:'Address',    value:selected.address||'—' },
                { label:'Registered', value:selected.created_at?new Date(selected.created_at).toLocaleDateString('en-AU'):'—' },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                  <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-display)', letterSpacing:'0.3px' }}>{row.label}</span>
                  <span style={{ color:row.color||'var(--text-primary)', fontWeight:600, fontFamily:row.mono?'var(--font-mono)':'var(--font-body)', fontSize:row.mono?11:13 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Asset limit */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10 }}>Asset Limit</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="number" value={selected.asset_limit||10}
                  onChange={e => setSelected(prev => ({ ...prev, asset_limit:parseInt(e.target.value) }))}
                  style={{ width:80, padding:'8px 10px', textAlign:'center' }}
                />
                <button className="ma-action export" onClick={() => saveAssetLimit(selected)}>{saving?'…':'Save Limit'}</button>
              </div>
            </div>

            {/* Features */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:12 }}>Feature Access</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {FEATURES.map(f => {
                  const on = selected.features?.[f.key] !== false;
                  return (
                    <div key={f.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'var(--text-secondary)', fontSize:13, fontFamily:'var(--font-display)' }}>{f.label}</span>
                      <button className={`feat-toggle feat-${on?'on':'off'}`} onClick={() => toggleFeature(selected, f.key)}>
                        {on?'✓ Active':'✕ Locked'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10 }}>Account Actions</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {selected.status!=='active'    && <button className="ma-action activate" onClick={() => setStatus(selected.id,'active')}>Activate</button>}
                {selected.status!=='suspended' && <button className="ma-action suspend"  onClick={() => setStatus(selected.id,'suspended')}>Suspend</button>}
                {selected.status!=='pending'   && <button className="ma-action pending"  onClick={() => setStatus(selected.id,'pending')}>Set Pending</button>}
              </div>
            </div>

            {/* Data */}
            <div style={{ padding:'16px 22px' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10 }}>Data Management</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="ma-action export" onClick={() => exportProfile(selected)}>Export JSON</button>
                <button className="ma-action danger" disabled={deleting} onClick={() => handleDelete(selected)}>{deleting?'Deleting…':'Delete Company'}</button>
              </div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:10, lineHeight:1.6, fontFamily:'var(--font-display)' }}>
                Delete exports a full data backup first, then permanently removes all company records.
              </div>
            </div>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}

export default MasterAdmin;
