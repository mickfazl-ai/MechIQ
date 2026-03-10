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
  root.style.setProperty('--blue-bright',  t.primary);
  root.style.setProperty('--blue-dark',    t.primaryDark);
  root.style.setProperty('--blue-deeper',  t.primaryDark);
  root.style.setProperty('--blue-light',   t.bg);
  root.style.setProperty('--blue-mid',     t.border);
  root.style.setProperty('--blue-soft',    t.bg + 'aa');
  root.style.setProperty('--text-dark',    t.dark);
  root.style.setProperty('--text-mid',     t.textMid);
  root.style.setProperty('--text-muted',   t.textMuted);
  root.style.setProperty('--border',       t.border);
  root.style.setProperty('--border-light', t.border + '88');
  // Dark mode body bg
  document.body.style.backgroundColor = t.bg;
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const card = {
  backgroundColor: '#fff', border: '1px solid #d6e6f2',
  borderRadius: '12px', padding: '24px', marginBottom: '20px',
};
const label = {
  fontSize: '11px', fontWeight: 700, color: '#7a92a8',
  letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};
const input = {
  width: '100%', padding: '10px 14px',
  border: '1px solid #d6e6f2', borderRadius: '6px',
  fontSize: '14px', color: '#1a2b3c', backgroundColor: '#fff', outline: 'none',
};
const saveBtn = (color = '#00ABE4') => ({
  padding: '10px 24px', backgroundColor: color, color: '#fff',
  border: 'none', borderRadius: '6px', fontSize: '13px',
  fontWeight: 700, cursor: 'pointer',
});

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{ width: '40px', height: '40px', backgroundColor: '#E9F1FA', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2b3c' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#7a92a8' }}>{desc}</div>
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
          <div style={{ width: '80px', height: '80px', borderRadius: '10px', border: '2px dashed #d6e6f2', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F1FA' }}>
            {logoUrl
              ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: '28px' }}>🏢</span>
            }
          </div>
          <div>
            <button onClick={() => fileRef.current.click()} style={{ ...saveBtn('#00ABE4'), marginBottom: '8px', display: 'block' }}>
              {logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            <div style={{ fontSize: '12px', color: '#7a92a8' }}>PNG or JPG, max 2MB. Recommended 400×400px.</div>
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
function Format({ userRole }) {
  const [selected, setSelected] = useState(localStorage.getItem('mechiq_theme') || 'default');
  const [saved, setSaved] = useState(false);

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('mechiq_theme') || 'default';
    applyTheme(savedTheme);
    setSelected(savedTheme);
  }, []);

  const handleSave = () => {
    localStorage.setItem('mechiq_theme', selected);
    applyTheme(selected);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div style={card}>
        <SectionHeader icon="🎨" title="Colour Theme" desc="Customise the look and feel of MechIQ for your team" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {THEMES.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                border: selected === t.id ? `2px solid ${t.primary}` : '2px solid #d6e6f2',
                borderRadius: '10px', padding: '16px', cursor: 'pointer',
                backgroundColor: selected === t.id ? t.bg : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.primary }} />
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.bg, border: '1px solid #d6e6f2' }} />
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.dark }} />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2b3c' }}>{t.label}</div>
              {selected === t.id && <div style={{ fontSize: '11px', color: t.primary, fontWeight: 600, marginTop: '4px' }}>✓ Selected</div>}
            </div>
          ))}
        </div>

        {/* Preview */}
        <div style={{ marginBottom: '20px' }}>
          <label style={label}>Preview</label>
          <div style={{ backgroundColor: THEMES.find(t => t.id === selected)?.bg || '#E9F1FA', borderRadius: '8px', padding: '16px', border: '1px solid #d6e6f2' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '80px', height: '8px', borderRadius: '4px', backgroundColor: THEMES.find(t => t.id === selected)?.primary }} />
              <div style={{ width: '50px', height: '8px', borderRadius: '4px', backgroundColor: '#d6e6f2' }} />
              <div style={{ width: '60px', height: '8px', borderRadius: '4px', backgroundColor: '#d6e6f2' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Assets', 'Maintenance', 'Reports'].map(s => (
                <div key={s} style={{ padding: '6px 14px', borderRadius: '4px', backgroundColor: THEMES.find(t => t.id === selected)?.primary, color: '#fff', fontSize: '12px', fontWeight: 600 }}>{s}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleSave} style={saveBtn()}>Apply Theme</button>
          {saved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Theme applied</span>}
        </div>
      </div>

      <div style={card}>
        <SectionHeader icon="🔤" title="Display Preferences" desc="Adjust how information is displayed" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={label}>Date Format</label>
            <select style={input}>
              <option>DD/MM/YYYY (Australian)</option>
              <option>MM/DD/YYYY (US)</option>
              <option>YYYY-MM-DD (ISO)</option>
            </select>
          </div>
          <div>
            <label style={label}>Time Zone</label>
            <select style={input}>
              <option>AEST — Australian Eastern Standard Time</option>
              <option>AWST — Australian Western Standard Time</option>
              <option>ACST — Australian Central Standard Time</option>
            </select>
          </div>
          <div>
            <label style={label}>Currency</label>
            <select style={input}>
              <option>AUD — Australian Dollar</option>
              <option>USD — US Dollar</option>
              <option>NZD — New Zealand Dollar</option>
            </select>
          </div>
          <div>
            <label style={label}>Units</label>
            <select style={input}>
              <option>Metric (km, kg, L)</option>
              <option>Imperial (mi, lb, gal)</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '16px' }}>
          <button style={saveBtn()}>Save Preferences</button>
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
        width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
        position: 'absolute', top: '3px',
        left: prefs[k] ? '23px' : '3px', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  const NotifRow = ({ k, title, desc }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #E9F1FA' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2b3c' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#7a92a8', marginTop: '2px' }}>{desc}</div>
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
              {perms.map(p => <div key={p} style={{ fontSize: '12px', color: '#3d5166', marginBottom: '4px' }}>✓ {p}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* User list */}
      <div style={card}>
        <SectionHeader icon="👥" title="Team Members" desc={`${users.length} users in your company`} />
        {loading ? <div style={{ color: '#7a92a8', fontSize: '13px' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#E9F1FA' }}>
                {['Name', 'Email', 'Role', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#7a92a8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #E9F1FA' }}>
                  <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 600, color: '#1a2b3c' }}>{u.name}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', color: '#3d5166' }}>{u.email}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {u.role === 'master' ? roleBadge(u.role) : (
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{ padding: '4px 8px', border: '1px solid #d6e6f2', borderRadius: '4px', fontSize: '12px', color: '#1a2b3c', backgroundColor: '#fff' }}>
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
                        style={{ padding: '5px 12px', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
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
            <div key={l} style={{ backgroundColor: '#E9F1FA', borderRadius: '8px', padding: '16px 24px', textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#00ABE4' }}>{value}</div>
              <div style={{ fontSize: '11px', color: '#7a92a8', fontWeight: 600, letterSpacing: '1px', marginTop: '4px' }}>{l}</div>
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
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#1a2b3c', marginBottom: '4px' }}>{p.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#00ABE4', marginBottom: '4px' }}>{p.price}</div>
              <div style={{ fontSize: '12px', color: '#7a92a8', marginBottom: '14px' }}>Up to {p.assets === 999 ? 'unlimited' : p.assets} assets</div>
              {p.features.map(f => <div key={f} style={{ fontSize: '12px', color: '#3d5166', marginBottom: '4px' }}>✓ {f}</div>)}
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
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#7a92a8' }}>
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
            <div key={e.id} style={{ border: '1px solid #d6e6f2', borderRadius: '8px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '24px' }}>{e.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a2b3c' }}>{e.label}</div>
                  <div style={{ fontSize: '12px', color: '#7a92a8', marginTop: '2px' }}>{e.desc}</div>
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
          <div style={{ fontSize: '13px', color: '#3d5166', marginBottom: '14px' }}>Permanently removes all assets, maintenance records, work orders and oil samples. This cannot be undone. Export your data first.</div>
          <button
            onClick={() => { if (window.confirm('Are you sure? Contact info@mechiq.com.au to request a full account deletion.')) { window.location.href = 'mailto:info@mechiq.com.au?subject=Account Deletion Request'; } }}
            style={{ padding: '9px 20px', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
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
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a2b3c', margin: '0 0 4px' }}>Settings</h2>
        <p style={{ fontSize: '13px', color: '#7a92a8', margin: 0 }}>Manage your company preferences, team and account.</p>
      </div>

      {/* Sub-nav tabs */}
      

      {/* Tab content */}
      {tabContent[activeTab]}
    </div>
  );
}

export default Settings;
