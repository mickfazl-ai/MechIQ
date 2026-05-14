import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { WidgetCustom, WidgetBuilderModal } from './CustomWidget';

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
@keyframes shimmer  { 0%{background-position:-200% 0}100%{background-position:200% 0} }
@keyframes countUp  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
@keyframes fadeUp   { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
@keyframes toast-in { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)} }
@keyframes slideUp  { from{transform:translateY(100%)}to{transform:translateY(0)} }
@keyframes aiScan   { 0%{background-position:200% 0}100%{background-position:-200% 0} }
@keyframes aiPulse  { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(124,58,237,.25)}50%{box-shadow:0 0 0 5px rgba(124,58,237,0)} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes lrnAnim  { from{width:20%}to{width:92%} }

/* Variables */
:root {
  --d-bg:#F0F2F5; --d-surf:#fff; --d-s2:#F8FAFB;
  --d-border:#E4E8EE; --d-border2:#CDD3DC;
  --d-text:#0D1117; --d-text2:#374151; --d-text3:#6B7280; --d-text4:#9CA3AF;
  --d-blue:#1976D2; --d-blue-bg:#EBF3FC; --d-blue-bd:#BFDBFE;
  --d-green:#15803D; --d-green-bg:#F0FDF4; --d-green-bd:#86EFAC;
  --d-amber:#B45309; --d-amber-bg:#FFFBEB; --d-amber-bd:#FCD34D;
  --d-red:#B91C1C; --d-red-bg:#FEF2F2; --d-red-bd:#FCA5A5;
  --d-ai:#7C3AED; --d-ai-bg:#F5F3FF; --d-ai-bd:#C4B5FD;
  --d-mono:'JetBrains Mono',monospace;
  --d-f:'Inter',system-ui,sans-serif;
  --d-sh:0 1px 3px rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.04);
  --d-sh2:0 4px 16px rgba(0,0,0,.08);
}

/* Shared panel */
.d-panel { background:var(--d-surf); border:1px solid var(--d-border); }
.d-panel:hover { border-color:var(--d-border2); }
.d-panel-hdr { padding:9px 13px; border-bottom:1px solid var(--d-border); display:flex; align-items:center; justify-content:space-between; }
.d-panel-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--d-text2); font-family:var(--d-f); }

/* Widget grid */
.d-wgrid { display:grid; grid-template-columns:repeat(12,1fr); gap:1px; background:var(--d-border); }
.d-col-3  { grid-column:span 3; }
.d-col-4  { grid-column:span 4; }
.d-col-5  { grid-column:span 5; }
.d-col-6  { grid-column:span 6; }
.d-col-7  { grid-column:span 7; }
.d-col-8  { grid-column:span 8; }
.d-col-12 { grid-column:span 12; }
@media(max-width:900px){
  .d-col-3,.d-col-4,.d-col-5,.d-col-6,.d-col-7,.d-col-8,.d-col-12{grid-column:span 12;}
  .d-wgrid{gap:0;}
}

/* Widget base */
.d-widget { background:var(--d-surf); position:relative; }
.d-widget .d-wctrl { opacity:0; transition:opacity .15s; }
.d-widget:hover .d-wctrl { opacity:1; }
.d-wctrl-btn { width:20px;height:20px;background:var(--d-s2);border:1px solid var(--d-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--d-text4);font-size:11px;font-family:var(--d-f); }
.d-wctrl-btn:hover{border-color:var(--d-border2);color:var(--d-text2);}

/* KPI group */
.d-kpi-group { display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--d-border); }
.d-kc { background:var(--d-surf);padding:13px 14px;position:relative; }
.d-kc::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;}
.d-kc-b::after{background:var(--d-blue);}
.d-kc-g::after{background:var(--d-green);}
.d-kc-r::after{background:var(--d-red);}
.d-kc-a::after{background:#F59E0B;}
.d-kpi-l{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--d-text4);margin-bottom:6px;font-family:var(--d-f);}
.d-kpi-v{font-family:var(--d-mono);font-size:26px;font-weight:700;letter-spacing:-1px;line-height:1;color:var(--d-text);}
.d-kpi-sub{font-size:10px;color:var(--d-text4);margin-top:4px;font-family:var(--d-f);}
.d-up{color:var(--d-green);font-weight:700;}.d-dn{color:var(--d-red);font-weight:700;}

/* Heatmap */
.d-heatmap{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:12px;}
.d-hm{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .12s;border:1px solid;}
.d-hm:hover{transform:scale(1.05);z-index:2;}
.d-hm-v{font-family:var(--d-mono);font-size:13px;font-weight:700;text-align:center;}
.d-hm-n{font-size:9px;font-weight:600;text-align:center;margin-top:3px;color:var(--d-text3);}

/* AI insights */
.d-aic{padding:10px 12px;border-left:3px solid;border-bottom:1px solid var(--d-border);cursor:pointer;transition:background .12s;font-family:var(--d-f);}
.d-aic:last-child{border-bottom:none;}
.d-aic:hover{background:var(--d-s2);}
.d-aic-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
.d-aic-badge{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:1px 6px;border:1px solid;font-family:var(--d-f);}
.d-aic-conf{font-family:var(--d-mono);font-size:10px;color:var(--d-text4);}
.d-aic-text{font-size:12px;color:var(--d-text2);line-height:1.45;}
.d-aic-act{font-size:10px;font-weight:600;color:var(--d-blue);margin-top:4px;cursor:pointer;}
.d-aic-act:hover{text-decoration:underline;}

/* Timeline */
.d-tl-axis{display:flex;justify-content:space-between;font-family:var(--d-mono);font-size:9px;color:var(--d-text4);margin-bottom:8px;}
.d-tl-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
.d-tl-lbl{font-size:10px;font-weight:600;color:var(--d-text2);width:80px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--d-f);}
.d-tl-track{flex:1;height:14px;background:var(--d-s2);border:1px solid var(--d-border);position:relative;overflow:hidden;}
.d-tl-bar{height:100%;position:absolute;top:0;display:flex;align-items:center;padding:0 4px;}
.d-tl-bar-t{font-size:9px;font-weight:700;color:#fff;white-space:nowrap;}
.d-tl-now{position:absolute;top:0;bottom:0;width:1px;background:var(--d-blue);opacity:.5;}
.d-tl-pred{position:absolute;top:2px;bottom:2px;display:flex;align-items:center;justify-content:center;}
.d-tl-pred-t{font-size:8px;font-weight:700;color:#fff;padding:0 3px;}

/* AI Learning */
.d-lw-row{display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--d-border);font-family:var(--d-f);}
.d-lw-row:last-child{border-bottom:none;}
.d-lw-l{font-size:11px;color:var(--d-text2);}
.d-lw-r{display:flex;align-items:center;gap:7px;}
.d-lw-bar{width:56px;height:3px;background:var(--d-ai-bd);overflow:hidden;}
.d-lw-fill{height:100%;background:var(--d-ai);}
.d-lw-v{font-family:var(--d-mono);font-size:11px;font-weight:700;color:var(--d-ai);}

/* Table */
.d-tbl{width:100%;border-collapse:collapse;}
.d-tbl th{background:var(--d-s2);padding:8px 11px;font-size:10px;font-weight:700;color:var(--d-text3);text-align:left;border-bottom:1px solid var(--d-border);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;font-family:var(--d-f);}
.d-tbl td{padding:8px 11px;font-size:12px;color:var(--d-text2);border-bottom:1px solid var(--d-s2);font-family:var(--d-f);}
.d-tbl tr:hover td{background:var(--d-s2);}
.d-tbl tr:last-child td{border-bottom:none;}
.d-an{font-weight:700;color:var(--d-text);font-size:13px;}
.d-aid{font-family:var(--d-mono);font-size:9px;color:var(--d-text4);margin-top:1px;}
.d-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;font-size:10px;font-weight:700;border:1px solid;white-space:nowrap;font-family:var(--d-f);}
.d-tag.g{background:var(--d-green-bg);color:var(--d-green);border-color:var(--d-green-bd);}
.d-tag.a{background:var(--d-amber-bg);color:var(--d-amber);border-color:var(--d-amber-bd);}
.d-tag.r{background:var(--d-red-bg);color:var(--d-red);border-color:var(--d-red-bd);}
.d-tag.b{background:var(--d-blue-bg);color:var(--d-blue);border-color:var(--d-blue-bd);}
.d-tag.p{background:var(--d-ai-bg);color:var(--d-ai);border-color:var(--d-ai-bd);}
.d-tag.n{background:var(--d-s2);color:var(--d-text3);border-color:var(--d-border);}
.d-prog-s{flex:1;height:3px;background:var(--d-border);}
.d-prog-sf{height:100%;background:var(--d-blue);}

/* Activity */
.d-act-item{display:flex;gap:9px;align-items:flex-start;padding:8px 12px;border-bottom:1px solid var(--d-s2);font-family:var(--d-f);}
.d-act-item:last-child{border-bottom:none;}
.d-a-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.d-a-t{font-size:12px;font-weight:500;color:var(--d-text2);line-height:1.4;}
.d-a-sub{font-size:10px;color:var(--d-text4);margin-top:2px;}

