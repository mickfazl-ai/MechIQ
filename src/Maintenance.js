// MechIQ Maintenance v2 - Calendar + Service Schedules
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ─── Shared design tokens ──────────────────────────────────────────────────────
const C = {
  bg: 'var(--bg)', surface: 'var(--surface)',
  border: 'var(--border)', borderLight: 'var(--border)',
  textDark: 'var(--text-primary)', textMid: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)', accent: 'var(--accent)',
  red: 'var(--red, #ff3366)', redBg: 'var(--red-glow, rgba(255,51,102,0.12))',
  amber: 'var(--amber, #ffaa00)', amberBg: 'var(--amber-glow, rgba(255,170,0,0.12))',
  green: 'var(--green, #00ff88)', greenBg: 'var(--green-glow, rgba(0,255,136,0.12))',
  purple: 'var(--purple, #aa55ff)', purpleBg: 'var(--purple-glow, rgba(170,85,255,0.12))',
};

const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 14, padding: '22px 24px',
  boxShadow: '0 0 24px rgba(0,212,255,0.05)',
};

// ─── Status / Priority helpers ─────────────────────────────────────────────────
const STATUS_MAP = {
  'Overdue':     [C.red,    C.redBg],
  'Due Soon':    [C.amber,  C.amberBg],
  'Upcoming':    [C.accent, 'rgba(0,212,255,0.1)'],
  'Completed':   [C.green,  C.greenBg],
  'Open':        [C.accent, 'rgba(0,212,255,0.1)'],
  'Assigned':    [C.amber,  C.amberBg],
  'In Progress': [C.purple, C.purpleBg],
  'Complete':    [C.green,  C.greenBg],
};
const PRIORITY_MAP = {
  'Critical': [C.red,    C.redBg],
  'High':     ['#ff6600', 'rgba(255,102,0,0.12)'],
  'Medium':   [C.accent, 'rgba(0,212,255,0.1)'],
  'Low':      [C.green,  C.greenBg],
};

function Badge({ text, map }) {
  const [color, bg] = (map || STATUS_MAP)[text] || [C.textMuted, 'var(--surface-2)'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:4, background:bg, color, fontSize:10, fontWeight:700, border:`1px solid ${color}40`, fontFamily:'var(--font-display)', letterSpacing:'0.8px', textTransform:'uppercase', whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:color }} />{text}
    </span>
  );
}

// ─── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:4, background:'var(--surface-2)', borderRadius:10, padding:4, marginBottom:24, width:'fit-content', border:'1px solid var(--border)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding:'8px 20px', border:'none', borderRadius:8, cursor:'pointer',
          fontSize:12, fontWeight:700, letterSpacing:'0.3px', fontFamily:'inherit',
          transition:'all 0.15s',
          background: active === t.id ? 'var(--surface,#fff)' : 'transparent',
          color: active === t.id ? 'var(--blue-bright,var(--accent))' : 'var(--text-muted,#7a92a8)',
          boxShadow: active === t.id ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color, bg }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:C.surface, border:`1px solid ${C.borderLight}`, borderRadius:10, padding:'10px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <span style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:800, color, background:bg, padding:'2px 10px', borderRadius:7 }}>{value}</span>
      <span style={{ fontSize:12, fontWeight:600, color:C.textMid }}>{label}</span>
    </div>
  );
}

