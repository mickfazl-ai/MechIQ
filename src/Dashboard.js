import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

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

/* ── Main Dashboard ── */
function Dashboard({ companyId }) {
  const [stats, setStats]   = useState(null);
  const [dt, setDT]         = useState([]);
  const [maint, setMaint]   = useState([]);
  const [assets, setAssets] = useState([]);
  const [wos, setWOs]       = useState([]);
  const [loading, setLoad]  = useState(true);
  const [refreshing, setRef]= useState(false);
  const [hVis, setHVis]     = useState(false);
  const { toasts, add: toast } = useToast();

  useEffect(() => {
    if (!document.getElementById('dash-css')) {
      const s = document.createElement('style'); s.id='dash-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    setTimeout(() => setHVis(true), 60);
    if (companyId) load();
  }, [companyId]);

  const load = async (isRefresh=false) => {
    if (isRefresh) setRef(true); else setLoad(true);
    try {
      const [{ data:aD }, { data:dD }, { data:mD }, { data:wD }] = await Promise.all([
        supabase.from('assets').select('*').eq('company_id', companyId),
        supabase.from('downtime').select('*').eq('company_id', companyId).order('created_at',{ascending:false}).limit(8),
        supabase.from('maintenance').select('*').eq('company_id', companyId).order('next_service_date').limit(8),
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
    ...(maint.filter(m=>m.status==='Overdue').slice(0,2).map(m=>({ c:'var(--amber)', label:'Overdue',  title:m.asset_name||m.asset,           sub:m.service_type||'Scheduled service', time:m.next_service_date||'' }))),
    ...(wos.filter(w=>w.priority==='Critical').slice(0,2).map(w=>({ c:'var(--red)',   label:'Critical', title:w.title||'Critical work order',   sub:w.asset_name||'',                    time:ago(w.created_at) }))),
  ].slice(0,6);

  const now = new Date();

  /* Accent shortcuts */
  const A = { cyan:'var(--accent)', red:'var(--red)', amber:'var(--amber)', green:'var(--green)' };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div style={{ animation:'fadeUp 0.35s ease both' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28, opacity:hVis?1:0, transform:hVis?'none':'translateY(-6px)', transition:'opacity 0.4s, transform 0.4s' }}>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:900, color:'var(--text-primary)', letterSpacing:'1.5px', textTransform:'uppercase', margin:0, lineHeight:1 }}>Dashboard</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0', fontWeight:400 }}>
              {now.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </p>
          </div>
          <button className="refresh-btn" onClick={() => load(true)} disabled={refreshing}>
            <span style={{ display:'inline-block', animation:refreshing?'spin 0.8s linear infinite':'none' }}>↻</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Fleet health ── */}
        {!loading && stats && <FleetHealthBar running={stats.running} down={stats.down} maintenance={stats.maintenance} total={stats.total} />}

        {/* ── KPI Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:16 }}>
          {loading ? [0,1,2,3].map(i => (
            <div key={i} className="kpi-card">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}><Sk w="55%" h="11px" /><Sk w="34px" h="34px" r="8px" /></div>
              <Sk w="40%" h="46px" r="6px" style={{ marginBottom:12 }} /><Sk w="65%" h="11px" />
            </div>
          )) : (<>
            <KPICard label="Total Fleet"      value={stats.total}        accent={A.cyan}  sub="registered assets"   delay={0}   />
            <KPICard label="Units Down"       value={stats.down}         accent={A.red}   sub="need attention"      delay={80}  urgent={stats.down>0}    trend={stats.down>0?12:0} />
            <KPICard label="Overdue Services" value={stats.overdue}      accent={A.amber} sub="past due"            delay={160} warn={stats.overdue>0} />
            <KPICard label="Fleet Utilisation"value={`${stats.util}%`}  accent={A.green} sub="currently running"   delay={240} trend={stats.util>80?-4:6} />
          </>)}
        </div>

        {/* ── Secondary strip ── */}
        {!loading && stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Running Now',       value:stats.running, color:'var(--green)', bg:'var(--green-bg)' },
              { label:'Services Due Soon', value:stats.dueSoon, color:'var(--amber)', bg:'var(--amber-bg)' },
              { label:'Open Work Orders',  value:stats.openWOs, color:'var(--accent)', bg:'var(--accent-light)' },
            ].map((s,i) => (
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', opacity:0, animation:`fadeUp 0.4s ease ${260+i*60}ms forwards`, boxShadow:'var(--shadow-xs)', transition:'box-shadow 0.2s' }}>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:800, color:s.color, background:s.bg, padding:'2px 12px', borderRadius:6 }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Activity + Intervals ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          <div className="panel">
            <div className="panel-title">Activity Feed <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-faint)', fontWeight:400, letterSpacing:0, textTransform:'none', fontFamily:'var(--font-body)' }}>Real-time events</span></div>
            {loading ? [0,1,2,3,4].map(i => (
              <div key={i} className="activity-row">
                <Sk w="38px" h="38px" r="8px" />
                <div style={{ flex:1 }}><Sk w="65%" h="12px" style={{ marginBottom:6 }} /><Sk w="42%" h="11px" /></div>
              </div>
            )) : activity.length === 0 ? (
              <EmptyState icon="✓" title="All clear" desc="No recent downtime or overdue services." />
            ) : activity.map((a,i) => (
              <div key={i} className="activity-row" style={{ opacity:0, animation:`fadeUp 0.3s ease ${i*50}ms forwards` }}>
                <div style={{ width:38, height:38, borderRadius:8, background:`${a.c}12`, border:`1px solid ${a.c}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:a.c, letterSpacing:'0.3px', fontFamily:'var(--font-display)' }}>{a.label}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{a.sub}</div>
                </div>
                <div style={{ fontSize:11, color:'var(--text-faint)', whiteSpace:'nowrap', marginTop:2 }}>{a.time}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-title">Service Intervals <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-faint)', fontWeight:400, letterSpacing:0, textTransform:'none', fontFamily:'var(--font-body)' }}>Hours to next service</span></div>
            {loading ? [0,1,2,3,4].map(i => (
              <div key={i} style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><Sk w="50%" h="12px" /><Sk w="22%" h="11px" /></div>
                <Sk w="100%" h="6px" r="99px" />
              </div>
            )) : progressAssets.length === 0 ? (
              <EmptyState icon="⚙" title="No interval data" desc="Assets with hours tracked will appear here." />
            ) : progressAssets.map(a => (
              <ProgressBar key={a.id} label={a.asset_number ? `${a.asset_number} — ${a.name}` : (a.name||'Asset')} current={a.current_hours} max={a.next_service_hours} />
            ))}
          </div>
        </div>

        {/* ── Work Orders ── */}
        <div className="panel" style={{ marginBottom:20 }}>
          <div className="panel-title">Open Work Orders <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-faint)', fontWeight:400, letterSpacing:0, textTransform:'none', fontFamily:'var(--font-body)' }}>Requires action</span></div>
          {loading ? [0,1,2].map(r => (
            <div key={r} style={{ display:'grid', gridTemplateColumns:'3fr 2fr 1fr 1fr', gap:14, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              {[0,1,2,3].map(i => <Sk key={i} h="12px" w={['78%','60%','50%','55%'][i]} />)}
            </div>
          )) : wos.length === 0 ? (
            <EmptyState icon="✓" title="No open work orders" desc="All work is complete." />
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Work Order','Asset','Priority','Status'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'0 14px 11px 0', fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.4px', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wos.map((wo,i) => {
                  const pc = PCOLOR[wo.priority]||'var(--text-muted)';
                  return (
                    <tr key={wo.id} className="wo-row" style={{ borderBottom:'1px solid var(--border)', opacity:0, animation:`fadeUp 0.3s ease ${i*50+100}ms forwards` }}>
                      <td style={{ padding:'11px 14px 11px 0' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:3, height:26, borderRadius:99, background:pc, flexShrink:0 }} />
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{wo.title||wo.description?.slice(0,45)||'—'}</span>
                        </div>
                      </td>
                      <td style={{ padding:'11px 14px 11px 0', fontSize:12, color:'var(--text-muted)' }}>{wo.asset_name||wo.asset||'—'}</td>
                      <td style={{ padding:'11px 14px 11px 0' }}>
                        <span style={{ padding:'3px 8px', borderRadius:4, fontSize:11, fontWeight:600, color:pc, background:`${pc}14`, border:`1px solid ${pc}28` }}>{wo.priority||'—'}</span>
                      </td>
                      <td style={{ padding:'11px 0' }}><StatusBadge status={wo.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Downtime log ── */}
        <div className="panel">
          <div className="panel-title">Downtime Log <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-faint)', fontWeight:400, letterSpacing:0, textTransform:'none', fontFamily:'var(--font-body)' }}>Last 8 events</span></div>
          {loading ? [0,1,2,3].map(r => (
            <div key={r} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 3fr', gap:12, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
              {[0,1,2,3,4].map(i => <Sk key={i} h="12px" w={['75%','55%','60%','40%','85%'][i]} />)}
            </div>
          )) : dt.length === 0 ? (
            <EmptyState icon="✓" title="No downtime recorded" desc="Downtime events will be logged here." />
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Asset','Date','Category','Hours','Description'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'0 12px 11px 0', fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:'0.4px', textTransform:'uppercase', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dt.map((d,i) => (
                  <tr key={d.id} className="wo-row" style={{ borderBottom:'1px solid var(--border)', opacity:0, animation:`fadeUp 0.3s ease ${i*40+80}ms forwards` }}>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{d.asset}</td>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', fontFamily:'var(--font-mono)' }}>{d.date}</td>
                    <td style={{ padding:'11px 12px 11px 0' }}>
                      <span style={{ padding:'3px 8px', borderRadius:4, background:'var(--surface-2)', color:'var(--text-secondary)', fontSize:11, fontWeight:500, border:'1px solid var(--border)' }}>{d.category}</span>
                    </td>
                    <td style={{ padding:'11px 12px 11px 0' }}>
                      <span style={{ padding:'3px 8px', borderRadius:4, background:'var(--amber-bg)', color:'var(--amber)', fontSize:11, fontWeight:600, border:'1px solid var(--amber-border)', fontFamily:'var(--font-mono)' }}>{d.hours}h</span>
                    </td>
                    <td style={{ padding:'11px 0', fontSize:12, color:'var(--text-muted)', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  );
}

export default Dashboard;
