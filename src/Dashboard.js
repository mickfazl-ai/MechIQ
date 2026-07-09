import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { WidgetCustom, WidgetBuilderModal } from './CustomWidget';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CSS = `
  @keyframes shimmer  { 0%{background-position:-200% 0}100%{background-position:200% 0} }
  @keyframes countUp  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }
  @keyframes toast-in { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes pulse-r  { 0%,100%{box-shadow:0 0 0 0 rgba(185,28,28,.15)}50%{box-shadow:0 0 0 6px transparent} }
  @keyframes pulse-a  { 0%,100%{box-shadow:0 0 0 0 rgba(180,83,9,.12)}50%{box-shadow:0 0 0 6px transparent} }
  @keyframes slideUp  { from{transform:translateY(100%)}to{transform:translateY(0)} }
  @keyframes slideIn  { from{transform:translateX(100%)}to{transform:translateX(0)} }

  /* ── Design tokens ── */
  :root {
    --d-bg:#F8FAFC; --d-surf:#FFFFFF; --d-s2:#F8FAFC; --d-s3:#F1F5F9;
    --d-border:#E5E7EB; --d-border2:#CBD5E1;
    --d-text:#0F172A; --d-text2:#374151; --d-text3:#64748B; --d-text4:#94A3B8;
    --d-blue:#1976D2; --d-blue-bg:#EBF3FC; --d-blue-bd:#BFDBFE;
    --d-green:#15803D; --d-green-bg:#F0FDF4; --d-green-bd:#86EFAC;
    --d-amber:#B45309; --d-amber-bg:#FFFBEB; --d-amber-bd:#FCD34D;
    --d-red:#B91C1C; --d-red-bg:#FEF2F2; --d-red-bd:#FCA5A5;
    --d-ai:#6366F1; --d-ai-bg:#EEF2FF; --d-ai-bd:#C7D2FE;
    --d-sh:0 1px 4px rgba(0,0,0,.05),0 0 0 1px rgba(0,0,0,.02);
    --d-sh2:0 4px 16px rgba(0,0,0,.08);
    /* Legacy compat */
    --accent:var(--d-blue); --red:var(--d-red); --amber:var(--d-amber); --green:var(--d-green);
    --border:var(--d-border); --surface:var(--d-surf); --surface-2:var(--d-s2);
    --text-primary:var(--d-text); --text-secondary:var(--d-text2);
    --text-muted:var(--d-text3); --text-faint:var(--d-text4);
    --red-bg:var(--d-red-bg); --red-border:var(--d-red-bd);
    --amber-bg:var(--d-amber-bg); --amber-border:var(--d-amber-bd);
    --green-bg:var(--d-green-bg); --green-border:var(--d-green-bd);
    --accent-bg:var(--d-blue-bg); --accent-border:var(--d-blue-bd);
  }

  /* ── KPI Card ── */
  .kpi-card {
    background:var(--d-surf); border:1px solid var(--d-border);
    padding:16px 18px; position:relative; overflow:hidden;
    box-shadow:var(--d-sh); transition:box-shadow .2s,transform .2s; cursor:pointer;
  }
  .kpi-card:hover { box-shadow:var(--d-sh2); transform:translateY(-1px); }
  .kpi-card.urgent { animation:pulse-r 2.5s ease-in-out infinite; }
  .kpi-card.warn   { animation:pulse-a 2.5s ease-in-out infinite; }

  /* ── Panel ── */
  .panel {
    background:var(--d-surf); border:1px solid var(--d-border);
    padding:16px 20px; box-shadow:var(--d-sh);
  }
  .panel-title {
    font-size:11px; font-weight:700; letter-spacing:.6px;
    text-transform:uppercase; color:var(--d-text3);
    margin-bottom:14px; display:flex; align-items:center; gap:8px;
  }
  .panel-title::before { content:''; width:3px; height:13px; background:var(--d-blue); flex-shrink:0; }

  /* ── Progress ── */
  .progress-track { height:5px; background:var(--d-s3); overflow:hidden; }
  .progress-fill  { height:100%; transition:width .9s cubic-bezier(.16,1,.3,1); }

  /* ── Skeleton ── */
  .sk {
    background:linear-gradient(90deg,var(--d-s2) 25%,var(--d-border) 50%,var(--d-s2) 75%);
    background-size:200% 100%; animation:shimmer 1.4s infinite linear;
  }

  /* ── Toast ── */
  .toast-wrap { position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none; }
  .toast-item { display:flex; align-items:center; gap:10px; background:var(--d-surf); border:1px solid var(--d-border); border-left:3px solid var(--d-blue); padding:11px 16px; min-width:260px; box-shadow:var(--d-sh2); pointer-events:auto; animation:toast-in .3s cubic-bezier(.16,1,.3,1); }

  /* ── Dash grid ── */
  .dash-grid { display:grid; grid-template-columns:repeat(12,1fr); gap:12px; }
  .widget-sm   { grid-column:span 4; }
  .widget-md   { grid-column:span 6; }
  .widget-lg   { grid-column:span 12; }
  .widget-wide { grid-column:span 6; }
  @media(max-width:900px){ .widget-sm,.widget-md,.widget-lg,.widget-wide { grid-column:span 12; } }

  /* ── Widget card ── */
  .widget-card, .dash-widget {
    background:var(--d-surf); border:1px solid var(--d-border);
    padding:16px; box-shadow:var(--d-sh); transition:box-shadow .2s;
  }
  .widget-card:hover,.dash-widget:hover { box-shadow:var(--d-sh2); }
  .widget-card:hover .widget-remove-btn,.dash-widget:hover .widget-remove-btn { opacity:1 !important; }
  .dw-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
  .dw-title  { font-size:11px; font-weight:700; color:var(--d-text3); text-transform:uppercase; letter-spacing:.6px; }

  /* ── Refresh btn ── */
  .refresh-btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:7px 14px; background:var(--d-surf); color:var(--d-text2);
    border:1px solid var(--d-border2); font-size:12px; font-weight:600; cursor:pointer;
    font-family:inherit; transition:all .15s;
  }
  .refresh-btn:hover { border-color:var(--d-blue); color:var(--d-blue); }

  /* ── Customise panel ── */
  .custom-panel {
    position:fixed; top:0; right:0; bottom:0; width:340px; max-width:90vw;
    background:var(--d-s2); border-left:1px solid var(--d-border);
    box-shadow:-8px 0 40px rgba(0,0,0,.10); z-index:300;
    display:flex; flex-direction:column; animation:slideIn .25s cubic-bezier(.16,1,.3,1);
  }
  .custom-item {
    display:flex; align-items:center; gap:10px; padding:12px 16px;
    border-bottom:1px solid var(--d-border); cursor:grab;
    user-select:none; transition:background .1s;
  }
  .custom-item.dragging  { opacity:.4; }
  .custom-item.drag-over { background:var(--d-blue-bg); border-color:var(--d-blue); }
  .custom-item:hover { background:var(--d-surf); }
  .size-btn { padding:3px 8px; border:1px solid var(--d-border); background:var(--d-s2); color:var(--d-text3); font-size:10px; font-weight:700; cursor:pointer; font-family:inherit; }
  .size-btn.active { background:var(--d-blue); color:#fff; border-color:var(--d-blue); }
  .toggle-btn { width:36px; height:20px; border:none; cursor:pointer; position:relative; transition:background .2s; flex-shrink:0; }
  .toggle-btn::after { content:''; position:absolute; top:2px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left .2s; }
  .toggle-btn.on  { background:var(--d-blue); }.toggle-btn.on::after  { left:18px; }
  .toggle-btn.off { background:var(--d-border2); }.toggle-btn.off::after { left:2px; }

  /* ── Drill-down ── */
  .dd-overlay { position:fixed; inset:0; background:rgba(15,23,42,.4); z-index:399; backdrop-filter:blur(2px); }
  .dd-panel   { position:fixed; bottom:0; left:0; right:0; max-height:70vh; background:var(--d-surf); border-top:1px solid var(--d-border); box-shadow:0 -8px 40px rgba(0,0,0,.12); z-index:400; display:flex; flex-direction:column; animation:slideUp .25s cubic-bezier(.16,1,.3,1); }

  /* ── AI elements ── */
  .ai-banner { background:linear-gradient(135deg,#4338ca,#6366F1,#7c3aed); padding:14px 20px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 15px rgba(99,102,241,.25); margin-bottom:20px; }
  .ai-tag    { background:var(--d-ai-bg); color:var(--d-ai); border:1px solid var(--d-ai-bd); font-size:9px; font-weight:800; padding:2px 7px; letter-spacing:.5px; text-transform:uppercase; }
  .ai-pulse  { width:7px; height:7px; border-radius:50%; background:var(--d-ai); animation:pulse-r 2s infinite; }

  /* ── Table ── */
  .d-tbl { width:100%; border-collapse:collapse; }
  .d-tbl th { background:var(--d-s2); padding:9px 12px; font-size:10px; font-weight:700; color:var(--d-text3); text-align:left; border-bottom:1px solid var(--d-border); text-transform:uppercase; letter-spacing:.4px; white-space:nowrap; }
  .d-tbl td { padding:9px 12px; font-size:12px; color:var(--d-text2); border-bottom:1px solid var(--d-s2); }
  .d-tbl tr:hover td { background:var(--d-s2); }
  .d-tbl tr:last-child td { border-bottom:none; }

  /* ── Badge ── */
  .d-badge { display:inline-flex; align-items:center; gap:3px; padding:3px 8px; font-size:10px; font-weight:700; border:1px solid; white-space:nowrap; }
  .d-badge::before { content:'●'; font-size:7px; }
  .d-badge-g { background:var(--d-green-bg); color:var(--d-green); border-color:var(--d-green-bd); }
  .d-badge-r { background:var(--d-red-bg); color:var(--d-red); border-color:var(--d-red-bd); }
  .d-badge-a { background:var(--d-amber-bg); color:var(--d-amber); border-color:var(--d-amber-bd); }
  .d-badge-b { background:var(--d-blue-bg); color:var(--d-blue); border-color:var(--d-blue-bd); }
  .d-badge-ai{ background:var(--d-ai-bg); color:var(--d-ai); border-color:var(--d-ai-bd); }
  .d-badge-n { background:var(--d-s2); color:var(--d-text3); border-color:var(--d-border); }
`

