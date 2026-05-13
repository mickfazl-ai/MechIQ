import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { WidgetCustom, WidgetBuilderModal } from './CustomWidget';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CSS = `
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes countUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse-red   { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.25)}  50%{box-shadow:0 0 0 6px transparent} }
  @keyframes pulse-amber { 0%,100%{box-shadow:0 0 0 0 rgba(217,119,6,0.25)} 50%{box-shadow:0 0 0 6px transparent} }
  @keyframes toast-in  { from{opacity:0;transform:translateX(20px) scale(0.96)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes toast-out { from{opacity:1;max-height:80px;margin-bottom:10px} to{opacity:0;max-height:0;margin-bottom:0} }

  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 22px;
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
    cursor: default;
  }
  .kpi-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); border-color: var(--border-strong); }
  .kpi-card.urgent { animation: pulse-red 2.5s ease-in-out infinite; }
  .kpi-card.warn   { animation: pulse-amber 2.5s ease-in-out infinite; }

  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 22px 24px;
    transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }
  .panel:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); transform: translateY(-1px); }

  .panel-title {
    font-family: var(--font-display);
    font-size: 12px; font-weight: 800; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--text-muted);
    margin-bottom: 18px; display: flex; align-items: center; gap: 8px;
  }
  .panel-title::before {
    content: ''; width: 3px; height: 14px; border-radius: 2px;
    background: var(--accent); flex-shrink: 0;
  }

  .wo-row:hover td { background: var(--surface-2) !important; }

  .progress-track {
    height: 6px; background: var(--surface-3); border-radius: 99px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 99px;
    transition: width 0.9s cubic-bezier(0.16,1,0.3,1);
  }

  .health-seg { transition: width 1.1s cubic-bezier(0.16,1,0.3,1); }

  .activity-row {
    display: flex; gap: 12px; align-items: flex-start;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .activity-row:last-child { border-bottom: none; }

  .refresh-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; background: var(--surface); color: var(--text-secondary);
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.15s; font-family: var(--font-body);
  }
  .refresh-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

  .sk { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite linear; border-radius: 6px; }
  /* ── Widget system ── */
  .dash-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
  .widget-sm   { grid-column: span 4; }
  .widget-md   { grid-column: span 6; }
  .widget-lg   { grid-column: span 12; }
  .widget-wide { grid-column: span 6; }
  @media(max-width:900px) { .widget-sm,.widget-md,.widget-lg,.widget-wide { grid-column: span 12; } }
  @media(min-width:901px) and (max-width:1200px) { .widget-sm { grid-column: span 6; } .widget-wide { grid-column: span 12; } }
  .widget-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:18px; transition:box-shadow 0.2s; }
  .widget-card.dragging { opacity:0.4; }
  .widget-card.drag-over { border-color:var(--accent); box-shadow:0 0 0 2px rgba(14,165,233,0.3); }
  .widget-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .widget-title { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px; }
  .widget-chevron { font-size:12px; color:var(--text-muted); transition:transform 0.2s; cursor:pointer; }
  .widget-chevron.open { transform:rotate(180deg); }
  .widget-expand-btn { display:flex; align-items:center; gap:6px; background:none; border:none; cursor:pointer; padding:0; }
  .widget-body { overflow:hidden; transition:max-height 0.3s ease, opacity 0.2s; }
  .widget-body.closed { max-height:0; opacity:0; }
  .widget-body.opened { max-height:2000px; opacity:1; }
  .widget-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }
  .custom-panel { position:fixed; top:0; right:0; bottom:0; width:360px; max-width:90vw; background:var(--bg); border-left:1px solid var(--border); box-shadow:-8px 0 40px rgba(0,0,0,0.2); z-index:300; display:flex; flex-direction:column; animation:slideIn 0.25s cubic-bezier(0.16,1,0.3,1); }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  .custom-item { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--border); cursor:grab; user-select:none; transition:background 0.1s; }
  .custom-item:hover { background:var(--surface); }
  .size-btn { padding:3px 8px; border-radius:5px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-muted); font-size:10px; font-weight:700; cursor:pointer; font-family:inherit; }
  .size-btn.active { background:var(--accent); color:#fff; border-color:var(--accent); }
  .toggle-btn { width:36px; height:20px; border-radius:10px; border:none; cursor:pointer; position:relative; transition:background 0.2s; flex-shrink:0; }
  .toggle-btn::after { content:''; position:absolute; top:2px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left 0.2s; }
  .toggle-btn.on { background:var(--accent); }
  .toggle-btn.on::after { left:18px; }
  .toggle-btn.off { background:var(--border); }
  .toggle-btn.off::after { left:2px; }

`;

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
function CustomisePanel({ layout, onLayoutChange, onClose, onSaveDefault, isAdmin, companyId, userEmail }) {
  const [items, setItems] = useState([...layout]);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const toggle = (id) => setItems(its => its.map(it => it.id===id ? {...it, enabled:!it.enabled} : it));
  const setSize = (id, size) => setItems(its => its.map(it => it.id===id ? {...it, size} : it));

  const onDragStart = (i) => setDragIdx(i);
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const onDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setItems(next);
    setDragIdx(null); setOverIdx(null);
  };

  const apply = (saveDefault=false) => {
    saveLayout(items, companyId, userEmail, saveDefault);
    onLayoutChange(items);
    if (saveDefault) onSaveDefault && onSaveDefault(items);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:299 }} />
      <div className="custom-panel">
        <div style={{ padding:'20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>Customise Dashboard</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Drag to reorder · toggle · set size</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {items.map((item, i) => {
            const def = WIDGET_DEFS.find(w => w.id === item.id);
            return (
              <div key={item.id} className={`custom-item${dragIdx===i?' dragging':''}${overIdx===i&&dragIdx!==i?' drag-over':''}`}
                draggable onDragStart={() => onDragStart(i)} onDragOver={e => onDragOver(e, i)} onDrop={() => onDrop(i)} onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}>
                <span style={{ fontSize:14, color:'var(--text-faint)', cursor:'grab' }}>⠿</span>
                <span style={{ fontSize:18, flexShrink:0 }}>{def?.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: item.enabled ? 'var(--text-primary)' : 'var(--text-faint)' }}>{def?.label}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{def?.desc}</div>
                </div>
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  {['sm','md','lg'].map(s => (
                    <button key={s} className={`size-btn${item.size===s?' active':''}`} onClick={() => setSize(item.id, s)}>{s}</button>
                  ))}
                  <button className={`toggle-btn ${item.enabled?'on':'off'}`} onClick={() => toggle(item.id)} title={item.enabled?'Hide':'Show'} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding:'16px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={() => apply(false)} style={{ padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Apply My Layout
          </button>
          {isAdmin && (
            <button onClick={() => apply(true)} style={{ padding:'10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--text-secondary)' }}>
              💾 Save as Company Default
            </button>
          )}
          <button onClick={() => { setItems(DEFAULT_LAYOUT); }} style={{ padding:'8px', background:'none', border:'none', color:'var(--text-muted)', fontSize:12, cursor:'pointer' }}>
            Reset to defaults
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Individual Widgets ── */

/* ── Expandable Widget Wrapper ── */
function ExpandableWidget({ sizeClass, title, icon, count, countColor, countSize, summary, children, defaultOpen=false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`widget-card ${sizeClass}`} style={{ cursor:'default' }}>
      <div className="widget-header" style={{ cursor:'pointer', userSelect:'none' }} onClick={() => setOpen(o => !o)}>
        <span className="widget-title">{icon} {title}</span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {count !== undefined && <span style={{ fontSize: countSize||20, fontWeight:900, color:countColor||'var(--text-primary)', fontFamily:'var(--font-display)' }}>{count}</span>}
          {summary && !open && <span style={{ fontSize:11, color:'var(--text-muted)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{summary}</span>}
          <span className={`widget-chevron${open?' open':''}`}>▼</span>
        </div>
      </div>
      <div className={`widget-body ${open?'opened':'closed'}`}>
        <div style={{ paddingTop:8 }}>{children}</div>
      </div>
    </div>
  );
}

function WidgetFleetHealth({ assets, loading }) {
  if (loading) return <div className="widget-card widget-lg"><Sk h="60px" /></div>;
  const total = assets.length, running = assets.filter(a=>a.status==='Running').length, down = assets.filter(a=>a.status==='Down').length, maint = assets.filter(a=>a.status==='Maintenance').length;
  return (
    <ExpandableWidget sizeClass="widget-lg" title="Fleet Health" icon="🚛" count={total} countColor="var(--accent)" countSize={16} summary={`${running} running · ${down} down`} defaultOpen={true}>
      <FleetHealthBar running={running} down={down} maintenance={maint} total={total} />
      <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
        {assets.map(a => {
          const c = a.status==='Down'?'var(--red)':a.status==='Maintenance'?'var(--amber)':' var(--green)';
          return (
            <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', borderRadius:8, background:'var(--surface-2)', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{a.name}</span>
                {a.asset_number && <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>#{a.asset_number}</span>}
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {a.hours && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{Number(a.hours).toLocaleString()} hrs</span>}
                <span style={{ fontSize:11, fontWeight:700, color:c, padding:'2px 8px', background:c+'18', borderRadius:20 }}>{a.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ExpandableWidget>
  );
}

function WidgetBreakdowns({ assets, loading, size }) {
  const breakdowns = assets.filter(a => a.status === 'Down');
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Breakdowns" icon="🔴" count={loading?'—':breakdowns.length} countColor="var(--red)" summary={breakdowns[0]?.name}>
      {!loading && breakdowns.length === 0 && <div style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ All machines running</div>}
      {!loading && breakdowns.map(a => (
        <div key={a.id} style={{ padding:'8px 10px', borderRadius:8, background:'var(--red-bg)', border:'1px solid var(--red-border)', marginBottom:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{a.name}</span>
            <span style={{ fontSize:11, color:'var(--red)', fontWeight:700 }}>DOWN</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
            {[a.location, a.asset_number?`#${a.asset_number}`:null, a.make, a.model].filter(Boolean).join(' · ')}
          </div>
        </div>
      ))}
    </ExpandableWidget>
  );
}

function WidgetOverdue({ maint, loading, size }) {
  const overdue = maint.filter(m => m.status === 'Overdue');
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Overdue Services" icon="⚠️" count={loading?'—':overdue.length} countColor="var(--amber)" summary={overdue[0]?.asset}>
      {!loading && overdue.length === 0 && <div style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ No overdue services</div>}
      {!loading && overdue.map(m => (
        <div key={m.id} style={{ padding:'8px 10px', borderRadius:8, background:'var(--amber-bg)', border:'1px solid var(--amber-border)', marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{m.asset}</div>
          <div style={{ fontSize:11, color:'var(--amber)', fontWeight:600, marginTop:2 }}>{m.task}</div>
          {m.next_due && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Due: {m.next_due} · Assigned: {m.assigned_to||'—'}</div>}
        </div>
      ))}
    </ExpandableWidget>
  );
}

function WidgetDueToday({ maint, loading, size }) {
  const today = new Date().toISOString().split('T')[0];
  const dueToday = maint.filter(m => m.next_due === today || m.status === 'Due Soon');
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Due Today" icon="📅" count={loading?'—':dueToday.length} countColor="var(--accent)" summary={dueToday[0]?.asset}>
      {!loading && dueToday.length === 0 && <div style={{ fontSize:12, color:'var(--text-muted)' }}>Nothing due today</div>}
      {!loading && dueToday.map(m => (
        <div key={m.id} style={{ padding:'8px 10px', borderRadius:8, background:'var(--accent-light)', border:'1px solid rgba(14,165,233,0.2)', marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{m.asset}</div>
          <div style={{ fontSize:11, color:'var(--accent)', fontWeight:600, marginTop:2 }}>{m.task}</div>
          {m.assigned_to && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Assigned: {m.assigned_to}</div>}
        </div>
      ))}
    </ExpandableWidget>
  );
}

function WidgetPriorityWOs({ wos, loading, size }) {
  const priority = wos.filter(w => w.priority === 'Critical' || w.priority === 'High');
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Priority Jobs" icon="🔥" count={loading?'—':priority.length} countColor="var(--red)" summary={priority[0]?.asset}>
      {!loading && priority.length === 0 && <div style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ No critical jobs</div>}
      {!loading && priority.map(w => {
        const c = w.priority==='Critical'?'var(--red)':'var(--amber)';
        return (
          <div key={w.id} style={{ padding:'8px 10px', borderRadius:8, background:c+'10', border:`1px solid ${c}40`, marginBottom:6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:11, fontWeight:700, color:c, padding:'2px 8px', background:c+'20', borderRadius:20 }}>{w.priority}</span>
              {w.due_date && <span style={{ fontSize:10, color:'var(--text-muted)' }}>Due: {w.due_date}</span>}
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{w.defect_description?.slice(0,60)||'—'}</div>
            {w.asset && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{w.asset} · {w.assigned_to||'Unassigned'}</div>}
          </div>
        );
      })}
    </ExpandableWidget>
  );
}

function WidgetOilSampling({ companyId, size }) {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('oil_samples').select('*').eq('company_id', companyId).order('created_at', { ascending:false }).limit(20)
      .then(({ data }) => { setSamples(data||[]); setLoading(false); });
  }, [companyId]);
  const alerts = samples.filter(s => s.ai_condition === 'CRITICAL' || s.ai_condition === 'WARNING');
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Oil Sampling" icon="🧪" count={loading?'—':alerts.length} countColor={alerts.length>0?'var(--red)':'var(--green)'} summary={alerts[0]?.asset_name}>
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

function WidgetPartsStock({ companyId, size }) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('parts').select('id,name,quantity,min_quantity,unit').eq('company_id', companyId)
      .then(({ data }) => { setParts((data||[]).filter(p => p.quantity <= p.min_quantity)); setLoading(false); });
  }, [companyId]);
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Low Stock Parts" icon="🔩" count={loading?'—':parts.length} countColor={parts.length>0?'var(--amber)':'var(--green)'} summary={parts[0]?.name}>
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

function WidgetDowntimeSummary({ companyId, size }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
    supabase.from('downtime').select('hours').eq('company_id', companyId).gte('created_at', start.toISOString())
      .then(({ data }) => { setHours((data||[]).reduce((s,d) => s + (parseFloat(d.hours)||0), 0)); setLoading(false); });
  }, [companyId]);
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Downtime This Month" icon="📉" summary={loading?'':`${hours?.toFixed(1)} hrs lost`}>
      <div style={{ fontSize:36, fontWeight:900, color:'var(--red)', fontFamily:'var(--font-display)' }}>{loading ? '—' : hours?.toFixed(1)}<span style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)', marginLeft:4 }}>hrs</span></div>
      {!loading && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Lost to unplanned downtime in {new Date().toLocaleString('default',{month:'long'})}</div>}
    </ExpandableWidget>
  );
}

function WidgetCalendarPreview({ companyId, size }) {
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
    <ExpandableWidget sizeClass={`widget-${size}`} title="Next 7 Days" icon="📆" count={loading?'—':events.length} countColor="var(--accent)" countSize={16} summary={events[0]?.label?.slice(0,30)}>
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

function WidgetMessages({ companyId, size }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('messages').select('*').order('created_at', { ascending:false }).limit(5)
      .then(({ data }) => { setMsgs(data||[]); setLoading(false); });
  }, [companyId]);
  const ago = ts => { if(!ts)return''; const m=Math.floor((Date.now()-new Date(ts))/60000); if(m<60)return`${m}m ago`; if(m<1440)return`${Math.floor(m/60)}h ago`; return`${Math.floor(m/1440)}d ago`; };
  return (
    <ExpandableWidget sizeClass={`widget-${size}`} title="Messages" icon="💬" count={loading?'—':msgs.length} countColor="var(--accent)" countSize={16}>
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
function WidgetPrestartKPI({ companyId, loading }) {
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
    <div className="dash-widget" style={{ gridColumn:'span 2' }}>
      <div className="dw-header">
        <div className="dw-title">📋 Prestart KPIs — Today</div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{today}</div>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          ['Completed', data.completed, 'var(--green)',   '✓'],
          ['Total Units', data.total,   'var(--accent)',  '🚛'],
          ['Missing',    data.missing,  data.missing>0?'var(--red)':'var(--green)',  '⚠'],
          ['Defects',    data.defects,  data.defects>0?'var(--amber)':'var(--green)','🔴'],
        ].map(([label, val, color, icon]) => (
          <div key={label} style={{ background:'var(--surface-2)', borderRadius:8, padding:'12px 10px', textAlign:'center', border:`1px solid ${color}22` }}>
            <div style={{ fontSize:22, fontWeight:900, color }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:2 }}>{label}</div>
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
function WidgetServiceKPI({ companyId, loading }) {
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
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const { toasts, add: toast } = useToast();
  const isAdmin = ['admin','supervisor'].includes(userRole?.role);

  useEffect(() => {
    if (!document.getElementById('dash-css')) {
      const s = document.createElement('style'); s.id='dash-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    setTimeout(() => setHVis(true), 60);
    if (companyId) { load(); loadCustomWidgets(); }
  }, [companyId]);

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
    fleet_health:     (w) => <WidgetFleetHealth key={w.id} assets={assets} loading={loading} />,
    breakdowns:       (w) => <WidgetBreakdowns key={w.id} assets={assets} loading={loading} size={w.size} />,
    overdue:          (w) => <WidgetOverdue key={w.id} maint={maint} loading={loading} size={w.size} />,
    due_today:        (w) => <WidgetDueToday key={w.id} maint={maint} loading={loading} size={w.size} />,
    priority_wos:     (w) => <WidgetPriorityWOs key={w.id} wos={wos} loading={loading} size={w.size} />,
    oil_sampling:     (w) => <WidgetOilSampling key={w.id} companyId={companyId} size={w.size} />,
    parts_stock:      (w) => <WidgetPartsStock key={w.id} companyId={companyId} size={w.size} />,
    downtime_summary: (w) => <WidgetDowntimeSummary key={w.id} companyId={companyId} size={w.size} />,
    calendar_preview:  (w) => <WidgetCalendarPreview key={w.id} companyId={companyId} size={w.size} />,
    prestart_kpi:      (w) => <WidgetPrestartKPI key={w.id} companyId={companyId} loading={loading} />,
    service_kpi:       (w) => <WidgetServiceKPI  key={w.id} companyId={companyId} loading={loading} />,
    messages:         (w) => <WidgetMessages key={w.id} companyId={companyId} size={w.size} />,
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
      <div style={{ animation:'fadeUp 0.35s ease both' }}>

        {/* ── Top bar: date + actions ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', letterSpacing:-0.3 }}>
              {now.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {assets.length} assets · {activeCount} active · {downCount > 0 ? `${downCount} down` : 'none down'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {isAdmin && (
              <button onClick={() => { setEditingWidget(null); setShowBuilder(true); }}
                style={{ padding:'7px 14px', background:'linear-gradient(135deg,var(--accent),#0090a8)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                + Widget
              </button>
            )}
            <button onClick={() => setShowCustomise(true)} style={{ padding:'7px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
              ⚙️ Customise
            </button>
            <button className="refresh-btn" onClick={() => load(true)} disabled={refreshing}>
              <span style={{ display:'inline-block', animation:refreshing?'spin 0.8s linear infinite':'none' }}>↻</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Hero KPI Strip ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Fleet',   value: assets.length,  color:'var(--accent)',  icon:'🚛', sub:'registered assets' },
            { label:'Active',        value: activeCount,    color:'var(--green)',   icon:'✓',  sub:'operational now' },
            { label:'Down',          value: downCount,      color: downCount>0?'var(--red)':'var(--text-muted)', icon:'⬇', sub:'offline / breakdown', urgent: downCount>0 },
            { label:'Overdue Svc',   value: overdueCount,   color: overdueCount>0?'var(--red)':'var(--text-muted)', icon:'⚠', sub:'services past due', urgent: overdueCount>0 },
            { label:'Open WOs',      value: openWOCount,    color: openWOCount>0?'var(--amber)':'var(--text-muted)', icon:'🔧', sub:'work orders open', warn: openWOCount>0 },
          ].map(k => (
            <div key={k.label} className={`kpi-card${k.urgent?' urgent':k.warn?' warn':''}`}
              style={{ borderTop:`3px solid ${k.color}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>{k.label}</div>
                <div style={{ fontSize:18, opacity:0.6 }}>{k.icon}</div>
              </div>
              <div style={{ fontSize:32, fontWeight:900, color:k.color, lineHeight:1, marginBottom:4, animation:'countUp 0.4s ease' }}>{loading ? '—' : k.value}</div>
              <div style={{ fontSize:11, color:'var(--text-faint)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Fleet health bar ── */}
        {!loading && assets.length > 0 && (
          <div className="panel" style={{ marginBottom:20, padding:'16px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Fleet Health</div>
              <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--text-muted)' }}>
                {[['var(--green)','Active'],['var(--amber)','Maintenance'],['var(--red)','Down'],['var(--text-faint)','Other']].map(([c,l])=>(
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden', gap:2 }}>
              {[
                [activeCount,'var(--green)'],
                [maintCount,'var(--amber)'],
                [downCount,'var(--red)'],
                [Math.max(0, assets.length-activeCount-maintCount-downCount),'var(--text-faint)'],
              ].map(([v,c],i) => v > 0 && (
                <div key={i} className="health-seg" style={{ flex:v, background:c, borderRadius:2 }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Main KPI widgets: Prestarts + Services side by side ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <WidgetPrestartKPI companyId={companyId} loading={loading} />
          <WidgetServiceKPI  companyId={companyId} loading={loading} />
        </div>

        {/* ── Widget Grid (customisable widgets below) ── */}
        <div className="dash-grid">
          {layout.filter(w => w.enabled && !['prestart_kpi','service_kpi'].includes(w.id)).map(w => {
            const renderer = WIDGET_COMPONENTS[w.id];
            if (!renderer) return null;
            const sizeClass = w.size==='lg'?'widget-lg':w.size==='sm'?'widget-sm':w.size==='wide'?'widget-wide':'widget-md';
            return (
              <div key={w.id} className={sizeClass}>
                {renderer(w)}
              </div>
            );
          })}
        </div>

        {/* ── Custom Widgets ── */}
        {customWidgets.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
                Custom Widgets
              </div>
              {isAdmin && (
                <button onClick={() => { setEditingWidget(null); setShowBuilder(true); }}
                  style={{ padding:'5px 12px', background:'var(--surface-2)', border:'1px dashed var(--border)', borderRadius:7, fontSize:11, fontWeight:700, color:'var(--accent)', cursor:'pointer' }}>
                  + Add Widget
                </button>
              )}
            </div>
            <div className="dash-grid">
              {customWidgets.map(w => {
                const sizeClass = w.size==='lg' ? 'widget-lg' : w.size==='sm' ? 'widget-sm' : 'widget-md';
                return (
                  <div key={w.id} className={sizeClass}>
                    <WidgetCustom
                      config={w}
                      companyId={companyId}
                      isAdmin={isAdmin}
                      onEdit={() => { setEditingWidget(w); setShowBuilder(true); }}
                      onDelete={() => deleteCustomWidget(w.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Empty custom widgets state (admin only) ── */}
        {customWidgets.length === 0 && isAdmin && (
          <div style={{ border:'1.5px dashed var(--border)', borderRadius:12, padding:'24px', textAlign:'center', marginBottom:16, cursor:'pointer' }}
            onClick={() => { setEditingWidget(null); setShowBuilder(true); }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📊</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:4 }}>No custom widgets yet</div>
            <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:12 }}>Build widgets from your fleet data — KPIs, charts, lists — anything you want to track.</div>
            <div style={{ display:'inline-block', padding:'8px 18px', background:'var(--accent)', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700 }}>+ Create First Widget</div>
          </div>
        )}

        {/* ── Service Intervals ── */}
        {progressAssets.length > 0 && (
          <div className="panel" style={{ marginTop:16 }}>
            <div className="panel-title">Service Intervals
              <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-faint)', fontWeight:400, letterSpacing:0, textTransform:'none', fontFamily:'var(--font-body)' }}>Hours to next service</span>
            </div>
            {progressAssets.map(a => (
              <ProgressBar key={a.id} label={a.asset_number ? `${a.asset_number} — ${a.name}` : (a.name||'Asset')} current={a.current_hours} max={a.next_service_hours} />
            ))}
          </div>
        )}

      </div>

      {showBuilder && isAdmin && (
        <WidgetBuilderModal
          companyId={companyId}
          editConfig={editingWidget}
          onSave={handleWidgetSaved}
          onClose={() => { setShowBuilder(false); setEditingWidget(null); }}
        />
      )}

      {showCustomise && (
        <CustomisePanel
          layout={layout}
          onLayoutChange={setLayout}
          onClose={() => setShowCustomise(false)}
          onSaveDefault={(l) => toast('Company default saved', 'success')}
          isAdmin={isAdmin}
          companyId={companyId}
          userEmail={userRole?.email || ''}
        />
      )}
    </>
  );
}

export default Dashboard;