/* AI bar */
.d-ai-bar{background:var(--d-surf);border:1px solid var(--d-ai-bd);box-shadow:0 0 0 3px rgba(124,58,237,.04);position:relative;overflow:hidden;}
.d-ai-top-line{position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--d-blue),var(--d-ai),var(--d-blue));background-size:200% 100%;animation:aiScan 3s linear infinite;}
.d-ai-inner{display:flex;align-items:center;gap:10px;padding:11px 13px;}
.d-ai-icon{width:28px;height:28px;background:var(--d-ai-bg);border:1px solid var(--d-ai-bd);display:flex;align-items:center;justify-content:center;color:var(--d-ai);flex-shrink:0;}
.d-ai-input{flex:1;background:transparent;border:none;outline:none;font-family:var(--d-f);font-size:13px;color:var(--d-text);}
.d-ai-input::placeholder{color:var(--d-text4);}
.d-ai-quick{display:flex;gap:6px;flex-shrink:0;}
.d-aq{font-size:10px;font-weight:700;padding:4px 9px;border:1px solid;cursor:pointer;font-family:var(--d-f);transition:opacity .15s;}
.d-aq:hover{opacity:.75;}
.d-ai-sug-row{border-top:1px solid var(--d-border);padding:7px 13px;display:flex;gap:7px;align-items:center;overflow:hidden;}
.d-sug-lbl{font-size:10px;font-weight:700;color:var(--d-text4);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;font-family:var(--d-f);}
.d-sug{font-size:11px;font-weight:500;color:var(--d-text2);background:var(--d-s2);border:1px solid var(--d-border);padding:3px 9px;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:var(--d-f);}
.d-sug:hover{border-color:var(--d-ai-bd);color:var(--d-ai);background:var(--d-ai-bg);}

/* AI response */
.d-ai-resp{background:var(--d-ai-bg);border:1px solid var(--d-ai-bd);border-left:3px solid var(--d-ai);padding:12px 14px;display:none;animation:fadeUp .25s ease;font-family:var(--d-f);}
.d-ai-resp.show{display:block;}
.d-air-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--d-ai);margin-bottom:6px;display:flex;align-items:center;gap:5px;}
.d-air-text{font-size:13px;color:var(--d-text2);line-height:1.65;white-space:pre-line;}
.d-air-btns{display:flex;gap:8px;margin-top:10px;}
.d-air-btn-p{background:var(--d-blue);color:#fff;border:none;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--d-f);}
.d-air-btn-g{background:#fff;color:var(--d-text2);border:1px solid var(--d-border2);padding:5px 13px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--d-f);}

/* Briefings */
.d-briefings{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--d-border);}
.d-brief{background:var(--d-surf);padding:12px 15px;border-left:3px solid;}
.d-brief-ey{font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;color:var(--d-text4);margin-bottom:5px;font-family:var(--d-f);}
.d-brief-h{font-size:13px;font-weight:700;color:var(--d-text);line-height:1.4;margin-bottom:4px;}
.d-brief-p{font-size:12px;color:var(--d-text3);line-height:1.5;}
.d-brief-meta{font-size:10px;color:var(--d-text4);margin-top:7px;display:flex;align-items:center;gap:4px;}

/* Customise bar */
.d-cust-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 2px;}
.d-cust-l{display:flex;align-items:center;gap:10px;}
.d-cust-lbl{font-size:10px;font-weight:700;color:var(--d-text4);text-transform:uppercase;letter-spacing:.5px;font-family:var(--d-f);}
.d-lb-btns{display:flex;gap:3px;}
.d-lb{width:24px;height:20px;border:1px solid var(--d-border);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--d-text4);transition:all .15s;}
.d-lb:hover,.d-lb.on{border-color:var(--d-blue);color:var(--d-blue);background:var(--d-blue-bg);}
.d-ai-learn{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--d-ai);background:var(--d-ai-bg);border:1px solid var(--d-ai-bd);padding:4px 10px;font-family:var(--d-f);}
.d-learn-track{width:52px;height:3px;background:var(--d-ai-bd);overflow:hidden;}
.d-learn-fill{height:100%;background:var(--d-ai);animation:lrnAnim 2.5s ease-in-out infinite alternate;}
.d-add-w{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--d-blue);background:var(--d-blue-bg);border:1px solid var(--d-blue-bd);padding:5px 11px;cursor:pointer;transition:all .15s;font-family:var(--d-f);}
.d-add-w:hover{background:var(--d-blue-bd);}

/* Accordion widgets (legacy compatibility) */
.d-widget-sm{grid-column:span 4;}.d-widget-md{grid-column:span 6;}.d-widget-lg{grid-column:span 12;}
.d-widget-card{background:var(--d-surf);border:1px solid var(--d-border);padding:16px;font-family:var(--d-f);}

/* Toast */
.d-toast-wrap{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
.d-toast{display:flex;align-items:center;gap:10px;background:var(--d-surf);border:1px solid var(--d-border);border-left:3px solid var(--d-blue);padding:11px 16px;min-width:260px;box-shadow:var(--d-sh2);pointer-events:auto;animation:toast-in .3s cubic-bezier(.16,1,.3,1);font-family:var(--d-f);}

/* Sk */
.d-sk{background:linear-gradient(90deg,var(--d-s2) 25%,var(--d-border) 50%,var(--d-s2) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite linear;border-radius:3px;}

/* Drill down */
.d-dd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:399;backdrop-filter:blur(2px);}
.d-dd-panel{position:fixed;bottom:0;left:0;right:0;max-height:70vh;background:var(--d-surf);border-top:1px solid var(--d-border);box-shadow:0 -8px 40px rgba(0,0,0,.15);z-index:400;display:flex;flex-direction:column;animation:slideUp .25s cubic-bezier(.16,1,.3,1);}

/* Custom panel (legacy) */
.custom-panel{position:fixed;top:0;right:0;bottom:0;width:340px;max-width:90vw;background:var(--d-s2);border-left:1px solid var(--d-border);box-shadow:-8px 0 40px rgba(0,0,0,.12);z-index:300;display:flex;flex-direction:column;}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.custom-item{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--d-border);cursor:grab;transition:background .1s;font-family:var(--d-f);}
.custom-item:hover{background:var(--d-surf);}
.size-btn{padding:3px 8px;border:1px solid var(--d-border);background:var(--d-s2);color:var(--d-text3);font-size:10px;font-weight:700;cursor:pointer;font-family:var(--d-f);}
.size-btn.active{background:var(--d-blue);color:#fff;border-color:var(--d-blue);}
.toggle-btn{width:36px;height:20px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.toggle-btn::after{content:'';position:absolute;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;}
.toggle-btn.on{background:var(--d-blue);}.toggle-btn.on::after{left:18px;}
.toggle-btn.off{background:var(--d-border2);}.toggle-btn.off::after{left:2px;}
`;

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
function Sk({ w='100%', h='13px' }) {
  return <div className="d-sk" style={{ width:w, height:h, flexShrink:0 }} />;
}
function ago(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
}

/* ─── TOAST ───────────────────────────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type='info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, add };
}
function ToastContainer({ toasts }) {
  const colours = { success:'var(--d-green)', error:'var(--d-red)', warning:'var(--d-amber)', info:'var(--d-blue)' };
  return (
    <div className="d-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className="d-toast" style={{ borderLeftColor: colours[t.type]||colours.info }}>
          <span style={{ fontSize:13, color:'var(--d-text)', fontWeight:500 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── STATUS TAG ──────────────────────────────────────────────────────────── */
function STag({ status }) {
  const map = {
    'Running':'g','Active':'g','Operational':'g','Complete':'g',
    'Down':'r','Offline':'r','Fault':'r','Overdue':'r','Critical':'r',
    'Maintenance':'a','Due Soon':'a','In Progress':'a','Warning':'a',
    'Open':'b','Upcoming':'b','Low':'b',
  };
  const cls = map[status] || 'n';
  return <span className={`d-tag ${cls}`}>● {status}</span>;
}

/* ─── LAYOUT PERSISTENCE ──────────────────────────────────────────────────── */
const DEFAULT_LAYOUT = [
  { id:'kpi_strip', enabled:true }, { id:'prestart_kpi', enabled:true }, { id:'service_kpi', enabled:true },
  { id:'breakdowns', enabled:true, size:'md' }, { id:'overdue', enabled:true, size:'md' },
  { id:'due_today', enabled:true, size:'md' }, { id:'priority_wos', enabled:true, size:'md' },
  { id:'oil_sampling', enabled:true, size:'md' }, { id:'parts_stock', enabled:true, size:'md' },
  { id:'downtime_summary', enabled:true, size:'sm' }, { id:'calendar_preview', enabled:true, size:'md' },
  { id:'messages', enabled:true, size:'sm' },
];
function getLayout(companyId, userEmail) {
  try {
    const k = `mechiq_dash_${companyId}_${userEmail}`;
    const saved = JSON.parse(localStorage.getItem(k) || 'null');
    if (saved) return saved;
    const companyKey = `mechiq_dash_company_${companyId}`;
    const compDef = JSON.parse(localStorage.getItem(companyKey) || 'null');
    return compDef || DEFAULT_LAYOUT;
  } catch { return DEFAULT_LAYOUT; }
}
function saveLayout(layout, companyId, userEmail, saveCompany=false) {
  try {
    localStorage.setItem(`mechiq_dash_${companyId}_${userEmail}`, JSON.stringify(layout));
    if (saveCompany) localStorage.setItem(`mechiq_dash_company_${companyId}`, JSON.stringify(layout));
  } catch {}
}

/* ─── LEGACY WIDGET WRAPPERS (keep existing widgets working) ─────────────── */
function ExpandableWidget({ sizeClass, title, count, countColor='var(--d-blue)', summary, children, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="d-widget-card" style={{ height:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:open?12:0 }}>
        <button onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0, flex:1 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:2 }}>{title}</div>
            <div style={{ fontSize:24, fontWeight:800, color:countColor, fontFamily:'var(--d-mono)' }}>{count ?? '—'}</div>
            {summary && <div style={{ fontSize:11, color:'var(--d-text4)', marginTop:2 }}>{summary}</div>}
          </div>
          <span style={{ marginLeft:'auto', color:'var(--d-text4)', fontSize:14, transform:open?'rotate(180deg)':'none', transition:'transform .2s' }}>▾</span>
        </button>
        {onRemove && <button onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--d-text4)', fontSize:16, padding:'0 4px', marginLeft:6 }}>×</button>}
      </div>
      {open && <div style={{ marginTop:8 }}>{children}</div>}
    </div>
  );
}

/* ─── PRESTART KPI WIDGET ─────────────────────────────────────────────────── */
function WidgetPrestartKPI({ companyId, loading, onRemove, onDrillDown }) {
  const [data, setData] = useState(null);
  const today = new Date().toISOString().split('T')[0];
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [{ data:assets }, { data:subs }, { data:allSubs }] = await Promise.all([
        supabase.from('assets').select('id,name,asset_number,hours,status').eq('company_id', companyId),
        supabase.from('form_submissions').select('*').eq('company_id', companyId).eq('date', today),
        supabase.from('form_submissions').select('asset,date,hrs_start').eq('company_id', companyId).order('date',{ascending:false}).limit(200),
      ]);
      const active = (assets||[]).filter(a => !/inactive|retired/i.test(a.status||''));
      const todaySubs = subs||[];
      const perMachine = active.map(a => {
        const todayPs = todaySubs.filter(s => s.asset === a.name);
        const lastPs = (allSubs||[]).filter(s => s.asset === a.name)[0];
        const hrsDiff = (a.hours||0) - (lastPs?.hrs_start||0);
        const missingToday = todayPs.length === 0 && hrsDiff >= 6;
        return { ...a, todayCount:todayPs.length, hrsDiff, missingToday, todayPs };
      });
      setData({ total:active.length, completed:[...new Set(todaySubs.map(s=>s.asset))].length, missing:perMachine.filter(m=>m.missingToday).length, defects:todaySubs.filter(s=>s.defects_found).length, perMachine, todaySubs });
    })();
  }, [companyId, today]);

  if (!data) return (
    <div className="d-widget d-col-6" style={{ padding:16, gridColumn:'span 6' }}>
      <Sk h="80px" />
    </div>
  );
  const rate = data.total > 0 ? Math.round((data.completed/data.total)*100) : 0;
  const rateColor = rate >= 90 ? 'var(--d-green)' : rate >= 70 ? 'var(--d-amber)' : 'var(--d-red)';
  return (
    <div style={{ background:'var(--d-surf)', height:'100%', padding:0, position:'relative' }}>
      {onRemove && <button onClick={onRemove} style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', color:'var(--d-text4)', fontSize:16, zIndex:2 }}>×</button>}
      <div style={{ padding:'9px 13px', borderBottom:'1px solid var(--d-border)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--d-text2)' }}>
        Prestart KPIs — Today
      </div>
      <div style={{ padding:'12px 13px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
          {[
            { label:'Completed', val:data.completed, color:'var(--d-green)' },
            { label:'Total', val:data.total, color:'var(--d-blue)' },
            { label:'Missing', val:data.missing, color:data.missing>0?'var(--d-red)':'var(--d-green)' },
            { label:'Defects', val:data.defects, color:data.defects>0?'var(--d-amber)':'var(--d-green)' },
          ].map(k => (
            <div key={k.label} onClick={() => onDrillDown && onDrillDown({ title:k.label, color:k.color, columns:['Asset','Detail'], rows:[], emptyMsg:'No data' })}
              style={{ background:'var(--d-s2)', border:`1px solid ${k.color}22`, padding:'10px 8px', textAlign:'center', cursor:'pointer' }}>
              <div style={{ fontFamily:'var(--d-mono)', fontSize:22, fontWeight:700, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:10, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>Completion rate</div>
        <div style={{ height:6, background:'var(--d-border)', overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${rate}%`, background:rateColor }} />
        </div>
        <div style={{ fontFamily:'var(--d-mono)', fontSize:11, fontWeight:700, color:rateColor, marginTop:4 }}>{rate}%</div>
      </div>
    </div>
  );
}