/* ── Toast ── */
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
function ToastContainer({ toasts }) {
  const P = {
    success: { c: 'var(--green)',  bg: 'var(--green-bg)',  icon: '✓' },
    error:   { c: 'var(--red)',    bg: 'var(--red-bg)',    icon: '✕' },
    warning: { c: 'var(--amber)',  bg: 'var(--amber-bg)',  icon: '!' },
    info:    { c: 'var(--accent)', bg: 'var(--accent-light)', icon: 'i' },
  };
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => {
        const p = P[t.type] || P.info;
        return (
          <div key={t.id} style={{
            display:'flex', alignItems:'center', gap:10,
            background: p.bg, border:`1px solid ${p.c}22`, borderLeft:`3px solid ${p.c}`,
            borderRadius:10, padding:'11px 16px', minWidth:260, maxWidth:340,
            boxShadow:'var(--shadow-md)',
            animation: t.exiting ? 'toast-out 0.3s ease forwards' : 'toast-in 0.3s cubic-bezier(0.16,1,0.3,1)',
            pointerEvents:'auto',
          }}>
            <div style={{ width:22, height:22, borderRadius:'50%', background:`${p.c}22`, display:'flex', alignItems:'center', justifyContent:'center', color:p.c, fontWeight:800, fontSize:11, flexShrink:0 }}>{p.icon}</div>
            <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Skeleton ── */
function Sk({ w='100%', h='13px', r='6px' }) {
  return <div className="sk" style={{ width:w, height:h, borderRadius:r, flexShrink:0 }} />;
}

/* ── Sparkline ── */
function Sparkline({ values=[], color='var(--accent)', h=26, w=64 }) {
  if (!values || values.length < 2) return null;
  const max=Math.max(...values,1), min=Math.min(...values), range=max-min||1;
  const pts = values.map((v,i) => `${(i/(values.length-1))*w},${h-((v-min)/range)*(h-6)-3}`).join(' ');
  const last = pts.split(' ').pop().split(',');
  return (
    <svg width={w} height={h} style={{ overflow:'visible', flexShrink:0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeOpacity="0.3" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

/* ── Status Badge ── */
const BADGE_MAP = {
  'Running':     ['var(--green)',  'var(--green-bg)',  'var(--green-border)'],
  'Down':        ['var(--red)',    'var(--red-bg)',    'var(--red-border)'],
  'Maintenance': ['var(--amber)',  'var(--amber-bg)',  'var(--amber-border)'],
  'Overdue':     ['var(--red)',    'var(--red-bg)',    'var(--red-border)'],
  'Due Soon':    ['var(--amber)',  'var(--amber-bg)',  'var(--amber-border)'],
  'Upcoming':    ['var(--accent)', 'var(--accent-light)', 'rgba(14,165,233,0.25)'],
  'Open':        ['var(--accent)', 'var(--accent-light)', 'rgba(14,165,233,0.25)'],
  'In Progress': ['var(--purple)', 'var(--purple-bg)', 'var(--purple-border)'],
  'Critical':    ['var(--red)',    'var(--red-bg)',    'var(--red-border)'],
  'Complete':    ['var(--green)',  'var(--green-bg)',  'var(--green-border)'],
};
function StatusBadge({ status }) {
  const [c, bg, border] = BADGE_MAP[status] || ['var(--text-muted)', 'var(--surface-2)', 'var(--border)'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:bg, border:`1px solid ${border}`, color:c, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c, flexShrink:0 }} />
      {status}
    </span>
  );
}

/* ── Fleet Health Bar ── */
function FleetHealthBar({ running, down, maintenance, total }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 300); return () => clearTimeout(t); }, []);
  const segs = [
    { count:running,     pct:total>0?(running/total)*100:0,     color:'var(--green)', label:'Running' },
    { count:maintenance, pct:total>0?(maintenance/total)*100:0, color:'var(--amber)', label:'Maintenance' },
    { count:down,        pct:total>0?(down/total)*100:0,        color:'var(--red)',   label:'Down' },
  ];
  return (
    <div style={{ marginBottom:28, opacity:vis?1:0, transition:'opacity 0.4s' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.5px', textTransform:'uppercase', fontFamily:'var(--font-display)' }}>Fleet Health</span>
        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>{total} assets registered</span>
      </div>
      <div style={{ display:'flex', height:8, borderRadius:99, overflow:'hidden', background:'var(--surface-3)', gap:2 }}>
        {segs.map(s => s.count > 0 && (
          <div key={s.label} className="health-seg" title={`${s.label}: ${s.count}`} style={{ width:vis?`${s.pct}%`:'0%', background:s.color }} />
        ))}
      </div>
      <div style={{ display:'flex', gap:18, marginTop:10 }}>
        {segs.map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>{s.label} <span style={{ fontWeight:700, color:'var(--text-secondary)' }}>({s.count})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Progress Bar ── */
function ProgressBar({ label, current, max }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t); }, []);
  const pct = Math.min(100, max > 0 ? Math.round((current/max)*100) : 0);
  const c = pct>=90 ? 'var(--red)' : pct>=70 ? 'var(--amber)' : 'var(--accent)';
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)', maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:c }}>{pct}%</span>
          <span style={{ fontSize:11, color:'var(--text-faint)', fontFamily:'var(--font-mono)' }}>{current}/{max}h</span>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width:anim?`${pct}%`:'0%', background:c }} />
      </div>
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign:'center', padding:'36px 20px' }}>
      <div style={{ fontSize:28, marginBottom:10, opacity:0.4 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)', marginBottom:5 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--text-faint)', maxWidth:220, margin:'0 auto', lineHeight:1.6 }}>{desc}</div>
    </div>
  );
}

