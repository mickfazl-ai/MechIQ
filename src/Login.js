import React, { useState } from 'react';
import { supabase } from './supabase';

function Login({ onShowRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }

    const { data: roleData } = await supabase.from('user_roles').select('role, company_id').eq('email', email).single();

    if (roleData && roleData.role !== 'master' && roleData.company_id) {
      const { data: company } = await supabase.from('companies').select('status').eq('id', roleData.company_id).single();
      if (company?.status === 'pending') {
        await supabase.auth.signOut();
        setError('Your account is pending approval. You will be notified once activated.');
        setLoading(false);
        return;
      }
      if (company?.status === 'suspended') {
        await supabase.auth.signOut();
        setError('Your account has been suspended. Please contact support.');
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">MECH<span> IQ</span></h1>
        <p className="login-subtitle">Machine Maintenance Software</p>
        <div className="login-form">
          <div className="login-field">
            <label>Email</label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input type="password" placeholder="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button className="btn-login" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1a2f2f' }} />
            <span style={{ color: '#a0b0b0', fontSize: '12px' }}>NEW TO MECH IQ?</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1a2f2f' }} />
          </div>

          <button onClick={onShowRegister} style={{
            width: '100%', padding: '13px', backgroundColor: 'transparent',
            border: '1px solid #00c2e0', color: '#00c2e0', borderRadius: '6px',
            cursor: 'pointer', fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px'
          }}>
            Register for an Account →
          </button>
          <p style={{ textAlign: 'center', marginTop: '12px', color: '#a0b0b0', fontSize: '12px' }}>
            View plans and pricing · 14-day free trial available
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