// ─── Form panel ────────────────────────────────────────────────────────────────
function FormPanel({ title, onClose, children }) {
  return (
    <div style={{ ...card, marginBottom:20, borderLeft:`3px solid ${C.accent}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontSize:14, fontWeight:800, color:C.textDark }}>{title}</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMuted, cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
      </div>
      {children}
    </div>
  );
}

// ─── Input / Select / Textarea shared style ────────────────────────────────────
const iStyle = {
  width:'100%', padding:'9px 12px', border:`1.5px solid ${C.border}`,
  borderRadius:8, fontSize:13, color:C.textDark, background:C.surface,
  fontFamily:'inherit', outline:'none', boxSizing:'border-box',
};

// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(3px)' }}>
      <div style={{ ...card, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:16, fontWeight:800, color:C.textDark }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMuted, cursor:'pointer', fontSize:20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────
function Table({ heads, children, empty }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:`2px solid ${C.borderLight}` }}>
            {heads.map(h => <th key={h} style={{ textAlign:'left', padding:'0 14px 12px 0', fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:'1.2px', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

function Tr({ children, faded }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ borderBottom:`1px solid ${C.borderLight}`, background: hov ? 'var(--bg,#E9F1FA)' : 'transparent', opacity: faded ? 0.55 : 1, transition:'background 0.12s' }}>
      {children}
    </tr>
  );
}

function Td({ children, style }) {
  return <td style={{ padding:'11px 14px 11px 0', fontSize:13, color:C.textMid, ...style }}>{children}</td>;
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function Empty({ icon, title, desc }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 20px' }}>
      <div style={{ fontSize:36, marginBottom:12, opacity:0.4 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:C.textDark, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, color:C.textMuted, maxWidth:220, margin:'0 auto', lineHeight:1.65 }}>{desc}</div>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHead({ title, count, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, paddingBottom:12, borderBottom:`1.5px solid ${C.borderLight}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:C.textDark }}>{title}</span>
        {count !== undefined && <span style={{ background:C.accent+'20', color:C.accent, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{count}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function Maintenance({ userRole, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'scheduled');
  // Tab driven by sidebar subPage prop
  const [tasks, setTasks] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showWOForm, setShowWOForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingWO, setEditingWO] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [newSchedule, setNewSchedule] = useState({ asset_id:'', asset_name:'', service_name:'', interval_type:'hours', interval_value:'', last_service_value:'', last_service_date:'', notes:'' });
  const [newTask, setNewTask] = useState({ asset:'', task:'', frequency:'', next_due:'', assigned_to:'' });
  const [newWO, setNewWO] = useState({ asset:'', defect_description:'', priority:'Medium', assigned_to:'', due_date:'', estimated_hours:'', comments:'' });

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { if (userRole?.company_id) { fetchTasks(); fetchWorkOrders(); fetchAssets(); fetchUsers(); fetchSchedules(); } }, [userRole]);

  const fetchTasks = async () => { setLoading(true); const { data } = await supabase.from('maintenance').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setTasks(data || []); setLoading(false); };
  const fetchWorkOrders = async () => { const { data } = await supabase.from('work_orders').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setWorkOrders(data || []); };
  const fetchAssets = async () => { const { data } = await supabase.from('assets').select('name, hours').eq('company_id', userRole.company_id); setAssets(data || []); };
  const fetchUsers = async () => { const { data } = await supabase.from('user_roles').select('name').eq('company_id', userRole.company_id); setUsers(data || []); };
  const fetchSchedules = async () => { const { data } = await supabase.from('service_schedules').select('*').eq('company_id', userRole.company_id).order('next_due_date'); setSchedules(data || []); };
  
  const handleAddSchedule = async () => {
    if (!newSchedule.asset_name || !newSchedule.service_name || !newSchedule.interval_value) { alert('Fill in asset, service name and interval'); return; }
    const last = parseFloat(newSchedule.last_service_value) || 0;
    const interval = parseFloat(newSchedule.interval_value) || 0;
    const nextVal = last + interval;
    let nextDate = null;
    if (newSchedule.interval_type === 'days' || newSchedule.interval_type === 'months') {
      const d = newSchedule.last_service_date ? new Date(newSchedule.last_service_date) : new Date();
      if (newSchedule.interval_type === 'days') d.setDate(d.getDate() + interval);
      else d.setMonth(d.getMonth() + interval);
      nextDate = d.toISOString().split('T')[0];
    }
    const { error } = await supabase.from('service_schedules').insert({
      ...newSchedule,
      company_id: userRole.company_id,
      interval_value: interval,
      last_service_value: last,
      next_due_value: nextVal,
      next_due_date: nextDate,
    });
    if (error) alert('Error: ' + error.message);
    else { fetchSchedules(); setNewSchedule({ asset_id:'', asset_name:'', service_name:'', interval_type:'hours', interval_value:'', last_service_value:'', last_service_date:'', notes:'' }); setShowScheduleForm(false); }
  };

  const aiSuggestSchedules = async (assetName, assetType) => {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: `You are a heavy equipment maintenance expert. For a ${assetName} (type: ${assetType}), list the standard service intervals. Return ONLY a JSON array, no markdown. Each item: {"service_name":"","interval_type":"hours","interval_value":0,"notes":""}. Include oil changes, filter changes, major services, inspections. Use hours for heavy equipment, km for vehicles/trucks.` }]
        })
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text || '[]';
      const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
      const suggestions = JSON.parse(clean);
      return suggestions;
    } catch(e) { alert('AI error: ' + e.message); return []; }
    finally { setAiLoading(false); }
  };

  const handleAdd = async () => {
    if (newTask.asset && newTask.task && newTask.next_due) {
      const { error } = await supabase.from('maintenance').insert([{ ...newTask, status:'Upcoming', company_id: userRole.company_id }]);
      if (error) alert('Error: ' + error.message);
      else { fetchTasks(); setNewTask({ asset:'', task:'', frequency:'', next_due:'', assigned_to:'' }); setShowForm(false); }
    }
  };

  const handleComplete = async (id) => {
    const { error } = await supabase.from('maintenance').update({ status:'Completed' }).eq('id', id);
    if (error) alert('Error: ' + error.message); else fetchTasks();
  };

  const handleAddWO = async () => {
    if (!newWO.asset || !newWO.defect_description) { alert('Please fill in asset and defect description'); return; }
    const { error } = await supabase.from('work_orders').insert([{ ...newWO, company_id: userRole.company_id, status:'Open', source:'manual' }]);
    if (error) alert('Error: ' + error.message);
    else { fetchWorkOrders(); setNewWO({ asset:'', defect_description:'', priority:'Medium', assigned_to:'', due_date:'', estimated_hours:'', comments:'' }); setShowWOForm(false); }
  };

  const handleUpdateWOStatus = async (id, status) => {
    const { error } = await supabase.from('work_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) alert('Error: ' + error.message); else fetchWorkOrders();
  };

  const handleUpdateWO = async () => {
    const { error } = await supabase.from('work_orders').update({ ...editingWO, updated_at: new Date().toISOString() }).eq('id', editingWO.id);
    if (error) alert('Error: ' + error.message); else { fetchWorkOrders(); setEditingWO(null); }
  };

  const getNextStatus = s => ({ Open:'Assigned', Assigned:'In Progress', 'In Progress':'Complete' }[s] || null);

  const openWOs   = workOrders.filter(w => w.status !== 'Complete');
  const closedWOs = workOrders.filter(w => w.status === 'Complete');



  const btnPrimary = { padding:'8px 18px', background:C.accent, color:'var(--text-primary)', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 3px 10px ${C.accent}44`, letterSpacing:'0.5px' };
  const btnGhost   = { padding:'8px 16px', background:C.surface, color:C.textMid, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' };

  return (
    <div style={{ animation:'fadeUp 0.35s ease both' }}>



      {/* ══ SCHEDULED SERVICE ══ */}
      {activeTab === 'scheduled' && (
        <div>
          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            <StatPill label="Overdue"   value={tasks.filter(t=>t.status==='Overdue').length}   color={C.red}    bg={C.redBg}   />
            <StatPill label="Due Soon"  value={tasks.filter(t=>t.status==='Due Soon').length}  color={C.amber}  bg={C.amberBg} />
            <StatPill label="Upcoming"  value={tasks.filter(t=>t.status==='Upcoming').length}  color={C.accent} bg="#e0f4ff"   />
            <StatPill label="Completed" value={tasks.filter(t=>t.status==='Completed').length} color={C.green}  bg={C.greenBg} />
          </div>

          {/* Add form */}
          {showForm && (
            <FormPanel title="Add PM Task" onClose={() => setShowForm(false)}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <input style={iStyle} placeholder="Asset name" value={newTask.asset} onChange={e => setNewTask({...newTask, asset:e.target.value})} />
                <input style={iStyle} placeholder="Task description" value={newTask.task} onChange={e => setNewTask({...newTask, task:e.target.value})} />
                <select style={iStyle} value={newTask.frequency} onChange={e => setNewTask({...newTask, frequency:e.target.value})}>
                  <option value="">Select frequency</option>
                  <option>Daily</option><option>Weekly</option><option>Monthly</option>
                  <option>Every 250 hours</option><option>Every 500 hours</option>
                  <option>Every 1000 hours</option><option>Annually</option>
                </select>
                <input style={iStyle} type="date" value={newTask.next_due} onChange={e => setNewTask({...newTask, next_due:e.target.value})} />
                <input style={iStyle} placeholder="Assigned to" value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to:e.target.value})} />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={btnPrimary} onClick={handleAdd}>Save PM Task</button>
                <button style={btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </FormPanel>
          )}

          {/* Table card */}
          <div style={card}>
            <SectionHead
              title="Service Schedule"
              count={tasks.length}
              action={userRole?.role !== 'technician' && !showForm && (
                <button style={btnPrimary} onClick={() => setShowForm(true)}>+ Add PM Task</button>
              )}
            />
            {loading ? (
              <div style={{ textAlign:'center', padding:'40px', color:C.textMuted }}>Loading…</div>
            ) : tasks.length === 0 ? (
              <Empty icon="📅" title="No maintenance tasks" desc="Add your first preventative maintenance schedule to get started." />
            ) : (
              <Table heads={['Asset','Task','Frequency','Next Due','Status','Assigned To','']}>
                {tasks.map(t => (
                  <Tr key={t.id}>
                    <Td><span style={{ fontWeight:700, color:C.textDark }}>{t.asset}</span></Td>
                    <Td>{t.task}</Td>
                    <Td><span style={{ background:C.borderLight, padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, color:C.textMid }}>{t.frequency}</span></Td>
                    <Td style={{ whiteSpace:'nowrap' }}>{t.next_due}</Td>
                    <Td><Badge text={t.status} /></Td>
                    <Td>{t.assigned_to || '—'}</Td>
                    <Td>
                      {t.status !== 'Completed' && (
                        <button onClick={() => handleComplete(t.id)} style={{ ...btnPrimary, padding:'5px 12px', fontSize:11, background:C.green, boxShadow:'none' }}>
                          Mark Complete
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </div>
        </div>
      )}

      {/* ══ WORK ORDERS ══ */}
      {activeTab === 'work_orders' && (
        <div>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            <StatPill label="Open"        value={workOrders.filter(w=>w.status==='Open').length}        color={C.accent} bg="#e0f4ff"   />
            <StatPill label="Assigned"    value={workOrders.filter(w=>w.status==='Assigned').length}    color={C.amber}  bg={C.amberBg} />
            <StatPill label="In Progress" value={workOrders.filter(w=>w.status==='In Progress').length} color={C.purple} bg={C.purpleBg}/>
            <StatPill label="Complete"    value={workOrders.filter(w=>w.status==='Complete').length}    color={C.green}  bg={C.greenBg} />
          </div>

          {/* New WO form */}
          {showWOForm && (
            <FormPanel title="New Work Order" onClose={() => setShowWOForm(false)}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <select style={iStyle} value={newWO.asset} onChange={e => setNewWO({...newWO, asset:e.target.value})}>
                  <option value="">Select asset</option>
                  {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
                <select style={iStyle} value={newWO.priority} onChange={e => setNewWO({...newWO, priority:e.target.value})}>
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
                <select style={iStyle} value={newWO.assigned_to} onChange={e => setNewWO({...newWO, assigned_to:e.target.value})}>
                  <option value="">Assign to…</option>
                  {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                </select>
                <input style={iStyle} type="date" value={newWO.due_date} onChange={e => setNewWO({...newWO, due_date:e.target.value})} />
                <input style={iStyle} type="number" placeholder="Estimated hours" value={newWO.estimated_hours} onChange={e => setNewWO({...newWO, estimated_hours:e.target.value})} />
              </div>
              <textarea style={{ ...iStyle, minHeight:80, marginBottom:8, resize:'vertical' }} placeholder="Defect description *" value={newWO.defect_description} onChange={e => setNewWO({...newWO, defect_description:e.target.value})} />
              <textarea style={{ ...iStyle, minHeight:60, marginBottom:12, resize:'vertical' }} placeholder="Comments / notes" value={newWO.comments} onChange={e => setNewWO({...newWO, comments:e.target.value})} />
              <div style={{ display:'flex', gap:8 }}>
                <button style={btnPrimary} onClick={handleAddWO}>Save Work Order</button>
                <button style={btnGhost} onClick={() => setShowWOForm(false)}>Cancel</button>
              </div>
            </FormPanel>
          )}

          {/* Open WOs */}
          <div style={{ ...card, marginBottom:16 }}>
            <SectionHead
              title="Open Work Orders"
              count={openWOs.length}
              action={!showWOForm && userRole?.role !== 'technician' && (
                <button style={btnPrimary} onClick={() => setShowWOForm(true)}>+ New Work Order</button>
              )}
            />
            {openWOs.length === 0 ? (
              <Empty icon="🎉" title="All clear" desc="No open work orders. Great work from the team!" />
            ) : (
              <Table heads={['Asset','Defect','Priority','Assigned','Due','Hrs','Status','Source','']}>
                {openWOs.map(w => (
                  <Tr key={w.id}>
                    <Td><span style={{ fontWeight:700, color:C.textDark }}>{w.asset}</span></Td>
                    <Td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={w.defect_description}>{w.defect_description}</Td>
                    <Td><Badge text={w.priority} map={PRIORITY_MAP} /></Td>
                    <Td>{w.assigned_to || '—'}</Td>
                    <Td style={{ whiteSpace:'nowrap' }}>{w.due_date || '—'}</Td>
                    <Td>{w.estimated_hours ? w.estimated_hours + 'h' : '—'}</Td>
                    <Td><Badge text={w.status} /></Td>
                    <Td>
                      <span style={{ fontSize:11, color:C.textMuted, background:C.borderLight, padding:'2px 7px', borderRadius:6 }}>
                        {w.source === 'prestart' ? 'Prestart' : 'Manual'}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ display:'flex', gap:6 }}>
                        {getNextStatus(w.status) && (
                          <button style={{ ...btnPrimary, padding:'4px 10px', fontSize:11, background:C.green, boxShadow:'none' }} onClick={() => handleUpdateWOStatus(w.id, getNextStatus(w.status))}>
                            → {getNextStatus(w.status)}
                          </button>
                        )}
                        <button style={{ ...btnGhost, padding:'4px 10px', fontSize:11 }} onClick={() => setEditingWO(w)}>Edit</button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Table>
            )}
          </div>

          {/* Completed WOs */}
          {closedWOs.length > 0 && (
            <div style={card}>
              <SectionHead title="Completed Work Orders" count={closedWOs.length} />
              <Table heads={['Asset','Defect','Priority','Assigned','Source','']}>
                {closedWOs.map(w => (
                  <Tr key={w.id} faded>
                    <Td><span style={{ fontWeight:700, color:C.textDark }}>{w.asset}</span></Td>
                    <Td>{w.defect_description}</Td>
                    <Td><Badge text={w.priority} map={PRIORITY_MAP} /></Td>
                    <Td>{w.assigned_to || '—'}</Td>
                    <Td><span style={{ fontSize:11, color:C.textMuted, background:C.borderLight, padding:'2px 7px', borderRadius:6 }}>{w.source === 'prestart' ? 'Prestart' : 'Manual'}</span></Td>
                    <Td><button style={{ ...btnGhost, padding:'4px 10px', fontSize:11 }} onClick={() => setEditingWO(w)}>View</button></Td>
                  </Tr>
                ))}
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ══ PM TASKS ══ */}
      {activeTab === 'pm_tasks' && (
        <div style={card}>
          <Empty icon="🔩" title="PM Tasks — Coming Soon" desc="Detailed PM task tracking will be available in a future update." />
        </div>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editingWO && (
        <Modal title="Edit Work Order" onClose={() => setEditingWO(null)}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <select style={iStyle} value={editingWO.asset} onChange={e => setEditingWO({...editingWO, asset:e.target.value})}>
              {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
            <select style={iStyle} value={editingWO.priority} onChange={e => setEditingWO({...editingWO, priority:e.target.value})}>
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
            <select style={iStyle} value={editingWO.assigned_to || ''} onChange={e => setEditingWO({...editingWO, assigned_to:e.target.value})}>
              <option value="">Assign to…</option>
              {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
            <select style={iStyle} value={editingWO.status} onChange={e => setEditingWO({...editingWO, status:e.target.value})}>
              <option>Open</option><option>Assigned</option><option>In Progress</option><option>Complete</option>
            </select>
            <input style={iStyle} type="date" value={editingWO.due_date || ''} onChange={e => setEditingWO({...editingWO, due_date:e.target.value})} />
            <input style={iStyle} type="number" placeholder="Estimated hours" value={editingWO.estimated_hours || ''} onChange={e => setEditingWO({...editingWO, estimated_hours:e.target.value})} />
          </div>
          <textarea style={{ ...iStyle, minHeight:80, marginBottom:8, resize:'vertical' }} placeholder="Defect description" value={editingWO.defect_description} onChange={e => setEditingWO({...editingWO, defect_description:e.target.value})} />
          <textarea style={{ ...iStyle, minHeight:60, marginBottom:16, resize:'vertical' }} placeholder="Comments / notes" value={editingWO.comments || ''} onChange={e => setEditingWO({...editingWO, comments:e.target.value})} />
          <div style={{ display:'flex', gap:8 }}>
            <button style={btnPrimary} onClick={handleUpdateWO}>Save Changes</button>
            <button style={btnGhost} onClick={() => setEditingWO(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Service Schedules Tab ── */}
      {activeTab === 'schedules' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            <button onClick={() => setShowScheduleForm(s=>!s)} style={{ padding:'9px 18px', background:showScheduleForm?'var(--surface-2)':'var(--accent)', color:showScheduleForm?'var(--text-secondary)':'#fff', border:'1px solid '+(showScheduleForm?'var(--border)':'var(--accent)'), borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {showScheduleForm ? '✕ Close' : '+ Add Schedule'}
            </button>
          </div>

          {showScheduleForm && (
            <div style={{ ...card, marginBottom:20, borderLeft:'3px solid var(--accent)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontSize:14, fontWeight:800, color:C.textDark }}>New Service Schedule</span>
                {aiLoading && <span style={{ fontSize:12, color:'var(--accent)' }}>🤖 AI thinking…</span>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Asset *</div>
                  <select style={iStyle} value={newSchedule.asset_name} onChange={e => {
                    const name = e.target.value;
                    const asset = assets.find(a => a.name === name);
                    setNewSchedule(s => ({ ...s, asset_name: name, asset_id: asset?.id || '' }));
                  }}>
                    <option value="">Select asset…</option>
                    {assets.map(a => <option key={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Service Name *</div>
                  <input style={iStyle} placeholder="e.g. Engine Oil Change" value={newSchedule.service_name} onChange={e => setNewSchedule(s=>({...s,service_name:e.target.value}))} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Interval Type</div>
                  <select style={iStyle} value={newSchedule.interval_type} onChange={e => setNewSchedule(s=>({...s,interval_type:e.target.value}))}>
                    <option value="hours">Hours</option>
                    <option value="km">Kilometres</option>
                    <option value="days">Days</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Every (value) *</div>
                  <input style={iStyle} type="number" placeholder={newSchedule.interval_type==='hours'?'e.g. 500':'e.g. 10000'} value={newSchedule.interval_value} onChange={e => setNewSchedule(s=>({...s,interval_value:e.target.value}))} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Last Service {newSchedule.interval_type==='hours'?'Hours':newSchedule.interval_type==='km'?'KM':'Date'}</div>
                  {newSchedule.interval_type==='hours'||newSchedule.interval_type==='km'
                    ? <input style={iStyle} type="number" placeholder="0" value={newSchedule.last_service_value} onChange={e => setNewSchedule(s=>({...s,last_service_value:e.target.value}))} />
                    : <input style={iStyle} type="date" value={newSchedule.last_service_date} onChange={e => setNewSchedule(s=>({...s,last_service_date:e.target.value}))} />
                  }
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Notes</div>
                  <input style={iStyle} placeholder="Optional notes" value={newSchedule.notes} onChange={e => setNewSchedule(s=>({...s,notes:e.target.value}))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={handleAddSchedule} style={{ padding:'9px 22px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Save Schedule</button>
                {newSchedule.asset_name && (
                  <button onClick={async () => {
                    const asset = assets.find(a => a.name === newSchedule.asset_name);
                    const suggestions = await aiSuggestSchedules(newSchedule.asset_name, asset?.type || '');
                    if (suggestions.length > 0) {
                      const rows = suggestions.map(s => ({
                        company_id: userRole.company_id,
                        asset_name: newSchedule.asset_name,
                        asset_id: asset?.id || null,
                        service_name: s.service_name,
                        interval_type: s.interval_type,
                        interval_value: s.interval_value,
                        last_service_value: 0,
                        next_due_value: s.interval_value,
                        notes: s.notes || '',
                      }));
                      await supabase.from('service_schedules').insert(rows);
                      fetchSchedules();
                      setShowScheduleForm(false);
                      alert(`✓ AI added ${rows.length} service schedules for ${newSchedule.asset_name}`);
                    }
                  }} disabled={aiLoading} style={{ padding:'9px 18px', background:'var(--surface-2)', color:'var(--accent)', border:'1px solid var(--accent)', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:aiLoading?0.5:1 }}>
                    {aiLoading ? '🤖 Loading…' : '🤖 AI Suggest All Services'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div style={card}>
            <SectionHead title="Service Schedules" count={schedules.length} />
            {schedules.length === 0 ? (
              <Empty icon="⏱" title="No service schedules" desc="Add schedules manually or use AI to generate them from your asset type." />
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ borderBottom:'2px solid var(--border)' }}>
                    {['Asset','Service','Interval','Last Service','Next Due','Status',''].map(h => <th key={h} style={{ textAlign:'left', padding:'0 14px 12px 0', fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:'1.2px', textTransform:'uppercase' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {schedules.map((s, i) => {
                      const hoursNow = assets.find(a => a.name === s.asset_name)?.hours || 0;
                      const remaining = s.interval_type === 'hours' || s.interval_type === 'km'
                        ? (s.next_due_value || 0) - hoursNow : null;
                      const isOverdue = remaining !== null ? remaining <= 0 : s.next_due_date && s.next_due_date < new Date().toISOString().split('T')[0];
                      const isWarning = remaining !== null ? (remaining > 0 && remaining <= s.interval_value * 0.1) : false;
                      const statusColor = isOverdue ? 'var(--red)' : isWarning ? 'var(--amber)' : 'var(--green)';
                      const statusBg = isOverdue ? 'var(--red-bg)' : isWarning ? 'var(--amber-bg)' : 'var(--green-bg)';
                      const statusLabel = isOverdue ? 'Overdue' : isWarning ? 'Due Soon' : 'OK';
                      return (
                        <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', opacity:0, animation:`fadeUp 0.25s ease ${i*25}ms forwards` }}>
                          <td style={{ padding:'11px 14px 11px 0', fontSize:13, fontWeight:600, color:C.textDark }}>{s.asset_name}</td>
                          <td style={{ padding:'11px 14px 11px 0', fontSize:13, color:C.textMid }}>{s.service_name}</td>
                          <td style={{ padding:'11px 14px 11px 0', fontSize:13, color:C.textMid }}>Every {s.interval_value} {s.interval_type}</td>
                          <td style={{ padding:'11px 14px 11px 0', fontSize:13, color:C.textMuted }}>
                            {s.interval_type === 'hours' || s.interval_type === 'km' ? `${s.last_service_value} ${s.interval_type}` : s.last_service_date || '—'}
                          </td>
                          <td style={{ padding:'11px 14px 11px 0', fontSize:13, fontWeight:700, color:statusColor }}>
                            {s.interval_type === 'hours' || s.interval_type === 'km'
                              ? `${s.next_due_value} ${s.interval_type}${remaining !== null ? ` (${remaining > 0 ? remaining + ' to go' : Math.abs(remaining) + ' overdue'})` : ''}`
                              : s.next_due_date || '—'}
                          </td>
                          <td style={{ padding:'11px 14px 11px 0' }}>
                            <span style={{ padding:'3px 9px', borderRadius:4, background:statusBg, color:statusColor, fontSize:10, fontWeight:700, border:`1px solid ${statusColor}40` }}>{statusLabel}</span>
                          </td>
                          <td style={{ padding:'11px 0' }}>
                            <button onClick={async () => {
                              const hoursVal = s.interval_type==='hours'||s.interval_type==='km' ? prompt(`Current ${s.interval_type} reading for ${s.asset_name}?`) : null;
                              const newLast = hoursVal ? parseFloat(hoursVal) : (s.next_due_value || s.last_service_value || 0);
                              const nextVal = newLast + s.interval_value;
                              let nextDate = null;
                              if (s.interval_type==='days'||s.interval_type==='months') {
                                const d = new Date(); if (s.interval_type==='days') d.setDate(d.getDate()+s.interval_value); else d.setMonth(d.getMonth()+s.interval_value);
                                nextDate = d.toISOString().split('T')[0];
                              }
                              await supabase.from('service_schedules').update({ last_service_value:newLast, last_service_date:new Date().toISOString().split('T')[0], next_due_value:nextVal, next_due_date:nextDate }).eq('id', s.id);
                              fetchSchedules();
                            }} style={{ padding:'4px 10px', background:'var(--green-bg)', color:'var(--green)', border:'1px solid var(--green-border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>✓ Done</button>
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

      {/* ── Calendar Tab ── */}
      {activeTab === 'calendar' && (
        <div>
          {(() => {
            const year = calMonth.getFullYear();
            const month = calMonth.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date().toISOString().split('T')[0];
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

            // Gather all events for this month
            const events = {};

            // Helper: estimate a date for hour/km-based schedules
            const estimateDate = (s) => {
              if (s.next_due_date) return s.next_due_date;
              if ((s.interval_type === 'hours' || s.interval_type === 'km') && s.next_due_value) {
                const assetData = assets.find(a => a.name === s.asset_name);
                const currentVal = assetData?.hours || s.last_service_value || 0;
                const remaining = s.next_due_value - currentVal;
                if (remaining <= 0) return today; // overdue — show today
                // Assume ~10 hrs/day for heavy equipment, ~50 km/day for vehicles
                const dailyRate = s.interval_type === 'km' ? 50 : 10;
                const daysUntilDue = Math.round(remaining / dailyRate);
                const d = new Date();
                d.setDate(d.getDate() + daysUntilDue);
                return d.toISOString().split('T')[0];
              }
              return null;
            };

            tasks.forEach(t => {
              if (t.next_due && t.next_due.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)) {
                const day = parseInt(t.next_due.split('-')[2]);
                if (!events[day]) events[day] = [];
                events[day].push({ label: t.asset + ' — ' + t.task, color: t.status==='Overdue'?'var(--red)':t.status==='Due Soon'?'var(--amber)':'var(--accent)', type:'service' });
              }
            });
            schedules.forEach(s => {
              const dateStr = estimateDate(s);
              if (dateStr && dateStr.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)) {
                const day = parseInt(dateStr.split('-')[2]);
                if (!events[day]) events[day] = [];
                const assetData = assets.find(a => a.name === s.asset_name);
                const currentVal = assetData?.hours || 0;
                const remaining = s.next_due_value ? s.next_due_value - currentVal : null;
                const suffix = remaining !== null ? ` (${remaining > 0 ? remaining + s.interval_type + ' to go' : 'OVERDUE'})` : '';
                const isOverdue = remaining !== null && remaining <= 0;
                events[day].push({ label: s.asset_name + ' — ' + s.service_name + suffix, color: isOverdue ? 'var(--red)' : 'var(--purple)', type:'schedule' });
              }
            });
            workOrders.filter(w=>w.status!=='Complete').forEach(w => {
              if (w.due_date && w.due_date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)) {
                const day = parseInt(w.due_date.split('-')[2]);
                if (!events[day]) events[day] = [];
                events[day].push({ label: (w.asset_name||'') + ' — ' + (w.title||w.defect_description||'').slice(0,30), color:'var(--red)', type:'wo' });
              }
            });

            const cells = [];
            for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);

            return (
              <div>
                {/* Month nav */}
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
                  <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))} style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:16, color:'var(--text-secondary)', fontWeight:700 }}>‹</button>
                  <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', minWidth:200, textAlign:'center', fontFamily:'var(--font-display)' }}>{monthNames[month]} {year}</div>
                  <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))} style={{ padding:'8px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontSize:16, color:'var(--text-secondary)', fontWeight:700 }}>›</button>
                  <button onClick={() => setCalMonth(new Date())} style={{ padding:'7px 14px', background:'var(--accent-light)', color:'var(--accent)', border:'1px solid rgba(14,165,233,0.25)', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700 }}>Today</button>
                </div>
                {/* Legend */}
                <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
                  {[['var(--accent)','Planned Maintenance'],['var(--purple)','Service Schedule'],['var(--red)','Work Order Due']].map(([col,lbl]) => (
                    <div key={lbl} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:col, display:'inline-block' }} />{lbl}
                    </div>
                  ))}
                </div>
                {/* Day headers */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                    <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-muted)', padding:'6px 0', textTransform:'uppercase', letterSpacing:'0.5px' }}>{d}</div>
                  ))}
                </div>
                {/* Grid */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                  {cells.map((day, i) => {
                    const dateStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
                    const isToday = dateStr === today;
                    const dayEvents = day ? (events[day] || []) : [];
                    return (
                      <div key={i} style={{
                        minHeight:80, background: day ? 'var(--surface)' : 'transparent',
                        border: day ? `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}` : 'none',
                        borderRadius:8, padding:'6px 8px',
                        boxShadow: isToday ? '0 0 0 2px var(--accent)' : 'none',
                      }}>
                        {day && (
                          <>
                            <div style={{ fontSize:12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : 'var(--text-secondary)', marginBottom:4 }}>{day}</div>
                            {dayEvents.slice(0,3).map((ev, j) => (
                              <div key={j} title={ev.label} style={{ fontSize:10, fontWeight:600, color:'#fff', background:ev.color, borderRadius:3, padding:'2px 5px', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.label}</div>
                            ))}
                            {dayEvents.length > 3 && <div style={{ fontSize:9, color:'var(--text-faint)' }}>+{dayEvents.length-3} more</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}

export default Maintenance;
