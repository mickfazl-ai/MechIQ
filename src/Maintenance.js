import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

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
  const [newTask, setNewTask] = useState({ asset: '', task: '', frequency: '', next_due: '', assigned_to: '' });
  const [newWO, setNewWO] = useState({ asset: '', defect_description: '', priority: 'Medium', assigned_to: '', due_date: '', estimated_hours: '', comments: '' });

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (userRole?.company_id) { fetchTasks(); fetchWorkOrders(); fetchAssets(); fetchUsers(); }
  }, [userRole]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('maintenance').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const fetchWorkOrders = async () => {
    const { data } = await supabase.from('work_orders').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setWorkOrders(data || []);
  };

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('name').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_roles').select('name').eq('company_id', userRole.company_id);
    setUsers(data || []);
  };

  const handleAdd = async () => {
    if (newTask.asset && newTask.task && newTask.next_due) {
      const { error } = await supabase.from('maintenance').insert([{ ...newTask, status: 'Upcoming', company_id: userRole.company_id }]);
      if (error) alert('Error: ' + error.message);
      else { fetchTasks(); setNewTask({ asset: '', task: '', frequency: '', next_due: '', assigned_to: '' }); setShowForm(false); }
    }
  };

  const handleComplete = async (id) => {
    const { error } = await supabase.from('maintenance').update({ status: 'Completed' }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchTasks();
  };

  const handleAddWO = async () => {
    if (!newWO.asset || !newWO.defect_description) { alert('Please fill in asset and defect description'); return; }
    const { error } = await supabase.from('work_orders').insert([{ ...newWO, company_id: userRole.company_id, status: 'Open', source: 'manual' }]);
    if (error) alert('Error: ' + error.message);
    else { fetchWorkOrders(); setNewWO({ asset: '', defect_description: '', priority: 'Medium', assigned_to: '', due_date: '', estimated_hours: '', comments: '' }); setShowWOForm(false); }
  };

  const handleUpdateWOStatus = async (id, status) => {
    const { error } = await supabase.from('work_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchWorkOrders();
  };

  const handleUpdateWO = async () => {
    const { error } = await supabase.from('work_orders').update({ ...editingWO, updated_at: new Date().toISOString() }).eq('id', editingWO.id);
    if (error) alert('Error: ' + error.message);
    else { fetchWorkOrders(); setEditingWO(null); }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Critical') return '#e94560';
    if (priority === 'High') return '#ff6b00';
    if (priority === 'Medium') return '#ffc800';
    return '#00c264';
  };

  const getStatusColor = (status) => {
    if (status === 'Complete') return '#00c264';
    if (status === 'In Progress') return '#00c2e0';
    if (status === 'Assigned') return '#ffc800';
    return '#a0b0b0';
  };

  const getNextStatus = (status) => {
    if (status === 'Open') return 'Assigned';
    if (status === 'Assigned') return 'In Progress';
    if (status === 'In Progress') return 'Complete';
    return null;
  };

  const openWOs = workOrders.filter(w => w.status !== 'Complete');
  const closedWOs = workOrders.filter(w => w.status === 'Complete');

  return (
    <div className="maintenance">
      {/* Sub Navbar */}
      <div style={{display:'flex', gap:'0', marginBottom:'25px', borderBottom:'2px solid #1a2f2f'}}>
        {[{id:'scheduled', label:'Scheduled Service'}, {id:'work_orders', label:'Work Orders'}, {id:'pm_tasks', label:'PM Tasks'}, {id:'oil_sampling', label:'Oil Sampling'}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{padding:'12px 24px', backgroundColor:'transparent', color: activeTab === tab.id ? '#00c2e0' : '#a0b0b0', border:'none', borderBottom: activeTab === tab.id ? '2px solid #00c2e0' : '2px solid transparent', cursor:'pointer', fontWeight: activeTab === tab.id ? 'bold' : 'normal', fontSize:'14px', marginBottom:'-2px', fontFamily:'Barlow, sans-serif', letterSpacing:'0.5px'}}>
            {tab.label}
            {tab.id === 'workorders' && openWOs.length > 0 && (
              <span style={{marginLeft:'8px', backgroundColor:'#e94560', color:'white', borderRadius:'10px', padding:'1px 7px', fontSize:'11px'}}>{openWOs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* PM TASKS TAB */}
      {activeTab === 'scheduled' && (
        <div>
          <div className="page-header">
            <h2>Preventative Maintenance</h2>
            {userRole?.role !== 'technician' && (
              <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add PM Task</button>
            )}
          </div>

          <div className="pm-summary">
            <div className="pm-badge overdue-count">Overdue: {tasks.filter(t => t.status === 'Overdue').length}</div>
            <div className="pm-badge duesoon-count">Due Soon: {tasks.filter(t => t.status === 'Due Soon').length}</div>
            <div className="pm-badge upcoming-count">Upcoming: {tasks.filter(t => t.status === 'Upcoming').length}</div>
            <div className="pm-badge completed-count">Completed: {tasks.filter(t => t.status === 'Completed').length}</div>
          </div>

          {showForm && (
            <div className="form-card">
              <h3>Add New PM Task</h3>
              <div className="form-grid">
                <input placeholder="Asset Name" value={newTask.asset} onChange={e => setNewTask({...newTask, asset: e.target.value})} />
                <input placeholder="Task Description" value={newTask.task} onChange={e => setNewTask({...newTask, task: e.target.value})} />
                <select value={newTask.frequency} onChange={e => setNewTask({...newTask, frequency: e.target.value})}>
                  <option value="">Select Frequency</option>
                  <option>Daily</option><option>Weekly</option><option>Monthly</option>
                  <option>Every 250 hours</option><option>Every 500 hours</option>
                  <option>Every 1000 hours</option><option>Annually</option>
                </select>
                <input type="date" value={newTask.next_due} onChange={e => setNewTask({...newTask, next_due: e.target.value})} />
                <input placeholder="Assigned To" value={newTask.assigned_to} onChange={e => setNewTask({...newTask, assigned_to: e.target.value})} />
              </div>
              <button className="btn-primary" onClick={handleAdd}>Save PM Task</button>
            </div>
          )}

          {loading ? <p style={{color:'#a8a8b3'}}>Loading maintenance tasks...</p> : (
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>Task</th><th>Frequency</th><th>Next Due</th><th>Status</th><th>Assigned To</th><th>Action</th></tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>{t.asset}</td><td>{t.task}</td><td>{t.frequency}</td><td>{t.next_due}</td>
                    <td><span className={`pm-status ${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span></td>
                    <td>{t.assigned_to}</td>
                    <td>{t.status !== 'Completed' && <button className="btn-complete" onClick={() => handleComplete(t.id)}>Mark Complete</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* WORK ORDERS TAB */}
      {activeTab === 'work_orders' && (
        <div>
          <div className="page-header">
            <h2>Work Orders</h2>
            {userRole?.role !== 'technician' && (
              <button className="btn-primary" onClick={() => setShowWOForm(!showWOForm)}>+ New Work Order</button>
            )}
          </div>

          {/* Stats */}
          <div className="pm-summary">
            <div className="pm-badge overdue-count">Open: {workOrders.filter(w => w.status === 'Open').length}</div>
            <div className="pm-badge duesoon-count">Assigned: {workOrders.filter(w => w.status === 'Assigned').length}</div>
            <div className="pm-badge upcoming-count">In Progress: {workOrders.filter(w => w.status === 'In Progress').length}</div>
            <div className="pm-badge completed-count">Complete: {workOrders.filter(w => w.status === 'Complete').length}</div>
          </div>

          {/* New WO Form */}
          {showWOForm && (
            <div className="form-card">
              <h3>New Work Order</h3>
              <div className="form-grid">
                <select value={newWO.asset} onChange={e => setNewWO({...newWO, asset: e.target.value})}>
                  <option value="">Select Asset</option>
                  {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
                <select value={newWO.priority} onChange={e => setNewWO({...newWO, priority: e.target.value})}>
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
                <select value={newWO.assigned_to} onChange={e => setNewWO({...newWO, assigned_to: e.target.value})}>
                  <option value="">Assign To...</option>
                  {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                </select>
                <input type="date" placeholder="Due Date" value={newWO.due_date} onChange={e => setNewWO({...newWO, due_date: e.target.value})} />
                <input type="number" placeholder="Estimated Hours" value={newWO.estimated_hours} onChange={e => setNewWO({...newWO, estimated_hours: e.target.value})} />
              </div>
              <textarea placeholder="Defect Description *" value={newWO.defect_description} onChange={e => setNewWO({...newWO, defect_description: e.target.value})}
                style={{width:'100%', padding:'10px', borderRadius:'4px', border:'1px solid #1a2f2f', backgroundColor:'#0a0f0f', color:'white', minHeight:'80px', fontFamily:'Barlow, sans-serif', fontSize:'14px', marginBottom:'10px'}} />
              <textarea placeholder="Comments / Notes" value={newWO.comments} onChange={e => setNewWO({...newWO, comments: e.target.value})}
                style={{width:'100%', padding:'10px', borderRadius:'4px', border:'1px solid #1a2f2f', backgroundColor:'#0a0f0f', color:'white', minHeight:'60px', fontFamily:'Barlow, sans-serif', fontSize:'14px', marginBottom:'10px'}} />
              <button className="btn-primary" onClick={handleAddWO}>Save Work Order</button>
            </div>
          )}

          {/* Edit WO Modal */}
          {editingWO && (
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{backgroundColor:'#0d1515', border:'1px solid #1a2f2f', borderRadius:'8px', padding:'30px', width:'500px', maxHeight:'80vh', overflowY:'auto'}}>
                <h3 style={{marginBottom:'20px', color:'#00c2e0'}}>Edit Work Order</h3>
                <div className="form-grid">
                  <select value={editingWO.asset} onChange={e => setEditingWO({...editingWO, asset: e.target.value})}>
                    {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                  <select value={editingWO.priority} onChange={e => setEditingWO({...editingWO, priority: e.target.value})}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                  </select>
                  <select value={editingWO.assigned_to || ''} onChange={e => setEditingWO({...editingWO, assigned_to: e.target.value})}>
                    <option value="">Assign To...</option>
                    {users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                  </select>
                  <select value={editingWO.status} onChange={e => setEditingWO({...editingWO, status: e.target.value})}>
                    <option>Open</option><option>Assigned</option><option>In Progress</option><option>Complete</option>
                  </select>
                  <input type="date" value={editingWO.due_date || ''} onChange={e => setEditingWO({...editingWO, due_date: e.target.value})} />
                  <input type="number" placeholder="Estimated Hours" value={editingWO.estimated_hours || ''} onChange={e => setEditingWO({...editingWO, estimated_hours: e.target.value})} />
                </div>
                <textarea placeholder="Defect Description" value={editingWO.defect_description} onChange={e => setEditingWO({...editingWO, defect_description: e.target.value})}
                  style={{width:'100%', padding:'10px', borderRadius:'4px', border:'1px solid #1a2f2f', backgroundColor:'#0a0f0f', color:'white', minHeight:'80px', fontFamily:'Barlow, sans-serif', fontSize:'14px', marginBottom:'10px'}} />
                <textarea placeholder="Comments / Notes" value={editingWO.comments || ''} onChange={e => setEditingWO({...editingWO, comments: e.target.value})}
                  style={{width:'100%', padding:'10px', borderRadius:'4px', border:'1px solid #1a2f2f', backgroundColor:'#0a0f0f', color:'white', minHeight:'60px', fontFamily:'Barlow, sans-serif', fontSize:'14px', marginBottom:'15px'}} />
                <div style={{display:'flex', gap:'10px'}}>
                  <button className="btn-primary" onClick={handleUpdateWO}>Save Changes</button>
                  <button onClick={() => setEditingWO(null)} style={{backgroundColor:'transparent', color:'#a0b0b0', border:'1px solid #1a2f2f', padding:'8px 16px', borderRadius:'4px', cursor:'pointer'}}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Open Work Orders */}
          <h3 style={{color:'#fff', marginTop:'20px', marginBottom:'12px'}}>Open Work Orders ({openWOs.length})</h3>
          {openWOs.length === 0 ? <p style={{color:'#a0b0b0'}}>No open work orders 🎉</p> : (
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>Defect</th><th>Priority</th><th>Assigned To</th><th>Due Date</th><th>Est. Hrs</th><th>Status</th><th>Source</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {openWOs.map(w => (
                  <tr key={w.id}>
                    <td>{w.asset}</td>
                    <td style={{maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={w.defect_description}>{w.defect_description}</td>
                    <td><span style={{color: getPriorityColor(w.priority), fontWeight:'bold'}}>{w.priority}</span></td>
                    <td>{w.assigned_to || '-'}</td>
                    <td>{w.due_date || '-'}</td>
                    <td>{w.estimated_hours ? w.estimated_hours + 'h' : '-'}</td>
                    <td><span style={{color: getStatusColor(w.status), fontWeight:'bold'}}>{w.status}</span></td>
                    <td><span style={{color:'#a0b0b0', fontSize:'12px'}}>{w.source === 'prestart' ? '⚠ Prestart' : 'Manual'}</span></td>
                    <td>
                      <div style={{display:'flex', gap:'6px'}}>
                        {getNextStatus(w.status) && (
                          <button className="btn-complete" style={{fontSize:'11px', padding:'4px 8px'}} onClick={() => handleUpdateWOStatus(w.id, getNextStatus(w.status))}>
                            → {getNextStatus(w.status)}
                          </button>
                        )}
                        <button className="btn-primary" style={{fontSize:'11px', padding:'4px 8px'}} onClick={() => setEditingWO(w)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Completed Work Orders */}
          {closedWOs.length > 0 && (
            <div style={{marginTop:'30px'}}>
              <h3 style={{color:'#a0b0b0', marginBottom:'12px'}}>Completed Work Orders ({closedWOs.length})</h3>
              <table className="data-table">
                <thead>
                  <tr><th>Asset</th><th>Defect</th><th>Priority</th><th>Assigned To</th><th>Source</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {closedWOs.map(w => (
                    <tr key={w.id} style={{opacity:0.6}}>
                      <td>{w.asset}</td>
                      <td>{w.defect_description}</td>
                      <td><span style={{color: getPriorityColor(w.priority), fontWeight:'bold'}}>{w.priority}</span></td>
                      <td>{w.assigned_to || '-'}</td>
                      <td><span style={{color:'#a0b0b0', fontSize:'12px'}}>{w.source === 'prestart' ? '⚠ Prestart' : 'Manual'}</span></td>
                      <td><button className="btn-primary" style={{fontSize:'11px', padding:'4px 8px'}} onClick={() => setEditingWO(w)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab === 'pm_tasks' && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#7a92a8' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#3d5166', marginBottom: '6px' }}>PM Tasks - Coming Soon</div>
        </div>
      )}
      {activeTab === 'oil_sampling' && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#7a92a8' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#3d5166', marginBottom: '6px' }}>Oil Sampling - Coming Soon</div>
        </div>
      )}
    </div>
  );
}

export default Maintenance;