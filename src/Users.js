import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(20px) scale(0.96); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes toast-out {
    from { opacity: 1; }
    to   { opacity: 0; transform: translateX(20px) scale(0.96); }
  }
  .u-card {
    background: var(--surface);
    border: 1px solid #eaf3fb;
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 2px 10px rgba(0,100,180,0.07);
  }
  .u-input {
    width: 100%; padding: 10px 13px;
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 13px; color: var(--text-primary); background: var(--surface);
    outline: none; box-sizing: border-box; font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .u-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,171,228,0.12); }
  .u-input::placeholder { color: #b0c4d4; }
  .u-btn-primary {
    padding: 9px 20px; background: var(--accent); color: #fff;
    border: none; border-radius: 8px; font-size: 12px; font-weight: 700;
    cursor: pointer; font-family: inherit; letter-spacing: 0.4px;
    box-shadow: 0 3px 10px rgba(0,171,228,0.35); transition: all 0.15s;
  }
  .u-btn-primary:hover:not(:disabled) { background: #0096cc; transform: translateY(-1px); box-shadow: 0 5px 14px rgba(0,171,228,0.4); }
  .u-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .u-btn-ghost {
    padding: 9px 18px; background: var(--surface); color: var(--text-secondary);
    border: 1px solid var(--border); border-radius: 8px; font-size: 12px;
    font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .u-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .u-btn-danger {
    padding: 6px 13px; background: var(--surface); color: #dc2626;
    border: 1.5px solid #fecaca; border-radius: 7px; font-size: 11px;
    font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .u-btn-danger:hover { background: #fee2e2; border-color: #dc2626; }
  .u-row { transition: background 0.1s; }
  .u-row:hover td { background: #f4f8fd !important; }
  .u-role-select {
    padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
    border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);
    font-family: inherit; cursor: pointer; outline: none; transition: border-color 0.15s;
  }
  .u-role-select:focus { border-color: var(--accent); }
`;

// ─── Role config ───────────────────────────────────────────────────────────────
const ROLE_COLOR = {
  admin:      ['var(--purple)', 'var(--purple-bg)'],
  supervisor: ['var(--amber)', 'var(--amber-bg)'],
  technician: ['var(--accent)', '#e0f4ff'],
  operator:   ['var(--green)', 'var(--green-bg)'],
};

function RoleBadge({ role }) {
  const [c, bg] = ROLE_COLOR[role] || ['var(--text-muted)', '#f1f5f9'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:bg, color:c, fontSize:11, fontWeight:700 }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c }} />
      {role.charAt(0).toUpperCase() + role.slice(1)}
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
    }, 3800);
  }, []);
  return { toasts, add };
}

function ToastContainer({ toasts }) {
  const P = {
    success: { border: 'var(--green)', icon: '✓', bg: '#f0fdf4' },
    error:   { border: 'var(--red)', icon: '✕', bg: '#fef2f2' },
    info:    { border: 'var(--accent)', icon: 'ℹ', bg: '#f0f8ff' },
  };
  return (
    <div style={{ position:'fixed', bottom:28, right:28, zIndex:9999, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none' }}>
      {toasts.map(t => {
        const p = P[t.type] || P.info;
        return (
          <div key={t.id} style={{
            display:'flex', alignItems:'center', gap:12,
            background:p.bg, borderLeft:`4px solid ${p.border}`,
            border:`1px solid ${p.border}28`,
            borderRadius:12, padding:'12px 18px',
            boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
            minWidth:260, animation: t.exiting ? 'toast-out 0.3s ease forwards' : 'toast-in 0.3s ease',
            pointerEvents:'auto',
          }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:p.border+'22', display:'flex', alignItems:'center', justifyContent:'center', color:p.border, fontWeight:800, fontSize:11, flexShrink:0 }}>{p.icon}</div>
            <span style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ w = '100%', h = '13px', r = '6px' }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:'linear-gradient(90deg,#edf2f8 25%,#f5f8fd 50%,#edf2f8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear' }} />;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, role }) {
  const initials = (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const [c, bg] = ROLE_COLOR[role] || ['var(--text-muted)', '#f1f5f9'];
  return (
    <div style={{ width:36, height:36, borderRadius:'50%', background:bg, color:c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, border:`2px solid ${c}30`, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function Users({ companyId, userRole }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser]  = useState({ name:'', email:'', password:'', role:'technician' });
  const [saving, setSaving]   = useState(false);
  const { toasts, add: toast } = useToast();

  useEffect(() => {
    if (!document.getElementById('users-css')) {
      const s = document.createElement('style'); s.id = 'users-css'; s.textContent = CSS; document.head.appendChild(s);
    }
    if (companyId) fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('user_roles').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (error) toast('Failed to load users', 'error');
    else setUsers(data || []);
    setLoading(false);
  };

  const handleRoleChange = async (id, newRole) => {
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('id', id);
    if (error) toast('Failed to update role', 'error');
    else { toast('Role updated', 'success'); fetchUsers(); }
  };

  const handleDelete = async (id, email, name) => {
    if (email === userRole?.email) { toast("You can't remove your own account", 'error'); return; }
    if (!window.confirm(`Remove ${name || email} from your company?`)) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', id);
    if (error) toast('Failed to remove user', 'error');
    else { toast(`${name || email} removed`, 'success'); fetchUsers(); }
  };

  const handleAdd = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) { toast('Please fill in all fields', 'error'); return; }
    setSaving(true);
    try {
      const { error: authError } = await supabase.auth.signUp({ email: newUser.email, password: newUser.password });
      if (authError) throw authError;
      const { error: roleError } = await supabase.from('user_roles').insert([{ email: newUser.email, name: newUser.name, role: newUser.role, company_id: companyId }]);
      if (roleError) throw roleError;
      toast(`${newUser.name} added successfully`, 'success');
      setNewUser({ name:'', email:'', password:'', role:'technician' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      toast(err.message, 'error');
    }
    setSaving(false);
  };

  const admins      = users.filter(u => u.role === 'admin' || u.role === 'supervisor');
  const technicians = users.filter(u => u.role === 'technician' || u.role === 'operator');

  return (
    <>
      <ToastContainer toasts={toasts} />
      <div style={{ animation:'fadeUp 0.4s ease both' }}>

        {/* ── Page header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28 }}>
          <div>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0, lineHeight:1 }}>User Management</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0', fontWeight:500 }}>{users.length} team member{users.length !== 1 ? 's' : ''} in your organisation</p>
          </div>
          {userRole?.role === 'admin' && (
            <button className="u-btn-primary" onClick={() => { setShowForm(s => !s); }}>
              {showForm ? '✕ Cancel' : '+ Add User'}
            </button>
          )}
        </div>

        {/* ── Stat strip ── */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Total Users',  value:users.length,                                   color:'var(--accent)', bg:'#e0f4ff' },
              { label:'Admins',       value:users.filter(u=>u.role==='admin').length,        color:'var(--purple)', bg:'var(--purple-bg)' },
              { label:'Supervisors',  value:users.filter(u=>u.role==='supervisor').length,   color:'var(--amber)', bg:'var(--amber-bg)' },
              { label:'Technicians',  value:users.filter(u=>u.role==='technician'||u.role==='operator').length, color:'var(--green)', bg:'var(--green-bg)' },
            ].map((s, i) => (
              <div key={s.label} className="u-card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, opacity:0, animation:`fadeUp 0.4s ease ${i*60}ms forwards` }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:36, fontWeight:800, color:s.color, background:s.bg, padding:'2px 12px', borderRadius:8, lineHeight:1.2 }}>{s.value}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', lineHeight:1.3 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Add user form ── */}
        {showForm && (
          <div className="u-card" style={{ marginBottom:20, borderLeft:'3px solid var(--accent)', animation:'fadeUp 0.3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)' }}>Add New Team Member</span>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, lineHeight:1 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:5 }}>Full Name</label>
                <input className="u-input" placeholder="e.g. John Smith" value={newUser.name} onChange={e => setNewUser({...newUser, name:e.target.value})} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:5 }}>Email Address</label>
                <input className="u-input" type="email" placeholder="john@company.com" value={newUser.email} onChange={e => setNewUser({...newUser, email:e.target.value})} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:5 }}>Temporary Password</label>
                <input className="u-input" type="password" placeholder="Min. 8 characters" value={newUser.password} onChange={e => setNewUser({...newUser, password:e.target.value})} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:5 }}>Role</label>
                <select className="u-input" value={newUser.role} onChange={e => setNewUser({...newUser, role:e.target.value})}>
                  <option value="operator">Operator</option>
                  <option value="technician">Technician</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="u-btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Adding…' : 'Add Team Member'}</button>
              <button className="u-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Users table ── */}
        <div className="u-card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottom:'1.5px solid #eaf3fb' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text-primary)' }}>Team Members</span>
              <span style={{ background:'#e0f4ff', color:'var(--accent)', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{users.length}</span>
            </div>
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid #eaf3fb' }}>
                  <Sk w="36px" h="36px" r="50%" />
                  <div style={{ flex:1 }}><Sk w="40%" h="13px" /><div style={{ marginTop:5 }}><Sk w="55%" h="11px" /></div></div>
                  <Sk w="80px" h="24px" r="20px" />
                  <Sk w="60px" h="28px" r="6px" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px' }}>
              <div style={{ fontSize:36, marginBottom:12, opacity:0.3 }}>👥</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>No team members yet</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>Add your first team member to get started.</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #eaf3fb' }}>
                  {['Team Member','Email','Role','Joined',''].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'0 14px 12px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className="u-row" style={{ borderBottom:'1px solid #eaf3fb', opacity:0, animation:`fadeUp 0.3s ease ${i*40}ms forwards` }}>
                    <td style={{ padding:'13px 14px 13px 0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <Avatar name={u.name} role={u.role} />
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{u.name || '—'}</div>
                          {u.email === userRole?.email && (
                            <span style={{ fontSize:10, color:'var(--accent)', fontWeight:700, letterSpacing:'0.5px' }}>YOU</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'13px 14px 13px 0', fontSize:12, color:'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ padding:'13px 14px 13px 0' }}>
                      {userRole?.role === 'admin' && u.email !== userRole?.email ? (
                        <select className="u-role-select" value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                          <option value="operator">Operator</option>
                          <option value="technician">Technician</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td style={{ padding:'13px 14px 13px 0', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                    </td>
                    <td style={{ padding:'13px 0' }}>
                      {userRole?.role === 'admin' && u.email !== userRole?.email && (
                        <button className="u-btn-danger" onClick={() => handleDelete(u.id, u.email, u.name)}>Remove</button>
                      )}
                    </td>
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

export default Users;