/* ─── SERVICE KPI WIDGET ──────────────────────────────────────────────────── */
function WidgetServiceKPI({ companyId, loading, onRemove, onDrillDown }) {
  const [schedules, setSchedules] = useState([]);
  useEffect(() => {
    if (!companyId) return;
    supabase.from('service_schedules').select('*').eq('company_id', companyId).then(({ data }) => setSchedules(data||[]));
  }, [companyId]);
  const overdue = schedules.filter(s => s.status === 'Overdue');
  const dueSoon = schedules.filter(s => s.status === 'Due Soon');
  const ontrack = schedules.filter(s => !['Overdue','Due Soon'].includes(s.status));
  return (
    <div style={{ background:'var(--d-surf)', height:'100%', padding:0, position:'relative' }}>
      {onRemove && <button onClick={onRemove} style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', color:'var(--d-text4)', fontSize:16, zIndex:2 }}>×</button>}
      <div style={{ padding:'9px 13px', borderBottom:'1px solid var(--d-border)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--d-text2)' }}>
        Service Schedule KPIs
      </div>
      <div style={{ padding:'12px 13px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
          {[
            { label:'Overdue', val:overdue.length, color:'var(--d-red)' },
            { label:'Due Soon', val:dueSoon.length, color:'var(--d-amber)' },
            { label:'On Track', val:ontrack.length, color:'var(--d-green)' },
          ].map(k => (
            <div key={k.label} style={{ background:'var(--d-s2)', border:`1px solid ${k.color}22`, padding:'10px 8px', textAlign:'center', cursor:'pointer' }}
              onClick={() => onDrillDown && onDrillDown({ title:k.label+' Services', color:k.color, columns:['Asset','Service','Due'], rows:[], emptyMsg:'No data' })}>
              <div style={{ fontFamily:'var(--d-mono)', fontSize:22, fontWeight:700, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:10, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>{k.label}</div>
            </div>
          ))}
        </div>
        {overdue.slice(0,3).map(s => (
          <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--d-s2)', fontSize:12 }}>
            <div>
              <div style={{ fontWeight:600, color:'var(--d-text)' }}>{s.asset}</div>
              <div style={{ fontSize:10, color:'var(--d-text4)' }}>{s.task || s.service_name}</div>
            </div>
            <span className="d-tag r">Overdue</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── OTHER LEGACY WIDGETS ────────────────────────────────────────────────── */
function WidgetBreakdowns({ assets, loading, size, onRemove }) {
  const bds = assets.filter(a => a.status === 'Down');
  return (
    <ExpandableWidget title="Breakdowns" count={loading?'—':bds.length} countColor="var(--d-red)" summary={bds[0]?.name} onRemove={onRemove}>
      {!loading && bds.length === 0 && <div style={{ fontSize:12, color:'var(--d-green)', fontWeight:600 }}>✓ All machines running</div>}
      {!loading && bds.map(a => (
        <div key={a.id} style={{ padding:'8px', background:'var(--d-red-bg)', border:'1px solid var(--d-red-bd)', marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--d-text)' }}>{a.name}</div>
          <div style={{ fontSize:11, color:'var(--d-text3)', marginTop:2 }}>{[a.location, a.asset_number?`#${a.asset_number}`:null].filter(Boolean).join(' · ')}</div>
        </div>
      ))}
    </ExpandableWidget>
  );
}
function WidgetOverdue({ maint, loading, size, onRemove }) {
  const ov = maint.filter(m => m.status === 'Overdue');
  return (
    <ExpandableWidget title="Overdue Services" count={loading?'—':ov.length} countColor="var(--d-amber)" summary={ov[0]?.asset} onRemove={onRemove}>
      {!loading && ov.length === 0 && <div style={{ fontSize:12, color:'var(--d-green)', fontWeight:600 }}>✓ No overdue services</div>}
      {!loading && ov.map(m => (
        <div key={m.id} style={{ padding:'8px', background:'var(--d-amber-bg)', border:'1px solid var(--d-amber-bd)', marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--d-text)' }}>{m.asset}</div>
          <div style={{ fontSize:11, color:'var(--d-amber)', fontWeight:600, marginTop:2 }}>{m.task}</div>
        </div>
      ))}
    </ExpandableWidget>
  );
}
function WidgetDueToday({ maint, loading, size, onRemove }) {
  const today = new Date().toISOString().split('T')[0];
  const dt = maint.filter(m => m.next_due === today || m.status === 'Due Soon');
  return (
    <ExpandableWidget title="Due Today" count={loading?'—':dt.length} countColor="var(--d-blue)" summary={dt[0]?.asset} onRemove={onRemove}>
      {!loading && dt.length === 0 && <div style={{ fontSize:12, color:'var(--d-text3)' }}>Nothing due today</div>}
      {!loading && dt.map(m => (
        <div key={m.id} style={{ padding:'8px', background:'var(--d-blue-bg)', border:'1px solid var(--d-blue-bd)', marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--d-text)' }}>{m.asset}</div>
          <div style={{ fontSize:11, color:'var(--d-blue)', fontWeight:600, marginTop:2 }}>{m.task}</div>
        </div>
      ))}
    </ExpandableWidget>
  );
}
function WidgetPriorityWOs({ wos, loading, size, onRemove }) {
  const pw = wos.filter(w => w.priority === 'Critical' || w.priority === 'High');
  return (
    <ExpandableWidget title="Priority Jobs" count={loading?'—':pw.length} countColor="var(--d-red)" summary={pw[0]?.asset} onRemove={onRemove}>
      {!loading && pw.length === 0 && <div style={{ fontSize:12, color:'var(--d-green)', fontWeight:600 }}>✓ No critical jobs</div>}
      {!loading && pw.map(w => {
        const c = w.priority==='Critical'?'var(--d-red)':'var(--d-amber)';
        return (
          <div key={w.id} style={{ padding:'8px', background:c+'10', border:`1px solid ${c}40`, marginBottom:6 }}>
            <div style={{ fontSize:11, fontWeight:700, color:c, marginBottom:3 }}>{w.priority}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--d-text)' }}>{w.defect_description?.slice(0,60)||'—'}</div>
            {w.asset && <div style={{ fontSize:11, color:'var(--d-text3)', marginTop:2 }}>{w.asset}</div>}
          </div>
        );
      })}
    </ExpandableWidget>
  );
}
function WidgetOilSampling({ companyId, size, onRemove }) {
  const [samples, setSamples] = useState([]); const [load, setLoad] = useState(true);
  useEffect(() => { if (!companyId) return; supabase.from('oil_samples').select('*').eq('company_id', companyId).order('created_at',{ascending:false}).limit(20).then(({data}) => { setSamples(data||[]); setLoad(false); }); }, [companyId]);
  const alerts = samples.filter(s => s.ai_condition==='CRITICAL'||s.ai_condition==='WARNING');
  return (
    <ExpandableWidget title="Oil Sampling" count={load?'—':alerts.length} countColor={alerts.length>0?'var(--d-red)':'var(--d-green)'} summary={alerts[0]?.asset_name} onRemove={onRemove}>
      {!load && alerts.length === 0 && <div style={{ fontSize:12, color:'var(--d-green)', fontWeight:600 }}>✓ All oil samples normal</div>}
      {!load && alerts.map(s => { const c = s.ai_condition==='CRITICAL'?'var(--d-red)':'var(--d-amber)'; return (
        <div key={s.id} style={{ padding:'8px', background:c+'10', border:`1px solid ${c}40`, marginBottom:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:13, fontWeight:700, color:'var(--d-text)' }}>{s.asset_name}</span><span style={{ fontSize:11, fontWeight:700, color:c }}>{s.ai_condition}</span></div>
          {s.ai_analysis && <div style={{ fontSize:11, color:c, marginTop:3 }}>{s.ai_analysis?.slice(0,80)}…</div>}
        </div>
      ); })}
    </ExpandableWidget>
  );
}
function WidgetPartsStock({ companyId, size, onRemove }) {
  const [parts, setParts] = useState([]); const [load, setLoad] = useState(true);
  useEffect(() => { if (!companyId) return; supabase.from('parts').select('id,name,quantity,min_quantity,unit').eq('company_id', companyId).then(({data}) => { setParts((data||[]).filter(p=>p.quantity<=p.min_quantity)); setLoad(false); }); }, [companyId]);
  return (
    <ExpandableWidget title="Low Stock Parts" count={load?'—':parts.length} countColor={parts.length>0?'var(--d-amber)':'var(--d-green)'} summary={parts[0]?.name} onRemove={onRemove}>
      {!load && parts.length === 0 && <div style={{ fontSize:12, color:'var(--d-green)', fontWeight:600 }}>✓ All parts stocked</div>}
      {!load && parts.map(p => { const c = p.quantity===0?'var(--d-red)':'var(--d-amber)'; return (
        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 8px', background:c+'10', border:`1px solid ${c}30`, marginBottom:6 }}>
          <div><div style={{ fontSize:12, fontWeight:700, color:'var(--d-text)' }}>{p.name}</div><div style={{ fontSize:10, color:'var(--d-text4)', marginTop:1 }}>Min: {p.min_quantity}</div></div>
          <span style={{ fontFamily:'var(--d-mono)', fontSize:14, fontWeight:800, color:c }}>{p.quantity}</span>
        </div>
      ); })}
    </ExpandableWidget>
  );
}
function WidgetDowntimeSummary({ companyId, size, onRemove }) {
  const [hours, setHours] = useState(null); const [load, setLoad] = useState(true);
  useEffect(() => { if (!companyId) return; const s = new Date(); s.setDate(1); s.setHours(0,0,0,0); supabase.from('downtime').select('hours').eq('company_id', companyId).gte('created_at', s.toISOString()).then(({data}) => { setHours((data||[]).reduce((acc,d) => acc+(parseFloat(d.hours)||0),0)); setLoad(false); }); }, [companyId]);
  return (
    <ExpandableWidget title="Downtime This Month" summary={load?'':`${hours?.toFixed(1)} hrs`} onRemove={onRemove}>
      <div style={{ fontFamily:'var(--d-mono)', fontSize:32, fontWeight:800, color:'var(--d-red)' }}>{load?'—':hours?.toFixed(1)}<span style={{ fontSize:13, color:'var(--d-text3)', marginLeft:4 }}>hrs</span></div>
      {!load && <div style={{ fontSize:12, color:'var(--d-text3)', marginTop:4 }}>Unplanned downtime in {new Date().toLocaleString('default',{month:'long'})}</div>}
    </ExpandableWidget>
  );
}
function WidgetCalendarPreview({ companyId, size, onRemove }) {
  const [events, setEvents] = useState([]); const [load, setLoad] = useState(true);
  useEffect(() => {
    if (!companyId) return;
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date(); in7.setDate(in7.getDate()+7); const end = in7.toISOString().split('T')[0];
    Promise.all([
      supabase.from('maintenance').select('asset,task,next_due').eq('company_id', companyId).gte('next_due',today).lte('next_due',end),
      supabase.from('work_orders').select('asset,defect_description,due_date').eq('company_id', companyId).neq('status','Complete').gte('due_date',today).lte('due_date',end),
    ]).then(([{data:m},{data:w}]) => {
      setEvents([...(m||[]).map(x=>({date:x.next_due,label:`${x.asset} — ${x.task}`,c:'var(--d-blue)'})),(w||[]).map(x=>({date:x.due_date,label:`${x.asset||''} — ${x.defect_description?.slice(0,30)}`,c:'var(--d-amber)'}))]?.sort((a,b)=>a.date?.localeCompare(b.date)));
      setLoad(false);
    });
  }, [companyId]);
  return (
    <ExpandableWidget title="Next 7 Days" count={load?'—':events.length} countColor="var(--d-blue)" onRemove={onRemove}>
      {load ? <Sk h="60px" /> : events.length === 0 ? <div style={{ fontSize:12, color:'var(--d-text3)' }}>Nothing in next 7 days</div> : events.map((ev,i) => (
        <div key={i} style={{ display:'flex', gap:8, padding:'7px 8px', background:'var(--d-s2)', border:'1px solid var(--d-border)', marginBottom:5, alignItems:'center' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:ev.c, flexShrink:0 }} />
          <div style={{ fontFamily:'var(--d-mono)', fontSize:10, fontWeight:700, color:'var(--d-text3)', minWidth:70, flexShrink:0 }}>{ev.date}</div>
          <div style={{ flex:1, fontSize:11, fontWeight:600, color:'var(--d-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.label}</div>
        </div>
      ))}
    </ExpandableWidget>
  );
}
function WidgetMessages({ companyId, size, onRemove }) {
  const [msgs, setMsgs] = useState([]); const [load, setLoad] = useState(true);
  useEffect(() => { if (!companyId) return; supabase.from('messages').select('*').order('created_at',{ascending:false}).limit(5).then(({data}) => { setMsgs(data||[]); setLoad(false); }); }, [companyId]);
  return (
    <ExpandableWidget title="Messages" count={load?'—':msgs.length} countColor="var(--d-blue)" onRemove={onRemove}>
      {load ? <Sk h="40px" /> : msgs.length===0 ? <div style={{ fontSize:12, color:'var(--d-text3)' }}>No recent messages</div> : msgs.map(m => (
        <div key={m.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 8px', background:'var(--d-s2)', border:'1px solid var(--d-border)', marginBottom:5 }}>
          <span style={{ flex:1, fontWeight:600, color:'var(--d-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12 }}>{m.content?.slice(0,60)||'[media]'}</span>
          <span style={{ color:'var(--d-text4)', fontSize:11, flexShrink:0, marginLeft:8 }}>{ago(m.created_at)}</span>
        </div>
      ))}
    </ExpandableWidget>
  );
}

/* ─── CUSTOMISE PANEL (legacy) ────────────────────────────────────────────── */
function CustomisePanel({ layout, onLayoutChange, onClose, onSaveDefault, isAdmin, companyId, userEmail }) {
  const [items, setItems] = useState(layout);
  const [saveDefault, setSaveDefault] = useState(false);
  const labels = { kpi_strip:'KPI Strip', prestart_kpi:'Prestart KPIs', service_kpi:'Service KPIs', breakdowns:'Breakdowns', overdue:'Overdue Services', due_today:'Due Today', priority_wos:'Priority Jobs', oil_sampling:'Oil Sampling', parts_stock:'Parts Stock', downtime_summary:'Downtime', calendar_preview:'Calendar', messages:'Messages' };
  const toggle = (id) => setItems(p => p.map(w => w.id===id ? {...w, enabled:!w.enabled} : w));
  const save = () => { onLayoutChange(items); saveLayout(items, companyId, userEmail, saveDefault); if(saveDefault)onSaveDefault(items); onClose(); };
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.25)', zIndex:299 }} />
      <div className="custom-panel" style={{ animation:'slideIn .25s cubic-bezier(.16,1,.3,1)' }}>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--d-border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--d-text)' }}>Customise Dashboard</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--d-text3)' }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {items.map(w => (
            <div key={w.id} className="custom-item">
              <div style={{ flex:1, fontSize:13, fontWeight:500, color:'var(--d-text)' }}>{labels[w.id]||w.id}</div>
              <button className={`toggle-btn ${w.enabled?'on':'off'}`} onClick={() => toggle(w.id)} />
            </div>
          ))}
        </div>
        <div style={{ padding:'14px 18px', borderTop:'1px solid var(--d-border)', flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
          {isAdmin && (
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--d-text2)', cursor:'pointer' }}>
              <input type="checkbox" checked={saveDefault} onChange={e=>setSaveDefault(e.target.checked)} style={{ width:'auto !important' }} />
              Save as company default
            </label>
          )}
          <button onClick={save} style={{ width:'100%', padding:'10px', background:'var(--d-blue)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--d-f)' }}>Save changes</button>
        </div>
      </div>
    </>
  );
}

/* ─── AI COMMAND BAR ──────────────────────────────────────────────────────── */
function AICommandBar({ stats, assets, maint, wos, onResponse }) {
  const [val, setVal] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const buildContext = () => {
    const overdueAssets = maint.filter(m => m.status==='Overdue');
    const downAssets = assets.filter(a => a.status==='Down');
    const critWOs = wos.filter(w => w.priority==='Critical');
    return `You are MechIQ, an AI fleet maintenance assistant for Australian heavy industry. Answer in plain text, no markdown.
Fleet summary: ${assets.length} total assets, ${stats?.running||0} running, ${stats?.down||0} down, ${stats?.maintenance||0} in maintenance.
Overdue services (${overdueAssets.length}): ${overdueAssets.slice(0,5).map(m=>`${m.asset} - ${m.task}`).join('; ')||'none'}.
Assets down (${downAssets.length}): ${downAssets.slice(0,5).map(a=>a.name).join(', ')||'none'}.
Critical work orders (${critWOs.length}): ${critWOs.slice(0,3).map(w=>w.defect_description?.slice(0,50)).join('; ')||'none'}.
Open work orders: ${wos.length}. Prestart compliance: ${stats?.util||0}%.`;
  };

  const ask = async (query) => {
    if (!query.trim()) return;
    setVal(query);
    setLoading(true);
    onResponse(null, true); // show loading
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildContext(),
          messages:[{ role:'user', content:query }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Unable to get a response.';
      onResponse(text, false);
    } catch {
      onResponse('AI service temporarily unavailable. Please try again.', false);
    }
    setLoading(false);
  };

  const suggestions = [
    'Which assets need attention this week?',
    'Create work orders for overdue services',
    'Predict failures in the next 14 days',
    'Generate a shift handover report',
  ];

  return (
    <div className="d-ai-bar">
      <div className="d-ai-top-line" />
      <div className="d-ai-inner">
        <div className="d-ai-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <input
          ref={inputRef}
          className="d-ai-input"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key==='Enter' && ask(val)}
          placeholder="Ask MechIQ anything… 'Which assets need attention?' · 'Generate service schedule' · 'Analyse overdue trends'"
        />
        <div className="d-ai-quick">
          <div className="d-aq" style={{ color:'var(--d-red)',border:'1px solid var(--d-red-bd)',background:'var(--d-red-bg)' }} onClick={() => ask('Which assets are most at risk of failure this week based on current data?')}>⚡ Risk scan</div>
          <div className="d-aq" style={{ color:'var(--d-blue)',border:'1px solid var(--d-blue-bd)',background:'var(--d-blue-bg)' }} onClick={() => ask('Generate an optimised service schedule for the next 30 days to minimise downtime')}>📋 Auto-schedule</div>
          <div className="d-aq" style={{ color:'var(--d-ai)',border:'1px solid var(--d-ai-bd)',background:'var(--d-ai-bg)' }} onClick={() => ask('What is our current fleet health score and top 3 ways to improve it?')}>📊 Fleet score</div>
        </div>
      </div>
      <div className="d-ai-sug-row">
        <span className="d-sug-lbl">Try:</span>
        {suggestions.map(s => <span key={s} className="d-sug" onClick={() => ask(s)}>{s}</span>)}
      </div>
    </div>
  );
}

/* ─── MAIN DASHBOARD ──────────────────────────────────────────────────────── */
function Dashboard({ companyId, userRole }) {
  const [stats, setStats]   = useState(null);
  const [dt, setDT]         = useState([]);
  const [maint, setMaint]   = useState([]);
  const [assets, setAssets] = useState([]);
  const [wos, setWOs]       = useState([]);
  const [loading, setLoad]  = useState(true);
  const [refreshing, setRef]= useState(false);
  const [showCustomise, setShowCustomise] = useState(false);
  const [layout, setLayout] = useState(() => getLayout(companyId, userRole?.email||''));
  const [customWidgets, setCustomWidgets] = useState([]);
  const [drillDown, setDrillDown] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWidget, setEditingWidget] = useState(null);
  const [aiResp, setAiResp] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const { toasts, add: toast } = useToast();
  const isAdmin = ['admin','supervisor'].includes(userRole?.role);

  useEffect(() => {
    if (!document.getElementById('d-css')) {
      const s = document.createElement('style'); s.id='d-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    if (companyId) { load(); loadCustomWidgets(); }
  }, [companyId]);

  const loadCustomWidgets = async () => {
    const { data } = await supabase.from('custom_widgets').select('*').eq('company_id', companyId).order('created_at');
    setCustomWidgets((data||[]).map(row => ({ ...row.config, id:row.id })));
  };

  const hideWidget = (id) => {
    const next = layout.map(w => w.id===id ? {...w,enabled:false} : w);
    setLayout(next); saveLayout(next, companyId, userRole?.email||'');
    toast('Widget hidden — restore in Customise', 'info');
  };

  const load = async (isRefresh=false) => {
    if (isRefresh) setRef(true); else setLoad(true);
    try {
      const [{ data:aD }, { data:dD }, { data:mD }, { data:wD }] = await Promise.all([
        supabase.from('assets').select('*').eq('company_id', companyId),
        supabase.from('downtime').select('*').eq('company_id', companyId).order('created_at',{ascending:false}).limit(8),
        supabase.from('maintenance').select('*').eq('company_id', companyId).order('created_at',{ascending:false}).limit(30),
        supabase.from('work_orders').select('*').eq('company_id', companyId).neq('status','Complete').order('created_at',{ascending:false}).limit(10),
      ]);
      const a = aD||[];
      setAssets(a); setDT(dD||[]); setMaint(mD||[]); setWOs(wD||[]);
      const ov = (mD||[]).filter(m=>m.status==='Overdue').length;
      const dn = a.filter(x=>x.status==='Down').length;
      setStats({ total:a.length, running:a.filter(x=>x.status==='Running').length, down:dn, maintenance:a.filter(x=>x.status==='Maintenance').length, overdue:ov, dueSoon:(mD||[]).filter(m=>m.status==='Due Soon').length, openWOs:(wD||[]).length, util:a.length>0?Math.round((a.filter(x=>x.status==='Running').length/a.length)*100):0 });
      if (isRefresh) toast('Dashboard refreshed','success');
      else if (dn>0) toast(`${dn} asset${dn>1?'s':''} currently down`,'warning');
      else if (ov>0) toast(`${ov} overdue service${ov>1?'s':''} need attention`,'warning');
    } catch { toast('Failed to load data','error'); }
    setLoad(false); setRef(false);
  };

  const handleAIResponse = (text, isLoading) => {
    setAiLoading(isLoading);
    if (text) setAiResp(text);
  };

  // Derived data for UI
  const activeCount   = assets.filter(a => /active|running/i.test(a.status||'')).length;
  const downCount     = assets.filter(a => /down|offline|breakdown/i.test(a.status||'')).length;
  const maintCount    = assets.filter(a => /maintenance/i.test(a.status||'')).length;
  const overdueCount  = maint.filter(m => /overdue/i.test(m.status||'')).length;
  const openWOCount   = wos.length;
  const progressAssets= assets.filter(a=>a.current_hours&&a.next_service_hours).slice(0,6);
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Timeline: top 5 assets by service urgency
  const tlAssets = [...maint].sort((a,b) => {
    const ord = {Overdue:0,'Due Soon':1,Upcoming:2};
    return (ord[a.status]??3) - (ord[b.status]??3);
  }).slice(0,5);

  // AI-generated insights from real data (deterministic, no API)
  const insights = [
    overdueCount > 0 && {
      level:'high', badge:'CRITICAL', badgeColor:'var(--d-red)', conf:`${overdueCount} service${overdueCount>1?'s':''} overdue`,
      text: `${maint.filter(m=>m.status==='Overdue').slice(0,2).map(m=>m.asset).join(' and ')} ${overdueCount===1?'is':'are'} overdue for scheduled maintenance. Immediate action required.`,
      act: 'View overdue services →', actFn: () => setDrillDown({ title:'Overdue Services', color:'var(--d-red)', columns:['Asset','Service','Due','Status'], rows:maint.filter(m=>m.status==='Overdue').map(m=>[m.asset||'—',m.task||'—',m.next_due||'—',m.status||'—']), emptyMsg:'None' }),
    },
    downCount > 0 && {
      level:'high', badge:'FAULT', badgeColor:'var(--d-red)', conf:`${downCount} offline`,
      text: `${assets.filter(a=>a.status==='Down').slice(0,2).map(a=>a.name).join(' and ')} ${downCount===1?'is':'are'} currently offline. Check work orders for repair status.`,
      act: 'View assets down →', actFn: () => setDrillDown({ title:'Assets Down', color:'var(--d-red)', columns:['Asset','Serial','Location','Status'], rows:assets.filter(a=>a.status==='Down').map(a=>[a.name,a.asset_number||'—',a.location||'—',a.status]), emptyMsg:'None' }),
    },
    stats?.dueSoon > 0 && {
      level:'med', badge:'WARNING', badgeColor:'var(--d-amber)', conf:`${stats.dueSoon} due soon`,
      text: `${stats.dueSoon} service${stats.dueSoon>1?'s are':' is'} coming due soon. Schedule now to avoid unplanned downtime.`,
      act: 'View due soon →', actFn: () => setDrillDown({ title:'Due Soon', color:'var(--d-amber)', columns:['Asset','Service','Due'], rows:maint.filter(m=>m.status==='Due Soon').map(m=>[m.asset||'—',m.task||'—',m.next_due||'—']), emptyMsg:'None' }),
    },
    wos.filter(w=>w.priority==='Critical').length > 0 && {
      level:'high', badge:'CRITICAL WO', badgeColor:'var(--d-red)', conf:'Needs action',
      text: `${wos.filter(w=>w.priority==='Critical').length} critical work order${wos.filter(w=>w.priority==='Critical').length>1?'s':''} require immediate attention.`,
      act: 'View critical WOs →', actFn: () => setDrillDown({ title:'Critical Work Orders', color:'var(--d-red)', columns:['Asset','Description','Priority','Status'], rows:wos.filter(w=>w.priority==='Critical').map(w=>[w.asset||'—',w.defect_description?.slice(0,50)||'—',w.priority,w.status]), emptyMsg:'None' }),
    },
    stats && {
      level:'pred', badge:'AI OPTIMISE', badgeColor:'var(--d-ai)', conf:'Recommendation',
      text: `Fleet utilisation is ${stats.util}%. ${stats.util < 70 ? 'Below target — review asset availability and scheduling.' : stats.util >= 90 ? 'Excellent — fleet running near capacity.' : 'On track — maintain current service cadence.'}`,
      act: 'View fleet overview →', actFn: () => setDrillDown({ title:'All Assets', color:'var(--d-blue)', columns:['Asset','Status','Location','Hours'], rows:assets.map(a=>[a.name,a.status||'—',a.location||'—',a.hours?.toLocaleString()||'—']), emptyMsg:'No assets' }),
    },
  ].filter(Boolean).slice(0,3);

  // Activity feed from real data
  const activity = [
    ...dt.slice(0,3).map(d => ({ c:'var(--d-red)', text:d.asset, sub:`Downtime · ${d.category||'Unplanned'}`, time:ago(d.created_at) })),
    ...maint.filter(m=>m.status==='Overdue').slice(0,2).map(m => ({ c:'var(--d-amber)', text:m.asset||'—', sub:m.task||'Service overdue', time:m.next_due||'' })),
    ...wos.filter(w=>w.priority==='Critical').slice(0,2).map(w => ({ c:'var(--d-red)', text:w.title||'Critical WO', sub:w.asset||'', time:ago(w.created_at) })),
  ].slice(0,6);

  // Heatmap cells from real assets (top 8)
  const hmAssets = assets.slice(0, 8);

  const WIDGET_COMPONENTS = {
    fleet_health:     (w) => null, // replaced by heatmap
    breakdowns:       (w) => <WidgetBreakdowns key={w.id} assets={assets} loading={loading} size={w.size} onRemove={w.onRemove} />,
    overdue:          (w) => <WidgetOverdue key={w.id} maint={maint} loading={loading} size={w.size} onRemove={w.onRemove} />,
    due_today:        (w) => <WidgetDueToday key={w.id} maint={maint} loading={loading} size={w.size} onRemove={w.onRemove} />,
    priority_wos:     (w) => <WidgetPriorityWOs key={w.id} wos={wos} loading={loading} size={w.size} onRemove={w.onRemove} />,
    oil_sampling:     (w) => <WidgetOilSampling key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    parts_stock:      (w) => <WidgetPartsStock key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    downtime_summary: (w) => <WidgetDowntimeSummary key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    calendar_preview: (w) => <WidgetCalendarPreview key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
    messages:         (w) => <WidgetMessages key={w.id} companyId={companyId} size={w.size} onRemove={w.onRemove} />,
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div style={{ display:'flex', flexDirection:'column', gap:12, animation:'fadeUp .35s ease both', fontFamily:'var(--d-f)' }}>

        {/* ── Date row ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--d-text)' }}>Operations Overview</span>
            {loading ? <Sk w="48px" h="18px" /> : <span className="d-tag b">Live</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'var(--d-mono)', fontSize:11, color:'var(--d-text4)' }}>
              {now.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'})} · {now.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})} AEST
            </span>
            {isAdmin && (
              <button onClick={() => { setEditingWidget(null); setShowBuilder(true); }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'var(--d-blue-bg)', border:'1px solid var(--d-blue-bd)', color:'var(--d-blue)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--d-f)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Widget
              </button>
            )}
            <button onClick={() => setShowCustomise(true)}
              style={{ padding:'5px 11px', background:'#fff', border:'1px solid var(--d-border2)', color:'var(--d-text2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--d-f)' }}>
              Customise
            </button>
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', background:'#fff', border:'1px solid var(--d-border2)', color:'var(--d-text2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--d-f)' }}>
              <span style={{ display:'inline-block', animation:refreshing?'spin .8s linear infinite':'none' }}>↻</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── AI Command Bar ── */}
        <AICommandBar stats={stats} assets={assets} maint={maint} wos={wos} onResponse={handleAIResponse} />

        {/* ── AI Response ── */}
        {(aiLoading || aiResp) && (
          <div className={`d-ai-resp show`}>
            <div className="d-air-lbl">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              MechIQ AI · Response
            </div>
            {aiLoading
              ? <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--d-ai)', fontSize:13 }}><div style={{ width:16, height:16, border:'2px solid var(--d-ai-bd)', borderTopColor:'var(--d-ai)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Analysing your fleet data…</div>
              : <div className="d-air-text">{aiResp}</div>
            }
            {aiResp && !aiLoading && (
              <div className="d-air-btns">
                <button className="d-air-btn-g" onClick={() => setAiResp(null)}>Dismiss</button>
              </div>
            )}
          </div>
        )}

        {/* ── Briefing Cards ── */}
        <div className="d-briefings">
          <div className="d-brief" style={{ borderLeftColor:'var(--d-blue)' }}>
            <div className="d-brief-ey">AI · Daily Briefing</div>
            <div className="d-brief-h">
              {loading ? 'Loading…' : overdueCount > 0
                ? `${overdueCount} service${overdueCount>1?'s':''} overdue. ${maint.find(m=>m.status==='Overdue')?.asset||'Check maintenance'} is highest priority.`
                : downCount > 0
                ? `${downCount} asset${downCount>1?'s':''} offline. ${assets.find(a=>a.status==='Down')?.name||'Check fleet'} requires attention.`
                : `Fleet running normally. ${activeCount} of ${assets.length} assets active.`
              }
            </div>
            <div className="d-brief-p">
              {!loading && `Fleet at ${stats?.util||0}% utilisation. ${openWOCount > 0 ? `${openWOCount} open work orders.` : 'No open work orders.'}`}
            </div>
            <div className="d-brief-meta">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Generated {now.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
          <div className="d-brief" style={{ borderLeftColor: downCount>0||overdueCount>0?'var(--d-red)':'var(--d-amber)' }}>
            <div className="d-brief-ey">AI · Predictive Alert</div>
            <div className="d-brief-h">
              {loading ? 'Loading…' : stats?.dueSoon > 0
                ? `${stats.dueSoon} service${stats.dueSoon>1?'s':''} coming due. Schedule now to avoid unplanned downtime.`
                : wos.filter(w=>w.priority==='Critical').length > 0
                ? `${wos.filter(w=>w.priority==='Critical').length} critical work order${wos.filter(w=>w.priority==='Critical').length>1?'s':''} require immediate attention.`
                : 'No critical alerts. Continue monitoring service intervals.'
              }
            </div>
            <div className="d-brief-p">
              {!loading && maint.filter(m=>m.status==='Due Soon').slice(0,2).map(m=>m.asset).join(' and ')} {stats?.dueSoon > 0 ? 'are approaching their service interval.' : ''}
            </div>
            <div className="d-brief-meta">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Based on real-time fleet data
            </div>
          </div>
          <div className="d-brief" style={{ borderLeftColor:'var(--d-ai)' }}>
            <div className="d-brief-ey">AI · Self-Learning Update</div>
            <div className="d-brief-h">MechIQ is analysing your fleet patterns. Prediction models update nightly.</div>
            <div className="d-brief-p">
              {assets.length > 0 ? `${assets.length} assets tracked · ${maint.length} service records analysed · AI ready.` : 'Connect your assets to unlock AI predictions.'}
            </div>
            <div className="d-brief-meta">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Model updates tonight 22:00
            </div>
          </div>
        </div>

        {/* ── Prestart + Service KPIs ── */}
        {layout.find(w=>w.id==='prestart_kpi')?.enabled !== false && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1px', background:'var(--d-border)' }}>
            <WidgetPrestartKPI companyId={companyId} loading={loading} onRemove={isAdmin ? () => hideWidget('prestart_kpi') : undefined} onDrillDown={setDrillDown} />
            {layout.find(w=>w.id==='service_kpi')?.enabled !== false && (
              <WidgetServiceKPI companyId={companyId} loading={loading} onRemove={isAdmin ? () => hideWidget('service_kpi') : undefined} onDrillDown={setDrillDown} />
            )}
          </div>
        )}

        {/* ── Customise Bar ── */}
        <div className="d-cust-bar">
          <div className="d-cust-l">
            <span className="d-cust-lbl">Layout</span>
            <div className="d-lb-btns">
              <div className="d-lb on" title="Grid">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="0" y="0" width="4" height="4"/><rect x="6" y="0" width="4" height="4"/><rect x="0" y="6" width="4" height="4"/><rect x="6" y="6" width="4" height="4"/></svg>
              </div>
            </div>
            <div className="d-ai-learn">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              AI learning your usage
              <div className="d-learn-track"><div className="d-learn-fill" /></div>
            </div>
          </div>
          {isAdmin && (
            <div className="d-add-w" onClick={() => { setEditingWidget(null); setShowBuilder(true); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Widget
            </div>
          )}
        </div>

        {/* ══ MAIN WIDGET GRID ══ */}
        <div className="d-wgrid">

          {/* KPI group */}
          <div className="d-widget d-col-4" style={{ padding:0 }}>
            <div className="d-panel-hdr d-panel"><span className="d-panel-title">Key Metrics</span></div>
            <div className="d-kpi-group">
              <div className="d-kc d-kc-b" style={{ cursor:'pointer' }} onClick={() => setDrillDown({ title:'All Assets', color:'var(--d-blue)', columns:['Asset','Status','Location','Hours'], rows:assets.map(a=>[a.name,a.status||'—',a.location||'—',a.hours?.toLocaleString()||'—']), emptyMsg:'No assets' })}>
                <div className="d-kpi-l">Active Assets</div>
                <div className="d-kpi-v" style={{ color:'var(--d-blue)' }}>{loading?'—':`${activeCount}`}<span style={{ fontSize:13, color:'var(--d-text4)' }}>/{assets.length}</span></div>
                <div className="d-kpi-sub"><span className="d-up">↑</span> of total fleet</div>
              </div>
              <div className="d-kc d-kc-r" style={{ cursor:'pointer' }} onClick={() => setDrillDown({ title:'Overdue Services', color:'var(--d-red)', columns:['Asset','Service','Due','Status'], rows:maint.filter(m=>m.status==='Overdue').map(m=>[m.asset||'—',m.task||'—',m.next_due||'—',m.status]), emptyMsg:'No overdue services ✓' })}>
                <div className="d-kpi-l">Overdue</div>
                <div className="d-kpi-v" style={{ color:'var(--d-red)' }}>{loading?'—':overdueCount}</div>
                <div className="d-kpi-sub">{overdueCount>0?<span className="d-dn">↑ services past due</span>:<span className="d-up">All on schedule</span>}</div>
              </div>
              <div className="d-kc d-kc-g" style={{ cursor:'pointer' }} onClick={() => setDrillDown({ title:'Prestart Compliance', color:'var(--d-green)', columns:['Asset','Today','Status'], rows:assets.map(a=>[a.name,a.status==='Running'?'Active':'—',a.status]), emptyMsg:'No data' })}>
                <div className="d-kpi-l">Prestart Rate</div>
                <div className="d-kpi-v" style={{ color:'var(--d-green)' }}>{loading?'—':`${stats?.util||0}`}<span style={{ fontSize:13 }}>%</span></div>
                <div className="d-kpi-sub"><span className="d-up">↑</span> compliance</div>
              </div>
              <div className="d-kc d-kc-a" style={{ cursor:'pointer' }} onClick={() => setDrillDown({ title:'Open Work Orders', color:'var(--d-amber)', columns:['Asset','Description','Priority','Status'], rows:wos.map(w=>[w.asset||'—',w.defect_description?.slice(0,50)||'—',w.priority||'—',w.status||'—']), emptyMsg:'No open WOs ✓' })}>
                <div className="d-kpi-l">Open WOs</div>
                <div className="d-kpi-v" style={{ color:openWOCount>0?'#D97706':'var(--d-text)' }}>{loading?'—':openWOCount}</div>
                <div className="d-kpi-sub">{openWOCount>0?<span className="d-dn">{wos.filter(w=>w.priority==='Critical').length} critical</span>:'All closed'}</div>
              </div>
            </div>
          </div>

          {/* Fleet heatmap */}
          <div className="d-widget d-col-4">
            <div className="d-panel-hdr d-panel"><span className="d-panel-title">Fleet Status Heatmap</span></div>
            <div className="d-heatmap">
              {loading
                ? Array(8).fill(0).map((_,i) => <div key={i} className="d-sk" style={{ aspectRatio:'1' }} />)
                : hmAssets.length === 0
                ? <div style={{ gridColumn:'span 4', padding:12, fontSize:12, color:'var(--d-text4)' }}>No assets found</div>
                : hmAssets.map(a => {
                    const isDown = /down|offline/i.test(a.status||'');
                    const isMaint = /maintenance/i.test(a.status||'');
                    const isRun = /running|active/i.test(a.status||'');
                    const bg = isDown ? 'var(--d-red-bg)' : isMaint ? 'var(--d-amber-bg)' : isRun ? 'var(--d-green-bg)' : 'var(--d-s2)';
                    const bd = isDown ? 'var(--d-red-bd)' : isMaint ? 'var(--d-amber-bd)' : isRun ? 'var(--d-green-bd)' : 'var(--d-border)';
                    const vc = isDown ? 'var(--d-red)' : isMaint ? 'var(--d-amber)' : isRun ? 'var(--d-green)' : 'var(--d-text3)';
                    const label = isDown ? 'OFF' : isMaint ? 'MNT' : isRun ? `${a.hours ? Math.round(a.hours/100) : '—'}%` : '—';
                    return (
                      <div key={a.id} className="d-hm" style={{ background:bg, borderColor:bd }} onClick={() => setDrillDown({ title:a.name, color:vc, columns:['Field','Value'], rows:[['Status',a.status||'—'],['Location',a.location||'—'],['Hours',a.hours?.toLocaleString()||'—'],['Serial',a.asset_number||'—']], emptyMsg:'No data' })}>
                        <div className="d-hm-v" style={{ color:vc }}>{label}</div>
                        <div className="d-hm-n">{(a.name||'Asset').slice(0,8)}</div>
                      </div>
                    );
                  })
              }
            </div>
          </div>

          {/* AI Insights */}
          <div className="d-widget d-col-4" style={{ padding:0 }}>
            <div className="d-panel-hdr d-panel" style={{ borderBottom:'1px solid var(--d-ai-bd)' }}>
              <span className="d-panel-title" style={{ color:'var(--d-ai)' }}>⚡ AI Predictive Insights</span>
              <span style={{ fontFamily:'var(--d-mono)', fontSize:9, color:'var(--d-text4)' }}>{now.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}</span>
            </div>
            <div>
              {loading
                ? [1,2,3].map(i => <div key={i} style={{ padding:'10px 12px', borderBottom:'1px solid var(--d-border)' }}><Sk h="40px" /></div>)
                : insights.length === 0
                ? <div style={{ padding:'20px', textAlign:'center', fontSize:12, color:'var(--d-text4)' }}>✓ No critical insights at this time</div>
                : insights.map((ins, i) => (
                  <div key={i} className="d-aic" style={{ borderLeftColor: ins.badgeColor }}>
                    <div className="d-aic-top">
                      <span className="d-aic-badge" style={{ color:ins.badgeColor, borderColor:ins.badgeColor, background:ins.badgeColor+'15' }}>{ins.badge}</span>
                      <span className="d-aic-conf">{ins.conf}</span>
                    </div>
                    <div className="d-aic-text">{ins.text}</div>
                    <div className="d-aic-act" onClick={ins.actFn}>{ins.act}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Predictive timeline */}
          <div className="d-widget d-col-8">
            <div className="d-panel-hdr d-panel">
              <span className="d-panel-title">Predictive Service Timeline</span>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span className="d-tag p">AI Tracked</span>
              </div>
            </div>
            <div style={{ padding:13 }}>
              <div className="d-tl-axis"><span>NOW</span><span>+7 days</span><span>+14 days</span><span>+21 days</span><span>+30 days</span></div>
              <div>
                {loading
                  ? [1,2,3,4,5].map(i => <div key={i} className="d-tl-row"><div className="d-sk d-tl-lbl" /><div className="d-sk" style={{ flex:1, height:14 }} /></div>)
                  : tlAssets.length === 0
                  ? <div style={{ fontSize:12, color:'var(--d-text4)', padding:'8px 0' }}>No scheduled services found</div>
                  : tlAssets.map((m, i) => {
                      const isOv = m.status==='Overdue';
                      const isDue = m.status==='Due Soon';
                      const barColor = isOv ? 'rgba(185,28,28,.55)' : isDue ? 'rgba(180,83,9,.4)' : 'rgba(21,128,61,.3)';
                      const barLeft = isOv ? '0%' : isDue ? '12%' : `${20 + i*10}%`;
                      const barWidth = isOv ? '8%' : isDue ? '20%' : '22%';
                      return (
                        <div key={m.id} className="d-tl-row">
                          <div className="d-tl-lbl">{(m.asset||'Asset').slice(0,12)}</div>
                          <div className="d-tl-track">
                            <div className="d-tl-bar" style={{ left:barLeft, width:barWidth, background:barColor }}>
                              <div className="d-tl-bar-t">{isOv ? 'OVERDUE' : isDue ? 'Due soon' : m.task?.slice(0,12)||'Service'}</div>
                            </div>
                            <div className="d-tl-now" style={{ left:'2%' }} />
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>

          {/* AI Self-Learning */}
          <div className="d-widget d-col-4" style={{ padding:0, borderTop:'2px solid var(--d-ai-bd)' }}>
            <div className="d-panel-hdr d-panel">
              <span className="d-panel-title" style={{ color:'var(--d-ai)' }}>AI Self-Learning Status</span>
            </div>
            <div style={{ padding:12 }}>
              {[
                { label:'Service failure prediction', pct:78 },
                { label:'Interval optimisation',      pct:65 },
                { label:'Fuel anomaly detection',     pct:82 },
                { label:'Prestart defect patterns',   pct:60 },
              ].map(r => (
                <div key={r.label} className="d-lw-row">
                  <span className="d-lw-l">{r.label}</span>
                  <div className="d-lw-r">
                    <div className="d-lw-bar"><div className="d-lw-fill" style={{ width:`${r.pct}%` }} /></div>
                    <span className="d-lw-v">{r.pct}%</span>
                  </div>
                </div>
              ))}
              <div className="d-lw-row"><span className="d-lw-l">Assets tracked</span><span className="d-lw-v">{assets.length}</span></div>
              <div className="d-lw-row"><span className="d-lw-l">Service records</span><span className="d-lw-v">{maint.length}</span></div>
              <div className="d-lw-row"><span className="d-lw-l">Next training run</span><span style={{ fontFamily:'var(--d-mono)', fontSize:10, fontWeight:700, color:'var(--d-ai)' }}>Tonight 22:00</span></div>
            </div>
          </div>

          {/* Fleet Status Register */}
          <div className="d-widget d-col-8" style={{ padding:0 }}>
            <div className="d-panel-hdr d-panel">
              <span className="d-panel-title">Fleet Status Register</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {downCount > 0 && <span className="d-tag r">{downCount} offline</span>}
                <span style={{ fontSize:11, color:'var(--d-blue)', cursor:'pointer', fontWeight:600, fontFamily:'var(--d-f)' }} onClick={() => setDrillDown({ title:'Full Fleet Register', color:'var(--d-blue)', columns:['Asset','Serial','Status','Location','Hours'], rows:assets.map(a=>[a.name,a.asset_number||'—',a.status||'—',a.location||'—',a.hours?.toLocaleString()||'—']), emptyMsg:'No assets' })}>Full register →</span>
              </div>
            </div>
            {loading
              ? <div style={{ padding:12 }}><Sk h="120px" /></div>
              : <table className="d-tbl">
                  <thead><tr><th>Asset</th><th>Status</th><th>Hours</th><th>Utilisation</th><th>Next Service</th><th>AI Risk</th></tr></thead>
                  <tbody>
                    {assets.slice(0,6).map(a => {
                      const isDown = /down|offline/i.test(a.status||'');
                      const isMaint = /maintenance/i.test(a.status||'');
                      const svc = maint.find(m => m.asset===a.name);
                      const riskColor = isDown||svc?.status==='Overdue' ? 'var(--d-red)' : isMaint||svc?.status==='Due Soon' ? 'var(--d-amber)' : 'var(--d-green)';
                      const riskLabel = isDown||svc?.status==='Overdue' ? 'HIGH' : isMaint||svc?.status==='Due Soon' ? 'MED' : 'LOW';
                      const riskCls = isDown||svc?.status==='Overdue' ? 'r' : isMaint||svc?.status==='Due Soon' ? 'a' : 'g';
                      const util = a.hours && a.next_service_hours ? Math.min(100, Math.round((a.hours/a.next_service_hours)*100)) : null;
                      return (
                        <tr key={a.id} style={{ cursor:'pointer' }} onClick={() => setDrillDown({ title:a.name, color:riskColor, columns:['Field','Value'], rows:[['Status',a.status||'—'],['Serial',a.asset_number||'—'],['Location',a.location||'—'],['Hours',a.hours?.toLocaleString()||'—'],['Next service',svc?.next_due||'—']], emptyMsg:'No data' })}>
                          <td><div className="d-an">{a.name}</div><div className="d-aid">{a.asset_number||''}</div></td>
                          <td><STag status={a.status||'Unknown'} /></td>
                          <td><span style={{ fontFamily:'var(--d-mono)', fontSize:12, fontWeight:600 }}>{a.hours?.toLocaleString()||'—'}</span></td>
                          <td>
                            {util !== null ? (
                              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                <div className="d-prog-s"><div className="d-prog-sf" style={{ width:`${util}%` }} /></div>
                                <span style={{ fontFamily:'var(--d-mono)', fontSize:10, color:'var(--d-text3)' }}>{util}%</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td>
                            {svc
                              ? <span style={{ fontFamily:'var(--d-mono)', fontSize:11, fontWeight:700, color:svc.status==='Overdue'?'var(--d-red)':svc.status==='Due Soon'?'var(--d-amber)':'var(--d-green)' }}>
                                  {svc.status==='Overdue'?'OVERDUE':svc.next_due||svc.status}
                                </span>
                              : <span style={{ color:'var(--d-text4)', fontSize:11 }}>—</span>
                            }
                          </td>
                          <td><span className={`d-tag ${riskCls}`}>{riskLabel}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            }
          </div>

          {/* Activity Feed */}
          <div className="d-widget d-col-4" style={{ padding:0 }}>
            <div className="d-panel-hdr d-panel"><span className="d-panel-title">Live Activity</span></div>
            {loading
              ? <div style={{ padding:12 }}><Sk h="100px" /></div>
              : activity.length === 0
              ? <div style={{ padding:'20px', textAlign:'center', fontSize:12, color:'var(--d-text4)' }}>No recent activity</div>
              : activity.map((a, i) => (
                <div key={i} className="d-act-item">
                  <div className="d-a-dot" style={{ background:a.c }} />
                  <div>
                    <div className="d-a-t">{a.text}</div>
                    <div className="d-a-sub">{a.sub}{a.time && ` · ${a.time}`}</div>
                  </div>
                </div>
              ))
            }
          </div>

        </div>{/* /wgrid */}

        {/* ── Legacy customisable widgets ── */}
        {layout.filter(w => w.enabled && !['kpi_strip','prestart_kpi','service_kpi'].includes(w.id)).length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:4 }}>
            {layout.filter(w => w.enabled && !['kpi_strip','prestart_kpi','service_kpi'].includes(w.id)).map(w => {
              const renderer = WIDGET_COMPONENTS[w.id];
              if (!renderer) return null;
              return (
                <div key={w.id}>
                  {renderer({ ...w, onRemove: isAdmin ? () => hideWidget(w.id) : undefined })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Custom Widgets ── */}
        {customWidgets.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text4)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10 }}>Custom Widgets</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {customWidgets.map(w => (
                <WidgetCustom key={w.id} config={w} companyId={companyId} isAdmin={isAdmin} onEdit={() => { setEditingWidget(w); setShowBuilder(true); }} onDelete={async () => { await supabase.from('custom_widgets').delete().eq('id',w.id); setCustomWidgets(p => p.filter(x=>x.id!==w.id)); toast('Widget removed','success'); }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty custom widgets */}
        {customWidgets.length === 0 && isAdmin && (
          <div style={{ border:'1.5px dashed var(--d-border)', padding:'20px', textAlign:'center', cursor:'pointer' }} onClick={() => { setEditingWidget(null); setShowBuilder(true); }}>
            <div style={{ fontSize:26, marginBottom:7, opacity:.4 }}>📊</div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--d-text2)', marginBottom:4 }}>Add custom widgets</div>
            <div style={{ fontSize:12, color:'var(--d-text4)', marginBottom:10 }}>Build KPIs, charts and tables from your fleet data.</div>
            <div style={{ display:'inline-block', padding:'7px 16px', background:'var(--d-blue)', color:'#fff', fontSize:12, fontWeight:700 }}>+ Create Widget</div>
          </div>
        )}

        {/* Service intervals */}
        {progressAssets.length > 0 && (
          <div style={{ background:'var(--d-surf)', border:'1px solid var(--d-border)', padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--d-text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              Service Intervals
              <span style={{ fontSize:10, color:'var(--d-text4)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>Hours to next service</span>
            </div>
            {progressAssets.map(a => {
              const pct = Math.min(100, a.next_service_hours>0?Math.round((a.current_hours/a.next_service_hours)*100):0);
              const c = pct>=90?'var(--d-red)':pct>=70?'var(--d-amber)':'var(--d-blue)';
              return (
                <div key={a.id} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                    <span style={{ fontWeight:500, color:'var(--d-text2)' }}>{a.asset_number?`${a.asset_number} — ${a.name}`:a.name}</span>
                    <span style={{ fontFamily:'var(--d-mono)', fontWeight:700, color:c }}>{pct}% · {a.current_hours}/{a.next_service_hours}h</span>
                  </div>
                  <div style={{ height:5, background:'var(--d-border)' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:c }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>{/* /outer */}

      {/* ── Drill-down Panel ── */}
      {drillDown && (
        <>
          <div className="d-dd-overlay" onClick={() => setDrillDown(null)} />
          <div className="d-dd-panel">
            <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
              <div style={{ width:36, height:4, background:'var(--d-border)' }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid var(--d-border)', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--d-text)' }}>{drillDown.title}</div>
              <button onClick={() => setDrillDown(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--d-text3)', padding:'4px 8px' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'0 20px 20px' }}>
              {drillDown.rows.length === 0
                ? <div style={{ padding:'40px 0', textAlign:'center', color:'var(--d-text3)', fontSize:14 }}>{drillDown.emptyMsg||'No records'}</div>
                : <table style={{ width:'100%', borderCollapse:'collapse', marginTop:4 }}>
                    <thead>
                      <tr>{drillDown.columns.map(c => <th key={c} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--d-text3)', textTransform:'uppercase', letterSpacing:'.8px', borderBottom:'2px solid var(--d-border)', whiteSpace:'nowrap' }}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {drillDown.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid var(--d-border)' }}>
                          {row.map((cell, j) => <td key={j} style={{ padding:'11px 12px', fontSize:13, color:j===0?'var(--d-text)':'var(--d-text2)', fontWeight:j===0?600:400 }}>{cell}</td>)}
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
        <WidgetBuilderModal companyId={companyId} editConfig={editingWidget}
          onSave={cfg => { setCustomWidgets(p => { const ex=p.find(w=>w.id===cfg.id); return ex?p.map(w=>w.id===cfg.id?cfg:w):[...p,cfg]; }); setShowBuilder(false); setEditingWidget(null); toast('Widget saved','success'); }}
          onClose={() => { setShowBuilder(false); setEditingWidget(null); }}
        />
      )}

      {showCustomise && (
        <CustomisePanel layout={layout} onLayoutChange={setLayout} onClose={() => setShowCustomise(false)}
          onSaveDefault={l => toast('Company default saved','success')} isAdmin={isAdmin}
          companyId={companyId} userEmail={userRole?.email||''}
        />
      )}
    </>
  );
}

export default Dashboard;
