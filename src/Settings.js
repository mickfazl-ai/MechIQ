import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import LabelDesigner from './LabelDesigner';

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
  const [features, setFeatures] = useState({ cost_analysis: false });
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
      if (data.features) setFeatures(data.features);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let logo_url = logoUrl;

    if (logo) {
      try {
        const ext = logo.name.split('.').pop().toLowerCase();
        const path = `logos/${userRole.company_id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('company-assets')
          .upload(path, logo, { upsert: true, contentType: logo.type });

        if (upErr) {
          // Bucket may not exist — try creating it then retry
          await supabase.storage.createBucket('company-assets', { public: true });
          await supabase.storage.from('company-assets').upload(path, logo, { upsert: true, contentType: logo.type });
        }

        const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
        if (urlData?.publicUrl) logo_url = urlData.publicUrl;
      } catch(e) {
        console.error('Logo upload failed:', e);
        alert('Logo upload failed: ' + e.message + '\n\nPlease create a public storage bucket called "company-assets" in Supabase Storage.');
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('companies')
      .update({ ...form, logo_url, features })
      .eq('id', userRole.company_id);

    if (error) {
      alert('Save failed: ' + error.message);
      setSaving(false);
      return;
    }

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

      {/* ── Feature Toggles ── */}
      <div style={card}>
        <SectionHeader title="Feature Settings" desc="Enable or disable features for your company" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'cost_analysis', label: 'Cost Analysis', desc: 'Show hourly rates, downtime costs and cost columns throughout the app. Disable to keep cost data private from technicians.' },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
              <div onClick={() => setFeatures(p => ({ ...p, [f.key]: !p[f.key] }))}
                style={{ width: 46, height: 26, borderRadius: 13, cursor: 'pointer', background: features[f.key] ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: features[f.key] ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          ))}
        </div>
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
    addSheet('Hours Log', (data.hours_log||[]).map(h => ({
      'Asset': h.asset_name, 'Hours': h.hours, 'Source': h.source,
      'Recorded By': h.recorded_by, 'Notes': h.notes,
      'Date': new Date(h.created_at).toLocaleDateString('en-AU'),
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
      const [assets, maintenance, work_orders, downtime, oil_samples, prestarts, service_schedules, parts, hours_log] = await Promise.all([
        supabase.from('assets').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('maintenance').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('work_orders').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('downtime').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('oil_samples').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('form_submissions').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('service_schedules').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('parts').select('*').eq('company_id', cid).then(r => r.data||[]),
        supabase.from('asset_hours_log').select('*').eq('company_id', cid).order('created_at',{ascending:false}).then(r => r.data||[]),
      ]);

      const data = { assets, maintenance, work_orders, downtime, oil_samples, prestarts, service_schedules, parts, hours_log };

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

// ─── Date & Time Settings ──────────────────────────────────────
function DateTimeSettings({ userRole }) {
  const [now, setNow] = React.useState(new Date());
  const [detectedTz, setDetectedTz] = React.useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedTz, setSelectedTz] = React.useState(() => localStorage.getItem('mechiq_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [detecting, setDetecting] = React.useState(false);
  const [dateFormat, setDateFormat] = React.useState(() => localStorage.getItem('mechiq_date_format') || 'DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = React.useState(() => localStorage.getItem('mechiq_time_format') || '12h');
  const [locationName, setLocationName] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  // Live clock
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Common Australian + global timezones
  const TIMEZONES = [
    { group: '🇦🇺 Australia', zones: [
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
      'Australia/Adelaide', 'Australia/Perth', 'Australia/Darwin', 'Australia/Hobart',
    ]},
    { group: '🌏 Asia Pacific', zones: [
      'Pacific/Auckland', 'Pacific/Auckland', 'Asia/Singapore',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai',
    ]},
    { group: '🌍 Europe', zones: [
      'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    ]},
    { group: '🌎 Americas', zones: [
      'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'America/Vancouver',
    ]},
    { group: '🌐 UTC', zones: ['UTC'] },
  ];

  const formatTime = (date, tz) => {
    try {
      return date.toLocaleTimeString('en-AU', {
        timeZone: tz,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: timeFormat === '12h',
      });
    } catch(e) { return '--:--:--'; }
  };

  const formatDate = (date, tz) => {
    try {
      const d = new Date(date.toLocaleString('en-AU', { timeZone: tz }));
      const day   = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year  = d.getFullYear();
      if (dateFormat === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
      if (dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
      if (dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      return `${day}/${month}/${year}`;
    } catch(e) { return '—'; }
  };

  const detectLocation = () => {
    setDetecting(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Use the browser's detected timezone (most accurate for current location)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDetectedTz(tz);
        setSelectedTz(tz);
        // Try to get a human-readable city name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.suburb || '';
          const country = data.address?.country || '';
          setLocationName([city, country].filter(Boolean).join(', '));
        } catch(e) {}
        setDetecting(false);
      },
      (err) => {
        setDetectedTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setDetecting(false);
        alert('Could not detect location. Please select your timezone manually.');
      },
      { timeout: 8000 }
    );
  };

  const save = () => {
    localStorage.setItem('mechiq_timezone', selectedTz);
    localStorage.setItem('mechiq_date_format', dateFormat);
    localStorage.setItem('mechiq_time_format', timeFormat);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const iStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit' };

  return (
    <div>
      <SectionHeader title="Date & Time" desc="Set your timezone, date format and clock display." />

      {/* Live clock display */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'24px', marginTop:16, marginBottom:20, textAlign:'center' }}>
        <div style={{ fontSize:48, fontWeight:900, fontFamily:'var(--font-display)', color:'var(--accent)', letterSpacing:2, marginBottom:6 }}>
          {formatTime(now, selectedTz)}
        </div>
        <div style={{ fontSize:16, fontWeight:600, color:'var(--text-secondary)', marginBottom:4 }}>
          {formatDate(now, selectedTz)}
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <span>🌏</span>
          <span>{selectedTz}</span>
          {locationName && <span>— {locationName}</span>}
        </div>
      </div>

      {/* Detect location button */}
      <div style={{ marginBottom:20, display:'flex', gap:10, alignItems:'center' }}>
        <button onClick={detectLocation} disabled={detecting} style={{ padding:'9px 18px', background:detecting?'var(--surface-2)':'var(--accent)', color:detecting?'var(--text-muted)':'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:detecting?'wait':'pointer', display:'flex', alignItems:'center', gap:8 }}>
          {detecting ? '⏳ Detecting…' : '📍 Auto-detect My Location'}
        </button>
        {detectedTz && detectedTz !== selectedTz && (
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Detected: <strong>{detectedTz}</strong></span>
        )}
      </div>

      {/* Timezone selector */}
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Timezone</label>
        <select value={selectedTz} onChange={e => setSelectedTz(e.target.value)} style={iStyle}>
          {TIMEZONES.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.zones.map(z => (
                <option key={z} value={z}>
                  {z.replace(/_/g,' ')} — {formatTime(now, z)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Date format */}
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Date Format</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'].map(fmt => (
            <button key={fmt} onClick={() => setDateFormat(fmt)} style={{ padding:'8px 16px', borderRadius:9, border:`2px solid ${dateFormat===fmt?'var(--accent)':'var(--border)'}`, background:dateFormat===fmt?'var(--accent-light)':'var(--surface)', color:dateFormat===fmt?'var(--accent)':'var(--text-secondary)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-mono)' }}>
              {fmt}
            </button>
          ))}
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:8 }}>Preview: {formatDate(now, selectedTz)}</div>
      </div>

      {/* Time format */}
      <div style={{ marginBottom:24 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Time Format</label>
        <div style={{ display:'flex', gap:8 }}>
          {[['12h','12-hour (AM/PM)'],['24h','24-hour']].map(([id, label]) => (
            <button key={id} onClick={() => setTimeFormat(id)} style={{ padding:'8px 18px', borderRadius:9, border:`2px solid ${timeFormat===id?'var(--accent)':'var(--border)'}`, background:timeFormat===id?'var(--accent-light)':'var(--surface)', color:timeFormat===id?'var(--accent)':'var(--text-secondary)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} style={{ padding:'10px 28px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}

// ─── OneDrive Sync ────────────────────────────────────────────
const ONEDRIVE_CLIENT_ID = 'c02fd590-3d2b-4834-857a-22cd45adab00';
const REDIRECT_URI = window.location.origin;

function OneDriveSync({ userRole }) {
  const [connected, setConnected]     = React.useState(false);
  const [account, setAccount]         = React.useState(null);
  const [folderPath, setFolderPath]   = React.useState(() => localStorage.getItem('mechiq_onedrive_folder') || 'MechIQ');
  const [saved, setSaved]             = React.useState(false);
  const [syncing, setSyncing]         = React.useState(false);
  const [syncLog, setSyncLog]         = React.useState([]);
  const [token, setToken]             = React.useState(() => localStorage.getItem('mechiq_onedrive_token') || null);
  const [tokenExpiry, setTokenExpiry] = React.useState(() => localStorage.getItem('mechiq_onedrive_expiry') || null);

  React.useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      const params = new URLSearchParams(window.location.hash.replace('#', '?'));
      const newToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      if (newToken) {
        const expiry = Date.now() + parseInt(expiresIn || 3600) * 1000;
        localStorage.setItem('mechiq_onedrive_token', newToken);
        localStorage.setItem('mechiq_onedrive_expiry', String(expiry));
        setToken(newToken); setTokenExpiry(String(expiry));
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    if (token && tokenExpiry && Date.now() < parseInt(tokenExpiry)) fetchAccount(token);
    else if (token) { localStorage.removeItem('mechiq_onedrive_token'); localStorage.removeItem('mechiq_onedrive_expiry'); setToken(null); }
  }, []);

  const fetchAccount = async (t) => {
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { const d = await res.json(); setAccount(d); setConnected(true); }
      else { setConnected(false); setToken(null); localStorage.removeItem('mechiq_onedrive_token'); }
    } catch(e) { setConnected(false); }
  };

  const connectOneDrive = () => {
    const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    url.searchParams.set('client_id', ONEDRIVE_CLIENT_ID);
    url.searchParams.set('response_type', 'token');
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('scope', 'Files.ReadWrite User.Read');
    url.searchParams.set('response_mode', 'fragment');
    window.location.href = url.toString();
  };

  const disconnect = () => { localStorage.removeItem('mechiq_onedrive_token'); localStorage.removeItem('mechiq_onedrive_expiry'); setToken(null); setConnected(false); setAccount(null); };
  const saveFolder = () => { localStorage.setItem('mechiq_onedrive_folder', folderPath); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const log = (msg) => setSyncLog(l => [...l, `${new Date().toLocaleTimeString()} — ${msg}`]);

  const ensureFolder = async (path) => {
    const parts = path.split('/').filter(Boolean);
    let parentId = 'root';
    for (const part of parts) {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/${parentId === 'root' ? 'root' : `items/${parentId}`}/children`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const existing = (data.value || []).find(i => i.name === part && i.folder);
      if (existing) { parentId = existing.id; }
      else {
        const cr = await fetch(`https://graph.microsoft.com/v1.0/me/drive/${parentId === 'root' ? 'root' : `items/${parentId}`}/children`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: part, folder: {}, '@microsoft.graph.conflictBehavior': 'rename' }) });
        const nf = await cr.json(); parentId = nf.id;
      }
    }
    return parentId;
  };

  const uploadFile = async (folderId, fileName, blob) => {
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${fileName}:/content`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob.type || 'text/csv' }, body: blob });
    return res.ok;
  };

  const toCSV = (rows) => {
    if (!rows?.length) return '';
    const headers = Object.keys(rows[0]);
    return [headers.join(','), ...rows.map(r => headers.map(h => { const v = r[h]; if (v == null) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s; }).join(','))].join('\n');
  };

  const syncNow = async () => {
    if (!connected || !token) { alert('Please connect to OneDrive first.'); return; }
    setSyncing(true); setSyncLog([]);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const fullPath = `${folderPath}/${dateStr}`;
      log(`Creating folder: ${fullPath}`);
      const folderId = await ensureFolder(fullPath);
      log('✓ Folder ready');
      const cid = userRole.company_id;
      const [
        { data: assets }, { data: maintenance }, { data: workOrders },
        { data: downtime }, { data: parts }, { data: prestarts },
        { data: serviceSheets }, { data: oilSamples }, { data: schedules },
      ] = await Promise.all([
        supabase.from('assets').select('*').eq('company_id', cid),
        supabase.from('maintenance').select('*').eq('company_id', cid),
        supabase.from('work_orders').select('*').eq('company_id', cid),
        supabase.from('downtime').select('*').eq('company_id', cid),
        supabase.from('parts').select('*').eq('company_id', cid),
        supabase.from('form_submissions').select('*').eq('company_id', cid),
        supabase.from('service_sheet_submissions').select('*').eq('company_id', cid),
        supabase.from('oil_samples').select('*').eq('company_id', cid),
        supabase.from('service_schedules').select('*').eq('company_id', cid),
      ]);
      const files = [
        ['Assets.csv', assets], ['Maintenance.csv', maintenance],
        ['WorkOrders.csv', workOrders], ['Downtime.csv', downtime],
        ['Parts.csv', parts], ['Prestarts.csv', prestarts],
        ['ServiceSheets.csv', serviceSheets], ['OilSamples.csv', oilSamples],
        ['ServiceSchedules.csv', schedules],
      ];
      for (const [name, data] of files) {
        if (!data?.length) { log(`⏭ ${name} — no data`); continue; }
        const ok = await uploadFile(folderId, name, new Blob([toCSV(data)], { type: 'text/csv' }));
        log(ok ? `✓ ${name} (${data.length} records)` : `✗ ${name} — failed`);
      }
      log('✅ Sync complete!');
    } catch(e) { log(`✗ Error: ${e.message}`); }
    setSyncing(false);
  };

  const iStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit' };

  return (
    <div>
      <SectionHeader title="OneDrive Sync" desc="Back up your MechIQ data automatically to Microsoft OneDrive." />
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginTop:16, marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:connected?'rgba(34,197,94,0.1)':'var(--surface-2)', border:`1px solid ${connected?'rgba(34,197,94,0.3)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>☁️</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{connected ? `Connected — ${account?.displayName || account?.userPrincipalName || 'Microsoft Account'}` : 'Not connected'}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{connected ? account?.userPrincipalName : 'Sign in with your Microsoft account'}</div>
            </div>
          </div>
          {connected ? <button onClick={disconnect} style={{ padding:'8px 16px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer' }}>Disconnect</button>
          : <button onClick={connectOneDrive} style={{ padding:'10px 20px', background:'#0078d4', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>🔗 Connect OneDrive</button>}
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>OneDrive Folder Path</label>
        <div style={{ display:'flex', gap:8 }}>
          <input value={folderPath} onChange={e => setFolderPath(e.target.value)} placeholder="e.g. MechIQ or Documents/MechIQ/Backups" style={{ ...iStyle, flex:1 }} />
          <button onClick={saveFolder} style={{ padding:'9px 18px', background:saved?'var(--green)':'var(--accent)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>{saved ? '✓ Saved' : 'Save'}</button>
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>Files sync to: <strong style={{ color:'var(--accent)' }}>OneDrive / {folderPath} / {new Date().toISOString().split('T')[0]}</strong></div>
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>What gets synced (9 CSV files)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:6 }}>
          {['Assets','Maintenance','Work Orders','Downtime','Parts','Prestarts','Service Sheets','Oil Samples','Service Schedules'].map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-secondary)' }}><span style={{ color:'var(--green)', fontWeight:700 }}>✓</span>{f}</div>
          ))}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>Each sync creates a dated subfolder so backups are preserved (e.g. <code>MechIQ/2026-03-21/</code>).</div>
      </div>
      <button onClick={syncNow} disabled={!connected||syncing} style={{ padding:'11px 28px', background:connected&&!syncing?'#0078d4':'var(--surface-2)', color:connected&&!syncing?'#fff':'var(--text-muted)', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:connected&&!syncing?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        {syncing ? '⏳ Syncing…' : '☁️ Sync to OneDrive Now'}
      </button>
      {syncLog.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Sync Log</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12, maxHeight:180, overflowY:'auto' }}>
            {syncLog.map((l, i) => <div key={i} style={{ color:l.includes('✅')||l.includes('✓')?'var(--green)':l.includes('✗')?'var(--red)':'var(--text-secondary)', marginBottom:3 }}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Modifier / Feature Requests ─────────────────────────
function AppModifier({ userRole }) {
  const [requests, setRequests]   = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [form, setForm]           = React.useState({ title:'', description:'', type:'feature', priority:'Medium' });
  const [showForm, setShowForm]   = React.useState(false);
  const [saving, setSaving]       = React.useState(false);
  const [aiDraft, setAiDraft]     = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [saved, setSaved]         = React.useState(false);

  React.useEffect(() => { loadRequests(); }, [userRole]);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_requests').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const submitRequest = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from('app_requests').insert({
      company_id: userRole.company_id,
      submitted_by: userRole.name || userRole.email,
      title: form.title,
      description: form.description,
      type: form.type,
      priority: form.priority,
      status: 'Pending',
      votes: 1,
      ai_draft: aiDraft || null,
    });
    setForm({ title:'', description:'', type:'feature', priority:'Medium' });
    setAiDraft(null);
    setShowForm(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadRequests();
  };

  const vote = async (id, currentVotes) => {
    await supabase.from('app_requests').update({ votes: (currentVotes || 0) + 1 }).eq('id', id);
    loadRequests();
  };

  const generateAIDraft = async () => {
    if (!form.title) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-insight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 600,
          messages: [{ role: 'user', content: `You are a React developer. A user wants to modify a fleet maintenance app called MechIQ. Based on this request, write a brief technical implementation note for the developer (2-3 sentences max, practical). Request: "${form.title}". Context: ${form.description || 'No additional context.'}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(c => c.type === 'text')?.text || '';
      setAiDraft(text);
    } catch(e) { setAiDraft('Could not generate AI draft.'); }
    setAiLoading(false);
  };

  const STATUS_COLOR = { Pending:'var(--amber)', Approved:'var(--accent)', 'In Progress':'var(--purple)', Complete:'var(--green)', Rejected:'var(--red)' };
  const iStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text-primary)', fontSize:13, boxSizing:'border-box', fontFamily:'inherit', marginBottom:10 };

  return (
    <div>
      <SectionHeader title="App Requests" desc="Submit feature requests or bug reports. These are reviewed by the MechIQ team." />
      {saved && <div style={{ background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:'12px 16px', marginTop:16, marginBottom:8, fontSize:13, fontWeight:700, color:'var(--green)' }}>✓ Request submitted! The MechIQ team will review it.</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16, marginBottom:16 }}>
        <div style={{ fontSize:13, color:'var(--text-muted)' }}>{requests.length} request{requests.length !== 1 ? 's' : ''} from your company</div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding:'9px 18px', background:showForm?'var(--surface-2)':'var(--accent)', color:showForm?'var(--text-secondary)':'#fff', border:`1px solid ${showForm?'var(--border)':'var(--accent)'}`, borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          {showForm ? '✕ Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)', marginBottom:16 }}>New Request</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:2 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))} style={iStyle}>
                <option value="feature">✨ Feature Request</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="improvement">⚡ Improvement</option>
                <option value="question">❓ Question</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority:e.target.value}))} style={iStyle}>
                {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="e.g. Add export to CSV on dashboard" style={iStyle} />
          <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:4 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Describe what you want in detail..." rows={4} style={{ ...iStyle, resize:'vertical' }} />
          {aiDraft && (
            <div style={{ background:'var(--accent-light)', border:'1px solid rgba(14,165,233,0.2)', borderRadius:10, padding:12, marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', marginBottom:6 }}>🤖 AI Implementation Note</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{aiDraft}</div>
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={generateAIDraft} disabled={!form.title||aiLoading} style={{ padding:'9px 16px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer', opacity:!form.title?0.5:1 }}>
              {aiLoading ? '⏳ Drafting…' : '🤖 AI Draft'}
            </button>
            <button onClick={submitRequest} disabled={!form.title||saving} style={{ flex:1, padding:'10px', background:form.title?'var(--accent)':'var(--surface-2)', color:form.title?'#fff':'var(--text-muted)', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:form.title?'pointer':'not-allowed' }}>
              {saving ? '⏳ Submitting…' : '📤 Submit Request'}
            </button>
          </div>
        </div>
      )}

      {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Loading…</div> : requests.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No requests yet. Submit your first one above!</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {requests.map(r => (
            <div key={r.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', borderLeft:`4px solid ${STATUS_COLOR[r.status]||'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#fff', background:STATUS_COLOR[r.status]||'var(--border)', padding:'2px 8px', borderRadius:20 }}>{r.status}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{r.type}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.priority} priority</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>· {r.submitted_by}</span>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{r.title}</div>
                  {r.description && <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5, marginBottom:6 }}>{r.description}</div>}
                  {r.ai_draft && (
                    <div style={{ fontSize:11, color:'var(--accent)', background:'var(--accent-light)', borderRadius:8, padding:'6px 10px', marginTop:6 }}>🤖 {r.ai_draft}</div>
                  )}
                </div>
                <button onClick={() => vote(r.id, r.votes)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'8px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', flexShrink:0 }}>
                  <span style={{ fontSize:16 }}>👍</span>
                  <span style={{ fontSize:13, fontWeight:800, color:'var(--accent)' }}>{r.votes || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
  { id: 'company',          label: 'Company Details', icon: '🏢' },
  { id: 'users',            label: 'Users & Roles',   icon: '👥' },
  { id: 'notifs',           label: 'Notifications',   icon: '🔔' },
  { id: 'billing',          label: 'Contact & Plan',  icon: '💳' },
  { id: 'data',             label: 'Data & Export',   icon: '📤' },
  { id: 'assets_settings',  label: 'Assets',          icon: '🚛' },
  { id: 'onboarding_admin', label: 'Plant Onboarding',icon: '🏗️' },
  { id: 'labels',           label: 'Labels',           icon: '🏷' },
];

const PERSONAL_TABS = [
  { id: 'format',       label: 'Format & Theme', icon: '🎨' },
  { id: 'datetime',     label: 'Date & Time',    icon: '🕐' },
  { id: 'sync',         label: 'OneDrive Sync',  icon: '☁️' },
  { id: 'app_modifier', label: 'App Requests',   icon: '🛠️' },
  { id: 'password',     label: 'Password Reset', icon: '🔑' },
];


// ─── Assets Settings ──────────────────────────────────────────────────────────
const INTERVAL_TYPES_CFG = [
  { id: 'hours',  label: 'Hours',      unit: 'hrs',    numeric: true  },
  { id: 'km',     label: 'Kilometres', unit: 'km',     numeric: true  },
  { id: 'months', label: 'Months',     unit: 'months', numeric: false },
  { id: 'years',  label: 'Years',      unit: 'years',  numeric: false },
];

function AssetSettingsRow({ asset, onSaved }) {
  const [open,      setOpen]      = React.useState(false);
  const [tab,       setTab]       = React.useState('info');   // 'info' | 'intervals'
  const [form,      setForm]      = React.useState({ ...asset });
  const [schedules, setSchedules] = React.useState([]);
  const [loadingSch,setLoadingSch]= React.useState(false);
  const [saving,    setSaving]    = React.useState(false);
  const [saved,     setSaved]     = React.useState(false);
  const [editSch,   setEditSch]   = React.useState(null);  // schedule being edited inline
  const [addSch,    setAddSch]    = React.useState(false); // show add row

  const blankSch = { service_name: '', interval_type: 'hours', interval_value: '', next_due_override: '', notes: '' };
  const [newSch, setNewSch] = React.useState(blankSch);
  // Label assign
  const [assignedLabel, setAssignedLabel] = React.useState(null);
  const [labelInput,    setLabelInput]    = React.useState('');
  const [labelSaving,   setLabelSaving]   = React.useState(false);
  const [labelMsg,      setLabelMsg]      = React.useState('');
  const [cameraActive,  setCameraActive]  = React.useState(false);
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    if (open) loadAssignedLabel();
    return () => stopCamera();
  }, [open]);

  const loadAssignedLabel = async () => {
    const { data } = await supabase.from('generated_labels')
      .select('id,label_code,qr_url,printed')
      .eq('asset_id', asset.id)
      .maybeSingle();
    setAssignedLabel(data || null);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      // Simple QR scanning via periodic canvas capture
      scanFromCamera();
    } catch(e) {
      setLabelMsg('Camera not available — please enter the label code manually');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraActive(false);
  };

  const scanFromCamera = () => {
    // Polling approach — user points camera then we grab a frame
    // Full QR decode would need jsQR library; for now we just stop camera and user confirms code
    setLabelMsg('Point camera at label QR code, then enter the label code below');
  };

  const assignLabel = async (code) => {
    if (!code.trim()) return;
    setLabelSaving(true); setLabelMsg('');
    stopCamera();
    // Find label by code
    const { data: label } = await supabase.from('generated_labels')
      .select('id,label_code,asset_id')
      .ilike('label_code', code.trim())
      .maybeSingle();
    if (!label) {
      setLabelMsg('Label not found: ' + code.trim()); setLabelSaving(false); return;
    }
    if (label.asset_id && label.asset_id !== asset.id) {
      setLabelMsg('This label is already assigned to another asset'); setLabelSaving(false); return;
    }
    // Unassign previous label from this asset
    await supabase.from('generated_labels').update({ asset_id: null, asset_name: null }).eq('asset_id', asset.id);
    // Assign new label
    await supabase.from('generated_labels').update({ asset_id: asset.id, asset_name: asset.name }).eq('id', label.id);
    setLabelInput(''); setLabelMsg('✓ Label ' + label.label_code + ' assigned to ' + asset.name);
    setLabelSaving(false);
    loadAssignedLabel();
  };

  const unassignLabel = async () => {
    if (!assignedLabel) return;
    if (!window.confirm('Remove label ' + assignedLabel.label_code + ' from this asset?')) return;
    await supabase.from('generated_labels').update({ asset_id: null, asset_name: null }).eq('id', assignedLabel.id);
    setAssignedLabel(null); setLabelMsg('Label removed');
  };

  const fStyle = { width:'100%', padding:'8px 10px', border:'1px solid #dde2ea', borderRadius:6, fontSize:13, color:'#1a2b3c', background:'#fff', outline:'none', boxSizing:'border-box' };
  const lStyle = { display:'block', fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 };

  const loadSchedules = async () => {
    setLoadingSch(true);
    const { data } = await supabase.from('service_schedules').select('*')
      .eq('asset_id', asset.id).order('interval_value');
    setSchedules(data || []);
    setLoadingSch(false);
  };

  const handleOpen = () => {
    setOpen(o => {
      if (!o) loadSchedules();
      return !o;
    });
  };

  const saveInfo = async () => {
    setSaving(true);
    await supabase.from('assets').update({
      name: form.name, asset_number: form.asset_number, type: form.type,
      make: form.make, model: form.model, year: form.year ? parseInt(form.year) : null,
      location: form.location, status: form.status,
      serial_number: form.serial_number, engine_number: form.engine_number,
      hours: form.hours ? parseFloat(form.hours) : null,
      target_hours: form.target_hours ? parseFloat(form.target_hours) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      purchase_date: form.purchase_date || null,
      registration: form.registration, notes: form.notes,
    }).eq('id', asset.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved && onSaved();
  };

  const calcNextDue = (type, value, last) => {
    const iv = parseFloat(value);
    if (!iv) return { next_due_value: null, next_due_date: null };
    if (type === 'hours' || type === 'km') {
      return { next_due_value: (parseFloat(last) || 0) + iv, next_due_date: null };
    }
    const base = new Date();
    if (type === 'months') base.setMonth(base.getMonth() + iv);
    if (type === 'years')  base.setFullYear(base.getFullYear() + iv);
    return { next_due_value: null, next_due_date: base.toISOString().split('T')[0] };
  };

  const saveSchedule = async (sch, isNew = false) => {
    const iType = INTERVAL_TYPES_CFG.find(t => t.id === sch.interval_type) || INTERVAL_TYPES_CFG[0];
    let next_due_value = null, next_due_date = null;
    if (sch.next_due_override) {
      if (iType.numeric) next_due_value = parseFloat(sch.next_due_override);
      else               next_due_date  = sch.next_due_override;
    } else {
      ({ next_due_value, next_due_date } = calcNextDue(sch.interval_type, sch.interval_value, asset.hours || 0));
    }
    const payload = {
      service_name:       sch.service_name.trim(),
      interval_type:      sch.interval_type,
      interval_value:     parseFloat(sch.interval_value),
      next_due_value, next_due_date,
      notes:              sch.notes || null,
    };
    if (isNew) {
      await supabase.from('service_schedules').insert([{ ...payload, asset_id: asset.id, asset_name: asset.name, company_id: asset.company_id }]);
      setNewSch(blankSch); setAddSch(false);
    } else {
      await supabase.from('service_schedules').update(payload).eq('id', sch.id);
      setEditSch(null);
    }
    loadSchedules();
  };

  const deleteSch = async (id) => {
    if (!window.confirm('Delete this service interval?')) return;
    await supabase.from('service_schedules').delete().eq('id', id);
    loadSchedules();
  };

  const sc = asset.status === 'Down' ? 'var(--red)' : asset.status === 'Maintenance' ? 'var(--amber)' : 'var(--green)';

  const SchRow = ({ s, editing, onChange, onSave, onCancel, isNew }) => {
    const iType = INTERVAL_TYPES_CFG.find(t => t.id === s.interval_type) || INTERVAL_TYPES_CFG[0];
    if (!editing) return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, background:'#f8fafc', border:'1px solid #dde2ea', marginBottom:6 }}>
        <div style={{ flex:2, fontSize:13, fontWeight:600, color:'#1a2b3c' }}>{s.service_name}</div>
        <div style={{ flex:1, fontSize:12, color:'#6b7a8d' }}>Every {s.interval_value} {s.interval_type}</div>
        <div style={{ flex:1, fontSize:12, color:'#6b7a8d' }}>
          {s.next_due_value ? `Due: ${Number(s.next_due_value).toLocaleString()} ${s.interval_type}` : s.next_due_date ? `Due: ${s.next_due_date}` : '—'}
        </div>
        <button onClick={() => onChange(s)} style={{ padding:'3px 10px', background:'#fff', border:'1px solid #dde2ea', borderRadius:5, fontSize:11, fontWeight:700, color:'#6b7a8d', cursor:'pointer' }}>✏️</button>
        <button onClick={() => deleteSch(s.id)} style={{ padding:'3px 10px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:5, fontSize:11, fontWeight:700, color:'#e94560', cursor:'pointer' }}>🗑</button>
      </div>
    );
    return (
      <div style={{ background:'#f0f8ff', border:'1px solid rgba(0,194,224,0.3)', borderRadius:8, padding:'12px', marginBottom:6 }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <label style={lStyle}>Service Name</label>
            <input style={fStyle} value={s.service_name} onChange={e => onChange({ ...s, service_name: e.target.value })} placeholder="e.g. 500hr Service" />
          </div>
          <div>
            <label style={lStyle}>Type</label>
            <select style={fStyle} value={s.interval_type} onChange={e => onChange({ ...s, interval_type: e.target.value })}>
              {INTERVAL_TYPES_CFG.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lStyle}>Every</label>
            <input style={fStyle} type="number" min="1" value={s.interval_value} onChange={e => onChange({ ...s, interval_value: e.target.value })} placeholder="250" />
          </div>
          <div>
            <label style={lStyle}>Next Due {iType.numeric ? '('+iType.unit+')' : '(date)'}</label>
            <input style={fStyle} type={iType.numeric ? 'number' : 'date'} value={s.next_due_override || ''} onChange={e => onChange({ ...s, next_due_override: e.target.value })} placeholder={iType.numeric ? 'e.g. 8000' : ''} />
          </div>
        </div>
        <div style={{ marginBottom:8 }}>
          <label style={lStyle}>Notes (optional)</label>
          <input style={fStyle} value={s.notes || ''} onChange={e => onChange({ ...s, notes: e.target.value })} placeholder="e.g. Check coolant, replace filters" />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => onSave(s, isNew)} style={{ padding:'6px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {isNew ? 'Add Interval' : 'Save'}
          </button>
          <button onClick={onCancel} style={{ padding:'6px 12px', background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:6, fontSize:12, color:'#6b7a8d', cursor:'pointer' }}>Cancel</button>
        </div>
      </div>
    );
  };

  const FIELDS = [
    ['Asset Name',    'name',          'text'],
    ['Asset Number',  'asset_number',  'text'],
    ['Type',          'type',          'text'],
    ['Make',          'make',          'text'],
    ['Model',         'model',         'text'],
    ['Year',          'year',          'number'],
    ['Location',      'location',      'text'],
    ['Serial Number', 'serial_number', 'text'],
    ['Engine Number', 'engine_number', 'text'],
    ['Current Hours', 'hours',         'number'],
    ['Target Hrs/Day','target_hours',  'number'],
    ['Hourly Rate',   'hourly_rate',   'number'],
    ['Purchase Price','purchase_price','number'],
    ['Purchase Date', 'purchase_date', 'date'],
    ['Registration',  'registration',  'text'],
  ];

  return (
    <div style={{ border:'1px solid #dde2ea', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      {/* Row header */}
      <div onClick={handleOpen} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:open?'#f0f8ff':'#fff', cursor:'pointer', transition:'background 0.15s' }}>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>{asset.asset_number}</span>
        <span style={{ fontSize:14, fontWeight:700, color:'#1a2b3c', flex:1 }}>{asset.name}</span>
        <span style={{ fontSize:11, color:'#6b7a8d' }}>{asset.type || '—'}</span>
        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:sc+'18', color:sc }}>{asset.status || 'Active'}</span>
        <span style={{ fontSize:12, color:'#a0b0b0', marginLeft:4 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding:'16px', borderTop:'1px solid #dde2ea', background:'#fff' }}>
          {/* Sub-tabs */}
          <div style={{ display:'flex', background:'#f1f5f9', borderRadius:8, padding:3, marginBottom:16, width:'fit-content' }}>
            {[['info','📋 Asset Info'],['intervals','🔧 Service Intervals'],['label','🏷 Label']].map(([id,lbl]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding:'7px 18px', border:'none', borderRadius:6, background:tab===id?'#fff':'transparent', color:tab===id?'#1a2b3c':'#6b7a8d', fontWeight:tab===id?700:500, fontSize:13, cursor:'pointer', boxShadow:tab===id?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>{lbl}</button>
            ))}
          </div>

          {tab === 'info' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12, marginBottom:12 }}>
                {FIELDS.map(([label, key, type]) => (
                  <div key={key}>
                    <label style={lStyle}>{label}</label>
                    <input style={fStyle} type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label style={lStyle}>Status</label>
                  <select style={fStyle} value={form.status || 'Active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option>Running</option><option>Active</option><option>Maintenance</option><option>Down</option><option>Standby</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lStyle}>Notes</label>
                <textarea style={{ ...fStyle, minHeight:60, resize:'vertical', fontFamily:'inherit' }} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button onClick={saveInfo} disabled={saving}
                style={{ padding:'9px 24px', background:saved?'#00c264':'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s' }}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </>
          )}

          {tab === 'intervals' && (
            <>
              {loadingSch ? (
                <div style={{ fontSize:13, color:'#a0b0b0', padding:'10px 0' }}>Loading…</div>
              ) : (
                <>
                  {schedules.length === 0 && !addSch && (
                    <div style={{ fontSize:13, color:'#a0b0b0', padding:'10px 0', marginBottom:8 }}>No service intervals set up yet.</div>
                  )}
                  {schedules.map(s => (
                    <SchRow key={s.id} s={editSch?.id === s.id ? editSch : s}
                      editing={editSch?.id === s.id}
                      onChange={v => setEditSch(v)}
                      onSave={(v) => saveSchedule(v, false)}
                      onCancel={() => setEditSch(null)}
                      isNew={false}
                    />
                  ))}
                  {addSch && (
                    <SchRow s={newSch} editing={true}
                      onChange={v => setNewSch(v)}
                      onSave={(v) => saveSchedule(v, true)}
                      onCancel={() => { setAddSch(false); setNewSch(blankSch); }}
                      isNew={true}
                    />
                  )}
                  {!addSch && (
                    <button onClick={() => setAddSch(true)}
                      style={{ marginTop:4, padding:'8px 18px', background:'transparent', border:'1px dashed rgba(0,194,224,0.5)', color:'var(--accent)', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', width:'100%' }}>
                      + Add Service Interval
                    </button>
                  )}
                </>
              )}
            </>
          )}
          {tab === 'label' && (
            <div>
              {/* Currently assigned label */}
              {assignedLabel ? (
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'14px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#166534', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>✓ Label Assigned</div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#1a2b3c', fontFamily:'var(--font-mono)' }}>{assignedLabel.label_code}</div>
                    <div style={{ fontSize:11, color:'#6b7a8d', marginTop:2 }}>
                      {assignedLabel.qr_url}
                      {assignedLabel.printed && <span style={{ marginLeft:8, color:'var(--accent)', fontWeight:700 }}>· Printed</span>}
                    </div>
                  </div>
                  <button onClick={unassignLabel}
                    style={{ padding:'6px 14px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:7, fontSize:12, fontWeight:700, color:'#e94560', cursor:'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#6b7a8d', fontStyle:'italic' }}>
                  No label assigned to this asset yet.
                </div>
              )}

              {/* Assign form */}
              <div style={{ background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:10, padding:'16px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#1a2b3c', marginBottom:4 }}>Assign a Label</div>
                <div style={{ fontSize:12, color:'#6b7a8d', marginBottom:14, lineHeight:1.5 }}>
                  Scan the QR code on the physical label using your camera, or type the label code manually (e.g. <strong>HK-001</strong>).
                </div>

                {/* Camera section */}
                <div style={{ marginBottom:14 }}>
                  {!cameraActive ? (
                    <button onClick={startCamera}
                      style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', background:'#1a2b3c', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      📷 Scan QR Code
                    </button>
                  ) : (
                    <div>
                      <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', maxWidth:320, borderRadius:8, border:'2px solid var(--accent)', display:'block', marginBottom:8 }} />
                      <button onClick={stopCamera} style={{ padding:'6px 14px', background:'#f8fafc', border:'1px solid #dde2ea', borderRadius:6, fontSize:12, fontWeight:600, color:'#6b7a8d', cursor:'pointer' }}>✕ Close Camera</button>
                    </div>
                  )}
                </div>

                {/* Manual input */}
                <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                  <div style={{ flex:1 }}>
                    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Label Code</label>
                    <input style={{ ...fStyle, fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700, letterSpacing:'1px' }}
                      value={labelInput} onChange={e => setLabelInput(e.target.value.toUpperCase())}
                      placeholder="e.g. HK-001"
                      onKeyDown={e => e.key === 'Enter' && assignLabel(labelInput)} />
                  </div>
                  <button onClick={() => assignLabel(labelInput)} disabled={!labelInput.trim() || labelSaving}
                    style={{ padding:'9px 20px', background: !labelInput.trim() || labelSaving ? '#e5e7eb' : 'var(--accent)', color: !labelInput.trim() || labelSaving ? '#9ca3af' : '#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:700, cursor: !labelInput.trim() || labelSaving ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
                    {labelSaving ? 'Assigning…' : 'Assign'}
                  </button>
                </div>

                {labelMsg && (
                  <div style={{ marginTop:10, padding:'8px 12px', borderRadius:7, fontSize:12, fontWeight:600,
                    background: labelMsg.startsWith('✓') ? '#f0fdf4' : '#fff1f2',
                    color: labelMsg.startsWith('✓') ? '#166534' : '#e94560',
                    border: `1px solid ${labelMsg.startsWith('✓') ? '#bbf7d0' : '#fecdd3'}` }}>
                    {labelMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssetsSettings({ userRole }) {
  const [assets,  setAssets]  = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [search,  setSearch]  = React.useState('');

  React.useEffect(() => {
    if (userRole?.company_id) load();
  }, [userRole]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('assets').select('*')
      .eq('company_id', userRole.company_id)
      .order('asset_number');
    setAssets(data || []);
    setLoading(false);
  };

  const filtered = assets.filter(a =>
    !search ||
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.asset_number?.toLowerCase().includes(search.toLowerCase()) ||
    a.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input
          placeholder="Search assets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, padding:'9px 14px', border:'1px solid #dde2ea', borderRadius:8, fontSize:13, color:'#1a2b3c', background:'#f8fafc', outline:'none' }}
        />
        <span style={{ fontSize:13, color:'#6b7a8d', flexShrink:0 }}>{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ fontSize:13, color:'#a0b0b0', padding:20, textAlign:'center' }}>Loading assets…</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize:13, color:'#a0b0b0', padding:20, textAlign:'center' }}>No assets found.</div>
      ) : (
        filtered.map(a => <AssetSettingsRow key={a.id} asset={a} onSaved={load} />)
      )}
    </div>
  );
}


// ─── Labels Section ───────────────────────────────────────────────────────────
// Three sub-tabs: Designer | Generator | Print
function LabelsSection({ userRole }) {
  const [tab, setTab] = React.useState('designer');
  const tabStyle = (id) => ({
    padding: '8px 20px', border: 'none', background: 'transparent',
    borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab === id ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: tab === id ? 700 : 500, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s',
  });
  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <button style={tabStyle('designer')} onClick={() => setTab('designer')}>🎨 Label Designer</button>
        <button style={tabStyle('generator')} onClick={() => setTab('generator')}>⚡ Label Generator</button>
        <button style={tabStyle('print')} onClick={() => setTab('print')}>🖨️ Print Labels</button>
      </div>
      {tab === 'designer'  && <LabelDesigner userRole={userRole?.role} companyId={userRole?.company_id} />}
      {tab === 'generator' && <LabelGenerator userRole={userRole} />}
      {tab === 'print'     && <LabelPrint userRole={userRole} />}
    </div>
  );
}

// ─── Label Generator ─────────────────────────────────────────────────────────
function LabelGenerator({ userRole }) {
  const [templates,  setTemplates]  = React.useState([]);
  const [selectedT,  setSelectedT]  = React.useState(null);
  const [count,      setCount]      = React.useState(10);
  const [prefix,     setPrefix]     = React.useState('MIQ');
  const [startNum,   setStartNum]   = React.useState(1);
  const [generated,  setGenerated]  = React.useState([]);
  const [loading,    setLoading]    = React.useState(false);
  const [saved,      setSaved]      = React.useState(false);
  const [existing,   setExisting]   = React.useState([]);
  const [loadingEx,  setLoadingEx]  = React.useState(true);

  React.useEffect(() => {
    if (userRole?.company_id) {
      supabase.from('label_templates').select('id,name,size').eq('company_id', userRole.company_id)
        .then(({ data }) => setTemplates(data || []));
      loadExisting();
    }
  }, [userRole]);

  const loadExisting = async () => {
    setLoadingEx(true);
    const { data } = await supabase.from('generated_labels')
      .select('*').eq('company_id', userRole.company_id)
      .order('label_number');
    setExisting(data || []);
    setLoadingEx(false);
  };

  const generate = async () => {
    if (!selectedT) { alert('Please select a label template first'); return; }
    if (count < 1 || count > 500) { alert('Count must be between 1 and 500'); return; }
    setLoading(true);
    // Find highest existing number to avoid duplicates
    const maxExisting = existing.reduce((m, l) => Math.max(m, l.label_number || 0), 0);
    const start = Math.max(startNum, maxExisting + 1);
    const rows = [];
    for (let i = 0; i < count; i++) {
      const num = start + i;
      const label_code = `${prefix}-${String(num).padStart(3, '0')}`;
      const qr_url = `https://www.mechiq.com.au/scan/label/${label_code}`;
      rows.push({
        company_id:   userRole.company_id,
        template_id:  selectedT.id,
        template_name: selectedT.name,
        label_number: num,
        label_code,
        qr_url,
        asset_id:     null,
        asset_name:   null,
        printed:      false,
      });
    }
    const { data, error } = await supabase.from('generated_labels').insert(rows).select();
    if (error) { alert('Error: ' + error.message); }
    else {
      setGenerated(data || []);
      setSaved(true);
      await loadExisting();
      setTimeout(() => setSaved(false), 3000);
    }
    setLoading(false);
  };

  const deleteLabel = async (id) => {
    await supabase.from('generated_labels').delete().eq('id', id);
    await loadExisting();
  };

  const iStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 };

  return (
    <div>
      {/* Generator form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Generate Labels</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Generate a batch of unique labels with sequential numbers and QR codes. Each label links to its assigned asset.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={lStyle}>Label Template</label>
            <select style={iStyle} value={selectedT?.id || ''} onChange={e => setSelectedT(templates.find(t => t.id === e.target.value) || null)}>
              <option value="">Select template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lStyle}>Prefix</label>
            <input style={iStyle} value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))} placeholder="MIQ" maxLength={6} />
          </div>
          <div>
            <label style={lStyle}>Starting Number</label>
            <input style={iStyle} type="number" min={1} value={startNum} onChange={e => setStartNum(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div>
            <label style={lStyle}>Number of Labels</label>
            <input style={iStyle} type="number" min={1} max={500} value={count} onChange={e => setCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} />
          </div>
        </div>
        {/* Preview */}
        {selectedT && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Preview:</strong>{' '}
            {prefix}-{String(startNum).padStart(3,'0')} → {prefix}-{String(startNum + count - 1).padStart(3,'0')}
            {' '}· Template: <strong style={{ color: 'var(--accent)' }}>{selectedT.name}</strong>
            {' '}· {count} label{count !== 1 ? 's' : ''}
          </div>
        )}
        <button onClick={generate} disabled={loading || !selectedT}
          style={{ padding: '11px 28px', background: loading || !selectedT ? 'var(--surface-2)' : 'var(--accent)', color: loading || !selectedT ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading || !selectedT ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
          {loading ? '⏳ Generating…' : saved ? '✓ Generated!' : `⚡ Generate ${count} Label${count !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Existing labels table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Generated Labels ({existing.length})</div>
          <button onClick={loadExisting} style={{ padding: '6px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>↻ Refresh</button>
        </div>
        {loadingEx ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : existing.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>No labels generated yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  {['Label Code','Template','Asset Assigned','Printed',''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {existing.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{l.label_code}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontSize: 12 }}>{l.template_name || '—'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      {l.asset_name
                        ? <span style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>{l.asset_name}</span>
                        : <span style={{ color: 'var(--text-faint)', fontSize: 12, fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.printed ? 'var(--accent-light)' : 'var(--surface-2)', color: l.printed ? 'var(--accent)' : 'var(--text-faint)', border: '1px solid ' + (l.printed ? 'rgba(0,194,224,0.3)' : 'var(--border)') }}>
                        {l.printed ? '✓ Printed' : 'Not printed'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <button onClick={() => { if (window.confirm('Delete label ' + l.label_code + '?')) deleteLabel(l.id); }}
                        style={{ padding: '3px 10px', background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Label Print ──────────────────────────────────────────────────────────────
function LabelPrint({ userRole }) {
  const [labels,     setLabels]     = React.useState([]);
  const [templates,  setTemplates]  = React.useState([]);
  const [loading,    setLoading]    = React.useState(true);
  const [selected,   setSelected]   = React.useState(new Set());
  const [paperSize,  setPaperSize]  = React.useState('A4');
  const [cols,       setCols]       = React.useState(3);
  const [rows,       setRows]       = React.useState(8);
  const [gap,        setGap]        = React.useState(4);
  const [filterAssigned, setFilterAssigned] = React.useState('all');
  const [filterTemplate, setFilterTemplate] = React.useState('');
  const printRef = React.useRef(null);

  React.useEffect(() => {
    if (userRole?.company_id) load();
  }, [userRole]);

  const load = async () => {
    setLoading(true);
    const [{ data: lD }, { data: tD }] = await Promise.all([
      supabase.from('generated_labels').select('*').eq('company_id', userRole.company_id).order('label_number'),
      supabase.from('label_templates').select('id,name').eq('company_id', userRole.company_id),
    ]);
    setLabels(lD || []);
    setTemplates(tD || []);
    setLoading(false);
  };

  const PAPER_SIZES = {
    'A4':     { w: 210, h: 297, label: 'A4 (210×297mm)' },
    'A3':     { w: 297, h: 420, label: 'A3 (297×420mm)' },
    'Letter': { w: 216, h: 279, label: 'US Letter (216×279mm)' },
    'A5':     { w: 148, h: 210, label: 'A5 (148×210mm)' },
  };

  const filtered = labels.filter(l => {
    if (filterAssigned === 'assigned'   && !l.asset_name) return false;
    if (filterAssigned === 'unassigned' && l.asset_name) return false;
    if (filterTemplate && l.template_id !== filterTemplate) return false;
    return true;
  });

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll    = () => setSelected(new Set(filtered.map(l => l.id)));
  const clearAll     = () => setSelected(new Set());

  const selectedLabels = filtered.filter(l => selected.has(l.id));
  const perPage = cols * rows;
  const pageCount = Math.ceil(selectedLabels.length / perPage);

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    const paper = PAPER_SIZES[paperSize];
    const labelW = Math.floor((paper.w - (cols + 1) * gap) / cols);
    const labelH = Math.floor((paper.h - (rows + 1) * gap) / rows);

    const labelHtml = selectedLabels.map((l, i) => `
      <div class="label" style="width:${labelW}mm;height:${labelH}mm;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #ccc;border-radius:4px;margin:${gap/2}mm;padding:2mm;box-sizing:border-box;page-break-inside:avoid;vertical-align:top;">
        <div style="font-family:monospace;font-size:10px;font-weight:700;color:#1a2433;margin-bottom:2px;">${l.label_code}</div>
        ${l.asset_name ? `<div style="font-size:7px;color:#666;margin-bottom:2px;text-align:center;">${l.asset_name}</div>` : ''}
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(l.qr_url)}" style="width:${Math.min(labelH*0.55, labelW*0.7)}mm;height:${Math.min(labelH*0.55, labelW*0.7)}mm;" />
        <div style="font-size:6px;color:#999;margin-top:2px;">mechiq.com.au</div>
      </div>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html><html><head><title>MechIQ Labels</title>
      <style>
        @page { size: ${paperSize === 'Letter' ? '216mm 279mm' : paperSize}; margin: ${gap}mm; }
        body { margin:0; padding:0; font-family:sans-serif; }
        .page { width:${paper.w}mm; display:flex; flex-wrap:wrap; align-items:flex-start; page-break-after:always; }
        @media print { body { -webkit-print-color-adjust:exact; } }
      </style></head><body>
      ${Array.from({ length: pageCount }, (_, p) => `
        <div class="page">
          ${labelHtml.slice ? selectedLabels.slice(p * perPage, (p + 1) * perPage).map((l) => `
            <div style="width:${labelW}mm;height:${labelH}mm;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #ccc;border-radius:4px;margin:${gap/2}mm;padding:2mm;box-sizing:border-box;vertical-align:top;">
              <div style="font-family:monospace;font-size:10px;font-weight:700;color:#1a2433;margin-bottom:2px;">${l.label_code}</div>
              ${l.asset_name ? `<div style="font-size:7px;color:#666;margin-bottom:2px;text-align:center;">${l.asset_name}</div>` : ''}
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(l.qr_url)}" style="width:${Math.min(labelH*0.55, labelW*0.7)}mm;height:${Math.min(labelH*0.55, labelW*0.7)}mm;" />
              <div style="font-size:6px;color:#999;margin-top:2px;">mechiq.com.au</div>
            </div>
          `).join('') : ''}
        </div>
      `).join('')}
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 800);

    // Mark as printed
    supabase.from('generated_labels').update({ printed: true }).in('id', [...selected]);
  };

  const iStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none' };

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>Loading…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
      {/* Settings panel */}
      <div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Print Settings</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Paper Size</label>
            <select style={{ ...iStyle, width: '100%' }} value={paperSize} onChange={e => setPaperSize(e.target.value)}>
              {Object.entries(PAPER_SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Columns</label>
              <input style={{ ...iStyle, width: '100%' }} type="number" min={1} max={10} value={cols} onChange={e => setCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Rows</label>
              <input style={{ ...iStyle, width: '100%' }} type="number" min={1} max={20} value={rows} onChange={e => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Gap (mm)</label>
            <input style={{ ...iStyle, width: '100%' }} type="number" min={0} max={20} value={gap} onChange={e => setGap(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))} />
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            <div><strong style={{ color: 'var(--text-secondary)' }}>{cols} × {rows}</strong> = {perPage} labels per page</div>
            <div style={{ marginTop: 3 }}><strong style={{ color: 'var(--text-secondary)' }}>{selectedLabels.length}</strong> selected → <strong style={{ color: 'var(--accent)' }}>{pageCount}</strong> page{pageCount !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={handlePrint} disabled={selectedLabels.length === 0}
            style={{ width: '100%', padding: '12px', background: selectedLabels.length === 0 ? 'var(--surface-2)' : 'var(--accent)', color: selectedLabels.length === 0 ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: selectedLabels.length === 0 ? 'not-allowed' : 'pointer' }}>
            🖨️ Print {selectedLabels.length > 0 ? selectedLabels.length + ' Label' + (selectedLabels.length !== 1 ? 's' : '') : ''}
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Filters</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Assignment</label>
            <select style={{ ...iStyle, width: '100%' }} value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
              <option value="all">All Labels</option>
              <option value="assigned">Assigned to Asset</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Template</label>
            <select style={{ ...iStyle, width: '100%' }} value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)}>
              <option value="">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Label list + preview */}
      <div>
        {/* Preview */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
              Page Preview — {PAPER_SIZES[paperSize]?.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cols}×{rows} layout · {perPage} per page</div>
          </div>
          {/* Scaled preview */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: '#fff', padding: 8, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px`, maxWidth: 480, margin: '0 auto' }}>
              {Array.from({ length: Math.min(perPage, 24) }).map((_, i) => {
                const l = selectedLabels[i];
                return (
                  <div key={i} style={{ aspectRatio: '1', border: '1px solid #dde', borderRadius: 3, background: l ? '#f8fcff' : '#f8f8f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 2, minWidth: 0 }}>
                    {l ? (
                      <>
                        <div style={{ fontSize: 7, fontFamily: 'monospace', fontWeight: 700, color: '#1a2433', textAlign: 'center', lineHeight: 1.2 }}>{l.label_code}</div>
                        <div style={{ width: '60%', aspectRatio: '1', background: '#1a2433', borderRadius: 1, margin: '1px 0' }} />
                        {l.asset_name && <div style={{ fontSize: 5, color: '#666', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.asset_name}</div>}
                      </>
                    ) : (
                      <div style={{ width: '60%', aspectRatio: '1', background: '#eee', borderRadius: 1 }} />
                    )}
                  </div>
                );
              })}
            </div>
            {perPage > 24 && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Showing first 24 of {perPage} cells</div>}
          </div>
        </div>

        {/* Label selection table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
              Select Labels to Print ({selected.size} of {filtered.length} selected)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAll} style={{ padding: '5px 12px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(0,194,224,0.3)', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Select All</button>
              <button onClick={clearAll} style={{ padding: '5px 12px', background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', padding: '20px 0' }}>No labels match the current filters.</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)' }}>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ width: 32, padding: '8px 10px' }} />
                    {['Label Code','Template','Asset','Printed'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} onClick={() => toggleSelect(l.id)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected.has(l.id) ? 'var(--accent-light)' : 'transparent', transition: 'background 0.1s' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: '1.5px solid ' + (selected.has(l.id) ? 'var(--accent)' : 'var(--border)'), background: selected.has(l.id) ? 'var(--accent)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>
                          {selected.has(l.id) ? '✓' : ''}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{l.label_code}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>{l.template_name || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>{l.asset_name ? <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>{l.asset_name}</span> : <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 11, color: l.printed ? 'var(--accent)' : 'var(--text-faint)' }}>{l.printed ? '✓' : '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Plant Onboarding Admin ───────────────────────────────────────────────────
function PlantOnboardingAdmin({ userRole }) {
  const [tab, setTab] = React.useState('submissions');
  const ts = (id) => ({
    padding:'8px 18px', border:'none', background:'transparent',
    borderBottom: tab===id ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab===id ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: tab===id ? 700 : 500, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
  });
  return (
    <div>
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        <button style={ts('submissions')} onClick={()=>setTab('submissions')}>📋 Submissions</button>
        <button style={ts('contractors')} onClick={()=>setTab('contractors')}>👷 Contractors</button>
        <button style={ts('checklists')} onClick={()=>setTab('checklists')}>✅ Compliance Checklists</button>
      </div>
      {tab==='submissions'  && <SubmissionsReview userRole={userRole} />}
      {tab==='contractors'  && <ContractorManager userRole={userRole} />}
      {tab==='checklists'   && <ComplianceChecklists userRole={userRole} />}
    </div>
  );
}

// ─── Submissions Review ───────────────────────────────────────────────────────
function SubmissionsReview({ userRole }) {
  const [subs,    setSubs]    = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selected,setSelected]= React.useState(null);
  const [docs,    setDocs]    = React.useState([]);
  const [checklists, setChecklists] = React.useState([]);
  const [completions, setCompletions] = React.useState({});
  const [rejectReason, setRejectReason] = React.useState('');
  const [saving,  setSaving]  = React.useState(false);
  const [labelInput, setLabelInput] = React.useState('');
  const [filter,  setFilter]  = React.useState('pending');

  React.useEffect(() => { if(userRole?.company_id) load(); }, [userRole]);

  const load = async () => {
    setLoading(true);
    const [{ data:s }, { data:cl }] = await Promise.all([
      supabase.from('plant_submissions').select('*, contractor_accounts(company_name,contact_name,email,phone)').eq('company_id', userRole.company_id).order('created_at',{ascending:false}),
      supabase.from('compliance_checklists').select('*').eq('company_id', userRole.company_id),
    ]);
    setSubs(s||[]); setChecklists(cl||[]); setLoading(false);
  };

  const selectSub = async (sub) => {
    setSelected(sub); setRejectReason(''); setLabelInput(sub.label_code||'');
    const { data } = await supabase.from('submission_documents').select('*').eq('submission_id', sub.id);
    setDocs(data||[]);
    const { data:comps } = await supabase.from('compliance_completions').select('*').eq('submission_id', sub.id);
    const map = {};
    (comps||[]).forEach(c => { map[c.checklist_id] = c.completed_items || {}; });
    setCompletions(map);
  };

  const toggleItem = (checklistId, itemId) => {
    setCompletions(prev => {
      const cl = { ...(prev[checklistId]||{}) };
      cl[itemId] = !cl[itemId];
      return { ...prev, [checklistId]: cl };
    });
  };

  const saveCompletions = async () => {
    for (const [checklistId, items] of Object.entries(completions)) {
      await supabase.from('compliance_completions').upsert({
        submission_id: selected.id, checklist_id: checklistId,
        completed_items: items, completed_by: userRole.name || userRole.email,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'submission_id,checklist_id' });
    }
  };

  const setStatus = async (status) => {
    setSaving(true);
    await saveCompletions();
    const update = { status, approved_by: userRole.name||userRole.email, approved_at: new Date().toISOString() };
    if (status === 'rejected') update.rejection_reason = rejectReason;
    if (labelInput) update.label_code = labelInput;
    await supabase.from('plant_submissions').update(update).eq('id', selected.id);
    // Assign label if provided
    if (labelInput) {
      await supabase.from('generated_labels').update({ asset_name: selected.name }).ilike('label_code', labelInput);
    }
    // Send mailto notification
    const sub = selected;
    const contractor = sub.contractor_accounts;
    if (contractor?.email) {
      const subj = status === 'approved'
        ? `MechIQ — ${sub.name} Approved for Site`
        : `MechIQ — ${sub.name} Requires Attention`;
      const body = status === 'approved'
        ? `Hi ${contractor.contact_name},\n\nYour plant submission has been approved:\n\nPlant: ${sub.name}\nType: ${sub.type}\nMake/Model: ${[sub.make,sub.model].filter(Boolean).join(' ')}\n${labelInput ? 'Site Label: '+labelInput+'\n' : ''}\nThe plant is now cleared for site. Please ensure it is fitted with the assigned label before commencing work.\n\nRegards,\nMechIQ Site Administration`
        : `Hi ${contractor.contact_name},\n\nYour plant submission requires attention:\n\nPlant: ${sub.name}\nReason: ${rejectReason}\n\nPlease address the above and resubmit. Contact your site administrator if you have questions.\n\nRegards,\nMechIQ Site Administration`;
      window.location.href = `mailto:${contractor.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    }
    setSaving(false);
    setSelected(null);
    load();
  };

  const addToAssets = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: asset } = await supabase.from('assets').insert([{
      company_id:     userRole.company_id,
      name:           selected.name,
      type:           selected.type,
      make:           selected.make,
      model:          selected.model,
      year:           selected.year,
      serial_number:  selected.serial_number,
      status:         'Active',
      ownership_type: selected.hire_type === 'dry' ? 'dry_hire' : selected.hire_type === 'wet' ? 'wet_hire' : 'owned',
      notes:          `Onboarded from contractor: ${selected.contractor_accounts?.company_name||''}`,
    }]).select().single();
    if (asset) {
      await supabase.from('plant_submissions').update({ asset_id: asset.id, status:'compliant' }).eq('id', selected.id);
    }
    setSaving(false);
    setSelected(null);
    load();
  };

  const filtered = subs.filter(s => filter === 'all' || s.status === filter);
  const SC = { pending:'#d97706', approved:'#16a34a', rejected:'#e11d48', compliant:'#2d8cf0' };
  const iStyle = { width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  // Relevant checklists for selected submission
  const relevantChecklists = selected
    ? checklists.filter(cl => !cl.plant_type || cl.plant_type.toLowerCase() === (selected.type||'').toLowerCase() || cl.plant_type === 'All')
    : [];

  return (
    <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:20 }}>
      {/* List */}
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['compliant','On Site']].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${filter===v?'var(--accent)':'var(--border)'}`, background:filter===v?'var(--accent-light)':'var(--surface)', color:filter===v?'var(--accent)':'var(--text-muted)', fontSize:12, fontWeight:filter===v?700:500, cursor:'pointer' }}>
              {l} {v!=='all'&&<span style={{ fontWeight:700 }}>({subs.filter(s=>s.status===(v==='compliant'?'compliant':v)).length})</span>}
            </button>
          ))}
        </div>
        {loading ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Loading…</div>
        : filtered.length === 0 ? <div style={{ color:'var(--text-muted)', fontSize:13, fontStyle:'italic' }}>No submissions.</div>
        : filtered.map(s => (
          <div key={s.id} onClick={()=>selectSub(s)}
            style={{ padding:'14px 16px', borderRadius:10, border:`1px solid ${selected?.id===s.id?'var(--accent)':'var(--border)'}`, background:selected?.id===s.id?'var(--accent-light)':'var(--surface)', marginBottom:8, cursor:'pointer', transition:'all 0.15s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:14 }}>{s.name}</div>
              <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:(SC[s.status]||'#a0b0b0')+'18', color:SC[s.status]||'#a0b0b0', border:`1px solid ${SC[s.status]||'#a0b0b0'}30` }}>
                {s.status}
              </span>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {[s.make,s.model].filter(Boolean).join(' ')} · {s.type} · {s.hire_type==='dry'?'Dry Hire':'Wet Hire'}
            </div>
            <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:4 }}>
              {s.contractor_accounts?.company_name} · {new Date(s.created_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'})}
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20, maxHeight:'80vh', overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>{selected.name}</div>
            <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
          </div>

          {/* Plant info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16, fontSize:12 }}>
            {[['Type',selected.type],['Make',selected.make],['Model',selected.model],['Year',selected.year],['Serial',selected.serial_number],['Capacity',selected.capacity],['Hire Type',selected.hire_type==='dry'?'Dry Hire':'Wet Hire']].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ padding:'8px 10px', background:'var(--surface-2)', borderRadius:7 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{k}</div>
                <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Contractor info */}
          <div style={{ padding:'10px 12px', background:'var(--surface-2)', borderRadius:8, marginBottom:16, fontSize:12 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Contractor</div>
            <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{selected.contractor_accounts?.company_name}</div>
            <div style={{ color:'var(--text-secondary)' }}>{selected.contractor_accounts?.contact_name} · {selected.contractor_accounts?.email}</div>
          </div>

          {/* Documents */}
          {docs.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Documents</div>
              {docs.map(d=>(
                <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'var(--surface-2)', borderRadius:7, marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{d.document_type}</div>
                    {d.expiry_date&&<div style={{ fontSize:11, color:'var(--text-muted)' }}>Expires: {d.expiry_date}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={async()=>{await supabase.from('submission_documents').update({verified:!d.verified}).eq('id',d.id);const{data}=await supabase.from('submission_documents').select('*').eq('submission_id',selected.id);setDocs(data||[]);}}
                      style={{ padding:'3px 10px', fontSize:11, fontWeight:700, borderRadius:5, cursor:'pointer', background:d.verified?'var(--green-bg)':'var(--surface)', border:`1px solid ${d.verified?'var(--green-border)':'var(--border)'}`, color:d.verified?'var(--green)':'var(--text-muted)' }}>
                      {d.verified?'✓ Verified':'Verify'}
                    </button>
                    {d.file_url&&<a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>View</a>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Compliance checklists */}
          {relevantChecklists.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Compliance Checklists</div>
              {relevantChecklists.map(cl=>(
                <div key={cl.id} style={{ background:'var(--surface-2)', borderRadius:9, padding:'12px 14px', marginBottom:10 }}>
                  <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:13, marginBottom:8 }}>{cl.name}</div>
                  {(cl.items||[]).map((item,i)=>(
                    <label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', cursor:'pointer', fontSize:13, color:'var(--text-secondary)' }}>
                      <input type="checkbox" checked={!!(completions[cl.id]?.[item.id||i])} onChange={()=>toggleItem(cl.id, item.id||i)} style={{ width:15, height:15, accentColor:'var(--accent)' }} />
                      {item.label}
                      {item.required&&<span style={{ fontSize:10, color:'var(--red)', fontWeight:700 }}>Required</span>}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Label assign */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Assign Label Code</label>
            <input style={iStyle} value={labelInput} onChange={e=>setLabelInput(e.target.value.toUpperCase())} placeholder="e.g. HK-001" />
          </div>

          {/* Reject reason */}
          {selected.status !== 'compliant' && (
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Rejection Reason (if rejecting)</label>
              <textarea style={{ ...iStyle, minHeight:60, resize:'vertical' }} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Explain what needs to be addressed…" />
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {selected.status !== 'compliant' && (
              <>
                <button onClick={()=>setStatus('approved')} disabled={saving}
                  style={{ flex:1, padding:'10px', background:'var(--green,#16a34a)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
                  ✓ Approve
                </button>
                <button onClick={()=>{ if(!rejectReason.trim()){alert('Please enter a rejection reason');return;} setStatus('rejected');}} disabled={saving}
                  style={{ flex:1, padding:'10px', background:'var(--red-bg,#fff1f2)', color:'var(--red,#e11d48)', border:'1px solid var(--red-border,#fecdd3)', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
                  ✕ Reject
                </button>
              </>
            )}
            {selected.status === 'approved' && !selected.asset_id && (
              <button onClick={addToAssets} disabled={saving}
                style={{ width:'100%', padding:'10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
                🚛 Add to Assets
              </button>
            )}
            {selected.asset_id && (
              <div style={{ width:'100%', padding:'10px 14px', background:'var(--green-bg,#f0fdf4)', border:'1px solid var(--green-border,#bbf7d0)', borderRadius:8, fontSize:13, fontWeight:700, color:'var(--green,#16a34a)', textAlign:'center' }}>
                ✓ Added to Assets
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contractor Manager ───────────────────────────────────────────────────────
function ContractorManager({ userRole }) {
  const [contractors, setContractors] = React.useState([]);
  const [loading,     setLoading]     = React.useState(true);
  const [showForm,    setShowForm]    = React.useState(false);
  const [form,        setForm]        = React.useState({ company_name:'', contact_name:'', email:'', phone:'', abn:'' });
  const [saving,      setSaving]      = React.useState(false);
  const [newPin,      setNewPin]      = React.useState('');

  React.useEffect(()=>{ if(userRole?.company_id) load(); },[userRole]);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('contractor_accounts').select('id,company_name,contact_name,email,phone,abn,created_at').eq('company_id', userRole.company_id).order('created_at',{ascending:false});
    setContractors(data||[]); setLoading(false);
  };

  const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const create = async () => {
    if (!form.company_name||!form.contact_name||!form.email) { alert('Please fill Company Name, Contact Name and Email'); return; }
    setSaving(true);
    const pin = generatePin();
    const { error } = await supabase.from('contractor_accounts').insert([{ ...form, company_id: userRole.company_id, pin }]);
    if (error) { alert('Error: '+error.message); setSaving(false); return; }
    setNewPin(pin);
    setSaving(false);
    setForm({ company_name:'', contact_name:'', email:'', phone:'', abn:'' });
    load();
  };

  const iStyle = { width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
  const lStyle = { display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 };

  return (
    <div>
      {newPin && (
        <div style={{ background:'var(--green-bg,#f0fdf4)', border:'1px solid var(--green-border,#bbf7d0)', borderRadius:10, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--green,#16a34a)', marginBottom:6 }}>✓ Contractor Created</div>
          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>Share these login details with the contractor:</div>
          <div style={{ marginTop:10, padding:'10px 14px', background:'#fff', borderRadius:8, border:'1px solid var(--green-border,#bbf7d0)', fontFamily:'monospace', fontSize:14 }}>
            <div>Portal: <strong>mechiq.com.au/contractor</strong></div>
            <div>Email: <strong>{form.email || 'their email'}</strong></div>
            <div>PIN: <strong style={{ fontSize:20, letterSpacing:4, color:'var(--accent)' }}>{newPin}</strong></div>
          </div>
          <button onClick={()=>{
            navigator.clipboard.writeText(`MechIQ Contractor Portal\nURL: mechiq.com.au/contractor\nPIN: ${newPin}`);
          }} style={{ marginTop:10, padding:'6px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Copy Details
          </button>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Registered Contractors ({contractors.length})</div>
        <button onClick={()=>setShowForm(!showForm)} style={{ padding:'7px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Add Contractor</button>
      </div>

      {showForm && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>New Contractor Account</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:14 }}>
            {[['Company Name *','company_name'],['Contact Name *','contact_name'],['Email *','email'],['Phone','phone'],['ABN','abn']].map(([lbl,key])=>(
              <div key={key}>
                <label style={lStyle}>{lbl}</label>
                <input style={iStyle} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} type={key==='email'?'email':'text'} />
              </div>
            ))}
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14, padding:'8px 12px', background:'var(--accent-light)', borderRadius:7, border:'1px solid rgba(0,194,224,0.2)' }}>
            💡 A 6-digit PIN will be auto-generated. Share it with the contractor so they can log in at <strong>mechiq.com.au/contractor</strong>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={create} disabled={saving} style={{ padding:'9px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving?'Creating…':'Create Account & Generate PIN'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{ padding:'9px 16px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Loading…</div> : contractors.length === 0 ? (
        <div style={{ color:'var(--text-muted)', fontSize:13, fontStyle:'italic', padding:'20px 0' }}>No contractors registered yet.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--surface-2)', borderBottom:'2px solid var(--border)' }}>
              {['Company','Contact','Email','Phone','ABN','Since'].map(h=><th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {contractors.map(c=>(
              <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'10px 12px', fontWeight:700, color:'var(--text-primary)' }}>{c.company_name}</td>
                <td style={{ padding:'10px 12px', color:'var(--text-secondary)' }}>{c.contact_name}</td>
                <td style={{ padding:'10px 12px', color:'var(--accent)', fontSize:12 }}>{c.email}</td>
                <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontSize:12 }}>{c.phone||'—'}</td>
                <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontSize:12 }}>{c.abn||'—'}</td>
                <td style={{ padding:'10px 12px', color:'var(--text-muted)', fontSize:12 }}>{new Date(c.created_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'})}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Compliance Checklists ────────────────────────────────────────────────────
function ComplianceChecklists({ userRole }) {
  const [checklists, setChecklists] = React.useState([]);
  const [editing,    setEditing]    = React.useState(null);
  const [form,       setForm]       = React.useState({ name:'', plant_type:'', site_name:'', items:[] });
  const [loading,    setLoading]    = React.useState(true);

  React.useEffect(()=>{ if(userRole?.company_id) load(); },[userRole]);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('compliance_checklists').select('*').eq('company_id', userRole.company_id).order('created_at',{ascending:false});
    setChecklists(data||[]); setLoading(false);
  };

  const newChecklist = () => { setEditing('new'); setForm({ name:'', plant_type:'All', site_name:'', items:[] }); };
  const addItem = () => setForm(f=>({...f, items:[...f.items, { id:Date.now().toString(), label:'', required:false }]}));
  const updateItem = (i,k,v) => setForm(f=>({...f, items:f.items.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const removeItem = (i) => setForm(f=>({...f, items:f.items.filter((_,j)=>j!==i)}));

  const save = async () => {
    if (!form.name.trim()||form.items.length===0) { alert('Please add a name and at least one item'); return; }
    if (editing==='new') {
      await supabase.from('compliance_checklists').insert([{ ...form, company_id: userRole.company_id }]);
    } else {
      await supabase.from('compliance_checklists').update({ name:form.name, plant_type:form.plant_type, site_name:form.site_name, items:form.items }).eq('id', editing);
    }
    setEditing(null); load();
  };

  const del = async (id) => {
    if (!window.confirm('Delete this checklist?')) return;
    await supabase.from('compliance_checklists').delete().eq('id',id);
    load();
  };

  const iStyle = { width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface-2)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
  const lStyle = { display:'block', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Site Compliance Checklists ({checklists.length})</div>
        <button onClick={newChecklist} style={{ padding:'7px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer' }}>+ New Checklist</button>
      </div>

      {editing && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:14 }}>{editing==='new'?'New Checklist':'Edit Checklist'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12, marginBottom:14 }}>
            <div><label style={lStyle}>Checklist Name *</label><input style={iStyle} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. EWP Site Compliance" /></div>
            <div><label style={lStyle}>Plant Type</label><input style={iStyle} value={form.plant_type} onChange={e=>setForm(f=>({...f,plant_type:e.target.value}))} placeholder="e.g. EWP, All" /></div>
            <div><label style={lStyle}>Site Name</label><input style={iStyle} value={form.site_name} onChange={e=>setForm(f=>({...f,site_name:e.target.value}))} placeholder="e.g. Newcastle" /></div>
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Checklist Items</div>
          {form.items.map((item,i)=>(
            <div key={item.id||i} style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
              <input style={{ ...iStyle, flex:1 }} value={item.label} onChange={e=>updateItem(i,'label',e.target.value)} placeholder="e.g. Valid registration certificate" />
              <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', flexShrink:0, cursor:'pointer' }}>
                <input type="checkbox" checked={item.required} onChange={e=>updateItem(i,'required',e.target.checked)} style={{ accentColor:'var(--accent)' }} />Required
              </label>
              <button onClick={()=>removeItem(i)} style={{ padding:'6px 10px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:5, fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>✕</button>
            </div>
          ))}
          <button onClick={addItem} style={{ padding:'6px 16px', background:'transparent', border:'1px dashed var(--border)', borderRadius:6, color:'var(--text-muted)', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:14 }}>+ Add Item</button>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={save} style={{ padding:'9px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>Save Checklist</button>
            <button onClick={()=>setEditing(null)} style={{ padding:'9px 16px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:'var(--text-muted)', fontSize:13 }}>Loading…</div>
      : checklists.length===0 ? <div style={{ color:'var(--text-muted)', fontSize:13, fontStyle:'italic' }}>No checklists created yet. Create checklists to define compliance requirements for different plant types and sites.</div>
      : checklists.map(cl=>(
        <div key={cl.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:14 }}>{cl.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                Plant type: <strong>{cl.plant_type||'All'}</strong>
                {cl.site_name&&<> · Site: <strong>{cl.site_name}</strong></>}
                · {(cl.items||[]).length} item{(cl.items||[]).length!==1?'s':''}
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>{ setEditing(cl.id); setForm({ name:cl.name, plant_type:cl.plant_type||'', site_name:cl.site_name||'', items:cl.items||[] }); }}
                style={{ padding:'4px 12px', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>✏️ Edit</button>
              <button onClick={()=>del(cl.id)}
                style={{ padding:'4px 10px', background:'var(--red-bg)', color:'var(--red)', border:'1px solid var(--red-border)', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>🗑</button>
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {(cl.items||[]).map((item,i)=>(
              <span key={i} style={{ fontSize:11, padding:'2px 8px', borderRadius:5, background: item.required?'var(--red-bg)':'var(--surface-2)', color:item.required?'var(--red)':'var(--text-muted)', border:`1px solid ${item.required?'var(--red-border)':'var(--border)'}` }}>
                {item.label}{item.required?' *':''}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
    format:       <FormatTheme userRole={userRole} />,
    datetime:     <DateTimeSettings userRole={userRole} />,
    sync:         <OneDriveSync userRole={userRole} />,
    app_modifier: <AppModifier userRole={userRole} />,
    password:        <PasswordReset userRole={userRole} />,
    assets_settings:  <AssetsSettings userRole={userRole} />,
    onboarding_admin: <PlantOnboardingAdmin userRole={userRole} />,
    labels:  <LabelsSection userRole={userRole} />,
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