import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const CSS = `
  @keyframes login-fade { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes login-blob {
    0%,100% { border-radius:60% 40% 30% 70%/60% 30% 70% 40%; }
    50%      { border-radius:30% 60% 70% 40%/50% 60% 30% 60%; }
  }

  .login-page {
    min-height: 100vh;
    background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    position: relative; overflow: hidden;
  }
  .login-blob {
    position: absolute; border-radius: 60% 40% 30% 70%/60% 30% 70% 40%;
    animation: login-blob 8s ease-in-out infinite;
    pointer-events: none; opacity: 0.06;
  }
  .login-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 44px 40px;
    width: 440px; max-width: calc(100vw - 32px);
    position: relative; z-index: 1;
    box-shadow: var(--shadow-lg);
    animation: login-fade 0.5s cubic-bezier(0.16,1,0.3,1) both;
  }
  .login-input {
    width:100%; padding:11px 14px;
    background: var(--surface-2) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    font-size: 14px !important; font-family: var(--font-body) !important;
    outline: none !important;
    transition: border-color 0.15s, box-shadow 0.15s !important;
    box-sizing: border-box;
  }
  .login-input:focus {
    border-color: var(--border-focus) !important;
    box-shadow: 0 0 0 3px var(--accent-glow) !important;
  }
  .login-input::placeholder { color: var(--text-faint) !important; }

  .login-btn {
    width:100%; padding:13px;
    background: var(--accent);
    border: none; border-radius: 8px;
    color: #fff; font-size: 14px; font-weight: 700;
    font-family: var(--font-body); letter-spacing: 0.3px;
    cursor: pointer; transition: all 0.15s; margin-top: 8px;
    box-shadow: 0 2px 8px var(--accent-glow);
  }
  .login-btn:hover { background: var(--accent-dark); box-shadow: 0 4px 16px var(--accent-glow); transform: translateY(-1px); }
  .login-btn:active { transform: translateY(0); }
  .login-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

  .login-tab {
    flex:1; padding:10px 8px;
    background:transparent; border:none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
    font-family: var(--font-body);
    cursor:pointer; transition:all 0.15s;
  }
  .login-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .login-tab:hover:not(.active) { color: var(--text-secondary); }

  .login-field { margin-bottom: 14px; }
  .login-label {
    display:block; font-size:12px; font-weight:600;
    color: var(--text-muted); margin-bottom:5px;
    font-family: var(--font-body);
  }
`;

function Login({ onAuth }) {
  const [tab,   setTab]   = useState('login');
  const [email, setEmail] = useState('');
  const [pw,    setPw]    = useState('');
  const [name,  setName]  = useState('');
  const [err,   setErr]   = useState('');
  const [msg,   setMsg]   = useState('');
  const [busy,  setBusy]  = useState(false);

  useEffect(() => {
    if (!document.getElementById('login-css')) {
      const s = document.createElement('style'); s.id='login-css'; s.textContent=CSS; document.head.appendChild(s);
    }
  }, []);

  const handle = async () => {
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        if (data.session) onAuth(data.session);
      } else if (tab === 'register') {
        const { error } = await supabase.auth.signUp({ email, password: pw, options: { data: { name } } });
        if (error) throw error;
        setMsg('Registration submitted. An admin will approve your access.');
        setTab('login');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg('Password reset email sent. Check your inbox.');
      }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="login-page">
      {/* Decorative blobs */}
      <div className="login-blob" style={{ width:500, height:500, background:'var(--accent)', top:'-15%', right:'-10%' }} />
      <div className="login-blob" style={{ width:400, height:400, background:'var(--green)', bottom:'-10%', left:'-8%', animationDelay:'-4s' }} />

      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:2, marginBottom:10 }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:40, fontWeight:900, color:'var(--text-primary)', letterSpacing:'2px', lineHeight:1 }}>MECH</span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:40, fontWeight:900, color:'var(--accent)', letterSpacing:'2px', lineHeight:1 }}>IQ</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-body)', fontWeight:500 }}>
            Maintenance Management
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:26, gap:0 }}>
          {[['login','Sign In'],['register','Register'],['reset','Reset']].map(([id,label]) => (
            <button key={id} className={`login-tab${tab===id?' active':''}`} onClick={() => { setTab(id); setErr(''); setMsg(''); }}>
              {label}
            </button>
          ))}
        </div>

        {/* Fields */}
        {tab === 'register' && (
          <div className="login-field">
            <label className="login-label">Full Name</label>
            <input className="login-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="login-field">
          <label className="login-label">Email Address</label>
          <input className="login-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} />
        </div>
        {tab !== 'reset' && (
          <div className="login-field">
            <label className="login-label">Password</label>
            <input className="login-input" type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} />
          </div>
        )}

        {err && (
          <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--red-bg)', border:'1px solid var(--red-border)', color:'var(--red)', fontSize:13, marginBottom:12, lineHeight:1.5 }}>
            {err}
          </div>
        )}
        {msg && (
          <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--green-bg)', border:'1px solid var(--green-border)', color:'var(--green)', fontSize:13, marginBottom:12, lineHeight:1.5 }}>
            {msg}
          </div>
        )}

        <button className="login-btn" onClick={handle} disabled={busy}>
          {busy ? 'Please wait…' : tab==='login' ? 'Sign In' : tab==='register' ? 'Create Account' : 'Send Reset Email'}
        </button>

        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:'var(--text-faint)' }}>
          MechIQ · Maintenance Intelligence
        </div>
      </div>
    </div>
  );
}

export default Login;
