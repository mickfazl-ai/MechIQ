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
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800, color, background:bg, padding:'2px 10px', borderRadius:7 }}>{value}</span>
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
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:C.textDark }}>{title}</span>
        {count !== undefined && <span style={{ background:C.accent+'20', color:C.accent, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{count}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function Maintenance({ userRole, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'scheduled');
  const [tasks, setTasks] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showWOForm, setShowWOForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingWO, setEditingWO] = useState(null);
  const [newTask, setNewTask] = useState({ asset:'', task:'', frequency:'', next_due:'', assigned_to:'' });
  const [newWO, setNewWO] = useState({ asset:'', defect_description:'', priority:'Medium', assigned_to:'', due_date:'', estimated_hours:'', comments:'' });

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { if (userRole?.company_id) { fetchTasks(); fetchWorkOrders(); fetchAssets(); fetchUsers(); } }, [userRole]);

  const fetchTasks = async () => { setLoading(true); const { data } = await supabase.from('maintenance').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setTasks(data || []); setLoading(false); };
  const fetchWorkOrders = async () => { const { data } = await supabase.from('work_orders').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false }); setWorkOrders(data || []); };
  const fetchAssets = async () => { const { data } = await supabase.from('assets').select('name').eq('company_id', userRole.company_id); setAssets(data || []); };
  const fetchUsers = async () => { const { data } = await supabase.from('user_roles').select('name').eq('company_id', userRole.company_id); setUsers(data || []); };

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

  const TABS = [
    { id:'scheduled',   label:'Scheduled Service' },
    { id:'work_orders', label:'Work Orders' },
    { id:'pm_tasks',    label:'PM Tasks' },
  ];

  const btnPrimary = { padding:'8px 18px', background:C.accent, color:'var(--text-primary)', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 3px 10px ${C.accent}44`, letterSpacing:'0.5px' };
  const btnGhost   = { padding:'8px 16px', background:C.surface, color:C.textMid, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' };

  return (
    <div style={{ animation:'fadeUp 0.35s ease both' }}>

      {/* ── Tab bar ── */}
      <TabBar tabs={TABS} active={activeTab} onChange={t => { setActiveTab(t); setShowForm(false); setShowWOForm(false); }} />

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
    </div>
  );
}

export default Maintenance;
