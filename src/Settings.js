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
  return (
    <div>
      <div style={card}>
        <SectionHeader title="Plans & Pricing" desc="Contact us to discuss the right plan for your fleet" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 20px', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-light)', border: '1px solid rgba(14,165,233,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚙️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>MechIQ Fleet Management</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.6 }}>
              For pricing, plan information or to discuss your fleet's requirements, get in touch with our team.
            </div>
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 280 }}>
            <a href="mailto:info@mechiq.com.au" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', padding: '12px 16px', background: 'var(--accent)', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              info@mechiq.com.au
            </a>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>We'll get back to you within 1 business day</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Data & Export ───────────────────────────────────────────────────────
function DataExport({ userRole }) {
  const [exporting, setExporting] = useState('');
  const [progress, setProgress] = useState('');

  const loadScript = (src) => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-AU') : '—';
  const fmtVal  = (v) => v == null || v === '' ? '—' : String(v);

  const buildWorkOrderPDF = (jsPDF, wo, company) => {
    const doc = new jsPDF({ format: 'a4' });
    const pc = { Critical:'#dc2626', High:'#ea580c', Medium:'#d97706', Low:'#16a34a' }[wo.priority] || '#333';
    doc.setFillColor(26, 43, 60); doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('MECHIQ — WORK ORDER', 15, 18);
    doc.setFontSize(10); doc.text(`ID: ${wo.id?.slice(0,8).toUpperCase()}`, 150, 18);
    doc.setTextColor(33,33,33); doc.setFontSize(11); doc.setFont('helvetica','normal');
    const rows = [
      ['Asset', wo.asset||'—'], ['Priority', wo.priority||'—'],
      ['Status', wo.status||'—'], ['Assigned To', wo.assigned_to||'—'],
      ['Due Date', fmtDate(wo.due_date)], ['Est. Hours', wo.estimated_hours ? wo.estimated_hours+'h' : '—'],
      ['Source', wo.source||'manual'], ['Created', fmtDate(wo.created_at)],
    ];
    let y = 40;
    rows.forEach(([k, v]) => {
      doc.setFont('helvetica','bold'); doc.text(k + ':', 15, y);
      doc.setFont('helvetica','normal'); doc.text(fmtVal(v), 70, y);
      y += 8;
    });
    y += 4;
    doc.setFont('helvetica','bold'); doc.text('Defect Description:', 15, y); y += 7;
    doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(wo.defect_description||'—', 180);
    doc.text(lines, 15, y); y += lines.length * 6 + 8;
    if (wo.comments) {
      doc.setFont('helvetica','bold'); doc.text('Comments:', 15, y); y += 7;
      doc.setFont('helvetica','normal');
      const clines = doc.splitTextToSize(wo.comments, 180);
      doc.text(clines, 15, y);
    }
    return doc;
  };

  const buildPrestartPDF = (jsPDF, p, company) => {
    const doc = new jsPDF({ format: 'a4' });
    doc.setFillColor(26, 43, 60); doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('MECHIQ — PRESTART CHECKLIST', 15, 18);
    doc.setTextColor(33,33,33); doc.setFontSize(11); doc.setFont('helvetica','normal');
    const rows = [
      ['Asset', p.asset||'—'], ['Operator', p.operator_name||'—'],
      ['Date', fmtDate(p.date)], ['Defects Found', p.defects_found ? 'YES' : 'No'],
    ];
    let y = 40;
    rows.forEach(([k, v]) => {
      doc.setFont('helvetica','bold'); doc.text(k + ':', 15, y);
      doc.setFont('helvetica','normal'); doc.text(fmtVal(v), 70, y);
      y += 8;
    });
    if (p.sections && Array.isArray(p.sections)) {
      y += 4;
      p.sections.forEach(section => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(section.name || 'Section', 15, y); y += 8;
        doc.setFontSize(10);
        (section.items || []).forEach(item => {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.setFont('helvetica','normal');
          const status = item.status || item.value || '—';
          const statusColor = status === 'OK' ? [22,163,74] : status === 'Defect' ? [220,38,38] : [100,100,100];
          doc.text(`• ${item.label||''}`, 20, y);
          doc.setTextColor(...statusColor); doc.text(status, 140, y);
          doc.setTextColor(33,33,33); y += 6;
        });
        y += 4;
      });
    }
    return doc;
  };

  const buildExcelWorkbook = (XLSX, data) => {
    const wb = XLSX.utils.book_new();
    const addSheet = (name, rows) => {
      if (!rows?.length) return;
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    addSheet('Assets', (data.assets||[]).map(a => ({
      'Asset Number': a.asset_number, 'Name': a.name, 'Type': a.type,
      'Make': a.make, 'Model': a.model, 'Year': a.year, 'Status': a.status,
      'Location': a.location, 'Hours': a.hours, 'Purchase Price': a.purchase_price,
      'Purchase Date': a.purchase_date, 'Serial Number': a.serial_number,
    })));
    addSheet('Work Orders', (data.work_orders||[]).map(w => ({
      'Asset': w.asset, 'Description': w.defect_description, 'Priority': w.priority,
      'Status': w.status, 'Assigned To': w.assigned_to, 'Due Date': w.due_date,
      'Est Hours': w.estimated_hours, 'Comments': w.comments, 'Source': w.source,
      'Created': fmtDate(w.created_at),
    })));
    addSheet('Maintenance', (data.maintenance||[]).map(m => ({
      'Asset': m.asset, 'Task': m.task, 'Frequency': m.frequency,
      'Next Due': m.next_due, 'Status': m.status, 'Assigned To': m.assigned_to,
    })));
    addSheet('Service Schedules', (data.service_schedules||[]).map(s => ({
      'Asset': s.asset_name, 'Service': s.service_name, 'Interval Type': s.interval_type,
      'Interval Value': s.interval_value, 'Last Service': s.last_service_date,
      'Next Due Value': s.next_due_value, 'Next Due Date': s.next_due_date,
    })));
    addSheet('Downtime', (data.downtime||[]).map(d => ({
      'Asset': d.asset, 'Date': d.date, 'Start': d.start_time, 'End': d.end_time,
      'Hours': d.hours, 'Category': d.category, 'Description': d.description,
      'Reported By': d.reported_by, 'Source': d.source,
    })));
    addSheet('Oil Samples', (data.oil_samples||[]).map(o => ({
      'Asset': o.asset_name, 'Component': o.component, 'Date': o.sample_date,
      'Oil Hours': o.oil_hours, 'Unit Hours': o.unit_hours,
      'Condition': o.ai_condition, 'Analysis': o.ai_analysis,
      'Recommendations': o.ai_recommendations,
    })));
    addSheet('Prestarts', (data.prestarts||[]).map(p => ({
      'Asset': p.asset, 'Date': p.date, 'Operator': p.operator_name,
      'Defects Found': p.defects_found ? 'Yes' : 'No', 'Form': p.form_name,
    })));
    addSheet('Parts', (data.parts||[]).map(p => ({
      'Name': p.name, 'Part Number': p.part_number, 'Category': p.category,
      'Supplier': p.supplier, 'Quantity': p.quantity, 'Min Stock': p.min_quantity,
      'Unit Cost': p.unit_cost, 'Location': p.location,
    })));
    return wb;
  };

  const exportZip = async () => {
    setExporting('zip');
    setProgress('Loading libraries…');
    try {
      await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'),
      ]);
      const JSZip   = window.JSZip;
      const jsPDF   = window.jspdf?.jsPDF;
      const XLSX    = window.XLSX;
      const zip     = new JSZip();
      const cid     = userRole.company_id;
      const date    = new Date().toISOString().split('T')[0];

      setProgress('Fetching all data…');
      const [assets, maintenance, work_orders, downtime, oil_samples, prestarts, service_schedules, parts] = await Promise.all([
        supabase.from('assets').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('maintenance').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('work_orders').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('downtime').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('oil_samples').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('form_submissions').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('service_schedules').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('parts').select('*').eq('company_id', cid).then(r => r.data||[]),
      ]);

      const data = { assets, maintenance, work_orders, downtime, oil_samples, prestarts, service_schedules, parts };

      // ── Excel workbook ──
      setProgress('Building Excel spreadsheet…');
      const wb = buildExcelWorkbook(XLSX, data);
      const xlsxBuf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
      zip.file(`MechIQ_${date}.xlsx`, xlsxBuf);

      // ── Work Order PDFs ──
      if (jsPDF && work_orders.length > 0) {
        setProgress(`Generating ${work_orders.length} work order PDFs…`);
        const woFolder = zip.folder('Work_Orders');
        for (const wo of work_orders) {
          const doc = buildWorkOrderPDF(jsPDF, wo);
          const pdfBuf = doc.output('arraybuffer');
          const fname = `WO_${(wo.asset||'unknown').replace(/[^a-zA-Z0-9]/g,'_')}_${wo.id?.slice(0,8)}.pdf`;
          woFolder.file(fname, pdfBuf);
        }
      }

      // ── Prestart PDFs ──
      if (jsPDF && prestarts.length > 0) {
        setProgress(`Generating ${prestarts.length} prestart PDFs…`);
        const psFolder = zip.folder('Prestarts');
        for (const p of prestarts) {
          const doc = buildPrestartPDF(jsPDF, p);
          const pdfBuf = doc.output('arraybuffer');
          const fname = `Prestart_${(p.asset||'unknown').replace(/[^a-zA-Z0-9]/g,'_')}_${p.date||'nodate'}.pdf`;
          psFolder.file(fname, pdfBuf);
        }
      }

      // ── README ──
      const readme = `MechIQ Data Export
Generated: ${new Date().toLocaleString('en-AU')}
Company ID: ${cid}

Contents:
- MechIQ_${date}.xlsx  — Full data spreadsheet (8 tabs)
- Work_Orders/         — PDF for each work order
- Prestarts/           — PDF for each prestart submission

Records exported:
  Assets:            ${assets.length}
  Work Orders:       ${work_orders.length}
  Maintenance:       ${maintenance.length}
  Service Schedules: ${service_schedules.length}
  Downtime:          ${downtime.length}
  Oil Samples:       ${oil_samples.length}
  Prestarts:         ${prestarts.length}
  Parts:             ${parts.length}
`;
      zip.file('README.txt', readme);

      setProgress('Compressing zip file…');
      const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `MechIQ_Export_${date}.zip`; a.click();
      URL.revokeObjectURL(url);
      setProgress('');
    } catch (err) {
      console.error(err);
      alert('Export failed: ' + err.message);
      setProgress('');
    }
    setExporting('');
  };

  return (
    <div>
      <div style={card}>
        <SectionHeader title="Export Data" desc="Download all your MechIQ data as a ZIP file" />

        {/* Main ZIP export */}
        <div style={{ border: '2px solid var(--accent)', borderRadius: 12, padding: 22, marginBottom: 16, background: 'var(--accent-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>📦 Full Export Package</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 400 }}>
                Downloads a ZIP containing:
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.8 }}>
                📊 Excel spreadsheet with 8 tabs (Assets, Work Orders, Maintenance, Service Schedules, Downtime, Oil Samples, Prestarts, Parts)<br />
                📄 PDF for every Work Order<br />
                📋 PDF for every Prestart submission
              </div>
            </div>
            <button onClick={exportZip} disabled={!!exporting}
              style={{ padding: '12px 28px', background: exporting ? 'var(--surface-2)' : 'var(--accent)', color: exporting ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
              {exporting === 'zip' ? '⟳ Exporting…' : '⬇ Download ZIP'}
            </button>
          </div>
          {progress && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 16 }}>⟳</span>
              {progress}
            </div>
          )}
        </div>

        {/* Individual exports */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Individual Exports</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { id: 'assets',      icon: '⚙️', label: 'Assets',           table: 'assets' },
            { id: 'work_orders', icon: '📋', label: 'Work Orders',       table: 'work_orders' },
            { id: 'maintenance', icon: '🔧', label: 'Maintenance',       table: 'maintenance' },
            { id: 'downtime',    icon: '⏱', label: 'Downtime Log',      table: 'downtime' },
            { id: 'oil_samples', icon: '🔬', label: 'Oil Samples',       table: 'oil_samples' },
            { id: 'parts',       icon: '🔩', label: 'Parts Inventory',   table: 'parts' },
          ].map(e => (
            <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>{e.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{e.label}</span>
              </div>
              <button onClick={async () => {
                setExporting(e.id);
                try {
                  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
                  const { data: d } = await supabase.from(e.table).select('*').eq('company_id', userRole.company_id);
                  const ws = window.XLSX.utils.json_to_sheet(d||[]);
                  const wb = window.XLSX.utils.book_new();
                  window.XLSX.utils.book_append_sheet(wb, ws, e.label);
                  window.XLSX.writeFile(wb, `MechIQ_${e.label.replace(/ /g,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
                } catch(err) { alert('Export failed: ' + err.message); }
                setExporting('');
              }} disabled={!!exporting}
                style={{ padding: '6px 14px', background: 'var(--surface-2)', color: 'var(--accent)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {exporting === e.id ? '…' : 'Excel'}
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
  { id: 'billing', label: 'Contact & Plan',  icon: '💳' },
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


      {content[activeTab]}
    </div>
  );
}

export default Settings;