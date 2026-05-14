import React, { useState, useRef, useEffect } from 'react';
import { supabase, persistSessionForDevice, clearPersistedSession, getDeviceFingerprint } from './supabase';

/* ─── CSS ──────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.lp *{box-sizing:border-box;}
.lp{font-family:'Inter',system-ui,sans-serif;color:#111827;background:#F3F4F6;min-height:100vh;display:flex;flex-direction:column;}

/* NAV */
.lp-nav{background:#fff;border-bottom:1px solid #E5E7EB;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:100;}
.lp-nav-brand{display:flex;align-items:center;gap:12px;}
.lp-nav-logo{font-size:18px;font-weight:800;color:#111827;letter-spacing:-.5px;}
.lp-nav-logo span{color:#1976D2;}
.lp-logo-mark{width:28px;height:28px;background:#1976D2;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;}
.lp-nav-sep{width:1px;height:18px;background:#E5E7EB;}
.lp-nav-tag{font-size:12px;color:#6B7280;font-weight:500;}
.lp-nav-right{display:flex;align-items:center;gap:8px;}
.lp-nav-link{background:none;border:none;padding:6px 12px;font-size:13px;font-weight:500;color:#6B7280;cursor:pointer;border-radius:6px;font-family:inherit;transition:.15s;}
.lp-nav-link:hover{background:#F9FAFB;color:#111827;}
.sys-status{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:#15803D;padding:5px 10px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:20px;}
.sys-dot{width:6px;height:6px;background:#22C55E;border-radius:50%;}
.lp-nav-btn{background:#1976D2;color:#fff;border:none;padding:8px 16px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;font-family:inherit;transition:.15s;box-shadow:0 1px 4px rgba(25,118,210,.25);}
.lp-nav-btn:hover{background:#1565C0;}

/* HERO */
.lp-hero-section{flex:1;display:grid;grid-template-columns:1fr 420px;gap:0;min-height:calc(100vh - 56px);}
.lp-hero{padding:48px 28px 48px 40px;display:flex;flex-direction:column;justify-content:center;max-width:560px;}
.lp-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1976D2;margin-bottom:12px;}
.lp-hero-h1{font-size:42px;font-weight:800;color:#111827;letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px;}
.lp-hero-h1 em{color:#1976D2;font-style:normal;}
.lp-hero-sub{font-size:14px;color:#6B7280;line-height:1.7;margin-bottom:28px;max-width:440px;}
.lp-hero-badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}
.lp-hero-badge{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:#374151;background:#fff;border:1px solid #E5E7EB;border-radius:20px;padding:4px 10px;}
.lp-hero-badge-dot{width:6px;height:6px;background:#1976D2;border-radius:50%;flex-shrink:0;}
.lp-hero-actions{display:flex;gap:10px;flex-wrap:wrap;}
.lp-btn-primary{display:inline-flex;align-items:center;gap:7px;background:#1976D2;color:#fff;border:none;padding:11px 20px;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;transition:.15s;box-shadow:0 2px 6px rgba(25,118,210,.3);}
.lp-btn-primary:hover{background:#1565C0;box-shadow:0 4px 12px rgba(25,118,210,.35);}
.lp-btn-secondary{display:inline-flex;align-items:center;gap:7px;background:#fff;color:#374151;border:1px solid #D1D5DB;padding:10px 18px;border-radius:7px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:.15s;}
.lp-btn-secondary:hover{border-color:#1976D2;color:#1976D2;background:#EBF3FC;}

/* LOGIN PANEL */
.lp-panel{background:#fff;border-left:1px solid #E5E7EB;padding:40px 36px;display:flex;flex-direction:column;justify-content:center;}
.lp-card-logo{display:flex;align-items:center;gap:9px;margin-bottom:28px;}
.lp-card-logo-text{font-size:17px;font-weight:800;color:#111827;letter-spacing:-.5px;}
.lp-card-logo-text span{color:#1976D2;}
.lp-card-title{font-size:22px;font-weight:800;color:#111827;letter-spacing:-.5px;margin-bottom:4px;}
.lp-card-sub{font-size:13px;color:#6B7280;margin-bottom:28px;}
.lp-tabs{display:flex;border-bottom:1px solid #E5E7EB;margin-bottom:22px;}
.lp-tab{padding:8px 0;margin-right:20px;font-size:13px;font-weight:500;color:#6B7280;border-bottom:2px solid transparent;cursor:pointer;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;transition:.15s;}
.lp-tab.on{color:#1976D2;border-bottom-color:#1976D2;font-weight:600;}
.lp-field{margin-bottom:14px;}
.lp-label{font-size:12px;font-weight:600;color:#374151;margin-bottom:5px;display:block;}
.lp-input{width:100%;padding:9px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:14px;color:#111827;background:#fff;outline:none;font-family:inherit;transition:.15s;}
.lp-input:focus{border-color:#1976D2;box-shadow:0 0 0 3px rgba(25,118,210,.12);}
.lp-input::placeholder{color:#9CA3AF;}
.lp-err{font-size:12px;color:#B91C1C;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:5px;padding:8px 11px;margin-bottom:12px;}
.lp-msg{font-size:12px;color:#15803D;background:#F0FDF4;border:1px solid #86EFAC;border-radius:5px;padding:8px 11px;margin-bottom:12px;}
.lp-submit{width:100%;padding:11px;background:#1976D2;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s;box-shadow:0 1px 4px rgba(25,118,210,.25);margin-top:4px;}
.lp-submit:hover:not(:disabled){background:#1565C0;box-shadow:0 3px 10px rgba(25,118,210,.3);}
.lp-submit:disabled{opacity:.55;cursor:not-allowed;}
.lp-policy{display:flex;align-items:flex-start;gap:8px;margin-top:14px;font-size:12px;color:#6B7280;line-height:1.5;}
.lp-policy input[type=checkbox]{width:14px!important;height:14px!important;flex-shrink:0;margin-top:1px;accent-color:#1976D2;}

/* MODULES SECTION */
.lp-modules{background:#fff;border-top:1px solid #E5E7EB;padding:56px 40px;}
.lp-section-eyebrow{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1976D2;text-align:center;margin-bottom:8px;}
.lp-section-title{font-size:28px;font-weight:800;color:#111827;letter-spacing:-.8px;text-align:center;margin-bottom:8px;}
.lp-section-sub{font-size:14px;color:#6B7280;text-align:center;margin-bottom:36px;}
.lp-modules-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:0 auto;}
.lp-mod-card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:18px 20px;transition:.2s;}
.lp-mod-card:hover{border-color:#D1D5DB;box-shadow:0 4px 12px rgba(0,0,0,.06);background:#fff;}
.lp-mod-num{font-size:10px;font-family:monospace;color:#9CA3AF;margin-bottom:6px;}
.lp-mod-name{font-size:15px;font-weight:700;color:#111827;margin-bottom:4px;}
.lp-mod-desc{font-size:12px;color:#6B7280;line-height:1.5;}

/* FOOTER */
.lp-footer{background:#fff;border-top:1px solid #E5E7EB;padding:20px 40px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#9CA3AF;}
.lp-footer-logo{font-size:14px;font-weight:800;color:#374151;letter-spacing:-.3px;}
.lp-footer-logo span{color:#1976D2;}

/* STAY SIGNED IN MODAL */
.lp-stay-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;}
.lp-stay-modal{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:32px 28px;width:100%;max-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.15);}
.lp-stay-title{font-size:18px;font-weight:800;color:#111827;letter-spacing:-.3px;margin-bottom:4px;}
.lp-stay-sub{font-size:13px;color:#6B7280;margin-bottom:8px;}
.lp-stay-name{font-size:15px;font-weight:700;color:#1976D2;margin-bottom:4px;}
.lp-stay-email{font-size:12px;color:#9CA3AF;margin-bottom:20px;}
.lp-stay-device{background:#FFFBEB;border:1px solid #FCD34D;border-radius:7px;padding:10px 13px;font-size:12px;color:#B45309;text-align:left;margin-bottom:22px;line-height:1.5;}
.lp-stay-btns{display:flex;gap:10px;}
.lp-stay-no{flex:1;padding:11px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:7px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;font-family:inherit;transition:.15s;}
.lp-stay-no:hover{border-color:#D1D5DB;background:#F3F4F6;}
.lp-stay-yes{flex:1;padding:11px;background:#1976D2;border:none;border-radius:7px;font-size:13px;font-weight:700;color:#fff;cursor:pointer;font-family:inherit;transition:.15s;box-shadow:0 2px 6px rgba(25,118,210,.25);}
.lp-stay-yes:hover{background:#1565C0;}

/* WELCOME BACK */
.lp-wb{min-height:100vh;background:#F3F4F6;display:flex;align-items:center;justify-content:center;padding:20px;}
.lp-wb-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:40px 36px;width:100%;max-width:360px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.08);}
.lp-wb-logo{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:28px;}
.lp-wb-logo-text{font-size:17px;font-weight:800;color:#111827;}
.lp-wb-logo-text span{color:#1976D2;}
.lp-wb-avatar{width:68px;height:68px;border-radius:50%;background:#EBF3FC;border:2px solid #BFDBFE;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#1976D2;margin:0 auto 16px;}
.lp-wb-greeting{font-size:12px;font-weight:600;color:#9CA3AF;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;}
.lp-wb-name{font-size:20px;font-weight:800;color:#111827;letter-spacing:-.5px;margin-bottom:4px;}
.lp-wb-email{font-size:13px;color:#9CA3AF;margin-bottom:28px;}
.lp-wb-continue{width:100%;padding:12px;background:#1976D2;color:#fff;border:none;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px;box-shadow:0 2px 6px rgba(25,118,210,.25);transition:.15s;}
.lp-wb-continue:hover{background:#1565C0;}
.lp-wb-other{width:100%;padding:11px;background:transparent;border:1px solid #E5E7EB;border-radius:7px;font-size:13px;font-weight:500;color:#6B7280;cursor:pointer;font-family:inherit;transition:.15s;}
.lp-wb-other:hover{border-color:#D1D5DB;color:#374151;}
.lp-wb-note{font-size:11px;color:#D1D5DB;margin-top:16px;line-height:1.5;}

@media(max-width:900px){
  .lp-hero-section{grid-template-columns:1fr;}
  .lp-panel{border-left:none;border-top:1px solid #E5E7EB;}
  .lp-modules-grid{grid-template-columns:1fr 1fr;}
  .lp-hero-h1{font-size:32px;}
}
`;

const MODULES = [
  { num:'M01', name:'Dashboard',        desc:'Live fleet operations overview, KPIs and utilisation' },
  { num:'M02', name:'Assets',           desc:'Full asset registry with service history and profiles' },
  { num:'M03', name:'Maintenance',      desc:'AI-assisted scheduling, work orders and job sheets' },
  { num:'M04', name:'Prestart',         desc:'Digital safety checks with defect capture and photo evidence' },
  { num:'M05', name:'Parts',            desc:'Inventory management, smart ordering and usage tracking' },
  { num:'M06', name:'Reports',          desc:'Compliance reports, analytics and data export' },
  { num:'M07', name:'Oil Sampling',     desc:'Oil condition analysis with trend monitoring' },
  { num:'M08', name:'Forms',            desc:'AI-generated service forms and custom field checklists' },
  { num:'M09', name:'Calendar',         desc:'Maintenance scheduling with Outlook/Google sync' },
];

export default function Login({ onAuth }) {
  const [tab,        setTab]        = useState('login');
  const [email,      setEmail]      = useState('');
  const [pw,         setPw]         = useState('');
  const [err,        setErr]        = useState('');
  const [msg,        setMsg]        = useState('');
  const [busy,       setBusy]       = useState(false);
  const [policy,     setPolicy]     = useState(false);
  const [stayPrompt, setStayPrompt] = useState(null);
  const [autoRestoring, setAutoRestoring] = useState(true);
  const [savedUser,  setSavedUser]  = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mechiq_saved_user') || 'null');
      if (!saved) return null;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - (saved.savedAt || 0) > TWENTY_FOUR_HOURS) {
        localStorage.removeItem('mechiq_saved_user'); return null;
      }
      if (saved.deviceFp) {
        try {
          const currentFp = getDeviceFingerprint();
          if (saved.deviceFp !== currentFp) {
            localStorage.removeItem('mechiq_saved_user'); return null;
          }
        } catch {}
      }
      return saved;
    } catch { return null; }
  });

  const loginRef   = useRef(null);
  const modulesRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('lp-css')) {
      const s = document.createElement('style');
      s.id = 'lp-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) onAuth(data.session);
      else setAutoRestoring(false);
    });
  }, []);

  const handle = async () => {
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        if (data.session) {
          setStayPrompt({ session: data.session, email: data.session.user.email, name: data.session.user.user_metadata?.name || email.split('@')[0] });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg('Reset email sent — check your inbox.');
      }
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const handleStayYes = () => {
    persistSessionForDevice(stayPrompt.name, stayPrompt.email);
    onAuth(stayPrompt.session); setStayPrompt(null);
  };
  const handleStayNo = () => {
    clearPersistedSession();
    onAuth(stayPrompt.session); setStayPrompt(null);
  };
  const handleContinueAsSaved = async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session) onAuth(data.session);
    else { setEmail(savedUser.email); setSavedUser(null); localStorage.removeItem('mechiq_saved_user'); }
  };
  const handleSignInAsOther = () => {
    clearPersistedSession(); setSavedUser(null); supabase.auth.signOut();
  };

  // Auto-restoring
  if (autoRestoring) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F3F4F6', flexDirection:'column', gap:14 }}>
        <div style={{ width:32, height:32, border:'3px solid #E5E7EB', borderTopColor:'#1976D2', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <div style={{ fontSize:13, color:'#6B7280', fontFamily:'Inter,sans-serif' }}>Loading MechIQ…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Stay signed in modal
  if (stayPrompt) {
    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|Android/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
    const deviceLabel = isTablet ? 'tablet' : isMobile ? 'phone' : 'computer';
    return (
      <div className="lp-stay-overlay">
        <div className="lp-stay-modal">
          <div className="lp-stay-title">Stay signed in?</div>
          <div className="lp-stay-sub">Signed in as</div>
          <div className="lp-stay-name">{stayPrompt.name}</div>
          <div className="lp-stay-email">{stayPrompt.email}</div>
          <div className="lp-stay-device">
            ⚠ <strong>Personal {deviceLabel} only.</strong> Session stays active for 24 hours. On shared devices, select No.
          </div>
          <div className="lp-stay-btns">
            <button className="lp-stay-no" onClick={handleStayNo}>No, sign out<br/>when I close</button>
            <button className="lp-stay-yes" onClick={handleStayYes}>Yes, stay signed in<br/>for 24 hours</button>
          </div>
        </div>
      </div>
    );
  }

  // Welcome back screen
  if (savedUser && !stayPrompt) {
    return (
      <div className="lp-wb">
        <div className="lp-wb-card">
          <div className="lp-wb-logo">
            <div className="lp-logo-mark">M</div>
            <div className="lp-wb-logo-text">Mech<span>IQ</span></div>
          </div>
          <div className="lp-wb-avatar">{(savedUser.name || '?')[0].toUpperCase()}</div>
          <div className="lp-wb-greeting">Welcome back</div>
          <div className="lp-wb-name">{savedUser.name}</div>
          <div className="lp-wb-email">{savedUser.email}</div>
          <button className="lp-wb-continue" onClick={handleContinueAsSaved}>Continue →</button>
          <button className="lp-wb-other" onClick={handleSignInAsOther}>Sign in as someone else</button>
          <div className="lp-wb-note">Not your device? Sign in as someone else to protect your account.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lp">
      {/* NAV */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-logo-mark">M</div>
          <div className="lp-nav-logo">Mech<span>IQ</span></div>
          <div className="lp-nav-sep" />
          <div className="lp-nav-tag">Fleet Maintenance Management</div>
        </div>
        <div className="lp-nav-right">
          <div className="sys-status"><div className="sys-dot" />All systems operational</div>
          <button className="lp-nav-link" onClick={() => modulesRef.current?.scrollIntoView({ behavior:'smooth' })}>Platform</button>
          <a href="mailto:info@mechiq.com.au" className="lp-nav-link" style={{ textDecoration:'none', color:'#6B7280' }}>Contact</a>
          <button className="lp-nav-btn" onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>Client Login</button>
        </div>
      </nav>

      {/* HERO + LOGIN */}
      <div className="lp-hero-section">
        <div className="lp-hero">
          <div className="lp-hero-eyebrow">Built for Australian Heavy Industry</div>
          <h1 className="lp-hero-h1">Intelligent Fleet<br /><em>Management</em></h1>
          <div className="lp-hero-badges">
            {['AI-Powered Forms','Real-time Dashboard','Oil Analysis','Calendar Sync','12 Modules'].map(b => (
              <div key={b} className="lp-hero-badge"><div className="lp-hero-badge-dot" />{b}</div>
            ))}
          </div>
          <p className="lp-hero-sub">
            A modern CMMS purpose-built for tunnelling, mining, civil infrastructure and heavy equipment operations.
            Real-time asset visibility, AI-generated maintenance forms and structured field data — built entirely in Australia.
          </p>
          <div className="lp-hero-actions">
            <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Request" className="lp-btn-primary">
              Request a Demo
            </a>
            <button className="lp-btn-secondary" onClick={() => modulesRef.current?.scrollIntoView({ behavior:'smooth' })}>
              Platform Overview
            </button>
          </div>
        </div>

        {/* LOGIN PANEL */}
        <div className="lp-panel" ref={loginRef}>
          <div className="lp-card-logo">
            <div className="lp-logo-mark">M</div>
            <div className="lp-card-logo-text">Mech<span>IQ</span></div>
          </div>
          <div className="lp-card-title">Welcome back</div>
          <div className="lp-card-sub">Sign in to your MechIQ workspace</div>

          <div className="lp-tabs">
            <button className={`lp-tab${tab==='login' ? ' on' : ''}`} onClick={() => { setTab('login'); setErr(''); setMsg(''); }}>Sign in</button>
            <button className={`lp-tab${tab==='reset' ? ' on' : ''}`} onClick={() => { setTab('reset'); setErr(''); setMsg(''); }}>Reset password</button>
          </div>

          {err && <div className="lp-err">{err}</div>}
          {msg && <div className="lp-msg">{msg}</div>}

          <div className="lp-field">
            <label className="lp-label">Email address</label>
            <input className="lp-input" type="email" placeholder="you@company.com.au" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} />
          </div>

          {tab === 'login' && (
            <div className="lp-field">
              <label className="lp-label">Password</label>
              <input className="lp-input" type="password" placeholder="••••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} />
            </div>
          )}

          {tab === 'login' && (
            <label className="lp-policy">
              <input type="checkbox" checked={policy} onChange={e => setPolicy(e.target.checked)} />
              <span>I agree to the <a href="/terms" style={{ color:'#1976D2' }}>Terms of Service</a> and acknowledge the Privacy Policy.</span>
            </label>
          )}

          <button
            className="lp-submit"
            onClick={handle}
            disabled={busy || (tab==='login' && !policy)}
            style={{ marginTop: tab==='login' ? 14 : 4 }}
          >
            {busy ? 'Please wait…' : tab === 'login' ? 'Sign in to MechIQ' : 'Send reset email'}
          </button>
        </div>
      </div>

      {/* MODULES */}
      <div className="lp-modules" ref={modulesRef}>
        <div className="lp-section-eyebrow">Platform</div>
        <div className="lp-section-title">Everything your fleet needs</div>
        <div className="lp-section-sub">Nine integrated modules, built for the demands of Australian heavy industry.</div>
        <div className="lp-modules-grid">
          {MODULES.map(m => (
            <div key={m.num} className="lp-mod-card">
              <div className="lp-mod-num">{m.num}</div>
              <div className="lp-mod-name">{m.name}</div>
              <div className="lp-mod-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="lp-footer">
        <div className="lp-footer-logo">Mech<span>IQ</span></div>
        <div>© 2026 MechIQ · mechiq.com.au · Built in Australia</div>
        <div>v{new Date().getFullYear()}.{String(new Date().getMonth()+1).padStart(2,'0')}</div>
      </div>
    </div>
  );
}
