import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// ─── Shared styles ────────────────────────────────────────────────────────────
const card = {
  backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: '12px', padding: '24px', marginBottom: '20px',
  boxShadow: 'var(--shadow-sm)',
};
const lbl = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '5px', display: 'block',
};
const inp = {
  width: '100%', padding: '10px 14px',
  border: '1px solid var(--border)', borderRadius: '8px',
  fontSize: '13px', color: 'var(--text-primary)', backgroundColor: 'var(--surface-2)',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};
const saveBtn = (color = 'var(--accent)') => ({
  padding: '10px 22px', backgroundColor: color, color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px',
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  transition: 'opacity 0.15s',
});

function SectionHeader({ title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: '3px', height: '32px', backgroundColor: 'var(--accent)', borderRadius: '2px', flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        {desc && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>}
      </div>
    </div>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

// ─── Tab: Company Details ─────────────────────────────────────────────────────
const INDUSTRIES = [
  'Mining', 'Construction', 'Agriculture', 'Transport & Logistics',
  'Manufacturing', 'Oil & Gas', 'Civil Engineering', 'Forestry',
  'Utilities', 'Marine', 'Aviation', 'Local Government', 'Other',
];
const FLEET_SIZES = ['1–5', '6–15', '16–50', '51–100', '101–250', '250+'];
const STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

function CompanyDetails({ userRole }) {
  const [form, setForm] = useState({
    name: '', abn: '', acn: '', industry: '', fleet_size: '',
    address: '', city: '', state: '', postcode: '', country: 'Australia',
    phone: '', mobile: '', email: '', website: '',
    contact_name: '', contact_title: '', contact_email: '', contact_phone: '',
    emergency_contact: '', emergency_phone: '',
    tax_number: '', invoice_email: '', purchase_order_required: false,
    safety_standard: '', insurance_provider: '', insurance_expiry: '',
    notes: '',
  });
  const [logo, setLogo] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const fileRef = useRef();

  useEffect(() => { if (userRole?.company_id) fetchCompany(); }, [userRole]);

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('*').eq('id', userRole.company_id).single();
    if (data) {
      setForm(prev => ({
        ...prev,
        name:                     data.name || '',
        abn:                      data.abn || '',
        acn:                      data.acn || '',
        industry:                 data.industry || '',
        fleet_size:               data.fleet_size || '',
        address:                  data.address || '',
        city:                     data.city || '',
        state:                    data.state || '',
        postcode:                 data.postcode || '',
        country:                  data.country || 'Australia',
        phone:                    data.phone || '',
        mobile:                   data.mobile || '',
        email:                    data.email || '',
        website:                  data.website || '',
        contact_name:             data.contact_name || '',
        contact_title:            data.contact_title || '',
        contact_email:            data.contact_email || '',
        contact_phone:            data.contact_phone || '',
        emergency_contact:        data.emergency_contact || '',
        emergency_phone:          data.emergency_phone || '',
        tax_number:               data.tax_number || '',
        invoice_email:            data.invoice_email || '',
        purchase_order_required:  data.purchase_order_required || false,
        safety_standard:          data.safety_standard || '',
        insurance_provider:       data.insurance_provider || '',
        insurance_expiry:         data.insurance_expiry || '',
        notes:                    data.notes || '',
      }));
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
    if (pwForm.newPw.length < 8) { setPwMsg('Minimum 8 characters'); return; }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) { setPwMsg(error.message); }
    else { setPwMsg('✓ Password updated'); setPwForm({ newPw: '', confirm: '' }); }
    setTimeout(() => setPwMsg(''), 4000);
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const F = ({ k, label, placeholder, type = 'text', half = false, span2 = false }) => (
    <div style={{ gridColumn: span2 ? 'span 2' : half ? 'span 1' : 'span 1' }}>
      <Field label={label}>
        <input style={inp} type={type} value={form[k]} placeholder={placeholder || ''}
          onChange={e => set(k, e.target.value)} />
      </Field>
    </div>
  );
  const Sel = ({ k, label, options, placeholder }) => (
    <div>
      <Field label={label}>
        <select style={inp} value={form[k]} onChange={e => set(k, e.target.value)}>
          <option value="">{placeholder || 'Select...'}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    </div>
  );

  const g2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
  const g3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' };

  return (
    <div>
      {/* ── Logo ── */}
      <div style={card}>
        <SectionHeader title="Company Logo" desc="Used on reports, pre-starts and service documents" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: 90, height: 90, borderRadius: 12, border: '2px dashed var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-2)', flexShrink: 0 }}>
            {logoUrl
              ? <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 32, opacity: 0.3 }}>🏢</span>}
          </div>
          <div>
            <button onClick={() => fileRef.current.click()} style={{ ...saveBtn(), marginBottom: 8, display: 'block' }}>
              {logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG or JPG · max 2MB · 400×400px recommended</div>
            {logoUrl && (
              <button onClick={() => { setLogoUrl(null); setLogo(null); }}
                style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>
                Remove logo
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { setLogo(e.target.files[0]); setLogoUrl(URL.createObjectURL(e.target.files[0])); }} />
          </div>
        </div>
      </div>

      {/* ── Business Information ── */}
      <div style={card}>
        <SectionHeader title="Business Information" desc="Your registered business details" />
        <div style={{ ...g2, marginBottom: 14 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <Field label="Company / Trading Name">
              <input style={inp} value={form.name} placeholder="Coastline Machine Management"
                onChange={e => set('name', e.target.value)} />
            </Field>
          </div>
          <F k="abn" label="ABN" placeholder="12 345 678 901" half />
          <F k="acn" label="ACN (if applicable)" placeholder="123 456 789" half />
          <Sel k="industry" label="Industry" options={INDUSTRIES} placeholder="Select industry..." />
          <Sel k="fleet_size" label="Fleet Size" options={FLEET_SIZES} placeholder="Number of assets..." />
        </div>
      </div>

      {/* ── Address ── */}
      <div style={card}>
        <SectionHeader title="Business Address" desc="Physical location of your main operations" />
        <div style={g2}>
          <div style={{ gridColumn: 'span 2' }}>
            <Field label="Street Address">
              <input style={inp} value={form.address} placeholder="123 Main Street"
                onChange={e => set('address', e.target.value)} />
            </Field>
          </div>
          <F k="city" label="City / Suburb" placeholder="Sydney" half />
          <Sel k="state" label="State / Territory" options={STATES} placeholder="Select state..." />
          <F k="postcode" label="Postcode" placeholder="2000" half />
          <F k="country" label="Country" placeholder="Australia" half />
        </div>
      </div>

      {/* ── Contact Details ── */}
      <div style={card}>
        <SectionHeader title="Contact Details" desc="How clients and suppliers can reach you" />
        <div style={g2}>
          <F k="phone" label="Main Phone" placeholder="+61 2 XXXX XXXX" />
          <F k="mobile" label="Mobile" placeholder="+61 4XX XXX XXX" />
          <div style={{ gridColumn: 'span 2' }}>
            <F k="email" label="General Email" placeholder="info@yourcompany.com.au" type="email" span2 />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <F k="website" label="Website" placeholder="www.yourcompany.com.au" span2 />
          </div>
        </div>
      </div>

      {/* ── Primary Contact ── */}
      <div style={card}>
        <SectionHeader title="Primary Contact Person" desc="Main person responsible for this account" />
        <div style={g2}>
          <F k="contact_name" label="Full Name" placeholder="John Smith" />
          <F k="contact_title" label="Job Title" placeholder="Fleet Manager" />
          <F k="contact_email" label="Direct Email" placeholder="john@company.com.au" type="email" />
          <F k="contact_phone" label="Direct Phone" placeholder="+61 4XX XXX XXX" />
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Emergency Contact</div>
          <div style={g2}>
            <F k="emergency_contact" label="Name" placeholder="Jane Smith" />
            <F k="emergency_phone" label="Phone" placeholder="+61 4XX XXX XXX" />
          </div>
        </div>
      </div>

      {/* ── Finance & Compliance ── */}
      <div style={card}>
        <SectionHeader title="Finance & Compliance" desc="Billing, insurance and safety information" />
        <div style={g2}>
          <F k="invoice_email" label="Accounts / Invoice Email" placeholder="accounts@yourcompany.com.au" type="email" />
          <F k="tax_number" label="Tax Reference / GST Number" placeholder="Optional" />
          <F k="insurance_provider" label="Insurance Provider" placeholder="e.g. QBE, Allianz" />
          <F k="insurance_expiry" label="Insurance Expiry Date" type="date" />
          <div style={{ gridColumn: 'span 2' }}>
            <F k="safety_standard" label="Safety Standard / Certification" placeholder="e.g. ISO 45001, AS 4801, OHSAS 18001" span2 />
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => set('purchase_order_required', !form.purchase_order_required)}
            style={{ width: 42, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: form.purchase_order_required ? 'var(--accent)' : 'var(--border-strong)', flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.purchase_order_required ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Purchase order required for all work orders</span>
        </div>
      </div>

      {/* ── Notes ── */}
      <div style={card}>
        <SectionHeader title="Internal Notes" desc="Any additional information about this account" />
        <Field label="Notes">
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={form.notes}
            placeholder="Site access instructions, special requirements, account notes..."
            onChange={e => set('notes', e.target.value)} />
        </Field>
      </div>

      {/* ── Save ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <button onClick={handleSave} disabled={saving} style={saveBtn()}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Changes saved successfully</span>}
      </div>

      {/* ── Password ── */}
      <div style={card}>
        <SectionHeader title="Change Password" desc="Update your account login password" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 500 }}>
          <Field label="New Password">
            <input style={inp} type="password" value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
          </Field>
          <Field label="Confirm New Password">
            <input style={inp} type="password" value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </Field>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handlePasswordChange} style={saveBtn()}>Update Password</button>
          {pwMsg && <span style={{ fontSize: 13, color: pwMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{pwMsg}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────
function Notifications({ userRole }) {
  const [prefs, setPrefs] = useState({
    work_order_created: true, work_order_critical: true,
    maintenance_due: true, maintenance_overdue: true,
    oil_critical: true, oil_monitor: false,
    rego_expiry: true, warranty_expiry: true,
    prestart_defect: true, daily_summary: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userRole?.company_id) return;
    supabase.from('companies').select('notification_prefs').eq('id', userRole.company_id).single()
      .then(({ data }) => { if (data?.notification_prefs) setPrefs(p => ({ ...p, ...data.notification_prefs })); });
  }, [userRole]);

  const toggle = key => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    await supabase.from('companies').update({ notification_prefs: prefs }).eq('id', userRole.company_id);
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({ k }) => (
    <div onClick={() => toggle(k)} style={{ width: 42, height: 24, borderRadius: 12, cursor: 'pointer', background: prefs[k] ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: prefs[k] ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  );

  const groups = [
    { title: 'Work Orders', rows: [
      { k: 'work_order_created',  title: 'Work Order Created',  desc: 'When a new work order is raised' },
      { k: 'work_order_critical', title: 'Critical Work Order', desc: 'When a work order is marked Critical priority' },
    ]},
    { title: 'Maintenance', rows: [
      { k: 'maintenance_due',     title: 'Service Due',     desc: 'When a scheduled service is coming up' },
      { k: 'maintenance_overdue', title: 'Service Overdue', desc: 'When a service is past its due date or hours' },
    ]},
    { title: 'Oil Sampling', rows: [
      { k: 'oil_critical', title: 'Critical Oil Result', desc: 'When an oil sample result comes back Critical' },
      { k: 'oil_monitor',  title: 'Monitor Oil Result',  desc: 'When an oil sample result comes back Monitor' },
    ]},
    { title: 'Asset Alerts', rows: [
      { k: 'rego_expiry',     title: 'Registration Expiry', desc: '30 days before registration expires' },
      { k: 'warranty_expiry', title: 'Warranty Expiry',     desc: '30 days before warranty expires' },
      { k: 'prestart_defect', title: 'Pre-start Defect',    desc: 'When an operator flags a defect on pre-start' },
    ]},
    { title: 'Reports', rows: [
      { k: 'daily_summary', title: 'Daily Summary Email', desc: 'Morning summary of open items and active alerts' },
    ]},
  ];

  return (
    <div>
      {groups.map(g => (
        <div key={g.title} style={card}>
          <SectionHeader title={g.title} />
          {g.rows.map(r => (
            <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
              </div>
              <Toggle k={r.k} />
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} style={saveBtn()}>Save Preferences</button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ Saved</span>}
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
  const [msg, setMsg] = useState('');

  useEffect(() => { if (userRole?.company_id) fetchUsers(); }, [userRole]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_roles').select('*').eq('company_id', userRole.company_id).order('role');
    setUsers(data || []); setLoading(false);
  };

  const handleInvite = async () => {
    if (!invite.email || !invite.name) { setMsg('Email and name are required'); return; }
    setInviting(true);
    const { error } = await supabase.from('user_roles').insert({ ...invite, company_id: userRole.company_id });
    if (error) setMsg(error.message);
    else { setMsg('✓ User added'); setInvite({ email: '', name: '', role: 'technician' }); fetchUsers(); }
    setInviting(false); setTimeout(() => setMsg(''), 4000);
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    await supabase.from('user_roles').delete().eq('id', id);
    fetchUsers();
  };

  const handleRoleChange = async (id, role) => {
    await supabase.from('user_roles').update({ role }).eq('id', id);
    fetchUsers();
  };

  const RC = { master: 'var(--purple)', admin: 'var(--accent)', supervisor: 'var(--amber)', technician: 'var(--green)', operator: 'var(--text-muted)' };

  return (
    <div>
      <div style={card}>
        <SectionHeader title="Add Team Member" desc="Add a new user to your company" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px auto', gap: 12, alignItems: 'flex-end' }}>
          <div><Field label="Full Name"><input style={inp} value={invite.name} placeholder="John Smith" onChange={e => setInvite(p => ({ ...p, name: e.target.value }))} /></Field></div>
          <div><Field label="Email"><input style={inp} value={invite.email} placeholder="john@company.com" onChange={e => setInvite(p => ({ ...p, email: e.target.value }))} /></Field></div>
          <div>
            <Field label="Role">
              <select style={inp} value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="technician">Technician</option>
                <option value="operator">Operator</option>
              </select>
            </Field>
          </div>
          <button onClick={handleInvite} disabled={inviting} style={{ ...saveBtn(), height: 38, whiteSpace: 'nowrap' }}>
            {inviting ? 'Adding…' : '+ Add User'}
          </button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{msg}</div>}
      </div>

      <div style={card}>
        <SectionHeader title="Role Permissions" desc="What each role can do" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { role: 'admin',      perms: ['Full access', 'Manage users', 'Company settings', 'Delete records'] },
            { role: 'supervisor', perms: ['View all data', 'Raise work orders', 'Approve pre-starts', 'View reports'] },
            { role: 'technician', perms: ['Close work orders', 'Log maintenance', 'View assigned assets'] },
            { role: 'operator',   perms: ['Submit pre-starts', 'View own assets', 'Log downtime'] },
          ].map(({ role, perms }) => (
            <div key={role} style={{ border: `1px solid ${RC[role]}30`, borderRadius: 8, padding: 14, borderTop: `3px solid ${RC[role]}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: RC[role], marginBottom: 10, textTransform: 'capitalize' }}>{role}</div>
              {perms.map(p => <div key={p} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>✓ {p}</div>)}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <SectionHeader title="Team Members" desc={`${users.length} user${users.length !== 1 ? 's' : ''} in your company`} />
        {loading ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                  <td style={{ padding: '12px', fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    {u.role === 'master' ? (
                      <span style={{ padding: '3px 10px', borderRadius: 20, background: RC.master + '20', color: RC.master, fontSize: 11, fontWeight: 700 }}>master</span>
                    ) : (
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                        style={{ ...inp, width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="technician">Technician</option>
                        <option value="operator">Operator</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {u.role !== 'master' && u.email !== userRole?.email && (
                      <button onClick={() => handleRemove(u.id, u.name)}
                        style={{ padding: '5px 12px', background: 'var(--surface)', color: 'var(--red)', border: '1px solid var(--red-border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
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

  useEffect(() => {
    if (!userRole?.company_id) return;
    supabase.from('companies').select('plan, status, asset_limit, features').eq('id', userRole.company_id).single()
      .then(({ data }) => setCompany(data));
  }, [userRole]);

  const plans = [
    { id: 'trial',      label: 'Free Trial',   price: 'Free',       assets: 10,  features: ['Assets', 'Maintenance', 'Pre-starts', 'Work Orders'] },
    { id: 'starter',    label: 'Starter',      price: 'A$49/mo',    assets: 25,  features: ['Everything in Trial', 'Reports', 'Downtime Tracking', 'Email Support'] },
    { id: 'pro',        label: 'Professional', price: 'A$149/mo',   assets: 100, features: ['Everything in Starter', 'Oil Sampling AI', 'API Access', 'Priority Support'] },
    { id: 'enterprise', label: 'Enterprise',   price: 'Contact us', assets: 999, features: ['Everything in Pro', 'Unlimited Assets', 'Custom Integrations', 'Dedicated Support'] },
  ];

  const current = company?.plan || 'trial';

  return (
    <div>
      <div style={card}>
        <SectionHeader title="Current Plan" desc="Your active subscription and limits" />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Plan',        value: (company?.plan || 'Trial').toUpperCase() },
            { label: 'Status',      value: (company?.status || 'Active').toUpperCase() },
            { label: 'Asset Limit', value: company?.asset_limit ?? 10 },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--accent-light)', borderRadius: 10, padding: '16px 28px', textAlign: 'center', minWidth: 110 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.8px', marginTop: 4, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <SectionHeader title="Available Plans" desc="Upgrade to unlock more features and assets" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {plans.map(p => (
            <div key={p.id} style={{ border: current === p.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 10, padding: 18, background: current === p.id ? 'var(--accent-light)' : 'var(--surface-2)', position: 'relative' }}>
              {current === p.id && (
                <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                  CURRENT PLAN
                </div>
              )}
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)', marginBottom: 2 }}>{p.price}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Up to {p.assets === 999 ? 'unlimited' : p.assets} assets</div>
              {p.features.map(f => <div key={f} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>✓ {f}</div>)}
              {current !== p.id && (
                <button onClick={() => window.location.href = `mailto:info@mechiq.com.au?subject=Upgrade to ${p.label}`}
                  style={{ ...saveBtn(), marginTop: 14, width: '100%', fontSize: 12, padding: '8px' }}>
                  {p.id === 'enterprise' ? 'Contact Us' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          To upgrade contact <a href="mailto:info@mechiq.com.au" style={{ color: 'var(--accent)' }}>info@mechiq.com.au</a>
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
      if (type === 'assets')      { const { data: d } = await supabase.from('assets').select('*').eq('company_id', cid); data = d; filename = 'MechIQ_Assets'; }
      else if (type === 'maintenance') { const { data: d } = await supabase.from('maintenance').select('*').eq('company_id', cid); data = d; filename = 'MechIQ_Maintenance'; }
      else if (type === 'work_orders') { const { data: d } = await supabase.from('work_orders').select('*').eq('company_id', cid); data = d; filename = 'MechIQ_WorkOrders'; }
      else if (type === 'oil_samples') { const { data: d } = await supabase.from('oil_samples').select('*').eq('company_id', cid); data = d; filename = 'MechIQ_OilSamples'; }
      else if (type === 'full') {
        const [a, m, w, dw, o] = await Promise.all([
          supabase.from('assets').select('*').eq('company_id', cid),
          supabase.from('maintenance').select('*').eq('company_id', cid),
          supabase.from('work_orders').select('*').eq('company_id', cid),
          supabase.from('downtime').select('*').eq('company_id', cid),
          supabase.from('oil_samples').select('*').eq('company_id', cid),
        ]);
        data = { assets: a.data, maintenance: m.data, work_orders: w.data, downtime: dw.data, oil_samples: o.data };
        filename = 'MechIQ_Full_Export';
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      anchor.click();
    } catch (err) { console.error(err); }
    setExporting('');
  };

  const exports = [
    { id: 'assets',      icon: '⚙️', label: 'Assets',      desc: 'All asset records and specs' },
    { id: 'maintenance', icon: '🔧', label: 'Maintenance',  desc: 'Maintenance history and schedules' },
    { id: 'work_orders', icon: '📋', label: 'Work Orders',  desc: 'All work orders — open and closed' },
    { id: 'oil_samples', icon: '🔬', label: 'Oil Samples',  desc: 'Oil analysis results and AI assessments' },
    { id: 'full',        icon: '📦', label: 'Full Backup',  desc: 'Complete company data export as JSON' },
  ];

  return (
    <div>
      <div style={card}>
        <SectionHeader title="Export Data" desc="Download your MechIQ data at any time" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {exports.map(e => (
            <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 22 }}>{e.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{e.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{e.desc}</div>
                </div>
              </div>
              <button onClick={() => exportData(e.id)} disabled={!!exporting}
                style={{ ...saveBtn(e.id === 'full' ? 'var(--text-secondary)' : 'var(--accent)'), whiteSpace: 'nowrap', fontSize: 12, padding: '8px 14px', flexShrink: 0 }}>
                {exporting === e.id ? 'Exporting…' : 'Export'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <SectionHeader title="Danger Zone" desc="Irreversible — proceed with caution" />
        <div style={{ border: '1px solid var(--red-border)', borderRadius: 8, padding: 18, background: 'var(--red-bg)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>Delete All Company Data</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Permanently removes all assets, maintenance records, work orders and oil samples. This cannot be undone — export your data first.</div>
          <button
            onClick={() => { if (window.confirm('Are you sure? This cannot be undone.')) { window.location.href = 'mailto:info@mechiq.com.au?subject=Account Deletion Request'; } }}
            style={{ padding: '9px 20px', background: 'var(--surface)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Request Account Deletion
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Format & Theme ─────────────────────────────────────────────
function FormatTheme({ userRole }) {
  const themes = [
    { id: 'light',    label: 'Light',    preview: '#f8fafc' },
    { id: 'dark',     label: 'Dark',     preview: '#0f172a' },
    { id: 'navy',     label: 'Navy',     preview: '#1e293b' },
    { id: 'contrast', label: 'Contrast', preview: '#000000' },
  ];
  const [current, setCurrent] = React.useState(() => localStorage.getItem('mechiq_theme') || 'light');

  const applyTheme = (id) => {
    setCurrent(id);
    localStorage.setItem('mechiq_theme', id);
    document.body.className = document.body.className
      .split(' ').filter(c => !c.startsWith('theme-')).concat('theme-' + id).join(' ');
  };

  return (
    <div>
      <SectionHeader title="Theme" desc="Choose your preferred colour scheme." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
        {themes.map(t => (
          <button key={t.id} onClick={() => applyTheme(t.id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 24px',
              background: current === t.id ? 'var(--accent-light)' : 'var(--surface-2)',
              border: current === t.id ? '2px solid var(--accent)' : '2px solid var(--border)',
              borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: t.preview, border: '1px solid var(--border)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: current === t.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Password Reset ───────────────────────────────────────────
function PasswordReset({ userRole }) {
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleReset = async () => {
    setLoading(true);
    const { supabase } = await import('./supabase');
    const { error } = await supabase.auth.resetPasswordForEmail(userRole?.email || '', {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (!error) setSent(true);
  };

  return (
    <div>
      <SectionHeader title="Password Reset" desc="Send a password reset link to your email address." />
      <div style={{ marginTop: 16, padding: 24, background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)', maxWidth: 480 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          A reset link will be sent to: <strong style={{ color: 'var(--text-primary)' }}>{userRole?.email}</strong>
        </div>
        {sent ? (
          <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>✓ Reset email sent — check your inbox.</div>
        ) : (
          <button onClick={handleReset} disabled={loading}
            style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings ──────────────────────────────────────────────────────────────────
const ADMIN_TABS = [
  { id: 'company', label: 'Company Details', icon: '🏢' },
  { id: 'users',   label: 'Users & Roles',   icon: '👥' },
  { id: 'notifs',  label: 'Notifications',   icon: '🔔' },
  { id: 'billing', label: 'Billing & Plan',  icon: '💳' },
  { id: 'data',    label: 'Data & Export',   icon: '📤' },
];

const PERSONAL_TABS = [
  { id: 'format',   label: 'Format & Theme', icon: '🎨' },
  { id: 'password', label: 'Password Reset', icon: '🔑' },
];

function Settings({ userRole, initialTab, adminMode, personalMode }) {
  const TABS = adminMode ? ADMIN_TABS : PERSONAL_TABS;
  const defaultTab = adminMode ? 'company' : 'format';
  const [activeTab, setActiveTab] = useState(initialTab || defaultTab);
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);

  const content = {
    company:  <CompanyDetails userRole={userRole} />,
    notifs:   <Notifications userRole={userRole} />,
    users:    <UsersRoles userRole={userRole} />,
    billing:  <Billing userRole={userRole} />,
    data:     <DataExport userRole={userRole} />,
    format:   <FormatTheme userRole={userRole} />,
    password: <PasswordReset userRole={userRole} />,
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          {TABS.find(t => t.id === activeTab)?.label || TABS[0].label}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          {adminMode ? 'Manage your company profile, team and account preferences.' : 'Personalise your MechIQ experience.'}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border)', marginBottom: 28 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {content[activeTab]}
    </div>
  );
}

export default Settings;