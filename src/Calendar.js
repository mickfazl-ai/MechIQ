// MechIQ — Calendar (standalone page)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const getUserTz  = () => localStorage.getItem('mechiq_timezone')    || Intl.DateTimeFormat().resolvedOptions().timeZone;
const getDateFmt = () => localStorage.getItem('mechiq_date_format') || 'DD/MM/YYYY';
const pad        = (n) => String(n).padStart(2, '0');
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getTodayInTz = (tz) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:tz, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  } catch { return new Date().toISOString().split('T')[0]; }
};

const formatDateDisplay = (dateStr, fmt) => {
  if (!dateStr) return '';
  try {
    const [y,m,d] = dateStr.split('-');
    if (fmt==='MM/DD/YYYY') return `${m}/${d}/${y}`;
    if (fmt==='YYYY-MM-DD') return dateStr;
    return `${d}/${m}/${y}`;
  } catch { return dateStr; }
};

// ─── iCal helpers ─────────────────────────────────────────────────────────────
const cleanIcal = (s) => (s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');
const buildVEvent = (ev, dateStr) => {
  const d2 = new Date(dateStr); d2.setDate(d2.getDate()+1);
  const d2s = `${d2.getFullYear()}${pad(d2.getMonth()+1)}${pad(d2.getDate())}`;
  const type = ev.type==='service'?'Planned Maintenance':ev.type==='schedule'?'Service Schedule':'Work Order';
  return ['BEGIN:VEVENT',`UID:mechiq-${ev.type}-${dateStr}-${Math.random().toString(36).slice(2)}@mechiq.com.au`,
    `DTSTART;VALUE=DATE:${dateStr.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${d2s}`,
    `SUMMARY:${cleanIcal(type+': '+ev.assetName+' — '+(ev.serviceName||ev.label))}`,
    `DESCRIPTION:${cleanIcal(ev.detail||'')}`,`STATUS:CONFIRMED`,'END:VEVENT'].join('\r\n');
};
const buildICS = (vevents, calName) => ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MechIQ//EN','CALSCALE:GREGORIAN',`X-WR-CALNAME:${calName}`,'X-WR-TIMEZONE:Australia/Sydney',...vevents,'END:VCALENDAR'].join('\r\n');
const downloadICS = (content, filename) => {
  const blob=new Blob([content],{type:'text/calendar;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

// ─── External Calendar Modal ───────────────────────────────────────────────────
function ExternalCalendarModal({ companyId, calendarToken, onClose, onRegenToken }) {
  const [tab,     setTab]     = useState('subscribe');
  const [app,     setApp]     = useState('google');
  const [copied,  setCopied]  = useState('');
  const [regen,   setRegen]   = useState(false);

  const feedUrl   = calendarToken ? `https://www.mechiq.com.au/api/calendar/${companyId}/${calendarToken}` : null;
  const webcalUrl = feedUrl?.replace('https://', 'webcal://');

  const copy = (str, key) => {
    navigator.clipboard.writeText(str).then(() => { setCopied(key); setTimeout(()=>setCopied(''), 2500); });
  };
  const handleRegen = async () => {
    if (!window.confirm('Regenerate the token? Existing subscriptions will need to be re-added.')) return;
    setRegen(true);
    const newToken = crypto.randomUUID();
    await supabase.from('companies').update({ calendar_token: newToken }).eq('id', companyId);
    onRegenToken(newToken); setRegen(false);
  };

  const APPS = {
    google: {
      name:'Google Calendar',
      color:'#4285F4',
      logo: <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
      steps: ['Open Google Calendar on desktop','Sidebar: click "+" next to "Other calendars"','Select "From URL"','Paste your subscription URL','Click "Add calendar" — auto-refreshes every 24h'],
      action: () => feedUrl && window.open(`https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(feedUrl)}`, '_blank'),
      btn: 'Open Google Calendar →',
    },
    outlook: {
      name:'Outlook / Microsoft 365',
      color:'#0078D4',
      logo: <svg width="20" height="20" viewBox="0 0 24 24"><rect fill="#0078D4" width="24" height="24" rx="3"/><text x="3.5" y="17.5" fill="#fff" fontSize="15" fontWeight="900" fontFamily="Segoe UI,sans-serif">O</text></svg>,
      steps: ['Open Outlook Calendar (web or 365)','Click "Add calendar" in the left panel','Select "Subscribe from web"','Paste your subscription URL','Name it "MechIQ Maintenance" → Import'],
      action: () => window.open('https://outlook.live.com/calendar/0/addcalendar', '_blank'),
      btn: 'Open Outlook Calendar →',
    },
    apple: {
      name:'Apple Calendar',
      color:'#1c1c1e',
      logo: <svg width="20" height="20" viewBox="0 0 24 24"><rect fill="#1c1c1e" width="24" height="24" rx="5"/><text x="5" y="17" fill="#fff" fontSize="13" fontFamily="SF Pro,sans-serif">🍎</text></svg>,
      steps: ['Open Calendar on Mac','Menu: File → New Calendar Subscription','Paste your subscription URL → Subscribe','On iPhone: Settings → Calendar → Accounts → Other → Add Subscribed Calendar','Apple Calendar auto-refreshes hourly'],
      action: () => webcalUrl && (window.location.href = webcalUrl),
      btn: 'Subscribe in Apple Calendar',
    },
  };
  const cur = APPS[app];
  const tabBtn = (id,label) => (
    <button onClick={()=>setTab(id)} style={{ flex:1, padding:'8px', border:'none', borderRadius:7, background:tab===id?'#fff':'transparent', color:tab===id?'#1a2b3c':'#6b7a8d', fontWeight:tab===id?700:500, fontSize:13, cursor:'pointer', boxShadow:tab===id?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>{label}</button>
  );
  const appBtn = (id) => (
    <button key={id} onClick={()=>setApp(id)} style={{ flex:1, padding:'8px 4px', background:app===id?'#f0f7ff':'#f8fafc', border:`2px solid ${app===id?'#2d8cf0':'#dde2ea'}`, borderRadius:8, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      {APPS[id].logo}
      <span style={{ fontSize:10, fontWeight:700, color:app===id?'#2d8cf0':'#6b7a8d' }}>{APPS[id].name.split(' ')[0]}</span>
    </button>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 22px 14px', borderBottom:'1px solid #f0f4f8', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#1a2b3c' }}>🔗 External Calendar Sync</div>
              <div style={{ fontSize:12, color:'#6b7a8d', marginTop:3 }}>Subscribe once — full year syncs automatically</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#a0b0b0' }}>✕</button>
          </div>
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:9, padding:3, marginTop:14 }}>
            {tabBtn('subscribe','📡 Subscribe (Live')} {tabBtn('howto','📖 How to Connect')}
          </div>
        </div>

        <div style={{ padding:'18px 22px 22px', overflowY:'auto', flex:1 }}>
          {tab==='subscribe' && (
            <>
              <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9, padding:'10px 14px', marginBottom:16, display:'flex', gap:10 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>✅</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#166534', marginBottom:2 }}>Live auto-sync — full year</div>
                  <div style={{ fontSize:12, color:'#166534', opacity:.85 }}>New service schedules, maintenance tasks and work orders appear automatically at the next refresh. No re-subscribing needed.</div>
                </div>
              </div>

              {calendarToken ? (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Your subscription URL</div>
                  <div style={{ display:'flex', gap:8, marginBottom:6 }}>
                    <div style={{ flex:1, background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:8, padding:'10px 12px', fontSize:11, color:'#1a2b3c', fontFamily:'monospace', wordBreak:'break-all', lineHeight:1.6 }}>{feedUrl}</div>
                    <button onClick={()=>copy(feedUrl,'url')} style={{ flexShrink:0, padding:'10px 14px', background:copied==='url'?'#00c264':'#2d8cf0', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {copied==='url'?'✓ Copied!':'Copy'}
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                    <button onClick={()=>copy(webcalUrl,'wc')} style={{ flex:1, padding:'7px', background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:7, fontSize:11, fontWeight:700, color:'#6b7a8d', cursor:'pointer' }}>
                      {copied==='wc'?'✓ Copied!':'Copy as webcal://'}
                    </button>
                    <button onClick={handleRegen} disabled={regen} style={{ flex:1, padding:'7px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:7, fontSize:11, fontWeight:700, color:'#e94560', cursor:'pointer' }}>
                      {regen?'Regenerating…':'↻ Regenerate Token'}
                    </button>
                  </div>

                  <div style={{ fontSize:11, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Open in your app</div>
                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>{['google','outlook','apple'].map(appBtn)}</div>
                  <button onClick={cur.action} style={{ width:'100%', padding:'11px', background:cur.color, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>{cur.btn}</button>
                </>
              ) : (
                <div style={{ textAlign:'center', padding:30, color:'#6b7a8d', background:'#f8fafc', borderRadius:10, border:'1px solid #dde2ea', fontSize:13 }}>⏳ Generating your calendar token…</div>
              )}
            </>
          )}

          {tab==='howto' && (
            <>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>{['google','outlook','apple'].map(appBtn)}</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#1a2b3c', marginBottom:12 }}>How to connect {cur.name}</div>
              <ol style={{ paddingLeft:20, margin:0 }}>
                {cur.steps.map((s,i)=><li key={i} style={{ fontSize:13, color:'#374151', marginBottom:10, lineHeight:1.5 }}>{s}</li>)}
              </ol>
              <div style={{ marginTop:14, padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e' }}>
                💡 Copy your subscription URL from the Subscribe tab and paste it in step 3.
              </div>
              <button onClick={()=>{setTab('subscribe');cur.action();}} style={{ marginTop:14, width:'100%', padding:'11px', background:cur.color, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>{cur.btn}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Send to Users Modal ───────────────────────────────────────────────────────
function SendToUsersModal({ ev, dateStr, eventsMap, year, month, userRole, onClose }) {
  const [users,    setUsers]    = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading,  setLoading]  = useState(true);
  const [mode,     setMode]     = useState(ev?'event':'month');
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    supabase.from('user_roles').select('email,name,role').eq('company_id', userRole.company_id)
      .then(({ data }) => { setUsers(data||[]); setLoading(false); });
  }, []);

  const toggle    = (email) => setSelected(p=>{const n=new Set(p);n.has(email)?n.delete(email):n.add(email);return n;});
  const allSel    = users.length>0 && users.every(u=>selected.has(u.email));
  const toggleAll = () => allSel ? setSelected(new Set()) : setSelected(new Set(users.map(u=>u.email)));

  const handleSend = () => {
    if (selected.size===0) return;
    let vevents=[];
    if (mode==='event'&&ev) {
      vevents=[buildVEvent(ev,dateStr)];
    } else {
      Object.entries(eventsMap).forEach(([day,evs])=>{
        const ds=`${year}-${pad(month+1)}-${pad(parseInt(day))}`;
        evs.forEach(e=>vevents.push(buildVEvent(e,ds)));
      });
    }
    const calName  = mode==='event'&&ev ? `${ev.assetName} — ${ev.serviceName}` : `MechIQ — ${MONTHS[month]} ${year}`;
    const filename = mode==='event'&&ev ? `MechIQ-event-${dateStr}.ics` : `MechIQ-${year}-${pad(month+1)}.ics`;
    downloadICS(buildICS(vevents,calName), filename);
    const subj = mode==='event'&&ev
      ? `MechIQ Service Event: ${ev.assetName} — ${ev.serviceName} (${dateStr})`
      : `MechIQ Maintenance Calendar — ${MONTHS[month]} ${year}`;
    const body = mode==='event'&&ev
      ? `Hi,\n\nA MechIQ maintenance event has been shared with you:\n\nAsset:   ${ev.assetName}\nService: ${ev.serviceName}\nDate:    ${dateStr}\nDetails: ${ev.detail||'—'}\n\nThe .ics file has been downloaded — attach it to this email or import it into your calendar.\n\nRegards,\nMechIQ`
      : `Hi,\n\nPlease find the MechIQ maintenance schedule for ${MONTHS[month]} ${year}.\n\nThe .ics file has been downloaded — attach it to this email or import it into your calendar.\n\nRegards,\nMechIQ`;
    window.location.href=`mailto:${[...selected].join(',')}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    setDone(true);
  };

  const RC = { admin:'#2d8cf0', supervisor:'#f59e0b', technician:'#00c264', operator:'#a0b0b0' };
  const mBtn = (id,lbl) => (
    <button onClick={()=>setMode(id)} style={{ flex:1, padding:'7px', border:'none', borderRadius:7, background:mode===id?'#fff':'transparent', color:mode===id?'#1a2b3c':'#6b7a8d', fontWeight:mode===id?700:500, fontSize:13, cursor:'pointer', boxShadow:mode===id?'0 1px 4px rgba(0,0,0,0.1)':'none' }}>{lbl}</button>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:460, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        <div style={{ padding:'20px 22px 14px', borderBottom:'1px solid #f0f4f8', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#1a2b3c' }}>👥 Send to Users</div>
              <div style={{ fontSize:12, color:'#6b7a8d', marginTop:3 }}>Send a calendar invite to selected team members</div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#a0b0b0' }}>✕</button>
          </div>
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:9, padding:3, marginTop:12 }}>
            {ev && mBtn('event','This Event')}
            {mBtn('month','Full Month')}
          </div>
        </div>

        <div style={{ padding:'14px 22px', overflowY:'auto', flex:1 }}>
          <div style={{ background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:9, padding:'10px 14px', marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>Sending</div>
            {mode==='event'&&ev
              ? <div style={{ fontSize:13, fontWeight:600, color:'#1a2b3c' }}>{ev.assetName} — {ev.serviceName} <span style={{ color:'#6b7a8d', fontWeight:400 }}>({dateStr})</span></div>
              : <div style={{ fontSize:13, fontWeight:600, color:'#1a2b3c' }}>{MONTHS[month]} {year} <span style={{ color:'#6b7a8d', fontWeight:400 }}>({Object.values(eventsMap).flat().length} events)</span></div>
            }
            <div style={{ fontSize:11, color:'#6b7a8d', marginTop:3 }}>A .ics file will download and your email app will open with recipients pre-filled.</div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:20, color:'#a0b0b0', fontSize:13 }}>Loading users…</div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#6b7a8d' }}>{selected.size} of {users.length} selected</span>
                <button onClick={toggleAll} style={{ fontSize:12, fontWeight:700, color:'#2d8cf0', background:'none', border:'none', cursor:'pointer' }}>{allSel?'Clear all':'Select all'}</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {users.map(u=>(
                  <div key={u.email} onClick={()=>toggle(u.email)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:selected.has(u.email)?'#f0f7ff':'#f8fafc', border:`1px solid ${selected.has(u.email)?'#93c5fd':'#dde2ea'}`, cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ width:18, height:18, borderRadius:4, background:selected.has(u.email)?'#2d8cf0':'#fff', border:`1.5px solid ${selected.has(u.email)?'#2d8cf0':'#c8d4e0'}`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:700, flexShrink:0 }}>
                      {selected.has(u.email)?'✓':''}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1a2b3c', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name||u.email}</div>
                      <div style={{ fontSize:11, color:'#6b7a8d', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:(RC[u.role]||'#a0b0b0')+'20', color:RC[u.role]||'#a0b0b0', flexShrink:0 }}>{u.role}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid #f0f4f8', flexShrink:0 }}>
          {done ? (
            <div style={{ textAlign:'center', padding:'10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, fontSize:13, fontWeight:700, color:'#166534' }}>✓ .ics downloaded — email app opened</div>
          ) : (
            <button onClick={handleSend} disabled={selected.size===0}
              style={{ width:'100%', padding:'12px', background:selected.size>0?'#2d8cf0':'#e5e7eb', color:selected.size>0?'#fff':'#9ca3af', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:selected.size>0?'pointer':'not-allowed', transition:'all 0.2s' }}>
              {selected.size===0?'Select at least one user':`📩 Send to ${selected.size} user${selected.size>1?'s':''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar ─────────────────────────────────────────────────────────────
function Calendar({ userRole, setCurrentPage }) {
  const [tasks,              setTasks]            = useState([]);
  const [schedules,          setSchedules]        = useState([]);
  const [workOrders,         setWorkOrders]       = useState([]);
  const [assets,             setAssets]           = useState([]);
  const [serviceTemplates,   setServiceTemplates] = useState([]);
  const [calendarToken,      setCalendarToken]    = useState(null);
  const [loading,            setLoading]          = useState(true);
  const [calMonth,           setCalMonth]         = useState(new Date());
  const [selectedDay,        setSelectedDay]      = useState(null);
  const [dayPanelEvents,     setDayPanelEvents]   = useState([]);
  const [serviceSheetPrompt, setServiceSheetPrompt] = useState(null);
  const [showExternal,       setShowExternal]     = useState(false);
  const [sendModal,          setSendModal]        = useState(null);

  useEffect(() => { if (userRole?.company_id) load(); }, [userRole]);

  const load = async () => {
    setLoading(true);
    const cid = userRole.company_id;
    const [{ data:tD },{ data:sD },{ data:wD },{ data:aD },{ data:tmD },{ data:coD }] = await Promise.all([
      supabase.from('maintenance').select('*').eq('company_id',cid).order('next_due',{ascending:true}),
      supabase.from('service_schedules').select('*').eq('company_id',cid),
      supabase.from('work_orders').select('*').eq('company_id',cid).neq('status','Complete').order('due_date',{ascending:true}),
      supabase.from('assets').select('name,hours,id').eq('company_id',cid),
      supabase.from('service_sheet_templates').select('id,name,service_type').eq('company_id',cid),
      supabase.from('companies').select('calendar_token').eq('id',cid).single(),
    ]);
    setTasks(tD||[]); setSchedules(sD||[]); setWorkOrders(wD||[]); setAssets(aD||[]); setServiceTemplates(tmD||[]);
    let token = coD?.calendar_token;
    if (!token) {
      token = crypto.randomUUID();
      await supabase.from('companies').update({ calendar_token: token }).eq('id', cid);
    }
    setCalendarToken(token);
    setLoading(false);
  };

  const estimateDate = (s) => {
    if (s.next_due_date) return s.next_due_date;
    if ((s.interval_type==='hours'||s.interval_type==='km') && s.next_due_value) {
      const a = assets.find(x=>x.name===s.asset_name);
      const remaining = s.next_due_value - (a?.hours||s.last_service_value||0);
      if (remaining<=0) return getTodayInTz(getUserTz());
      const d=new Date(); d.setDate(d.getDate()+Math.round(remaining/(s.interval_type==='km'?50:10)));
      return d.toISOString().split('T')[0];
    }
    return null;
  };

  const buildEvents = () => {
    const year=calMonth.getFullYear(), month=calMonth.getMonth();
    const prefix=`${year}-${pad(month+1)}`;
    const events={};
    const push=(day,ev)=>{ if(!events[day])events[day]=[]; events[day].push(ev); };
    tasks.forEach(t=>{ if(!t.next_due?.startsWith(prefix))return; const day=parseInt(t.next_due.split('-')[2]); push(day,{label:t.asset+' — '+t.task,color:t.status==='Overdue'?'var(--red)':t.status==='Due Soon'?'var(--amber)':'var(--accent)',type:'service',assetName:t.asset,assetId:assets.find(a=>a.name===t.asset)?.id,serviceName:t.task,detail:`Status: ${t.status} · Assigned: ${t.assigned_to||'—'}`}); });
    schedules.forEach(s=>{ const ds=estimateDate(s); if(!ds?.startsWith(prefix))return; const day=parseInt(ds.split('-')[2]); const cv=assets.find(a=>a.name===s.asset_name)?.hours||0; const rem=s.next_due_value?s.next_due_value-cv:null; const over=rem!==null&&rem<=0; push(day,{label:s.asset_name+' — '+s.service_name,color:over?'var(--red)':'var(--purple)',type:'schedule',assetName:s.asset_name,assetId:assets.find(a=>a.name===s.asset_name)?.id,serviceName:s.service_name,detail:`Every ${s.interval_value} ${s.interval_type} · ${rem!==null?(rem>0?rem+' '+s.interval_type+' to go':Math.abs(rem)+' '+s.interval_type+' overdue'):s.next_due_date||'—'}`}); });
    workOrders.forEach(w=>{ if(!w.due_date?.startsWith(prefix))return; const day=parseInt(w.due_date.split('-')[2]); push(day,{label:(w.asset||'')+' — '+(w.defect_description||'').slice(0,40),color:w.priority==='Critical'?'var(--red)':'var(--amber)',type:'wo',assetName:w.asset,assetId:assets.find(a=>a.name===w.asset)?.id,serviceName:w.defect_description,detail:`Priority: ${w.priority} · Assigned: ${w.assigned_to||'—'}`}); });
    return events;
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>Loading calendar…</div>;

  const year=calMonth.getFullYear(), month=calMonth.getMonth();
  const userTz=getUserTz(), dateFmt=getDateFmt(), today=getTodayInTz(userTz);
  const events=buildEvents();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells=[];
  for(let i=0;i<(firstDay===0?6:firstDay-1);i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  const allEvArr=Object.values(events).flat();
  const totalEvents=allEvArr.length;
  const overdueCount=allEvArr.filter(e=>e.color==='var(--red)').length;
  const woCount=allEvArr.filter(e=>e.type==='wo').length;

  return (
    <div style={{ fontFamily:'var(--font-body,Barlow,sans-serif)' }}>
      {showExternal && <ExternalCalendarModal companyId={userRole.company_id} calendarToken={calendarToken} onClose={()=>setShowExternal(false)} onRegenToken={t=>setCalendarToken(t)} />}
      {sendModal && <SendToUsersModal ev={sendModal.ev||null} dateStr={sendModal.dateStr||null} eventsMap={events} year={year} month={month} userRole={userRole} onClose={()=>setSendModal(null)} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>📅 Maintenance Calendar</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
            {totalEvents} event{totalEvents!==1?'s':''} this month
            {overdueCount>0&&<span style={{ color:'var(--red)', fontWeight:700, marginLeft:10 }}>⚠ {overdueCount} overdue</span>}
            {woCount>0&&<span style={{ color:'var(--amber)', fontWeight:700, marginLeft:10 }}>🔧 {woCount} WOs</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setSendModal({month:true})} style={{ padding:'8px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:700, color:'var(--text-secondary)', cursor:'pointer' }}>👥 Send to Users</button>
          <button onClick={()=>setShowExternal(true)} style={{ padding:'8px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }}>🔗 External Calendar</button>
          <button onClick={load} style={{ padding:'8px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:700, color:'var(--text-secondary)', cursor:'pointer' }}>↻</button>
        </div>
      </div>

      {/* Month nav */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={()=>{setSelectedDay(null);setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1));}} style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:16, color:'var(--text-secondary)', fontWeight:700 }}>‹</button>
        <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', minWidth:200, textAlign:'center', fontFamily:'var(--font-display)' }}>{MONTHS[month]} {year}</div>
        <button onClick={()=>{setSelectedDay(null);setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1));}} style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:16, color:'var(--text-secondary)', fontWeight:700 }}>›</button>
        <button onClick={()=>{setSelectedDay(null);setCalMonth(new Date());}} style={{ padding:'7px 14px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>Today</button>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
        {[['var(--accent)','Planned Maintenance'],['var(--purple)','Service Schedule'],['var(--amber)','Work Order'],['var(--red)','Overdue']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}><span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }}/>{l}</div>
        ))}
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-muted)', padding:'6px 0', textTransform:'uppercase', letterSpacing:'0.5px' }}>{d}</div>)}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
        {cells.map((day,i)=>{
          const isToday=day?`${year}-${pad(month+1)}-${pad(day)}`===today:false;
          const dayEvs=day?(events[day]||[]):[];
          const isSel=selectedDay===day;
          return (
            <div key={i} onClick={()=>{if(day){setSelectedDay(day);setDayPanelEvents(dayEvs);}}}
              style={{ minHeight:80, background:day?'var(--surface)':'transparent', border:day?`1px solid ${isSel||isToday?'var(--accent)':'var(--border)'}`:'none', borderRadius:8, padding:'6px 8px', cursor:day?'pointer':'default', boxShadow:isSel?'0 0 0 2px var(--accent)':isToday?'0 0 0 1px var(--accent)':'none', transition:'box-shadow 0.15s' }}>
              {day&&<>
                <div style={{ fontSize:12, fontWeight:(isToday||isSel)?800:500, color:isToday?'var(--accent)':'var(--text-secondary)', marginBottom:4 }}>{day}</div>
                {dayEvs.slice(0,2).map((ev,j)=><div key={j} title={ev.label} style={{ fontSize:10, fontWeight:600, color:'#fff', background:ev.color, borderRadius:3, padding:'2px 5px', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.label}</div>)}
                {dayEvs.length>2&&<div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>+{dayEvs.length-2} more</div>}
              </>}
            </div>
          );
        })}
      </div>

      {/* Day panel */}
      {selectedDay!==null&&(
        <>
          <div onClick={()=>setSelectedDay(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:200 }}/>
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:400, maxWidth:'90vw', background:'var(--bg)', borderLeft:'1px solid var(--border)', boxShadow:'-8px 0 32px rgba(0,0,0,0.15)', zIndex:201, display:'flex', flexDirection:'column', overflowY:'auto' }}>
            <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.8px' }}>{MONTHS[month]} {year}</div>
                <div style={{ fontSize:24, fontWeight:900, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>{formatDateDisplay(`${year}-${pad(month+1)}-${pad(selectedDay)}`,dateFmt)}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{dayPanelEvents.length} event{dayPanelEvents.length!==1?'s':''}</div>
              </div>
              <button onClick={()=>setSelectedDay(null)} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, width:36, height:36, cursor:'pointer', fontSize:18, color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
            <div style={{ padding:16, flex:1 }}>
              {dayPanelEvents.length===0
                ? <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:14, paddingTop:40 }}>No events this day</div>
                : dayPanelEvents.map((ev,i)=>{
                  const dateStr=`${year}-${pad(month+1)}-${pad(selectedDay)}`;
                  return (
                    <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:12, borderLeft:`4px solid ${ev.color}` }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#fff', background:ev.color, borderRadius:4, padding:'2px 8px', display:'inline-block', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        {ev.type==='service'?'Planned Maintenance':ev.type==='schedule'?'Service Schedule':'Work Order'}
                      </div>
                      <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>{ev.assetName}</div>
                      <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6 }}>{ev.serviceName}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:12 }}>{ev.detail}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {ev.assetId&&setCurrentPage&&(
                          <button onClick={()=>{setSelectedDay(null);sessionStorage.setItem('mechiq_open_asset',JSON.stringify({assetId:ev.assetId,tab:'service'}));setCurrentPage('assets','units');}}
                            style={{ padding:'6px 12px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer' }}>View Asset →</button>
                        )}
                        {(ev.type==='service'||ev.type==='schedule')&&(
                          <button onClick={()=>{const kw=(ev.serviceName||'').toLowerCase().split(/[\s\-\/]+/);const m=serviceTemplates.find(t=>{const tn=(t.name||'').toLowerCase();const tt=(t.service_type||'').toLowerCase();return kw.some(k=>k.length>2&&(tn.includes(k)||tt.includes(k)));});setServiceSheetPrompt({ev,matched:m,selectedTemplate:m?.id||''});}}
                            style={{ padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer' }}>📄 Service Sheet</button>
                        )}
                        <button onClick={()=>{setSelectedDay(null);setSendModal({ev,dateStr});}}
                          style={{ padding:'6px 12px', background:'#f0f7ff', color:'#2d8cf0', border:'1px solid #93c5fd', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer' }}>👥 Send to Users</button>
                        <button onClick={()=>{setSelectedDay(null);setShowExternal(true);}}
                          style={{ padding:'6px 12px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(0,194,224,0.3)', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer' }}>🔗 External Calendar</button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </>
      )}

      {/* Service sheet picker */}
      {serviceSheetPrompt&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--bg)', borderRadius:16, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>📄 Start Service Sheet</div><div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{serviceSheetPrompt.ev.assetName}</div></div>
              <button onClick={()=>setServiceSheetPrompt(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ background:'var(--surface)', borderRadius:10, padding:'12px 14px', marginBottom:16, borderLeft:'4px solid var(--accent)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Service Due</div>
                <div style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>{serviceSheetPrompt.ev.serviceName}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{serviceSheetPrompt.ev.detail}</div>
              </div>
              {serviceSheetPrompt.matched&&(<div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}><div style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', marginBottom:4 }}>✓ Suggested Template</div><div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{serviceSheetPrompt.matched.name}</div>{serviceSheetPrompt.matched.service_type&&<div style={{ fontSize:11, color:'var(--text-muted)' }}>{serviceSheetPrompt.matched.service_type}</div>}</div>)}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>{serviceSheetPrompt.matched?'Or choose a different template:':'Select a template:'}</div>
                {serviceTemplates.length===0?(<div style={{ fontSize:12, color:'var(--text-muted)', padding:'10px 0' }}>No templates — create one in Forms → Service Sheets first.</div>):(
                  <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                    {serviceTemplates.map(t=>(<div key={t.id} onClick={()=>setServiceSheetPrompt(p=>({...p,selectedTemplate:t.id,matched:t}))} style={{ padding:'10px 14px', borderRadius:9, border:`2px solid ${serviceSheetPrompt.selectedTemplate===t.id?'var(--accent)':'var(--border)'}`, background:serviceSheetPrompt.selectedTemplate===t.id?'var(--accent-light)':'var(--surface)', cursor:'pointer', transition:'all 0.15s' }}><div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{t.name}</div>{t.service_type&&<div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{t.service_type}</div>}</div>))}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setServiceSheetPrompt(null)} style={{ flex:1, padding:'10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}>Cancel</button>
                <button disabled={!serviceSheetPrompt.selectedTemplate&&!serviceSheetPrompt.matched} onClick={()=>{const tid=serviceSheetPrompt.selectedTemplate||serviceSheetPrompt.matched?.id;if(!tid)return;setServiceSheetPrompt(null);setSelectedDay(null);sessionStorage.setItem('mechiq_open_form',JSON.stringify({templateId:tid,assetName:serviceSheetPrompt.ev.assetName,serviceType:serviceSheetPrompt.ev.serviceName||serviceTemplates.find(t=>t.id===tid)?.name||''}));window.dispatchEvent(new CustomEvent('mechiq-navigate',{detail:{page:'forms',subPage:'service_sheets'}}));}}
                  style={{ flex:2, padding:'10px', background:(serviceSheetPrompt.selectedTemplate||serviceSheetPrompt.matched)?'var(--accent)':'var(--surface-2)', color:(serviceSheetPrompt.selectedTemplate||serviceSheetPrompt.matched)?'#fff':'var(--text-muted)', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:(serviceSheetPrompt.selectedTemplate||serviceSheetPrompt.matched)?'pointer':'not-allowed' }}>Open Service Sheet →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
