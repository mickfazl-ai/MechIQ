import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// ─── Colour themes ────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'default', label: 'Ocean Blue', primary: '#00ABE4', primaryDark: '#0088b8', bg: '#E9F1FA', dark: '#1a2b3c', textMid: '#3d5166', textMuted: '#7a92a8', border: '#d6e6f2' },
  { id: 'slate',   label: 'Slate',      primary: '#475569', primaryDark: '#334155', bg: '#f1f5f9', dark: '#0f172a', textMid: '#334155', textMuted: '#64748b', border: '#cbd5e1' },
  { id: 'green',   label: 'Forest',     primary: '#16a34a', primaryDark: '#15803d', bg: '#f0fdf4', dark: '#14532d', textMid: '#166534', textMuted: '#4ade80', border: '#bbf7d0' },
  { id: 'orange',  label: 'Amber',      primary: '#d97706', primaryDark: '#b45309', bg: '#fffbeb', dark: '#78350f', textMid: '#92400e', textMuted: '#a16207', border: '#fde68a' },
  { id: 'purple',  label: 'Violet',     primary: '#7c3aed', primaryDark: '#6d28d9', bg: '#f5f3ff', dark: '#2e1065', textMid: '#4c1d95', textMuted: '#7c3aed', border: '#ddd6fe' },
  { id: 'red',     label: 'Crimson',    primary: '#dc2626', primaryDark: '#b91c1c', bg: '#fef2f2', dark: '#7f1d1d', textMid: '#991b1b', textMuted: '#b91c1c', border: '#fecaca' },
  { id: 'teal',    label: 'Teal',       primary: '#0d9488', primaryDark: '#0f766e', bg: '#f0fdfa', dark: '#134e4a', textMid: '#115e59', textMuted: '#0f766e', border: '#99f6e4' },
  { id: 'dark',    label: 'Dark Mode',  primary: '#00ABE4', primaryDark: '#0088b8', bg: '#1e2d3d', dark: '#060d18', textMid: '#94a3b8', textMuted: '#64748b', border: '#2d3f52' },
];

