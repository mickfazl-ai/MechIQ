import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

function Users({ companyId, userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician' });
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (companyId) fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) {
      console.log('Error:', error);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleChange = async (id, newRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', id);
    if (error) {
      alert('Error updating role: ' + error.message);
    } else {
      fetchUsers();
    }
  };

  const handleDelete = async (id, email) => {
    if (email === userRole.email) {
      alert("You can't delete your own account.");
      return;
    }
    if (window.confirm(`Remove ${email} from your company?`)) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);
      if (error) {
        alert('Error: ' + error.message);
      } else {
        fetchUsers();
      }
    }
  };

  const handleInvite = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('Please fill in all fields');
      return;
    }
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password
      });
      if (authError) throw authError;

      // Add to user_roles with this company
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          company_id: companyId
        }]);
      if (roleError) throw roleError;

      setSuccess(`${newUser.name} has been added successfully!`);
      setNewUser({ name: '', email: '', password: '', role: 'technician' });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setInviting(false);
  };

  return (
    <div className="users">
      <div className="page-header">
        <h2>User Management</h2>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}>
          + Add User
        </button>
      </div>

      {success && <p style={{color:'#00c264', marginBottom:'15px'}}>{success}</p>}

      {showForm && (
        <div className="form-card">
          <h3>Add New User</h3>
          {error && <p style={{color:'#e94560', marginBottom:'10px'}}>{error}</p>}
          <div className="form-grid">
            <input
              placeholder="Full Name"
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})}
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value})}
            />
            <input
              type="password"
              placeholder="Temporary Password"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
            />
            <select
              value={newUser.role}
              onChange={e => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="operator">Operator</option>
              <option value="technician">Technician</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="btn-primary" onClick={handleInvite} disabled={inviting}>
            {inviting ? 'Adding...' : 'Add User'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{color: '#a0b0b0'}}>Loading users...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={e => handleRoleChange(user.id, e.target.value)}
                    style={{backgroundColor:'#E9F1FA', color:'#1a2b3c', border:'1px solid #00ABE4', padding:'5px 10px', borderRadius:'6px', fontFamily:'Inter,sans-serif', fontSize:'13px', cursor:'pointer'}}
                  >
                    <option value="technician">Technician</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-delete" onClick={() => handleDelete(user.id, user.email)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Users;