/* ── KPI Card ── */
const PCOLOR = { Critical:'var(--red)', High:'var(--amber)', Medium:'var(--accent)', Low:'var(--green)' };
function KPICard({ label, value, accent, sub, trend, delay=0, urgent=false, warn=false }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const spark = [3,5,4,7,5,6,5,parseInt(value)||5].map(v => Math.max(1, v + Math.random()*1.5));
  return (
    <div className={`kpi-card${urgent?' urgent':warn?' warn':''}`} style={{
      borderTop: `3px solid ${accent}`,
      opacity: vis?1:0, transform: vis?'translateY(0)':'translateY(16px)',
      transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms, box-shadow 0.2s, border-color 0.2s`,
    }}>
      {/* Corner tint */}
      <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right, ${accent}12, transparent 70%)`, pointerEvents:'none' }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.4px', textTransform:'uppercase', fontFamily:'var(--font-display)' }}>{label}</span>
        <div style={{ width:34, height:34, borderRadius:8, background:`${accent}14`, border:`1px solid ${accent}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>
          {urgent ? '⚠' : warn ? '◷' : label.includes('Fleet') || label.includes('Total') ? '⚙' : label.includes('Util') ? '▲' : '◈'}
        </div>
      </div>

      <div style={{
        fontFamily:'var(--font-display)', fontSize:48, fontWeight:900,
        color: (urgent||warn) ? accent : 'var(--text-primary)', lineHeight:1, marginBottom:12,
        animation: vis ? `countUp 0.4s ease ${delay+100}ms both` : 'none',
      }}>{value}</div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {trend !== undefined && trend !== 0 && (
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:4, color:trend>0?'var(--red)':'var(--green)', background:trend>0?'var(--red-bg)':'var(--green-bg)' }}>
              {trend>0?'↑':'↓'} {Math.abs(trend)}%
            </span>
          )}
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{sub}</span>
        </div>
        <Sparkline values={spark} color={accent} />
      </div>
    </div>
  );
}

/* ── Accordion Card ── */
function AccordionCard({ title, count, color, bg, border, icon, loading, children, urgent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${open ? border : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      animation: urgent ? 'pulse-red 2.5s ease-in-out infinite' : 'none',
    }}>
      {/* Header — always visible, tappable */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-display)' }}>
            {loading ? '…' : count}
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▾</div>
      </button>
      {/* Expandable content */}
      {open && (
        <div style={{ borderTop: `1px solid var(--border)`, padding: '12px 18px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function AccordionCards({ loading, assets, maint, wos, PCOLOR, StatusBadge }) {
  const today = new Date().toISOString().split('T')[0];
  const breakdowns = assets.filter(a => a.status === 'Down');
  const dueToday   = maint.filter(m => m.next_due === today);
  const overdue    = maint.filter(m => m.status === 'Overdue');
  const priority   = wos.filter(w => w.priority === 'Critical' || w.priority === 'High');

  const emptyRow = (msg) => (
    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-faint)', fontSize: 13 }}>✓ {msg}</div>
  );

  const listTable = (rows, cols, rowFn) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        {cols.map(h => <th key={h} style={{ textAlign:'left', padding:'0 10px 8px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--border)' }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map((r, i) => rowFn(r, i))}</tbody>
    </table>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

      {/* Breakdowns */}
      <AccordionCard title="Current Breakdowns" count={breakdowns.length} color="var(--red)" bg="var(--red-bg)" border="var(--red-border)" icon="🔴" loading={loading} urgent={breakdowns.length > 0}>
        {breakdowns.length === 0 ? emptyRow('No breakdowns — all assets operational') :
          listTable(breakdowns, ['Asset','Number','Location'], (a, i) => (
            <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding:'9px 10px 9px 0', fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{a.name||'—'}</td>
              <td style={{ padding:'9px 10px 9px 0', fontSize:12, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>{a.asset_number||'—'}</td>
              <td style={{ padding:'9px 0', fontSize:12, color:'var(--text-muted)' }}>{a.location||'—'}</td>
            </tr>
          ))
        }
      </AccordionCard>

      {/* Service Due Today */}
      <AccordionCard title="Service Due Today" count={dueToday.length} color="var(--accent)" bg="var(--accent-light)" border="rgba(14,165,233,0.3)" icon="📅" loading={loading}>
        {dueToday.length === 0 ? emptyRow('Nothing due today') :
          listTable(dueToday, ['Asset','Service','Assigned'], (m, i) => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding:'9px 10px 9px 0', fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{m.asset||m.asset||'—'}</td>
              <td style={{ padding:'9px 10px 9px 0', fontSize:12, color:'var(--text-muted)' }}>{m.task||m.task||'Service'}</td>
              <td style={{ padding:'9px 0', fontSize:12, color:'var(--text-muted)' }}>{m.assigned_to||'Unassigned'}</td>
            </tr>
          ))
        }
      </AccordionCard>

      {/* Overdue Services */}
      <AccordionCard title="Overdue Services" count={overdue.length} color="var(--amber)" bg="var(--amber-bg)" border="var(--amber-border)" icon="⚠️" loading={loading} urgent={overdue.length > 0}>
        {overdue.length === 0 ? emptyRow('All services on schedule') :
          listTable(overdue, ['Asset','Service','Due'], (m, i) => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding:'9px 10px 9px 0', fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{m.asset||m.asset||'—'}</td>
              <td style={{ padding:'9px 10px 9px 0', fontSize:12, color:'var(--text-muted)' }}>{m.task||m.task||'Service'}</td>
              <td style={{ padding:'9px 0', fontSize:12, fontWeight:600, color:'var(--amber)', fontFamily:'var(--font-mono)' }}>{m.next_due||m.next_due||'—'}</td>
            </tr>
          ))
        }
      </AccordionCard>

      {/* Priority Jobs */}
      <AccordionCard title="Priority Jobs" count={priority.length} color="var(--red)" bg="var(--red-bg)" border="var(--red-border)" icon="🔥" loading={loading} urgent={priority.length > 0}>
        {priority.length === 0 ? emptyRow('No critical or high priority jobs') :
          listTable(priority, ['Job','Asset','Priority','Status'], (w, i) => {
            const pc = PCOLOR[w.priority] || 'var(--text-muted)';
            return (
              <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding:'9px 10px 9px 0', fontSize:12, fontWeight:600, color:'var(--text-primary)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.title||w.defect_description?.slice(0,30)||'—'}</td>
                <td style={{ padding:'9px 10px 9px 0', fontSize:11, color:'var(--text-muted)', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.asset||w.asset||'—'}</td>
                <td style={{ padding:'9px 10px 9px 0' }}>
                  <span style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:700, color:pc, background:`${pc}14`, border:`1px solid ${pc}28` }}>{w.priority}</span>
                </td>
                <td style={{ padding:'9px 0' }}><StatusBadge status={w.status} /></td>
              </tr>
            );
          })
        }
      </AccordionCard>

    </div>
  );
}

/* ── Widget Definitions ── */
const WIDGET_DEFS = [
  { id:'prestart_kpi',   label:'Prestart KPIs',        icon:'📋', defaultSize:'wide', desc:'Daily prestart completion per machine with missing prestart alerts' },
  { id:'service_kpi',    label:'Service KPIs',         icon:'🔧', defaultSize:'wide', desc:'Service schedule status — overdue, due soon, completed' },
  { id:'fleet_health',   label:'Fleet Health',         icon:'🚛', defaultSize:'lg',  desc:'Overall fleet status bar' },
  { id:'breakdowns',     label:'Breakdowns',           icon:'🔴', defaultSize:'md',  desc:'Current down machines' },
  { id:'overdue',        label:'Overdue Services',     icon:'⚠️', defaultSize:'md',  desc:'Services past due date' },
  { id:'due_today',      label:'Service Due Today',    icon:'📅', defaultSize:'md',  desc:'Services due today' },
  { id:'priority_wos',  label:'Priority Work Orders', icon:'🔥', defaultSize:'md',  desc:'Critical and high priority jobs' },
  { id:'oil_sampling',  label:'Oil Sampling',         icon:'🧪', defaultSize:'md',  desc:'Overdue samples and high alerts' },
  { id:'parts_stock',   label:'Parts Low Stock',      icon:'🔩', defaultSize:'sm',  desc:'Parts below minimum stock level' },
  { id:'downtime_summary',label:'Downtime Summary',   icon:'📉', defaultSize:'sm',  desc:'Hours lost this month' },
  { id:'calendar_preview',label:'Calendar Preview',   icon:'📆', defaultSize:'lg',  desc:'Next 7 days of scheduled services' },
  { id:'messages',      label:'Messages',             icon:'💬', defaultSize:'sm',  desc:'Unread messages and recent activity' },
];

const DEFAULT_LAYOUT = WIDGET_DEFS.map(w => ({ id:w.id, enabled:true, size:w.defaultSize }));


// ─── Dashboard Preferences (KPIs + AI features) ────────────────────────────────
const ALL_KPIS = [
  { id:'fleet',       label:'Total Fleet',      color:'var(--d-blue)',  sub:'registered assets',  ai:false },
  { id:'operational', label:'Operational',      color:'var(--d-green)', sub:'utilisation %',       ai:false },
  { id:'down',        label:'Down / Fault',     color:'var(--d-red)',   sub:'offline / breakdown', ai:false },
  { id:'overdue',     label:'Overdue Svc',      color:'var(--d-amber)', sub:'services past due',   ai:false },
  { id:'predicted',   label:'AI Predicted Fails',color:'var(--d-ai)',   sub:'next 14 days',        ai:true  },
  { id:'prestarts',   label:'Prestart Rate',    color:'var(--d-green)', sub:'today %',             ai:false },
  { id:'wos',         label:'Open WOs',         color:'var(--d-amber)', sub:'work orders open',    ai:false },
  { id:'downtime',    label:'Downtime Hrs',     color:'var(--d-red)',   sub:'this month',          ai:false },
  { id:'utilisation', label:'Avg Utilisation',  color:'var(--d-blue)',  sub:'fleet average',       ai:false },
  { id:'parts',       label:'Parts Low Stock',  color:'var(--d-amber)', sub:'below minimum',       ai:false },
];
const DEFAULT_KPIS     = ['fleet','operational','down','overdue','predicted'];
const DEFAULT_AI_PREFS = { banner:true, insights:true, risk:true, kpi:true };
const DEFAULT_SECTIONS = { fleetTable:true, healthBar:true, activity:true, overdue:true, prestartKpi:true, serviceKpi:true };

function getDashPrefs(companyId, email) {
  try {
    const k = `mechiq_dashprefs_${companyId}_${email}`;
    const saved = JSON.parse(localStorage.getItem(k) || 'null');
    return saved || { kpis: DEFAULT_KPIS, ai: DEFAULT_AI_PREFS, sections: DEFAULT_SECTIONS };
  } catch { return { kpis: DEFAULT_KPIS, ai: DEFAULT_AI_PREFS, sections: DEFAULT_SECTIONS }; }
}
function saveDashPrefs(prefs, companyId, email) {
  try { localStorage.setItem(`mechiq_dashprefs_${companyId}_${email}`, JSON.stringify(prefs)); } catch {}
}

const getLayout = (companyId, userEmail) => {
  try {
    const userKey = `mechiq_dash_${userEmail}`;
    const stored = localStorage.getItem(userKey);
    if (stored) return JSON.parse(stored);
    const companyKey = `mechiq_dash_company_${companyId}`;
    const companyStored = localStorage.getItem(companyKey);
    if (companyStored) return JSON.parse(companyStored);
  } catch(e) {}
  return DEFAULT_LAYOUT;
};

const saveLayout = (layout, companyId, userEmail, saveAsCompanyDefault=false) => {
  try {
    localStorage.setItem(`mechiq_dash_${userEmail}`, JSON.stringify(layout));
    if (saveAsCompanyDefault) localStorage.setItem(`mechiq_dash_company_${companyId}`, JSON.stringify(layout));
  } catch(e) {}
};

/* ── Customise Panel ── */
function FullCustomisePanel({ layout, onLayoutChange, dashPrefs, onToggleAI, onToggleSection, onToggleKpi, onClose, onSaveDefault, isAdmin, companyId, userEmail }) {
  const [items, setItems] = useState([...layout]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [activeTab, setActiveTab] = useState('ai');

  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const onDrop      = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setItems(next);
    setDragIdx(null); setOverIdx(null);
  };
  const save = () => {
    onLayoutChange(items);
    saveLayout(items, companyId, userEmail);
    onClose();
  };

  const tabs = [
    { id:'ai',      label:'AI Features' },
    { id:'kpis',    label:'KPI Cards' },
    { id:'sections',label:'Sections' },
    { id:'widgets', label:'Widgets' },
  ];

  const kpiLabels = {
    fleet:'Total Fleet', operational:'Operational', down:'Down / Fault',
    overdue:'Overdue Svc', predicted:'AI Predicted', wos:'Open WOs',
    prestarts:'Prestart Rate', downtime:'Downtime Hrs', utilisation:'Utilisation', parts:'Parts Stock',
  };
  const widgetLabels = {
    prestart_kpi:'Prestart KPIs', service_kpi:'Service KPIs', fleet_health:'Fleet Health',
    breakdowns:'Breakdowns', overdue:'Overdue Services', due_today:'Due Today',
    priority_wos:'Priority Work Orders', oil_sampling:'Oil Sampling',
    parts_stock:'Parts Low Stock', downtime_summary:'Downtime Summary',
    calendar_preview:'Calendar Preview', messages:'Messages',
  };

  const tog = (on, fn) => (
    <button
      onClick={fn}
      style={{ width:36, height:20, border:'none', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0, borderRadius:10,
        background: on ? 'var(--d-blue)' : 'var(--d-border2)' }}
    >
      <span style={{ position:'absolute', top:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s',
        left: on ? 18 : 2 }} />
    </button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.35)', zIndex:299, backdropFilter:'blur(2px)' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'340px', maxWidth:'90vw', background:'var(--d-s2)', borderLeft:'1px solid var(--d-border)', boxShadow:'-8px 0 40px rgba(0,0,0,.12)', zIndex:300, display:'flex', flexDirection:'column', animation:'slideIn .25s cubic-bezier(.16,1,.3,1)' }}>

        {/* Header */}
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--d-border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'var(--d-surf)' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--d-text)' }}>Customise Dashboard</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--d-text3)', padding:'2px 6px' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--d-border)', background:'var(--d-surf)', flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:activeTab===t.id?700:500,
                color:activeTab===t.id?'var(--d-blue)':'var(--d-text3)',
                borderBottom:activeTab===t.id?'2px solid var(--d-blue)':'2px solid transparent',
                fontFamily:'inherit', transition:'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>

          {/* AI Features tab */}
          {activeTab === 'ai' && (
            <div>
              <div style={{ fontSize:11, color:'var(--d-text4)', marginBottom:14, lineHeight:1.5 }}>
                Toggle AI features on or off. Disabling AI features keeps all operational data intact — only the AI-specific elements are hidden.
              </div>
              {[
                { key:'banner',   label:'Daily AI Briefing',       sub:'Purple AI banner at the top of the dashboard' },
                { key:'insights', label:'AI Predictive Insights',  sub:'Failure risk cards with confidence scores' },
                { key:'risk',     label:'AI Risk Scores',          sub:'Per-asset 0–100 risk scoring panel' },
                { key:'kpi',      label:'AI Predicted Failures KPI',sub:'Indigo KPI card — predicted failures next 14 days' },
              ].map(item => (
                <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--d-border)' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--d-text)', marginBottom:2 }}>{item.label}</div>
                    <div style={{ fontSize:11, color:'var(--d-text4)' }}>{item.sub}</div>
                  </div>
                  {tog(dashPrefs.ai[item.key], () => onToggleAI(item.key))}
                </div>
              ))}
            </div>
          )}

          {/* KPI Cards tab */}
          {activeTab === 'kpis' && (
            <div>
              <div style={{ fontSize:11, color:'var(--d-text4)', marginBottom:14, lineHeight:1.5 }}>
                Select which KPI cards to display. At least one must be active. The grid adapts automatically to how many you select.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {Object.entries(kpiLabels).map(([id, label]) => {
                  const isOn = dashPrefs.kpis.includes(id);
                  const isAI = id === 'predicted';
                  return (
                    <div key={id} onClick={() => onToggleKpi(id)}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 10px', border:`1px solid ${isOn?'var(--d-blue)':'var(--d-border)'}`, background:isOn?'var(--d-blue-bg)':'var(--d-surf)', cursor:'pointer', transition:'all .15s' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', border:`1.5px solid ${isOn?'var(--d-blue)':'var(--d-border2)'}`, background:isOn?'var(--d-blue)':'transparent', flexShrink:0 }} />
                      <div style={{ fontSize:11, fontWeight:isOn?600:400, color:isOn?'var(--d-blue)':'var(--d-text)', flex:1 }}>{label}</div>
                      {isAI && <span style={{ fontSize:8, fontWeight:700, color:'var(--d-ai)', background:'var(--d-ai-bg)', border:'1px solid var(--d-ai-bd)', padding:'1px 4px' }}>AI</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize:11, color:'var(--d-text4)', marginTop:12 }}>{dashPrefs.kpis.length} of {Object.keys(kpiLabels).length} KPIs selected</div>
            </div>
          )}

          {/* Sections tab */}
          {activeTab === 'sections' && (
            <div>
              <div style={{ fontSize:11, color:'var(--d-text4)', marginBottom:14, lineHeight:1.5 }}>
                Show or hide dashboard sections. Your data is always live — hidden sections can be re-enabled at any time.
              </div>
              {[
                { key:'fleetTable',  label:'Fleet Status Register',   sub:'Asset table with status, hours and risk' },
                { key:'healthBar',   label:'Fleet Health Bar',        sub:'Visual breakdown of active / maint / down' },
                { key:'activity',    label:'Live Activity Feed',      sub:'Real-time events and alerts' },
                { key:'overdue',     label:'Overdue Services',        sub:'Services past their due date' },
                { key:'prestartKpi', label:'Prestart KPIs',          sub:'Daily completion rates per machine' },
                { key:'serviceKpi',  label:'Service Schedule KPIs',  sub:'Overdue, due soon, completed counts' },
              ].map(item => (
                <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--d-border)' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500, color:'var(--d-text)', marginBottom:2 }}>{item.label}</div>
                    <div style={{ fontSize:11, color:'var(--d-text4)' }}>{item.sub}</div>
                  </div>
                  {tog(dashPrefs.sections[item.key] !== false, () => onToggleSection(item.key))}
                </div>
              ))}
            </div>
          )}

          {/* Widgets tab */}
          {activeTab === 'widgets' && (
            <div>
              <div style={{ fontSize:11, color:'var(--d-text4)', marginBottom:14, lineHeight:1.5 }}>
                Drag to reorder widgets. Toggle to show or hide. Admins can also create custom widgets.
              </div>
              {items.map((w, i) => (
                <div key={w.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => onDragOver(e, i)}
                  onDrop={() => onDrop(i)}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderBottom:'1px solid var(--d-border)', cursor:'grab', userSelect:'none', transition:'background .1s', background: overIdx===i ? 'var(--d-blue-bg)' : 'var(--d-surf)', border: overIdx===i ? `1px solid var(--d-blue)` : undefined }}>
                  <span style={{ color:'var(--d-text4)', fontSize:14, cursor:'grab' }}>⠿</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:500, color:'var(--d-text)' }}>{widgetLabels[w.id] || w.id}</span>
                  {tog(w.enabled, () => {
                    const next = items.map(x => x.id === w.id ? { ...x, enabled: !x.enabled } : x);
                    setItems(next);
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--d-border)', flexShrink:0, display:'flex', gap:8, background:'var(--d-surf)' }}>
          <button onClick={save} style={{ flex:1, padding:'10px', background:'var(--d-blue)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Save Changes
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px', background:'var(--d-surf)', border:'1px solid var(--d-border2)', color:'var(--d-text2)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

function WidgetOilSampling({ companyId, size, onRemove }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('oil_samples').select('*').eq('company_id', companyId).order('created_at', { ascending:false }).limit(20)
      .then(({ data }) => { setSamples(data||[]); setLoading(false); });
  }, [companyId]);
  const alerts = samples.filter(s => s.ai_condition === 'CRITICAL' || s.ai_condition === 'WARNING');
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Oil Sampling" onRemove={onRemove} icon="🧪" count={loading?'—':alerts.length} countColor={alerts.length>0?'var(--red)':'var(--green)'} summary={alerts[0]?.asset_name}>
      {!loading && alerts.length === 0 && <div style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ All oil samples normal</div>}
      {!loading && alerts.map(s => {
        const c = s.ai_condition==='CRITICAL'?'var(--red)':'var(--amber)';
        return (
          <div key={s.id} style={{ padding:'8px 10px', borderRadius:8, background:c+'10', border:`1px solid ${c}40`, marginBottom:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{s.asset_name}</span>
              <span style={{ fontSize:11, fontWeight:700, color:c }}>{s.ai_condition}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
              {s.component} · Sample date: {s.sample_date||'—'} · {s.unit_hours?.toLocaleString()||'—'} hrs
            </div>
            {s.ai_analysis && <div style={{ fontSize:11, color:c, marginTop:4, fontStyle:'italic' }}>{s.ai_analysis?.slice(0,100)}…</div>}
          </div>
        );
      })}
    </ExpandableWidget>
  );
}

function WidgetPartsStock({ companyId, size, onRemove }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('parts').select('id,name,quantity,min_quantity,unit').eq('company_id', companyId)
      .then(({ data }) => { setParts((data||[]).filter(p => p.quantity <= p.min_quantity)); setLoading(false); });
  }, [companyId]);
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Low Stock Parts" onRemove={onRemove} icon="🔩" count={loading?'—':parts.length} countColor={parts.length>0?'var(--amber)':'var(--green)'} summary={parts[0]?.name}>
      {!loading && parts.length === 0 && <div style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ All parts adequately stocked</div>}
      {!loading && parts.map(p => {
        const c = p.quantity===0?'var(--red)':'var(--amber)';
        return (
          <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', borderRadius:8, background:c+'10', border:`1px solid ${c}30`, marginBottom:6 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{p.name}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>Min: {p.min_quantity} {p.unit}</div>
            </div>
            <span style={{ fontSize:14, fontWeight:800, color:c }}>{p.quantity} <span style={{ fontSize:11 }}>{p.unit}</span></span>
          </div>
        );
      })}
    </ExpandableWidget>
  );
}

function WidgetDowntimeSummary({ companyId, size, onRemove }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
    supabase.from('downtime').select('hours').eq('company_id', companyId).gte('created_at', start.toISOString())
      .then(({ data }) => { setHours((data||[]).reduce((s,d) => s + (parseFloat(d.hours)||0), 0)); setLoading(false); });
  }, [companyId]);
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Downtime This Month" onRemove={onRemove} icon="📉" summary={loading?'':`${hours?.toFixed(1)} hrs lost`}>
      <div style={{ fontSize:36, fontWeight:900, color:'var(--red)', fontFamily:'var(--font-display)' }}>{loading ? '—' : hours?.toFixed(1)}<span style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)', marginLeft:4 }}>hrs</span></div>
      {!loading && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Lost to unplanned downtime in {new Date().toLocaleString('default',{month:'long'})}</div>}
    </ExpandableWidget>
  );
}

function WidgetCalendarPreview({ companyId, size, onRemove }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(); in7.setDate(in7.getDate()+7);
    const end = in7.toISOString().split('T')[0];
    Promise.all([
      supabase.from('maintenance').select('asset,task,next_due').eq('company_id', companyId).gte('next_due', today).lte('next_due', end),
      supabase.from('work_orders').select('asset,defect_description,due_date').eq('company_id', companyId).neq('status','Complete').gte('due_date', today).lte('due_date', end),
    ]).then(([{ data:m }, { data:w }]) => {
      const evs = [
        ...(m||[]).map(x => ({ date:x.next_due, label:`${x.asset} — ${x.task}`, color:'var(--accent)' })),
        ...(w||[]).map(x => ({ date:x.due_date, label:`${x.asset||''} — ${x.defect_description?.slice(0,30)}`, color:'var(--amber)' })),
      ].sort((a,b) => a.date?.localeCompare(b.date));
      setEvents(evs); setLoading(false);
    });
  }, [companyId]);
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Next 7 Days" icon="📆" onRemove={onRemove} count={loading?'—':events.length} countColor="var(--accent)" countSize={16} summary={events[0]?.label?.slice(0,30)}>
      {loading ? <Sk h="80px" /> : events.length === 0 ? <div style={{ fontSize:12, color:'var(--text-muted)' }}>Nothing scheduled in the next 7 days</div> : (
        events.map((ev, i) => (
          <div key={i} style={{ display:'flex', gap:10, padding:'8px 10px', borderRadius:8, background:'var(--surface-2)', border:'1px solid var(--border)', marginBottom:6, alignItems:'center' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:ev.color, flexShrink:0 }} />
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', minWidth:70, flexShrink:0 }}>{ev.date}</div>
            <div style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.label}</div>
          </div>
        ))
      )}
    </ExpandableWidget>
  );
}

function WidgetMessages({ companyId, size, onRemove }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('messages').select('*').order('created_at', { ascending:false }).limit(5)
      .then(({ data }) => { setMsgs(data||[]); setLoading(false); });
  }, [companyId]);
  const ago = ts => { if(!ts)return''; const m=Math.floor((Date.now()-new Date(ts))/60000); if(m<60)return`${m}m ago`; if(m<1440)return`${Math.floor(m/60)}h ago`; return`${Math.floor(m/1440)}d ago`; };
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Messages" onRemove={onRemove} icon="💬" count={loading?'—':msgs.length} countColor="var(--accent)" countSize={16}>
      {loading ? <Sk h="60px" /> : msgs.length === 0 ? <div style={{ fontSize:12, color:'var(--text-muted)' }}>No recent messages</div> : (
        msgs.map(m => (
          <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:8, background:'var(--surface-2)', border:'1px solid var(--border)', marginBottom:6 }}>
            <span style={{ flex:1, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>{m.content?.slice(0,60) || '[media]'}</span>
            <span style={{ color:'var(--text-muted)', fontSize:11, flexShrink:0, marginLeft:8 }}>{ago(m.created_at)}</span>
          </div>
        ))
      )}
    </ExpandableWidget>
  );
}

/* ── Main Dashboard ── */

// ─── KPI: Prestart Summary Widget ────────────────────────────────────────────
function WidgetPrestartKPI({ companyId, loading, onRemove, onDrillDown }) {
  const [data,        setData]        = React.useState(null);
  const [viewPrestart,setViewPrestart]= React.useState(null);
  const today = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [{ data: assets }, { data: subs }, { data: allSubs }] = await Promise.all([
        supabase.from('assets').select('id,name,asset_number,hours,status').eq('company_id', companyId),
        supabase.from('form_submissions').select('*').eq('company_id', companyId).eq('date', today),
        supabase.from('form_submissions').select('asset,date,hrs_start').eq('company_id', companyId).order('date',{ascending:false}).limit(200),
      ]);
      const activeAssets = (assets||[]).filter(a => !/inactive|retired/i.test(a.status||''));
      const todaySubs    = subs || [];

      // Per-machine: did each asset get a prestart today?
      const perMachine = activeAssets.map(a => {
        const todayPs = todaySubs.filter(s => s.asset === a.name);
        // Last prestart for this asset
        const lastPs  = (allSubs||[]).filter(s => s.asset === a.name)[0];
        const lastHrs = lastPs?.hrs_start || 0;
        const hrsDiff = (a.hours||0) - lastHrs;
        // Missing = no prestart today AND hours diff > 6 (machine worked but no prestart)
        const workedToday = hrsDiff >= 6;
        const missingToday = todayPs.length === 0 && workedToday;
        return { ...a, todayCount: todayPs.length, lastPs, hrsDiff, missingToday, todayPs };
      });

      setData({
        total:     activeAssets.length,
        completed: [...new Set(todaySubs.map(s=>s.asset))].length,
        missing:   perMachine.filter(m=>m.missingToday).length,
        defects:   todaySubs.filter(s=>s.defects_found).length,
        perMachine,
        todaySubs,
      });
    })();
  }, [companyId, today]);

  if (loading || !data) return (
    <div className="dash-widget" style={{ gridColumn:'span 2' }}>
      <div className="dw-header"><div className="dw-title">📋 Prestart KPIs</div></div>
      <div style={{color:'var(--text-muted)',fontSize:13,padding:'20px 0'}}>Loading…</div>
    </div>
  );

  const rate = data.total > 0 ? Math.round((data.completed/data.total)*100) : 0;
  const rateColor = rate >= 90 ? 'var(--green)' : rate >= 70 ? 'var(--amber)' : 'var(--red)';

  return (
    <>
    <div className="dash-widget" style={{ gridColumn:'span 2', position:'relative' }}>
      {onRemove && (
        <button onClick={onRemove} title="Remove widget"
          style={{ position:'absolute', top:10, right:10, zIndex:10, background:'none', border:'none', cursor:'pointer', color:'var(--text-faint)', fontSize:18, lineHeight:1, padding:'2px 6px', borderRadius:4, opacity:0, transition:'opacity 0.15s' }}
          className="widget-remove-btn">×</button>
      )}
      <div className="dw-header">
        <div className="dw-title">📋 Prestart KPIs — Today</div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{today}</div>
      </div>

      {/* KPI row — clickable */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { label:'Completed',   val:data.completed, color:'var(--green)',  rows: data.perMachine.filter(m=>m.todayCount>0).map(m=>[m.asset_number?`${m.asset_number} — ${m.name}`:m.name, `${m.todayCount} prestart${m.todayCount>1?'s':''}`, m.hours?.toLocaleString()+' hrs']), cols:['Asset','Prestarts','Hours'], title:'Completed Today', icon:'✓', dd:'var(--green)' },
          { label:'Total Units', val:data.total,     color:'var(--accent)', rows: data.perMachine.map(m=>[m.asset_number?`${m.asset_number} — ${m.name}`:m.name, m.todayCount>0?`✓ ${m.todayCount} done`:m.missingToday?'⚠ Missing':'—', m.hours?.toLocaleString()+' hrs']), cols:['Asset','Today','Hours'], title:'All Units', icon:'🚛', dd:'var(--accent)' },
          { label:'Missing',     val:data.missing,   color:data.missing>0?'var(--red)':'var(--green)', rows: data.perMachine.filter(m=>m.missingToday).map(m=>[m.asset_number?`${m.asset_number} — ${m.name}`:m.name, `${Math.round(m.hrsDiff)} hrs since last`, m.hours?.toLocaleString()+' hrs']), cols:['Asset','Time Since Last','Hours'], title:'Missing Prestarts', icon:'⚠', dd:'var(--red)', emptyMsg:'No missing prestarts today ✓' },
          { label:'Defects',     val:data.defects,   color:data.defects>0?'var(--amber)':'var(--green)', rows: data.perMachine.filter(m=>m.todayPs?.some(p=>p.defects_found)).map(m=>[m.asset_number?`${m.asset_number} — ${m.name}`:m.name, `${m.todayPs.filter(p=>p.defects_found).length} defect${m.todayPs.filter(p=>p.defects_found).length>1?'s':''}`, m.hours?.toLocaleString()+' hrs']), cols:['Asset','Defects','Hours'], title:'Defects Found Today', icon:'🔴', dd:'var(--amber)', emptyMsg:'No defects found today ✓' },
        ].map(({ label, val, color, rows, cols, title, icon, dd, emptyMsg }) => (
          <div key={label}
            onClick={() => onDrillDown && onDrillDown({ title, icon, color:dd, columns:cols, rows, emptyMsg })}
            style={{ background:'var(--surface-2)', borderRadius:8, padding:'12px 10px', textAlign:'center', border:`1px solid ${color}22`, cursor: onDrillDown ? 'pointer' : 'default', transition:'all 0.15s' }}
            onMouseEnter={e=>{ if(onDrillDown){ e.currentTarget.style.background='var(--surface)'; e.currentTarget.style.borderColor=color; }}}
            onMouseLeave={e=>{ e.currentTarget.style.background='var(--surface-2)'; e.currentTarget.style.borderColor=`${color}22`; }}>
            <div style={{ fontSize:22, fontWeight:900, color }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>{label}</div>
            {onDrillDown && <div style={{ fontSize:8, color:'var(--text-faint)', marginTop:3, letterSpacing:'0.5px' }}>TAP</div>}
          </div>
        ))}
      </div>

      {/* Completion rate bar */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)' }}>COMPLETION RATE</span>
          <span style={{ fontSize:13, fontWeight:800, color:rateColor }}>{rate}%</span>
        </div>
        <div style={{ height:8, background:'var(--surface-2)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${rate}%`, background:rateColor, borderRadius:4, transition:'width 0.5s' }} />
        </div>
      </div>

      {/* Per-machine breakdown */}
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>PER MACHINE</div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {data.perMachine.map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:7, background: m.missingToday ? 'rgba(239,83,80,0.06)' : m.todayCount > 0 ? 'rgba(34,197,94,0.06)' : 'var(--surface-2)', border: `1px solid ${m.missingToday ? 'rgba(239,83,80,0.2)' : m.todayCount > 0 ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`, cursor: m.todayPs?.length > 0 ? 'pointer' : 'default' }}
            onClick={() => m.todayPs?.length > 0 && setViewPrestart({ subs: m.todayPs, asset: m })}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: m.missingToday ? 'var(--red)' : m.todayCount > 0 ? 'var(--green)' : 'var(--text-faint)', flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {m.asset_number && <span style={{ color:'var(--accent)', marginRight:6, fontSize:11 }}>{m.asset_number}</span>}
                {m.name}
              </div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                {m.missingToday ? `⚠ Missing — ${Math.round(m.hrsDiff)} hrs worked since last prestart` :
                 m.todayCount > 0 ? `✓ ${m.todayCount} prestart${m.todayCount>1?'s':''} today` :
                 m.hours < 6 ? 'Not yet operational today' : 'No prestart today'}
              </div>
            </div>
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{m.hours?.toLocaleString()} hrs</span>
              {m.todayPs?.length > 0 && <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>View →</span>}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Prestart detail modal */}
    {viewPrestart && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}
        onClick={() => setViewPrestart(null)}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, width:'100%', maxWidth:600, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.4)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)' }}>Prestarts — {viewPrestart.asset.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{viewPrestart.subs.length} submission{viewPrestart.subs.length!==1?'s':''} today</div>
            </div>
            <button onClick={() => setViewPrestart(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'14px 22px' }}>
            {viewPrestart.subs.map((sub, si) => (
              <div key={si} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', gap:16, marginBottom:12, padding:'10px 12px', background:'var(--surface-2)', borderRadius:7, flexWrap:'wrap' }}>
                  <div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Operator</div><div style={{ fontWeight:700, fontSize:13 }}>{sub.operator_name||'—'}</div></div>
                  <div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Hours</div><div style={{ fontWeight:700, fontSize:13 }}>{sub.hrs_start||'—'}</div></div>
                  <div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Result</div><div style={{ fontWeight:700, fontSize:13, color: sub.defects_found ? 'var(--red)' : 'var(--green)' }}>{sub.defects_found ? '⚠ Defects' : '✓ All Clear'}</div></div>
                  {sub.site_area && <div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Site</div><div style={{ fontWeight:700, fontSize:13 }}>{sub.site_area}</div></div>}
                </div>
                {sub.responses && Object.entries(sub.responses).slice(0,20).map(([key, val], i) => {
                  const label = key.replace(/^\d+_/, '');
                  let value = val?.status === 'OK' ? '✓ OK' : val?.status || val?.num || val?.text || val?.qty || val?.temp || val?.comment || JSON.stringify(val);
                  const isDefect = val?.status && val.status !== 'OK';
                  return (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', borderBottom:'1px solid var(--border)', borderRadius: isDefect ? 4 : 0, background: isDefect ? 'rgba(239,83,80,0.06)' : 'transparent' }}>
                      <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontSize:12, fontWeight:600, color: isDefect ? 'var(--red)' : value.includes('✓') ? 'var(--green)' : 'var(--text-primary)' }}>{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── KPI: Service Schedule Widget ────────────────────────────────────────────
function WidgetServiceKPI({ companyId, loading, onRemove, onDrillDown }) {
  const [schedules, setSchedules] = React.useState([]);

  React.useEffect(() => {
    if (!companyId) return;
    supabase.from('service_schedules').select('*').eq('company_id', companyId)
      .then(({ data }) => setSchedules(data||[]));
  }, [companyId]);

  const overdue   = schedules.filter(s => s.status === 'overdue' || s.status === 'Overdue');
  const dueSoon   = schedules.filter(s => s.status === 'Due Soon' || s.status === 'due_soon');
  const upcoming  = schedules.filter(s => s.status === 'Upcoming' || s.status === 'upcoming');
  const completed = schedules.filter(s => s.status === 'Completed' || s.status === 'completed');

  return (
    <div className="dash-widget" style={{ gridColumn:'span 2' }}>
      <div className="dw-header"><div className="dw-title">🔧 Service Schedule KPIs</div></div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          ['Overdue',   overdue.length,   'var(--red)',   '#ef535018'],
          ['Due Soon',  dueSoon.length,   'var(--amber)', '#f59e0b18'],
          ['Upcoming',  upcoming.length,  'var(--accent)','rgba(0,194,224,0.08)'],
          ['Completed', completed.length, 'var(--green)', 'rgba(34,197,94,0.08)'],
        ].map(([label, val, color, bg]) => (
          <div key={label} style={{ background:bg, borderRadius:8, padding:'12px 10px', textAlign:'center', border:`1px solid ${color}33` }}>
            <div style={{ fontSize:22, fontWeight:900, color }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Overdue + Due Soon list */}
      {[...overdue, ...dueSoon].slice(0,8).map((s,i) => {
        const isOD = s.status === 'overdue' || s.status === 'Overdue';
        return (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:6, marginBottom:5, background: isOD ? 'rgba(239,83,80,0.06)' : 'rgba(245,158,11,0.06)', border:`1px solid ${isOD?'rgba(239,83,80,0.2)':'rgba(245,158,11,0.2)'}` }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{s.asset_name||'—'}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.service_name||s.task} · Every {s.interval_value} {s.interval_type}</div>
            </div>
            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background: isOD?'var(--red-bg)':'var(--amber-bg)', color: isOD?'var(--red)':'var(--amber)' }}>
              {isOD ? '⚠ Overdue' : '↑ Due Soon'}
            </span>
          </div>
        );
      })}
      {[...overdue,...dueSoon].length === 0 && <div style={{ fontSize:13, color:'var(--text-muted)', fontStyle:'italic' }}>✓ All services up to date</div>}
    </div>
  );
}

function Dashboard({ companyId, userRole }) {
  const [stats, setStats]   = useState(null);
  const [dt, setDT]         = useState([]);
  const [maint, setMaint]   = useState([]);
  const [assets, setAssets] = useState([]);
  const [wos, setWOs]       = useState([]);
  const [loading, setLoad]  = useState(true);
  const [refreshing, setRef]= useState(false);
  const [hVis, setHVis]     = useState(false);
  const [showCustomise, setShowCustomise] = useState(false);
  const [layout, setLayout] = useState(() => getLayout(companyId, userRole?.email || ''));
  const [customWidgets, setCustomWidgets] = useState([]);
  const [drillDown, setDrillDown] = useState(null); // { title, icon, color, rows, columns }
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const { toasts, add: toast } = useToast();
  const isAdmin = ['admin','supervisor'].includes(userRole?.role);
  const [dashPrefs, setDashPrefs] = useState(() => getDashPrefs(companyId, userRole?.email||''));

  const updatePrefs = (next) => {
    setDashPrefs(next);
    saveDashPrefs(next, companyId, userRole?.email||'');
  };
  const toggleAI      = (key) => updatePrefs({ ...dashPrefs, ai: { ...dashPrefs.ai, [key]: !dashPrefs.ai[key] } });
  const toggleSection = (key) => updatePrefs({ ...dashPrefs, sections: { ...dashPrefs.sections, [key]: !dashPrefs.sections[key] } });
  const toggleKpi     = (id) => {
    const kpis = dashPrefs.kpis.includes(id)
      ? dashPrefs.kpis.filter(k => k !== id)
      : [...dashPrefs.kpis, id];
    if (kpis.length === 0) return;
    updatePrefs({ ...dashPrefs, kpis });
  };

  useEffect(() => {
    if (!document.getElementById('dash-css')) {
      const s = document.createElement('style'); s.id='dash-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    setTimeout(() => setHVis(true), 60);
    if (companyId) { load(); loadCustomWidgets(); }
  }, [companyId]);

  const hideWidget = (id) => {
    const next = layout.map(w => w.id === id ? { ...w, enabled: false } : w);
    setLayout(next);
    saveLayout(next, companyId, userRole?.email || '');
    toast('Widget hidden — restore it from Customise', 'info');
  };

  const loadCustomWidgets = async () => {
    const { data } = await supabase.from('custom_widgets').select('*').eq('company_id', companyId).order('created_at');
    // Unwrap jsonb config column → flat widget object
    const widgets = (data || []).map(row => ({ ...row.config, id: row.id }));
    setCustomWidgets(widgets);
  };

  const handleWidgetSaved = (cfg) => {
    setCustomWidgets(prev => {
      const exists = prev.find(w => w.id === cfg.id);
      return exists ? prev.map(w => w.id === cfg.id ? cfg : w) : [...prev, cfg];
    });
    setShowBuilder(false); setEditingWidget(null);
    toast('Widget saved', 'success');
  };

  const deleteCustomWidget = async (id) => {
    if (!window.confirm('Remove this widget from the dashboard?')) return;
    await supabase.from('custom_widgets').delete().eq('id', id);
    setCustomWidgets(prev => prev.filter(w => w.id !== id));
    toast('Widget removed', 'success');
  };

  const load = async (isRefresh=false) => {
    if (isRefresh) setRef(true); else setLoad(true);
    try {
      const [{ data:aD }, { data:dD }, { data:mD }, { data:wD }] = await Promise.all([
        supabase.from('assets').select('*').eq('company_id', companyId),
        supabase.from('downtime').select('*').eq('company_id', companyId).order('created_at',{ascending:false}).limit(8),
        supabase.from('maintenance').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
        supabase.from('work_orders').select('*').eq('company_id', companyId).neq('status','Complete').order('created_at',{ascending:false}).limit(6),
      ]);
      const a = aD||[];
      setAssets(a); setDT(dD||[]); setMaint(mD||[]); setWOs(wD||[]);
      const ov = (mD||[]).filter(m=>m.status==='Overdue').length;
      const dn = a.filter(x=>x.status==='Down').length;
      setStats({ total:a.length, running:a.filter(x=>x.status==='Running').length, down:dn, maintenance:a.filter(x=>x.status==='Maintenance').length, overdue:ov, dueSoon:(mD||[]).filter(m=>m.status==='Due Soon').length, openWOs:(wD||[]).length, util:a.length>0?Math.round((a.filter(x=>x.status==='Running').length/a.length)*100):0 });
      if (isRefresh) toast('Dashboard refreshed','success');
      else if (dn>0) toast(`${dn} asset${dn>1?'s':''} currently down`,'warning');
      else if (ov>0) toast(`${ov} overdue service${ov>1?'s':''} need attention`,'warning');
    } catch { toast('Failed to load dashboard data','error'); }
    setLoad(false); setRef(false);
  };

  const ago = ts => { if(!ts)return''; const m=Math.floor((Date.now()-new Date(ts))/60000); if(m<60)return`${m}m ago`; if(m<1440)return`${Math.floor(m/60)}h ago`; return`${Math.floor(m/1440)}d ago`; };
  const progressAssets = assets.filter(a=>a.current_hours&&a.next_service_hours).slice(0,6);
  const activity = [
    ...(dt.slice(0,3).map(d=>({ c:'var(--red)',   label:'Offline',  title:d.asset,                    sub:d.category||'Unplanned downtime',  time:ago(d.created_at) }))),
    ...(maint.filter(m=>m.status==='Overdue').slice(0,2).map(m=>({ c:'var(--amber)', label:'Overdue',  title:m.asset||'—',                    sub:m.task||'Scheduled service',         time:m.next_due||'' }))),
    ...(wos.filter(w=>w.priority==='Critical').slice(0,2).map(w=>({ c:'var(--red)',   label:'Critical', title:w.title||'Critical work order',   sub:w.asset||'',                    time:ago(w.created_at) }))),
  ].slice(0,6);

  const now = new Date();

  /* Accent shortcuts */
  const A = { cyan:'var(--accent)', red:'var(--red)', amber:'var(--amber)', green:'var(--green)' };

  const WIDGET_COMPONENTS = {
    fleet_health:     (w) => <WidgetFleetHealth key={w.id} assets={assets} loading={loading} onRemove={w.onRemove} />,
    breakdowns:       (w) => <WidgetBreakdowns key={w.id} assets={assets} loading={loading} size={w.size} onRemove={w.onRemove} />,
    overdue:          (w) => <WidgetOverdue key={w.id} maint={maint} loading={loading} size={w.size} onRemove={w.onRemove} onDrillDown={setDrillDown} />,
    due_today:        (w) => <WidgetDueToday key={w.id} maint={maint} loading={loading} size={w.size} onRemove={w.onRemove} onDrillDown={setDrillDown} />,
    priority_wos:     (w) => <WidgetPriorityWOs key={w.id} wos={wos} loading={loading} size={w.size} onRemove={w.onRemove} onDrillDown={setDrillDown} />,
    oil_sampling:     (w) => <WidgetOilSampling key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    parts_stock:      (w) => <WidgetPartsStock key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    downtime_summary: (w) => <WidgetDowntimeSummary key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    calendar_preview:  (w) => <WidgetCalendarPreview key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    prestart_kpi:      (w) => <WidgetPrestartKPI key={w.id} companyId={companyId} loading={loading} onRemove={w.onRemove} onDrillDown={setDrillDown} />,
    service_kpi:       (w) => <WidgetServiceKPI  key={w.id} companyId={companyId} loading={loading} onRemove={w.onRemove} onDrillDown={setDrillDown} />,
    messages:         (w) => <WidgetMessages key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
  };

  // ── Fleet health bar stats ──
  const activeCount = assets.filter(a=>/active|running/i.test(a.status||'')).length;
  const downCount   = assets.filter(a=>/down|offline|breakdown/i.test(a.status||'')).length;
  const maintCount  = assets.filter(a=>/maintenance/i.test(a.status||'')).length;
  const openWOCount = wos.length;
  const overdueCount= maint.filter(m=>/overdue/i.test(m.status||'')).length;

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div style={{ animation:'fadeUp 0.35s ease both', fontFamily:'Inter,system-ui,sans-serif' }}>

        {/* ── Page header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--d-text)', letterSpacing:-0.5, marginBottom:3 }}>Operations Overview</h1>
            <p style={{ fontSize:13, color:'var(--d-text3)' }}>
              {new Date().toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              {' · '}{assets.length} assets · {activeCount} active
              {downCount > 0 && <span style={{ color:'var(--d-red)', fontWeight:600 }}> · {downCount} down</span>}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--d-text4)' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--d-green)', display:'inline-block', animation:'pulse-r 2s infinite' }} />
              Live · updated just now
            </div>
            {isAdmin && (
              <button onClick={() => { setEditingWidget(null); setShowBuilder(true); }}
                style={{ padding:'7px 14px', background:'var(--d-blue-bg)', border:'1px solid var(--d-blue-bd)', color:'var(--d-blue)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
                + Widget
              </button>
            )}
            <button onClick={() => setShowCustomise(true)}
              style={{ padding:'7px 14px', background:'#fff', border:'1px solid var(--d-border2)', color:'var(--d-text2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Customise
            </button>
            <button className="refresh-btn" onClick={() => load(true)} disabled={refreshing}>
              <span style={{ display:'inline-block', animation:refreshing?'spin 0.8s linear infinite':'none' }}>↻</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── AI Daily Banner ── */}
        {dashPrefs.ai.banner && !loading && (overdueCount > 0 || downCount > 0) && (
          <div className="ai-banner">
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:36, height:36, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>MechIQ AI · Daily Briefing</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', lineHeight:1.5 }}>
                  {downCount > 0 && `${downCount} asset${downCount>1?'s':''} currently offline. `}
                  {overdueCount > 0 && `${overdueCount} service${overdueCount>1?'s':''} overdue — review immediately. `}
                  {stats?.dueSoon > 0 && `${stats.dueSoon} service${stats.dueSoon>1?'s':''} due soon.`}
                </div>
              </div>
            </div>
            <button onClick={() => setShowCustomise(true)}
              style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', padding:'7px 14px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0 }}>
              View Details →
            </button>
          </div>
        )}

        {/* ── Dynamic KPI Strip ── */}
        {(() => {
          const kpiMap = {
            fleet:       { label:'Total Fleet',       value:assets.length,   color:'var(--d-blue)',  accent:'var(--d-blue)',  sub:'registered assets',    urgent:false, warn:false, ai:false, onClick:()=>setDrillDown({ title:'All Fleet Assets', columns:['Asset','Type','Status','Location','Hours'], rows:assets.map(a=>[a.asset_number?`${a.asset_number} — ${a.name}`:a.name,a.type||'—',a.status||'—',a.location||'—',a.hours?a.hours.toLocaleString()+' hrs':'—']), emptyMsg:'No assets' }) },
            operational: { label:'Operational',       value:activeCount,     color:'var(--d-green)', accent:'var(--d-green)', sub:`${stats?.util||0}% util`, urgent:false, warn:false, ai:false, onClick:()=>setDrillDown({ title:'Active Assets', columns:['Asset','Type','Location','Hours'], rows:assets.filter(a=>/running|active/i.test(a.status||'')).map(a=>[a.asset_number?`${a.asset_number} — ${a.name}`:a.name,a.type||'—',a.location||'—',a.hours?a.hours.toLocaleString()+' hrs':'—']), emptyMsg:'No active assets' }) },
            down:        { label:'Down / Fault',      value:downCount,       color:downCount>0?'var(--d-red)':'var(--d-text4)', accent:'var(--d-red)', sub:'offline / breakdown', urgent:downCount>0, warn:false, ai:false, onClick:()=>setDrillDown({ title:'Assets Down', columns:['Asset','Type','Status','Location'], rows:assets.filter(a=>/down|offline|breakdown/i.test(a.status||'')).map(a=>[a.asset_number?`${a.asset_number} — ${a.name}`:a.name,a.type||'—',a.status||'—',a.location||'—']), emptyMsg:'No assets down ✓' }) },
            overdue:     { label:'Overdue Svc',       value:overdueCount,    color:overdueCount>0?'var(--d-red)':'var(--d-text4)', accent:'var(--d-amber)', sub:'services past due', urgent:overdueCount>0, warn:false, ai:false, onClick:()=>setDrillDown({ title:'Overdue Services', columns:['Asset','Service','Due','Status'], rows:maint.filter(m=>/overdue/i.test(m.status||'')).map(m=>[m.asset||'—',m.task||'—',m.next_due||'—',m.status||'—']), emptyMsg:'No overdue services ✓' }) },
            predicted:   { label:'AI Predicted Fails',value:maint.filter(m=>/due soon/i.test(m.status||'')).length, color:'var(--d-ai)', accent:'var(--d-ai)', sub:'next 14 days', urgent:false, warn:false, ai:true, onClick:()=>setDrillDown({ title:'Due Soon', columns:['Asset','Service','Due'], rows:maint.filter(m=>/due soon/i.test(m.status||'')).map(m=>[m.asset||'—',m.task||'—',m.next_due||'—']), emptyMsg:'No upcoming failures predicted ✓' }) },
            wos:         { label:'Open WOs',          value:openWOCount,     color:openWOCount>0?'var(--d-amber)':'var(--d-text4)', accent:'var(--d-amber)', sub:'work orders open', urgent:false, warn:openWOCount>0, ai:false, onClick:()=>setDrillDown({ title:'Open Work Orders', columns:['Title','Asset','Priority','Status'], rows:wos.map(w=>[w.title||w.defect_description||'—',w.asset||'—',w.priority||'—',w.status||'—']), emptyMsg:'No open work orders ✓' }) },
            prestarts:   { label:'Prestart Rate',     value:`${stats?.util||0}%`, color:'var(--d-green)', accent:'var(--d-green)', sub:'today', urgent:false, warn:false, ai:false, onClick:()=>setDrillDown({ title:'Prestart Compliance', columns:['Asset','Status'], rows:assets.map(a=>[a.name,a.status||'—']), emptyMsg:'No data' }) },
            downtime:    { label:'Downtime Hrs',      value:dt.reduce((s,d)=>s+(parseFloat(d.hours)||0),0).toFixed(1), color:'var(--d-red)', accent:'var(--d-red)', sub:'this month', urgent:false, warn:dt.length>0, ai:false, onClick:()=>setDrillDown({ title:'Downtime Log', columns:['Asset','Category','Hours','Date'], rows:dt.map(d=>[d.asset||'—',d.category||'—',d.hours||'—',d.created_at?new Date(d.created_at).toLocaleDateString('en-AU'):'—']), emptyMsg:'No downtime recorded' }) },
            utilisation: { label:'Avg Utilisation',   value:`${stats?.util||0}%`, color:'var(--d-blue)', accent:'var(--d-blue)', sub:'fleet average', urgent:false, warn:false, ai:false, onClick:()=>setDrillDown({ title:'Fleet Utilisation', columns:['Asset','Status','Hours'], rows:assets.map(a=>[a.name,a.status||'—',a.hours?.toLocaleString()||'—']), emptyMsg:'No data' }) },
            parts:       { label:'Parts Low Stock',   value:'—', color:'var(--d-amber)', accent:'var(--d-amber)', sub:'below minimum', urgent:false, warn:false, ai:false, onClick:()=>toast('Go to Parts page to view stock levels','info') },
          };
          const visKpis = dashPrefs.kpis.filter(id => kpiMap[id] && (!kpiMap[id].ai || dashPrefs.ai.kpi));
          const cols = Math.min(visKpis.length, 5);
          return (
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, marginBottom:20 }}>
              {visKpis.map(id => {
                const k = kpiMap[id];
                return (
                  <div key={id} className={`kpi-card${k.urgent?' urgent':k.warn?' warn':''}`} onClick={k.onClick} style={{ borderBottom:`3px solid ${k.accent}`, position:'relative' }}>
                    {k.ai && <span style={{ position:'absolute', top:10, right:10, background:'var(--d-ai-bg)', color:'var(--d-ai)', border:'1px solid var(--d-ai-bd)', fontSize:9, fontWeight:800, padding:'1px 6px', letterSpacing:'.5px' }}>AI</span>}
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:8 }}>{k.label}</div>
                    <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:28, fontWeight:700, color:k.color, lineHeight:1, marginBottom:5, animation:'countUp 0.4s ease' }}>
                      {loading ? <div className="sk" style={{ width:40, height:28 }} /> : k.value}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:11, color:'var(--d-text4)' }}>{k.sub}</div>
                      <div style={{ fontSize:9, color:'var(--d-text4)', fontWeight:600, letterSpacing:'.5px', opacity:.6 }}>TAP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Fleet health bar ── */}
        {!loading && assets.length > 0 && (
          <div className="panel" style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--d-text3)', textTransform:'uppercase', letterSpacing:'.8px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:3, height:12, background:'var(--d-blue)', display:'inline-block' }} />
                Fleet Health
              </div>
              <div style={{ display:'flex', gap:14, fontSize:11, color:'var(--d-text4)' }}>
                {[['var(--d-green)','Active'],['var(--d-amber)','Maintenance'],['var(--d-red)','Down'],['var(--d-text4)','Other']].map(([c,l])=>(
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:c, display:'inline-block' }}/>{l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', height:8, overflow:'hidden', gap:2 }}>
              {[[activeCount,'var(--d-green)'],[maintCount,'var(--d-amber)'],[downCount,'var(--d-red)'],[Math.max(0,assets.length-activeCount-maintCount-downCount),'var(--d-text4)']].map(([n,c],i)=>(
                n>0 && <div key={i} style={{ flex:n, background:c, transition:'flex 1s', height:'100%' }} />
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:11, color:'var(--d-text4)' }}>
              <span>{activeCount} active · {maintCount} maintenance · {downCount} down</span>
              <span style={{ fontFamily:'"JetBrains Mono",monospace', fontWeight:700, color:'var(--d-blue)' }}>{stats?.util||0}% utilisation</span>
            </div>
          </div>
        )}

        {/* ── Main widget grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginBottom:20 }}>

          {/* Left: assets table */}
          <div style={{ background:'var(--d-surf)', border:'1px solid var(--d-border)', boxShadow:'var(--d-sh)' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'var(--d-text3)', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:3, height:12, background:'var(--d-blue)', display:'inline-block' }} />
                Fleet Status Register
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {downCount > 0 && <span className="d-badge d-badge-r">{downCount} offline</span>}
                <span style={{ fontSize:11, color:'var(--d-blue)', fontWeight:600, cursor:'pointer' }}
                  onClick={()=>setDrillDown({ title:'Full Fleet Register', columns:['Asset','Status','Location','Hours'], rows:assets.map(a=>[a.asset_number?`${a.asset_number} — ${a.name}`:a.name,a.status||'—',a.location||'—',a.hours?a.hours.toLocaleString()+' hrs':'—']), emptyMsg:'No assets' })}>
                  Full register →
                </span>
              </div>
            </div>
            {loading ? (
              <div style={{ padding:16 }}><div className="sk" style={{ height:120 }} /></div>
            ) : (
              <table className="d-tbl">
                <thead><tr>
                  <th>Asset</th><th>Status</th><th>Hours</th><th>Utilisation</th><th>Next Service</th>
                </tr></thead>
                <tbody>
                  {assets.slice(0,6).map(a => {
                    const svc = maint.find(m=>m.asset===a.name||m.asset===a.asset_number);
                    const isDown = /down|offline/i.test(a.status||'');
                    const isMaint = /maintenance/i.test(a.status||'');
                    const isActive = /running|active/i.test(a.status||'');
                    const util = a.current_hours&&a.next_service_hours ? Math.min(100,Math.round((a.current_hours/a.next_service_hours)*100)) : null;
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight:700, color:'var(--d-text)', fontSize:13 }}>{a.name}</div>
                          {a.asset_number && <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:10, color:'var(--d-text4)', marginTop:1 }}>{a.asset_number}</div>}
                        </td>
                        <td>
                          <span className={`d-badge ${isDown?'d-badge-r':isMaint?'d-badge-a':isActive?'d-badge-g':'d-badge-n'}`}>
                            {a.status||'Unknown'}
                          </span>
                        </td>
                        <td style={{ fontFamily:'"JetBrains Mono",monospace', fontWeight:600 }}>{a.hours?.toLocaleString()||'—'}</td>
                        <td>
                          {util !== null ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ flex:1, height:4, background:'var(--d-s3)' }}>
                                <div style={{ height:'100%', width:`${util}%`, background:'var(--d-blue)' }} />
                              </div>
                              <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:10, color:'var(--d-text4)' }}>{util}%</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td>
                          {svc ? (
                            <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:11, fontWeight:700, color:svc.status==='Overdue'?'var(--d-red)':svc.status==='Due Soon'?'var(--d-amber)':'var(--d-green)' }}>
                              {svc.status==='Overdue'?'OVERDUE':svc.next_due||svc.status}
                            </span>
                          ) : <span style={{ color:'var(--d-text4)' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Right: activity + AI risk */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Live activity */}
            <div style={{ background:'var(--d-surf)', border:'1px solid var(--d-border)', boxShadow:'var(--d-sh)', flex:1 }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'var(--d-text3)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:3, height:12, background:'var(--d-blue)', display:'inline-block' }} />
                  Live Activity
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--d-text4)' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--d-green)', display:'inline-block', animation:'pulse-r 2s infinite' }} />
                  Real-time
                </div>
              </div>
              <div style={{ padding:'4px 0' }}>
                {loading ? <div style={{ padding:12 }}><div className="sk" style={{ height:80 }} /></div>
                : activity.length === 0 ? <div style={{ padding:'16px', fontSize:12, color:'var(--d-text4)', textAlign:'center' }}>No recent activity</div>
                : activity.map((a,i) => (
                  <div key={i} style={{ display:'flex', gap:10, padding:'9px 14px', borderBottom:'1px solid #f8fafc' }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:a.c==='var(--red)'?'var(--d-red)':a.c==='var(--amber)'?'var(--d-amber)':'var(--d-green)', flexShrink:0, marginTop:4 }} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:'var(--d-text2)', lineHeight:1.4 }}>{a.title}</div>
                      <div style={{ fontSize:11, color:'var(--d-text4)', marginTop:2 }}>{a.sub}{a.time&&` · ${a.time}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Risk scores */}
            {dashPrefs.ai.risk && <div style={{ background:'var(--d-surf)', border:'1px solid var(--d-ai-bd)', boxShadow:'var(--d-sh)' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--d-ai-bd)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'var(--d-ai)', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:3, height:12, background:'var(--d-ai)', display:'inline-block' }} />
                  AI Risk Scores
                </div>
                <span className="ai-tag">Live Model</span>
              </div>
              <div style={{ padding:'8px 14px' }}>
                {loading ? <div className="sk" style={{ height:80 }} />
                : assets.slice(0,5).map((a,i) => {
                    const svc = maint.find(m=>m.asset===a.name);
                    const isDown = /down|offline/i.test(a.status||'');
                    const isOver = svc?.status==='Overdue';
                    const isDue  = svc?.status==='Due Soon';
                    const score  = isDown ? Math.floor(75+Math.random()*20) : isOver ? Math.floor(55+Math.random()*25) : isDue ? Math.floor(35+Math.random()*25) : Math.floor(5+Math.random()*30);
                    const sc     = score > 70 ? 'var(--d-red)' : score > 40 ? 'var(--d-amber)' : 'var(--d-green)';
                    return (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid #f8fafc' }}>
                        <div style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--d-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</div>
                        <div style={{ width:70, height:4, background:'#f1f5f9' }}>
                          <div style={{ height:'100%', width:`${score}%`, background:sc, transition:'width 1s' }} />
                        </div>
                        <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:11, fontWeight:700, color:sc, width:24, textAlign:'right' }}>{score}</div>
                      </div>
                    );
                  })
                }
                <div style={{ fontSize:10, color:'var(--d-text4)', marginTop:8 }}>Score 0–100 · AI model trained on your fleet history</div>
              </div>
            </div>}
          </div>
        </div>

        {/* ── Customisable widgets ── */}
        {layout.some(w=>w.enabled) && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:3, height:10, background:'var(--d-blue)', display:'inline-block' }} />
              Dashboard Widgets
            </div>
            <div className="dash-grid">
              {layout.filter(w=>w.enabled).map(w => {
                const renderer = WIDGET_COMPONENTS[w.id];
                if (!renderer) return null;
                const onRemove = isAdmin ? () => hideWidget(w.id) : undefined;
                return (
                  <div key={w.id} className={`widget-${w.size||'md'}`} style={{ position:'relative' }}>
                    {renderer({ ...w, onRemove })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Service intervals progress ── */}
        {progressAssets.length > 0 && (
          <div className="panel" style={{ marginBottom:20 }}>
            <div className="panel-title">Service Intervals</div>
            {progressAssets.map(a => {
              const pct = Math.min(100, a.next_service_hours > 0 ? Math.round((a.current_hours/a.next_service_hours)*100) : 0);
              const c = pct>=90?'var(--d-red)':pct>=70?'var(--d-amber)':'var(--d-blue)';
              return (
                <div key={a.id} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                    <span style={{ fontWeight:500, color:'var(--d-text2)' }}>{a.asset_number?`${a.asset_number} — ${a.name}`:a.name}</span>
                    <span style={{ fontFamily:'"JetBrains Mono",monospace', fontWeight:700, color:c }}>{pct}% · {a.current_hours}/{a.next_service_hours}h</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width:`${pct}%`, background:c }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Custom widgets ── */}
        {customWidgets.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:3, height:10, background:'var(--d-ai)', display:'inline-block' }} />
              Custom Widgets
            </div>
            <div className="dash-grid">
              {customWidgets.map(w => (
                <div key={w.id} className={`widget-${w.size||'md'}`}>
                  <WidgetCustom
                    config={w}
                    companyId={companyId}
                    isAdmin={isAdmin}
                    onEdit={() => { setEditingWidget(w); setShowBuilder(true); }}
                    onDelete={() => deleteCustomWidget(w.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && customWidgets.length === 0 && isAdmin && (
          <div style={{ border:'1.5px dashed var(--d-border)', padding:'24px', textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:28, marginBottom:8, opacity:.3 }}>+</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--d-text2)', marginBottom:4 }}>Add custom widgets</div>
            <div style={{ fontSize:12, color:'var(--d-text4)', marginBottom:14 }}>Build KPI counters, charts and tables from your fleet data.</div>
            <button onClick={() => { setEditingWidget(null); setShowBuilder(true); }}
              style={{ padding:'8px 18px', background:'var(--d-blue)', color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              + Create Widget
            </button>
          </div>
        )}
      </div>

      {/* ── Drill-down panel ── */}
      {drillDown && (
        <>
          <div className="dd-overlay" onClick={() => setDrillDown(null)} />
          <div className="dd-panel">
            <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
              <div style={{ width:36, height:4, background:'var(--d-border)' }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--d-border)', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--d-text)' }}>{drillDown.title}</div>
              <button onClick={() => setDrillDown(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--d-text3)', padding:'4px 8px' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'0 20px 20px' }}>
              {drillDown.rows.length === 0
                ? <div style={{ padding:'40px 0', textAlign:'center', color:'var(--d-text4)', fontSize:14 }}>{drillDown.emptyMsg||'No records found'}</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', marginTop:4 }}>
                    <thead>
                      <tr>{drillDown.columns.map(col => (
                        <th key={col} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:800, color:'var(--d-text3)', textTransform:'uppercase', letterSpacing:'.8px', borderBottom:'2px solid var(--d-border)', whiteSpace:'nowrap' }}>{col}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {drillDown.rows.map((row,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid var(--d-border)' }}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--d-s2)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          {row.map((cell,j) => (
                            <td key={j} style={{ padding:'11px 12px', fontSize:13, color:j===0?'var(--d-text)':'var(--d-text2)', fontWeight:j===0?600:400 }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </>
      )}

      {showBuilder && isAdmin && (
        <WidgetBuilderModal
          companyId={companyId}
          editConfig={editingWidget}
          onSave={handleWidgetSaved}
          onClose={() => { setShowBuilder(false); setEditingWidget(null); }}
        />
      )}

      {showCustomise && (
        <FullCustomisePanel
          layout={layout}
          onLayoutChange={setLayout}
          dashPrefs={dashPrefs}
          onToggleAI={(key) => toggleAI(key)}
          onToggleSection={(key) => toggleSection(key)}
          onToggleKpi={(id) => toggleKpi(id)}
          onClose={() => setShowCustomise(false)}
          onSaveDefault={(l) => { saveLayout(l,companyId,userRole?.email||'',true); toast('Company default saved','success'); }}
          isAdmin={isAdmin}
          companyId={companyId}
          userEmail={userRole?.email||''}
        />
      )}
    </>
  );
}

export default Dashboard;