// ─── Apply theme to CSS variables ─────────────────────────────────────────────
const applyTheme = (themeId) => {
  const t = THEMES.find(x => x.id === themeId) || THEMES[0];
  const root = document.documentElement;
  // Brand / accent
  root.style.setProperty('--blue-bright',    t.primary);
  root.style.setProperty('--blue-dark',      t.primaryDark);
  root.style.setProperty('--blue-deeper',    t.primaryDark);
  root.style.setProperty('--blue-light',     t.bg);
  root.style.setProperty('--blue-mid',       t.border);
  root.style.setProperty('--blue-soft',      t.bg);
  // Surfaces
  root.style.setProperty('--bg',             t.bg);
  root.style.setProperty('--surface',        t.dark === '#e2e8f0' ? '#1e2d3d' : '#ffffff');
  root.style.setProperty('--surface-raised', t.dark === '#e2e8f0' ? '#253548' : '#ffffff');
  root.style.setProperty('--surface-hover',  t.bg);
  // Text
  root.style.setProperty('--text-dark',      t.dark);
  root.style.setProperty('--text-mid',       t.textMid);
  root.style.setProperty('--text-muted',     t.textMuted);
  root.style.setProperty('--text-faint',     t.border);
  // Borders
  root.style.setProperty('--border',         t.border);
  root.style.setProperty('--border-light',   t.border + '88');
  root.style.setProperty('--border-focus',   t.primary);
  // Page background
  document.body.style.backgroundColor = t.bg;
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const card = {
  backgroundColor: 'var(--surface)', border: '1px solid var(--border-light)',
  borderRadius: '12px', padding: '24px', marginBottom: '20px',
  boxShadow: 'var(--shadow-sm)',
};
const label = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};
const input = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid var(--border)', borderRadius: '8px',
  fontSize: '14px', color: 'var(--text-dark)', backgroundColor: 'var(--surface)', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s',
};
const saveBtn = (color = 'var(--blue-bright)') => ({
  padding: '10px 24px', backgroundColor: color, color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px',
  fontWeight: 700, cursor: 'pointer',
});

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1.5px solid var(--border-light)' }}>
      <div style={{ width: '3px', height: '32px', backgroundColor: 'var(--blue-bright)', borderRadius: '2px', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '0.2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Tab: Company Details ─────────────────────────────────────────────────────
function CompanyDetails({ userRole }) {
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', postcode: '', country: 'Australia', phone: '', abn: '', website: '' });
  const [logo, setLogo] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const fileRef = useRef();

  useEffect(() => { if (userRole?.company_id) fetchCompany(); }, [userRole]);

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('*').eq('id', userRole.company_id).single();
    if (data) {
      setForm({
        name:     data.name || '',
        address:  data.address || '',
        city:     data.city || '',
        state:    data.state || '',
        postcode: data.postcode || '',
        country:  data.country || 'Australia',
        phone:    data.phone || '',
        abn:      data.abn || '',
        website:  data.website || '',
      });
      if (data.logo_url) setLogoUrl(data.logo_url);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let logo_url = logoUrl;
    if (logo) {
      const ext = logo.name.split('.').pop();
      const path = `logos/${userRole.company_id}.${ext}`;
      await supabase.storage.from('company-assets').upload(path, logo, { upsert: true });
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
      logo_url = urlData.publicUrl;
    }
    await supabase.from('companies').update({ ...form, logo_url }).eq('id', userRole.company_id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordChange = async () => {
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Passwords do not match'); return; }
    if (pwForm.newPw.length < 8) { setPwMsg('Password must be at least 8 characters'); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) { setPwMsg(error.message); } else { setPwMsg('Password updated successfully'); setPwForm({ current: '', newPw: '', confirm: '' }); }
    setTimeout(() => setPwMsg(''), 4000);
  };

  const f = (key, lbl, placeholder, half = false) => (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={label}>{lbl}</label>
      <input style={input} value={form[key]} placeholder={placeholder} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div>
      {/* Logo */}
      <div style={card}>
        <SectionHeader icon="🏢" title="Company Logo" desc="Appears on reports, pre-starts and service sheets" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '10px', border: '2px dashed #d6e6f2', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--blue-light)' }}>
            {logoUrl
              ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: '28px' }}>🏢</span>
            }
          </div>
          <div>
            <button onClick={() => fileRef.current.click()} style={{ ...saveBtn('#00ABE4'), marginBottom: '8px', display: 'block' }}>
              {logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PNG or JPG, max 2MB. Recommended 400×400px.</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setLogo(e.target.files[0]); setLogoUrl(URL.createObjectURL(e.target.files[0])); }} />
          </div>
        </div>
      </div>

      {/* Company info */}
      <div style={card}>
        <SectionHeader icon="📋" title="Company Information" desc="Your business details used across the platform" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {f('name',     'Company Name',   'Coastline Machine Management')}
          {f('abn',      'ABN',            '12 345 678 901', true)}
          {f('phone',    'Phone',          '+61 4XX XXX XXX', true)}
          {f('website',  'Website',        'www.yourcompany.com.au')}
          {f('address',  'Street Address', '123 Main Street')}
          {f('city',     'City',           'Sydney', true)}
          {f('state',    'State',          'NSW', true)}
          {f('postcode', 'Postcode',       '2000', true)}
          {f('country',  'Country',        'Australia', true)}
        </div>
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleSave} disabled={saving} style={saveBtn()}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
          {saved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Changes saved successfully</span>}
        </div>
      </div>

      {/* Password */}
      <div style={card}>
        <SectionHeader icon="🔒" title="Change Password" desc="Update your account password" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', maxWidth: '600px' }}>
          {[['current', 'Current Password'], ['newPw', 'New Password'], ['confirm', 'Confirm New Password']].map(([k, l]) => (
            <div key={k}>
              <label style={label}>{l}</label>
              <input style={input} type="password" value={pwForm[k]} onChange={e => setPwForm(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handlePasswordChange} style={saveBtn()}>Update Password</button>
          {pwMsg && <span style={{ fontSize: '13px', color: pwMsg.includes('success') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{pwMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Format / Theme ──────────────────────────────────────────────────────

// Extended theme data with gradients, emoji, taglines
const THEMES_EX = [
  { id:'default', label:'Ocean Blue', emoji:'🌊', tagline:'Clean & professional',  primary:'#00ABE4', primaryDark:'#0088b8', accent:'#38bdf8', bg:'#E9F1FA', surface:'#ffffff', dark:'#1a2b3c', textMid:'#3d5166', textMuted:'#7a92a8', border:'#d6e6f2', gradient:'linear-gradient(135deg,#0070a8 0%,#00ABE4 55%,#38bdf8 100%)' },
  { id:'slate',   label:'Gunmetal',   emoji:'🔩', tagline:'Industrial & sharp',   primary:'#475569', primaryDark:'#334155', accent:'#94a3b8', bg:'#f1f5f9', surface:'#ffffff', dark:'#0f172a', textMid:'#334155', textMuted:'#64748b', border:'#cbd5e1', gradient:'linear-gradient(135deg,#1e293b 0%,#475569 60%,#94a3b8 100%)' },
  { id:'green',   label:'Forest',     emoji:'🌿', tagline:'Calm & natural',       primary:'#16a34a', primaryDark:'#15803d', accent:'#4ade80', bg:'#f0fdf4', surface:'#ffffff', dark:'#14532d', textMid:'#166534', textMuted:'#15803d', border:'#bbf7d0', gradient:'linear-gradient(135deg,#14532d 0%,#16a34a 55%,#4ade80 100%)' },
  { id:'orange',  label:'Amber',      emoji:'🔥', tagline:'Bold & energetic',     primary:'#d97706', primaryDark:'#b45309', accent:'#fbbf24', bg:'#fffbeb', surface:'#ffffff', dark:'#78350f', textMid:'#92400e', textMuted:'#a16207', border:'#fde68a', gradient:'linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)' },
  { id:'purple',  label:'Violet',     emoji:'⚡', tagline:'Creative & vibrant',   primary:'#7c3aed', primaryDark:'#6d28d9', accent:'#a78bfa', bg:'#f5f3ff', surface:'#ffffff', dark:'#2e1065', textMid:'#4c1d95', textMuted:'#6d28d9', border:'#ddd6fe', gradient:'linear-gradient(135deg,#2e1065 0%,#7c3aed 55%,#a78bfa 100%)' },
  { id:'red',     label:'Crimson',    emoji:'🚨', tagline:'High alert & urgent',  primary:'#dc2626', primaryDark:'#b91c1c', accent:'#f87171', bg:'#fef2f2', surface:'#ffffff', dark:'#7f1d1d', textMid:'#991b1b', textMuted:'#b91c1c', border:'#fecaca', gradient:'linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#f87171 100%)' },
  { id:'teal',    label:'Teal',       emoji:'🧊', tagline:'Fresh & precise',      primary:'#0d9488', primaryDark:'#0f766e', accent:'#2dd4bf', bg:'#f0fdfa', surface:'#ffffff', dark:'#134e4a', textMid:'#115e59', textMuted:'#0f766e', border:'#99f6e4', gradient:'linear-gradient(135deg,#134e4a 0%,#0d9488 55%,#2dd4bf 100%)' },
  { id:'dark',    label:'Dark Mode',  emoji:'🌙', tagline:'Night shift ready',    primary:'#00ABE4', primaryDark:'#0088b8', accent:'#38bdf8', bg:'#0d1b2a', surface:'#1e2d3d', dark:'#e2e8f0', textMid:'#94a3b8', textMuted:'#64748b', border:'#2d3f52', gradient:'linear-gradient(135deg,#020d18 0%,#0d1b2a 50%,#1e2d3d 100%)' },
];

const FORMAT_CSS = `
  @keyframes fmt-pop    { 0%{transform:scale(1)} 40%{transform:scale(0.96)} 100%{transform:scale(1)} }
  @keyframes fmt-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fmt-shimmer{ 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes fmt-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes fmt-pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }

  .fmt-theme-card {
    border-radius:16px; cursor:pointer; overflow:hidden;
    border:2px solid transparent; transition:transform 0.22s,box-shadow 0.22s;
  }
  .fmt-theme-card:hover { transform:translateY(-5px) scale(1.02); box-shadow:0 20px 48px rgba(0,0,0,0.18); }
  .fmt-theme-card.fmt-selected {
    box-shadow:0 0 0 2px #fff, 0 0 0 4px var(--fmt-pri,#00ABE4), 0 16px 40px rgba(0,0,0,0.2);
    animation:fmt-pop 0.3s ease;
  }
  .fmt-live-preview { animation:fmt-fadein 0.3s cubic-bezier(0.16,1,0.3,1); }
  .fmt-apply-btn {
    position:relative; overflow:hidden; border:none;
    padding:13px 36px; border-radius:12px; font-size:15px; font-weight:900;
    cursor:pointer; letter-spacing:0.5px; font-family:'Barlow Condensed',sans-serif;
    text-transform:uppercase; transition:all 0.2s; color:#fff;
  }
  .fmt-apply-btn::after {
    content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%);
    background-size:200% 100%; animation:fmt-shimmer 2.4s linear infinite;
  }
  .fmt-apply-btn:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,0.22); }
  .fmt-apply-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

  .fmt-seg { display:flex; background:#f0f5fa; border-radius:8px; padding:3px; gap:2px; }
  .fmt-seg-btn {
    padding:7px 14px; border:none; border-radius:6px; font-size:12px; font-weight:600;
    cursor:pointer; transition:all 0.15s; font-family:inherit; color:#7a92a8; background:transparent;
  }
  .fmt-seg-btn.on { background:#fff; color:#1a2b3c; box-shadow:0 1px 4px rgba(0,0,0,0.1); }

  .fmt-density-card {
    border:2px solid #e2ecf5; border-radius:12px; padding:16px;
    cursor:pointer; transition:all 0.18s; background:#fff; text-align:center;
  }
  .fmt-density-card:hover { border-color:var(--blue-bright,#00ABE4); transform:translateY(-2px); }
  .fmt-density-card.on   { border-color:var(--blue-bright,#00ABE4); background:#e0f4ff; }

  .fmt-pref-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 0; border-bottom:1px solid #f0f6fc; gap:16px;
    flex-wrap:wrap;
  }
  .fmt-pref-row:last-child { border-bottom:none; }
`;

// Tiny MechIQ UI inside each theme card
function ThemeCardMini({ t }) {
  return (
    <div style={{padding:'10px',background:t.bg}}>
      {/* mini navbar */}
      <div style={{background:t.surface,borderRadius:'5px',padding:'4px 7px',marginBottom:'6px',display:'flex',alignItems:'center',gap:'4px',boxShadow:'0 1px 3px rgba(0,0,0,0.07)'}}>
        <div style={{width:'22px',height:'6px',borderRadius:'3px',background:t.primary}}/>
        {[16,12,14].map((w,i)=><div key={i} style={{width:w,height:'5px',borderRadius:'2px',background:t.border}}/>)}
        <div style={{marginLeft:'auto',width:'14px',height:'14px',borderRadius:'50%',background:t.primary+'30',border:`1.5px solid ${t.primary}`}}/>
      </div>
      {/* mini kpi cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px'}}>
        {[['24','100%'],['3','13%'],['87%','87%']].map(([v,w],i)=>(
          <div key={i} style={{background:t.surface,borderRadius:'4px',padding:'5px',borderTop:`2px solid ${t.primary}`}}>
            <div style={{fontSize:'10px',fontWeight:800,color:t.dark,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>{v}</div>
            <div style={{height:'3px',background:t.border,borderRadius:'99px',marginTop:'3px'}}>
              <div style={{width:w,height:'100%',background:t.primary,borderRadius:'99px'}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Full live preview panel
function LivePreview({ t, density, fontSize }) {
  const sp = {compact:'7px',comfortable:'13px',spacious:'20px'}[density]||'13px';
  const fs = {small:'11px',medium:'13px',large:'15px'}[fontSize]||'13px';
  return (
    <div className="fmt-live-preview" key={t.id} style={{border:`1px solid ${t.border}`,borderRadius:'16px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.10)'}}>
      {/* Navbar */}
      <div style={{background:t.surface,borderBottom:`2.5px solid ${t.primary}`,padding:'0 14px',height:'38px',display:'flex',alignItems:'center',gap:'7px',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'15px',fontWeight:900,color:t.dark,letterSpacing:'2px'}}>MECH</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'15px',fontWeight:900,color:t.primary,letterSpacing:'2px'}}>IQ</span>
        <div style={{display:'flex',gap:'3px',marginLeft:'8px'}}>
          {['Dashboard','Assets','Maintenance','Reports'].map((lbl,i)=>(
            <div key={lbl} style={{padding:'3px 8px',borderRadius:'4px',background:i===0?t.primary:'transparent',color:i===0?'#fff':t.textMuted,fontSize:'9px',fontWeight:700}}>{lbl}</div>
          ))}
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:'5px',alignItems:'center'}}>
          <div style={{width:'52px',height:'16px',borderRadius:'8px',background:t.primary+'20',border:`1px solid ${t.primary}40`}}/>
          <div style={{width:'16px',height:'16px',borderRadius:'50%',background:t.gradient}}/>
        </div>
      </div>
      {/* Body */}
      <div style={{background:t.bg,padding:'12px'}}>
        {/* KPI row */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'7px',marginBottom:'8px'}}>
          {[['Fleet','24','100%'],['Down','3','13%'],['Overdue','7','29%'],['Util','87%','87%']].map(([l,v,w])=>(
            <div key={l} style={{background:t.surface,borderRadius:'7px',padding:sp,borderTop:`2px solid ${t.primary}`,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
              <div style={{fontSize:'8px',fontWeight:700,color:t.textMuted,letterSpacing:'0.6px',textTransform:'uppercase',marginBottom:'3px'}}>{l}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'20px',fontWeight:800,color:t.dark,lineHeight:1}}>{v}</div>
              <div style={{height:'3px',background:t.border,borderRadius:'99px',marginTop:'5px'}}>
                <div style={{width:w,height:'100%',background:t.primary,borderRadius:'99px'}}/>
              </div>
            </div>
          ))}
        </div>
        {/* Two-panel */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
          <div style={{background:t.surface,borderRadius:'7px',padding:sp,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:'9px',fontWeight:800,color:t.dark,letterSpacing:'0.7px',textTransform:'uppercase',marginBottom:'7px',fontFamily:"'Barlow Condensed',sans-serif"}}>Activity</div>
            {[['🔴','CAT 320 — downtime'],['⚠️','D9 service overdue'],['🔧','Work order #42']].map(([ic,tx],i)=>(
              <div key={i} style={{display:'flex',gap:'5px',alignItems:'center',padding:'3px 0',borderBottom:`1px solid ${t.border}`}}>
                <span style={{fontSize:'10px'}}>{ic}</span>
                <span style={{fontSize:fs,color:t.textMid,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tx}</span>
              </div>
            ))}
          </div>
          <div style={{background:t.surface,borderRadius:'7px',padding:sp,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:'9px',fontWeight:800,color:t.dark,letterSpacing:'0.7px',textTransform:'uppercase',marginBottom:'7px',fontFamily:"'Barlow Condensed',sans-serif"}}>Service Intervals</div>
            {[['CAT 320',78,'#d97706'],['D9 Dozer',45,t.primary],['Generator',92,'#dc2626']].map(([nm,pct,cl])=>(
              <div key={nm} style={{marginBottom:'7px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'2px'}}>
                  <span style={{fontSize:fs,color:t.textMid,fontWeight:600}}>{nm}</span>
                  <span style={{fontSize:'9px',color:cl,fontWeight:700}}>{pct}%</span>
                </div>
                <div style={{height:'4px',background:t.border,borderRadius:'99px'}}>
                  <div style={{width:`${pct}%`,height:'100%',background:cl,borderRadius:'99px'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Format({ userRole }) {
  const [selected,   setSelected]   = useState(() => localStorage.getItem('mechiq_theme')      || 'default');
  const [hovered,    setHovered]    = useState(null);
  const [density,    setDensity]    = useState(() => localStorage.getItem('mechiq_density')    || 'comfortable');
  const [fontSize,   setFontSize]   = useState(() => localStorage.getItem('mechiq_fontsize')   || 'medium');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('mechiq_datefmt')    || 'DD/MM/YYYY');
  const [units,      setUnits]      = useState(() => localStorage.getItem('mechiq_units')      || 'metric');
  const [timezone,   setTimezone]   = useState(() => localStorage.getItem('mechiq_tz')         || 'AEST');
  const [saved,      setSaved]      = useState(false);
  const [applying,   setApplying]   = useState(false);

  const activeT  = THEMES_EX.find(t => t.id === selected)    || THEMES_EX[0];
  const previewT = THEMES_EX.find(t => t.id === (hovered || selected)) || THEMES_EX[0];

  // Inject CSS + apply saved theme on mount
  useEffect(() => {
    if (!document.getElementById('format-tab-css')) {
      const s = document.createElement('style');
      s.id = 'format-tab-css'; s.textContent = FORMAT_CSS;
      document.head.appendChild(s);
    }
    applyTheme(localStorage.getItem('mechiq_theme') || 'default');
  }, []);

  const handleApply = () => {
    setApplying(true);
    setTimeout(() => {
      localStorage.setItem('mechiq_theme',   selected);
      localStorage.setItem('mechiq_density', density);
      localStorage.setItem('mechiq_fontsize',fontSize);
      localStorage.setItem('mechiq_datefmt', dateFormat);
      localStorage.setItem('mechiq_units',   units);
      localStorage.setItem('mechiq_tz',      timezone);
      applyTheme(selected);
      setApplying(false); setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    }, 500);
  };

  const panelStyle = { background:'#fff', border:'1px solid #e2ecf5', borderRadius:'18px', padding:'24px', marginBottom:'20px', boxShadow:'0 2px 12px rgba(0,100,180,0.06)' };
  const panelHead  = (emoji, title, desc) => (
    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'22px',paddingBottom:'14px',borderBottom:'1.5px solid var(--border-light)'}}>
      <div style={{width:'3px',height:'32px',backgroundColor:'var(--blue-bright)',borderRadius:'2px',flexShrink:0}} />
      <div>
        <div style={{fontSize:'14px',fontWeight:800,color:'var(--text-dark)',letterSpacing:'0.2px'}}>{title}</div>
        <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{desc}</div>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:'920px'}}>

      {/* ── Page title ── */}
      <div style={{marginBottom:'28px'}}>
        <h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'30px',fontWeight:900,color:'#1a2b3c',textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 4px'}}>
          Format <span style={{color:activeT.primary}}>&</span> Theme
        </h2>
        <p style={{fontSize:'13px',color:'#7a92a8',margin:0}}>Personalise MechIQ's look, feel and data display. Changes apply instantly across the entire app.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:'24px',alignItems:'start'}}>

        {/* ══ LEFT COLUMN ══ */}
        <div>

          {/* ── Theme picker ── */}
          <div style={panelStyle}>
            {panelHead('🎨', 'Colour Theme', 'Pick a visual personality for your workspace')}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'4px'}}>
              {THEMES_EX.map(t => (
                <div
                  key={t.id}
                  className={`fmt-theme-card${selected===t.id?' fmt-selected':''}`}
                  style={{'--fmt-pri':t.primary}}
                  onClick={() => setSelected(t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Gradient banner */}
                  <div style={{height:'42px',background:t.gradient,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    
                    {selected===t.id && (
                      <div style={{position:'absolute',top:'6px',right:'6px',width:'16px',height:'16px',borderRadius:'50%',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'50%',background:t.primary}}/>
                      </div>
                    )}
                  </div>
                  {/* Mini UI preview */}
                  <ThemeCardMini t={t} />
                  {/* Label */}
                  <div style={{padding:'8px 10px',background:t.surface,borderTop:`1px solid ${t.border}`}}>
                    <div style={{fontSize:'11px',fontWeight:800,color:t.dark}}>{t.label}</div>
                    <div style={{fontSize:'10px',color:t.textMuted,marginTop:'1px'}}>{t.tagline}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Layout density ── */}
          <div style={panelStyle}>
            {panelHead('📐', 'Layout Density', 'Controls how much breathing room elements have')}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
              {[
                {id:'compact',     label:'Compact',     icon:'▪▪▪▪', desc:'More data, tighter spacing'},
                {id:'comfortable', label:'Comfortable', icon:'▪ ▪ ▪',  desc:'Balanced — recommended'},
                {id:'spacious',    label:'Spacious',    icon:'▪   ▪',  desc:'Relaxed, easy on the eyes'},
              ].map(d => (
                <div
                  key={d.id}
                  className={`fmt-density-card${density===d.id?' on':''}`}
                  onClick={() => setDensity(d.id)}
                >
                  <div style={{fontSize:'16px',letterSpacing:density===d.id?'4px':'1px',color:density===d.id?activeT.primary:'#7a92a8',marginBottom:'8px',transition:'all 0.2s'}}>{d.icon}</div>
                  <div style={{fontSize:'12px',fontWeight:800,color:'#1a2b3c',marginBottom:'3px'}}>{d.label}</div>
                  <div style={{fontSize:'11px',color:'#7a92a8'}}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Display preferences ── */}
          <div style={panelStyle}>
            {panelHead('⚙️', 'Display Preferences', 'Regional settings and measurement units')}

            {/* Font size */}
            <div className="fmt-pref-row">
              <div>
                <div style={{fontSize:'13px',fontWeight:700,color:'#1a2b3c'}}>Font Size</div>
                <div style={{fontSize:'11px',color:'#7a92a8',marginTop:'2px'}}>Base text size throughout the app</div>
              </div>
              <div className="fmt-seg">
                {['small','medium','large'].map(s => (
                  <button key={s} className={`fmt-seg-btn${fontSize===s?' on':''}`} onClick={() => setFontSize(s)} style={{textTransform:'capitalize'}}>{s}</button>
                ))}
              </div>
            </div>

            {/* Date format */}
            <div className="fmt-pref-row">
              <div>
                <div style={{fontSize:'13px',fontWeight:700,color:'#1a2b3c'}}>Date Format</div>
                <div style={{fontSize:'11px',color:'#7a92a8',marginTop:'2px'}}>How dates appear across the platform</div>
              </div>
              <div className="fmt-seg">
                {['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'].map(f => (
                  <button key={f} className={`fmt-seg-btn${dateFormat===f?' on':''}`} onClick={() => setDateFormat(f)} style={{fontSize:'11px'}}>{f}</button>
                ))}
              </div>
            </div>

            {/* Timezone */}
            <div className="fmt-pref-row">
              <div>
                <div style={{fontSize:'13px',fontWeight:700,color:'#1a2b3c'}}>Time Zone</div>
                <div style={{fontSize:'11px',color:'#7a92a8',marginTop:'2px'}}>Used for timestamps and scheduling</div>
              </div>
              <div className="fmt-seg">
                {[['AEST','Eastern'],['ACST','Central'],['AWST','Western']].map(([id,lbl]) => (
                  <button key={id} className={`fmt-seg-btn${timezone===id?' on':''}`} onClick={() => setTimezone(id)} style={{fontSize:'11px'}}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div className="fmt-pref-row">
              <div>
                <div style={{fontSize:'13px',fontWeight:700,color:'#1a2b3c'}}>Measurement Units</div>
                <div style={{fontSize:'11px',color:'#7a92a8',marginTop:'2px'}}>Distances, weights and volumes</div>
              </div>
              <div className="fmt-seg">
                {[['metric','Metric (km/kg)'],['imperial','Imperial (mi/lb)']].map(([id,lbl]) => (
                  <button key={id} className={`fmt-seg-btn${units===id?' on':''}`} onClick={() => setUnits(id)} style={{fontSize:'11px'}}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Apply button ── */}
          <div style={{display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
            <button
              className="fmt-apply-btn"
              disabled={applying}
              onClick={handleApply}
              style={{background: applying ? '#94a3b8' : activeT.gradient}}
            >
              {applying ? '⟳  Applying…' : saved ? '✓  Saved!' : `Apply ${activeT.label}`}
            </button>
            {saved && (
              <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'11px 18px',background:'#dcfce7',border:'1px solid #86efac',borderRadius:'12px',animation:'fmt-fadein 0.3s ease'}}>
                <span style={{fontSize:'18px'}}>🎨</span>
                <span style={{fontSize:'13px',fontWeight:700,color:'#16a34a'}}>Theme applied across MechIQ</span>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT: Sticky live preview ══ */}
        <div style={{position:'sticky',top:'80px'}}>
          {/* Live label */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#16a34a',animation:'fmt-pulse 2s ease-in-out infinite'}}/>
            <span style={{fontSize:'10px',fontWeight:800,color:'#7a92a8',letterSpacing:'1.5px',textTransform:'uppercase'}}>
              Live Preview
            </span>
            <span style={{fontSize:'12px',fontWeight:700,color:previewT.primary,marginLeft:'2px'}}>
              — {previewT.label}
            </span>
          </div>

          {/* Preview window */}
          <LivePreview t={previewT} density={density} fontSize={fontSize} />

          {/* Theme info strip */}
          <div style={{marginTop:'12px',padding:'12px 16px',background:previewT.bg,border:`1px solid ${previewT.border}`,borderRadius:'12px',display:'flex',alignItems:'center',gap:'10px',transition:'all 0.35s'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'10px',background:previewT.gradient,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',animation:'fmt-float 2.5s ease-in-out infinite'}}>
              
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'13px',fontWeight:800,color:previewT.dark}}>{previewT.label}</div>
              <div style={{fontSize:'11px',color:previewT.textMuted}}>{previewT.tagline}</div>
            </div>
            {/* Colour swatches */}
            <div style={{display:'flex',gap:'4px'}}>
              {[previewT.primary, previewT.accent, previewT.dark].map((c,i) => (
                <div key={i} style={{width:'16px',height:'16px',borderRadius:'4px',background:c,border:'1.5px solid rgba(255,255,255,0.3)',boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}/>
              ))}
            </div>
          </div>

          {/* Density + font size preview labels */}
          <div style={{marginTop:'10px',display:'flex',gap:'8px'}}>
            {[['📐',density],['🔤',fontSize],['📅',dateFormat.split('/')[0]==='DD'?'AU date':'US date']].map(([ic,lbl])=>(
              <div key={lbl} style={{flex:1,padding:'8px',background:'#f8fafc',border:'1px solid #e2ecf5',borderRadius:'8px',textAlign:'center'}}>
                <div style={{fontSize:'14px',marginBottom:'2px'}}>{ic}</div>
                <div style={{fontSize:'10px',fontWeight:700,color:'#3d5166',textTransform:'capitalize'}}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────
function Notifications({ userRole }) {
  const [prefs, setPrefs] = useState({
    work_order_created:   true,
    work_order_critical:  true,
    maintenance_due:      true,
    maintenance_overdue:  true,
    oil_critical:         true,
    oil_monitor:          false,
    rego_expiry:          true,
    warranty_expiry:      true,
    prestart_defect:      true,
    daily_summary:        false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = key => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    await supabase.from('companies').update({ notification_prefs: prefs }).eq('id', userRole.company_id);
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({ k }) => (
    <div
      onClick={() => toggle(k)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        backgroundColor: prefs[k] ? '#00ABE4' : '#d6e6f2',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--surface)',
        position: 'absolute', top: '3px',
        left: prefs[k] ? '23px' : '3px', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  const NotifRow = ({ k, title, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
      </div>
      <Toggle k={k} />
    </div>
  );

  const groups = [
    {
      title: 'Work Orders',
      rows: [
        { k: 'work_order_created',  title: 'Work Order Created',  desc: 'When a new work order is raised' },
        { k: 'work_order_critical', title: 'Critical Work Order', desc: 'When a work order is marked Critical priority' },
      ],
    },
    {
      title: 'Maintenance',
      rows: [
        { k: 'maintenance_due',     title: 'Service Due',         desc: 'When a scheduled service is coming up' },
        { k: 'maintenance_overdue', title: 'Service Overdue',     desc: 'When a service is past its due date or hours' },
      ],
    },
    {
      title: 'Oil Sampling',
      rows: [
        { k: 'oil_critical', title: 'Critical Oil Result',   desc: 'When an oil sample comes back Critical' },
        { k: 'oil_monitor',  title: 'Monitor Oil Result',    desc: 'When an oil sample comes back Monitor' },
      ],
    },
    {
      title: 'Asset Alerts',
      rows: [
        { k: 'rego_expiry',     title: 'Registration Expiry',  desc: '30 days before registration expires' },
        { k: 'warranty_expiry', title: 'Warranty Expiry',      desc: '30 days before warranty expires' },
        { k: 'prestart_defect', title: 'Pre-start Defect',     desc: 'When an operator flags a defect on pre-start' },
      ],
    },
    {
      title: 'Reports',
      rows: [
        { k: 'daily_summary', title: 'Daily Summary Email', desc: 'Morning summary of open items and alerts' },
      ],
    },
  ];

  return (
    <div>
      {groups.map(g => (
        <div key={g.title} style={card}>
          <SectionHeader icon={g.title === 'Work Orders' ? '🔧' : g.title === 'Maintenance' ? '📅' : g.title === 'Oil Sampling' ? '🔬' : g.title === 'Asset Alerts' ? '⚠️' : '📊'} title={g.title} desc={`Notification preferences for ${g.title.toLowerCase()}`} />
          {g.rows.map(r => <NotifRow key={r.k} {...r} />)}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} style={saveBtn()}>Save Notifications</button>
        {saved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Preferences saved</span>}
      </div>
    </div>
  );
}

// ─── Tab: Users & Roles ───────────────────────────────────────────────────────
function UsersRoles({ userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState({ email: '', name: '', role: 'technician' });
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  useEffect(() => { if (userRole?.company_id) fetchUsers(); }, [userRole]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_roles').select('*').eq('company_id', userRole.company_id).order('role');
    setUsers(data || []);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!invite.email || !invite.name) { setInviteMsg('Email and name are required'); return; }
    setInviting(true);
    const { error } = await supabase.from('user_roles').insert({ ...invite, company_id: userRole.company_id });
    if (error) { setInviteMsg(error.message); }
    else { setInviteMsg('User added successfully'); setInvite({ email: '', name: '', role: 'technician' }); fetchUsers(); }
    setInviting(false); setTimeout(() => setInviteMsg(''), 4000);
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your company?`)) return;
    await supabase.from('user_roles').delete().eq('id', id);
    fetchUsers();
  };

  const handleRoleChange = async (id, role) => {
    await supabase.from('user_roles').update({ role }).eq('id', id);
    fetchUsers();
  };

  const roleColor = { master: '#7c3aed', admin: '#00ABE4', supervisor: '#d97706', technician: '#16a34a', operator: '#7a92a8' };
  const roleBadge = role => (
    <span style={{ padding: '3px 10px', borderRadius: '10px', backgroundColor: roleColor[role] + '20', color: roleColor[role], fontSize: '11px', fontWeight: 700 }}>
      {role}
    </span>
  );

  return (
    <div>
      {/* Invite */}
      <div style={card}>
        <SectionHeader icon="➕" title="Add Team Member" desc="Add a new user to your company" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={label}>Full Name</label>
            <input style={input} value={invite.name} placeholder="John Smith" onChange={e => setInvite(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label style={label}>Email Address</label>
            <input style={input} value={invite.email} placeholder="john@company.com" onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label style={label}>Role</label>
            <select style={input} value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value }))}>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="technician">Technician</option>
              <option value="operator">Operator</option>
            </select>
          </div>
          <button onClick={handleInvite} disabled={inviting} style={saveBtn()}>
            {inviting ? 'Adding...' : 'Add User'}
          </button>
        </div>
        {inviteMsg && <div style={{ marginTop: '10px', fontSize: '13px', color: inviteMsg.includes('success') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{inviteMsg}</div>}
      </div>

      {/* Role guide */}
      <div style={card}>
        <SectionHeader icon="🔑" title="Role Permissions" desc="What each role can access" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { role: 'admin',      perms: ['Full access', 'Manage users', 'Company settings', 'Delete data'] },
            { role: 'supervisor', perms: ['View all data', 'Raise work orders', 'Approve pre-starts', 'View reports'] },
            { role: 'technician', perms: ['View assigned work', 'Close work orders', 'Log maintenance', 'View assets'] },
            { role: 'operator',   perms: ['Submit pre-starts', 'View own assets', 'Log downtime'] },
          ].map(({ role, perms }) => (
            <div key={role} style={{ border: `1px solid ${roleColor[role]}30`, borderRadius: '8px', padding: '14px', borderTop: `3px solid ${roleColor[role]}` }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: roleColor[role], marginBottom: '10px', textTransform: 'capitalize' }}>{role}</div>
              {perms.map(p => <div key={p} style={{ fontSize: '12px', color: 'var(--text-mid)', marginBottom: '4px' }}>✓ {p}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* User list */}
      <div style={card}>
        <SectionHeader icon="👥" title="Team Members" desc={`${users.length} users in your company`} />
        {loading ? <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--blue-light)' }}>
                {['Name', 'Email', 'Role', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)' }}>{u.name}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-mid)' }}>{u.email}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {u.role === 'master' ? roleBadge(u.role) : (
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-dark)', backgroundColor: 'var(--surface)' }}>
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="technician">Technician</option>
                        <option value="operator">Operator</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {u.role !== 'master' && u.email !== userRole?.email && (
                      <button onClick={() => handleDeactivate(u.id, u.name)}
                        style={{ padding: '5px 12px', backgroundColor: 'var(--surface)', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Billing & Plan ──────────────────────────────────────────────────────
function Billing({ userRole }) {
  const [company, setCompany] = useState(null);

  useEffect(() => { if (userRole?.company_id) fetchCompany(); }, [userRole]);
  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('plan, status, asset_limit, features').eq('id', userRole.company_id).single();
    setCompany(data);
  };

  const plans = [
    { id: 'trial',   label: 'Free Trial',    price: 'Free',       assets: 10,  features: ['Assets', 'Maintenance', 'Pre-starts', 'Work Orders'] },
    { id: 'starter', label: 'Starter',       price: 'A$49/mo',    assets: 25,  features: ['Everything in Trial', 'Reports', 'Downtime Tracking', 'Email Support'] },
    { id: 'pro',     label: 'Professional',  price: 'A$149/mo',   assets: 100, features: ['Everything in Starter', 'Oil Sampling AI', 'API Access', 'Priority Support'] },
    { id: 'enterprise', label: 'Enterprise', price: 'Contact us', assets: 999, features: ['Everything in Pro', 'Unlimited Assets', 'Custom Integrations', 'Dedicated Support'] },
  ];

  const current = company?.plan || 'trial';

  return (
    <div>
      {/* Current plan */}
      <div style={card}>
        <SectionHeader icon="💳" title="Current Plan" desc="Your active subscription" />
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Plan', value: (company?.plan || 'Trial').toUpperCase() },
            { label: 'Status', value: (company?.status || 'Active').toUpperCase() },
            { label: 'Asset Limit', value: company?.asset_limit || 10 },
          ].map(({ label: l, value }) => (
            <div key={l} style={{ backgroundColor: 'var(--blue-light)', borderRadius: '8px', padding: '16px 24px', textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#00ABE4' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '1px', marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div style={card}>
        <SectionHeader icon="🚀" title="Available Plans" desc="Upgrade to unlock more features and assets" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {plans.map(p => (
            <div key={p.id} style={{
              border: current === p.id ? '2px solid #00ABE4' : '1px solid #d6e6f2',
              borderRadius: '10px', padding: '20px',
              backgroundColor: current === p.id ? '#E9F1FA' : '#fff',
              position: 'relative',
            }}>
              {current === p.id && (
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#00ABE4', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                  CURRENT PLAN
                </div>
              )}
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px' }}>{p.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#00ABE4', marginBottom: '4px' }}>{p.price}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Up to {p.assets === 999 ? 'unlimited' : p.assets} assets</div>
              {p.features.map(f => <div key={f} style={{ fontSize: '12px', color: 'var(--text-mid)', marginBottom: '4px' }}>✓ {f}</div>)}
              {current !== p.id && (
                <button
                  onClick={() => window.location.href = 'mailto:info@mechiq.com.au?subject=Upgrade to ' + p.label}
                  style={{ ...saveBtn(), marginTop: '16px', width: '100%', fontSize: '12px', padding: '8px' }}>
                  {p.id === 'enterprise' ? 'Contact Us' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          To upgrade your plan contact us at <a href="mailto:info@mechiq.com.au" style={{ color: '#00ABE4' }}>info@mechiq.com.au</a>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Data & Export ───────────────────────────────────────────────────────
function DataExport({ userRole }) {
  const [exporting, setExporting] = useState('');

  const exportData = async (type) => {
    setExporting(type);
    try {
      const cid = userRole.company_id;
      let data, filename;

      if (type === 'assets') {
        const { data: d } = await supabase.from('assets').select('*').eq('company_id', cid);
        data = d; filename = 'MechIQ_Assets';
      } else if (type === 'maintenance') {
        const { data: d } = await supabase.from('maintenance').select('*').eq('company_id', cid);
        data = d; filename = 'MechIQ_Maintenance';
      } else if (type === 'work_orders') {
        const { data: d } = await supabase.from('work_orders').select('*').eq('company_id', cid);
        data = d; filename = 'MechIQ_WorkOrders';
      } else if (type === 'oil_samples') {
        const { data: d } = await supabase.from('oil_samples').select('*').eq('company_id', cid);
        data = d; filename = 'MechIQ_OilSamples';
      } else if (type === 'full') {
        const [assets, maintenance, workOrders, downtime, oilSamples] = await Promise.all([
          supabase.from('assets').select('*').eq('company_id', cid),
          supabase.from('maintenance').select('*').eq('company_id', cid),
          supabase.from('work_orders').select('*').eq('company_id', cid),
          supabase.from('downtime').select('*').eq('company_id', cid),
          supabase.from('oil_samples').select('*').eq('company_id', cid),
        ]);
        data = { assets: assets.data, maintenance: maintenance.data, work_orders: workOrders.data, downtime: downtime.data, oil_samples: oilSamples.data };
        filename = 'MechIQ_Full_Export';
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (err) { console.error(err); }
    setExporting('');
  };

  const exports = [
    { id: 'assets',      icon: '⚙️', label: 'Assets',       desc: 'All asset records, specs and depreciation data' },
    { id: 'maintenance', icon: '🔧', label: 'Maintenance',   desc: 'Scheduled maintenance history and upcoming services' },
    { id: 'work_orders', icon: '📋', label: 'Work Orders',   desc: 'All work orders — open, in progress and completed' },
    { id: 'oil_samples', icon: '🔬', label: 'Oil Samples',   desc: 'All oil analysis results and AI assessments' },
    { id: 'full',        icon: '📦', label: 'Full Export',   desc: 'Everything — complete company data backup as JSON' },
  ];

  return (
    <div>
      <div style={card}>
        <SectionHeader icon="📤" title="Export Data" desc="Download your MechIQ data at any time" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {exports.map(e => (
            <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '24px' }}>{e.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>{e.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{e.desc}</div>
                </div>
              </div>
              <button onClick={() => exportData(e.id)} disabled={!!exporting}
                style={{ ...saveBtn(e.id === 'full' ? '#1a2b3c' : '#00ABE4'), whiteSpace: 'nowrap', fontSize: '12px', padding: '8px 16px', flexShrink: 0 }}>
                {exporting === e.id ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <SectionHeader icon="🗑️" title="Danger Zone" desc="Irreversible actions — proceed with caution" />
        <div style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '18px', backgroundColor: '#fef2f2' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>Delete All Company Data</div>
          <div style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '14px' }}>Permanently removes all assets, maintenance records, work orders and oil samples. This cannot be undone. Export your data first.</div>
          <button
            onClick={() => { if (window.confirm('Are you sure? Contact info@mechiq.com.au to request a full account deletion.')) { window.location.href = 'mailto:info@mechiq.com.au?subject=Account Deletion Request'; } }}
            style={{ padding: '9px 20px', backgroundColor: 'var(--surface)', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            Request Account Deletion
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings component ──────────────────────────────────────────────────
const TABS = [
  { id: 'company',   label: 'Company Details', icon: '🏢' },
  { id: 'format',    label: 'Format',          icon: '🎨' },
  { id: 'notifs',    label: 'Notifications',   icon: '🔔' },
  { id: 'users',     label: 'Users & Roles',   icon: '👥' },
  { id: 'billing',   label: 'Billing & Plan',  icon: '💳' },
  { id: 'data',      label: 'Data & Export',   icon: '📤' },
];

function Settings({ userRole, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'company');

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  const tabContent = {
    company: <CompanyDetails userRole={userRole} />,
    format:  <Format userRole={userRole} />,
    notifs:  <Notifications userRole={userRole} />,
    users:   <UsersRoles userRole={userRole} />,
    billing: <Billing userRole={userRole} />,
    data:    <DataExport userRole={userRole} />,
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 4px' }}>Settings</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Manage your company preferences, team and account.</p>
      </div>

      {/* Sub-nav tabs */}
      

      {/* Tab content */}
      {tabContent[activeTab]}
    </div>
  );
}

export default Settings;
