import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const MASTER_PIN = '4900';

const FEATURES = [
  { key: 'dashboard',    label: 'Dashboard' },
  { key: 'assets',       label: 'Assets' },
  { key: 'downtime',     label: 'Downtime' },
  { key: 'maintenance',  label: 'Maintenance' },
  { key: 'prestart',     label: 'Prestarts' },
  { key: 'scanner',      label: 'Scanner' },
  { key: 'reports',      label: 'Reports' },
  { key: 'users',        label: 'Users' },
  { key: 'form_builder', label: 'Form Builder' },
];

const STATUS_COLORS = { pending: '#f0a500', active: '#16a34a', suspended: '#dc2626' };

function PinModal({ onConfirm, onCancel, actionLabel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (pin === MASTER_PIN) { onConfirm(); }
    else { setError('Incorrect PIN'); setPin(''); }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#ffffff', border: '1px solid #d6e6f2', borderRadius: '12px', padding: '28px', width: '320px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
        <h3 style={{ color: '#1a2b3c', margin: '0 0 6px' }}>Confirm Action</h3>
        <p style={{ color: '#7a92a8', fontSize: '13px', marginBottom: '20px' }}>{actionLabel}</p>
        <input
          type="password" placeholder="Enter PIN" value={pin}
          onChange={e => { setPin(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          autoFocus
          style={{ width: '100%', padding: '12px', backgroundColor: '#E9F1FA', color: '#1a2b3c', border: '1px solid #00ABE4', borderRadius: '6px', fontSize: '18px', textAlign: 'center', letterSpacing: '6px', boxSizing: 'border-box', marginBottom: '8px' }}
        />
        {error && <p style={{ color: '#dc2626', fontSize: '12px', marginBottom: '8px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #d6e6f2', color: '#7a92a8', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleConfirm} style={{ flex: 1, padding: '10px', background: '#00ABE4', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function MasterAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [tab, setTab] = useState('all');
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pinAction, setPinAction] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    if (!error) setCompanies(data || []);
    setLoading(false);
  };

  const requirePin = (label, action) => {
    setPinAction({ label, onConfirm: () => { setPinAction(null); action(); } });
  };

  const updateCompany = async (id, updates) => {
    setSaving(true);
    const { error } = await supabase.from('companies').update(updates).eq('id', id);
    if (error) { alert('Error: ' + error.message); }
    else {
      await fetchCompanies();
      if (selectedCompany?.id === id) setSelectedCompany(prev => ({ ...prev, ...updates }));
    }
    setSaving(false);
  };

  const setStatus = (id, status) => {
    const labels = { active: 'Approve & activate this company', suspended: 'Suspend this company', pending: 'Set company to pending' };
    requirePin(labels[status] || 'Change company status', () => updateCompany(id, { status }));
  };

  const toggleFeature = (company, featureKey) => {
    const current = company.features?.[featureKey] !== false;
    requirePin(
      `${current ? 'Disable' : 'Enable'} "${FEATURES.find(f => f.key === featureKey)?.label}" for ${company.name}`,
      () => {
        const updated = { ...company.features, [featureKey]: !current };
        updateCompany(company.id, { features: updated });
        if (selectedCompany?.id === company.id) setSelectedCompany(prev => ({ ...prev, features: updated }));
      }
    );
  };

  const saveAssetLimit = (company) => {
    requirePin(`Set asset limit to ${company.asset_limit} for ${company.name}`, () => updateCompany(company.id, { asset_limit: company.asset_limit }));
  };
  // ── Export full company profile as JSON ─────────────────────────────────────
  const exportCompanyProfile = async (company) => {
    try {
      const cid = company.id;
      const [
        { data: users },
        { data: assets },
        { data: maintenance },
        { data: workOrders },
        { data: downtime },
        { data: formTemplates },
        { data: formSubmissions },
        { data: serviceTemplates },
        { data: serviceSubmissions },
        { data: oilSamples },
      ] = await Promise.all([
        supabase.from('user_roles').select('*').eq('company_id', cid),
        supabase.from('assets').select('*').eq('company_id', cid),
        supabase.from('maintenance').select('*').eq('company_id', cid),
        supabase.from('work_orders').select('*').eq('company_id', cid),
        supabase.from('downtime').select('*').eq('company_id', cid),
        supabase.from('form_templates').select('*').eq('company_id', cid),
        supabase.from('form_submissions').select('*').eq('company_id', cid),
        supabase.from('service_sheet_templates').select('*').eq('company_id', cid),
        supabase.from('service_sheet_submissions').select('*').eq('company_id', cid),
        supabase.from('oil_samples').select('*').eq('company_id', cid).catch(() => ({ data: [] })),
      ]);

      const profile = {
        exported_at: new Date().toISOString(),
        exported_by: 'MechIQ Master Admin',
        company,
        users: users || [],
        assets: assets || [],
        maintenance: maintenance || [],
        work_orders: workOrders || [],
        downtime: downtime || [],
        form_templates: formTemplates || [],
        form_submissions: formSubmissions || [],
        service_sheet_templates: serviceTemplates || [],
        service_sheet_submissions: serviceSubmissions || [],
        oil_samples: oilSamples || [],
        note: 'Photos are stored in Supabase Storage. URLs are embedded in form_submissions.responses and asset records.',
      };

      const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MechIQ_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      alert('Export failed: ' + err.message);
      return false;
    }
  };

  // ── Delete company and all related data ──────────────────────────────────────
  const handleDeleteCompany = (company) => {
    requirePin(
      `PERMANENTLY DELETE "${company.name}" — this cannot be undone`,
      async () => {
        setDeleting(true);
        // First export the full profile
        const exported = await exportCompanyProfile(company);
        if (!exported) { setDeleting(false); return; }

        // Then delete all related data in order (child tables first)
        const cid = company.id;
        const tables = [
          'oil_samples', 'service_sheet_submissions', 'service_sheet_templates',
          'form_submissions', 'form_templates', 'downtime',
          'work_orders', 'maintenance', 'assets', 'user_roles',
        ];
        for (const table of tables) {
          const { error } = await supabase.from(table).delete().eq('company_id', cid);
          if (error) console.warn(`Could not delete from ${table}:`, error.message);
        }
        // Finally delete the company itself
        const { error } = await supabase.from('companies').delete().eq('id', cid);
        if (error) { alert('Error deleting company: ' + error.message); setDeleting(false); return; }

        setDeleting(false);
        setSelectedCompany(null);
        await fetchCompanies();
        alert(`"${company.name}" has been deleted. Profile saved to your Downloads folder.`);
      }
    );
  };



  const filteredCompanies = companies.filter(c => {
    const matchTab = tab === 'all' || c.status === tab;
    const matchSearch = !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = {
    all: companies.length,
    pending: companies.filter(c => c.status === 'pending').length,
    active: companies.filter(c => c.status === 'active').length,
    suspended: companies.filter(c => c.status === 'suspended').length,
  };

  const btnStyle = (color) => ({ padding: '6px 14px', borderRadius: '5px', border: 'none', backgroundColor: color, color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 });

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {pinAction && <PinModal actionLabel={pinAction.label} onConfirm={pinAction.onConfirm} onCancel={() => setPinAction(null)} />}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#1a2b3c', margin: 0, fontWeight: 400, letterSpacing: '1px' }}>⚙️ Master Admin <span style={{ color: '#1a2b3c', fontWeight: 700 }}>Panel</span></h2>
        <p style={{ color: '#7a92a8', margin: '4px 0 0', fontSize: '13px' }}>Manage company registrations, features and access · Mech IQ</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: counts.all, color: '#00ABE4' },
          { label: 'Pending', value: counts.pending, color: '#f0a500' },
          { label: 'Active', value: counts.active, color: '#16a34a' },
          { label: 'Suspended', value: counts.suspended, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#ffffff', border: '1px solid #d6e6f2', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#7a92a8', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCompany ? '1fr 380px' : '1fr', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['all', 'pending', 'active', 'suspended'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, backgroundColor: tab === t ? '#00ABE4' : '#E9F1FA', color: tab === t ? '#fff' : '#3d5166' }}>
                {t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t]})
              </button>
            ))}
            <input placeholder="Search companies..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ marginLeft: 'auto', padding: '6px 12px', backgroundColor: '#fff', color: '#1a2b3c', border: '1px solid #d6e6f2', borderRadius: '6px', fontSize: '13px', width: '180px' }} />
          </div>

          {loading ? <p style={{ color: '#7a92a8' }}>Loading...</p> : (
            filteredCompanies.length === 0 ? <p style={{ color: '#7a92a8' }}>No companies found.</p> :
              filteredCompanies.map(c => (
                <div key={c.id}
                  style={{ backgroundColor: '#ffffff', border: `1px solid ${selectedCompany?.id === c.id ? '#00ABE4' : '#d6e6f2'}`, borderRadius: '8px', padding: '16px', marginBottom: '10px', cursor: 'pointer' }}
                  onClick={() => setSelectedCompany(c)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ color: '#1a2b3c', fontWeight: 700, fontSize: '15px' }}>{c.name}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: STATUS_COLORS[c.status] + '22', color: STATUS_COLORS[c.status] }}>{c.status}</span>
                        {c.plan && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', backgroundColor: '#E9F1FA', color: '#3d5166' }}>{c.plan}</span>}
                      </div>
                      <div style={{ color: '#7a92a8', fontSize: '12px' }}>{c.industry} · {c.contact_name} · {c.phone}</div>
                      {c.abn && <div style={{ color: '#7a92a8', fontSize: '11px', marginTop: '2px' }}>ABN: {c.abn}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '10px' }}>
                      {c.status === 'pending' && (<><button style={btnStyle('#16a34a')} onClick={e => { e.stopPropagation(); setStatus(c.id, 'active'); }}>✓ Approve</button><button style={btnStyle('#dc2626')} onClick={e => { e.stopPropagation(); setStatus(c.id, 'suspended'); }}>✕ Reject</button></>)}
                      {c.status === 'active' && <button style={btnStyle('#dc2626')} onClick={e => { e.stopPropagation(); setStatus(c.id, 'suspended'); }}>Suspend</button>}
                      {c.status === 'suspended' && <button style={btnStyle('#16a34a')} onClick={e => { e.stopPropagation(); setStatus(c.id, 'active'); }}>Reactivate</button>}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {FEATURES.map(f => (
                      <span key={f.key} style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '10px', backgroundColor: c.features?.[f.key] !== false ? '#e8eaed' : '#f0f0f0', color: c.features?.[f.key] !== false ? '#1a2b3c' : '#9aa0a8', border: `1px solid ${c.features?.[f.key] !== false ? '#c0c8d0' : '#dde0e3'}` }}>{f.label}</span>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>

        {selectedCompany && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #d6e6f2', borderRadius: '10px', padding: '20px', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#00ABE4', margin: 0, fontSize: '16px' }}>{selectedCompany.name}</h3>
              <button onClick={() => setSelectedCompany(null)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              {[
                { label: 'Status', value: selectedCompany.status, color: STATUS_COLORS[selectedCompany.status] },
                { label: 'Plan', value: selectedCompany.plan || '—' },
                { label: 'Industry', value: selectedCompany.industry },
                { label: 'Contact', value: selectedCompany.contact_name },
                { label: 'Phone', value: selectedCompany.phone },
                { label: 'ABN', value: selectedCompany.abn || '—' },
                { label: 'Address', value: selectedCompany.address || '—' },
                { label: 'Registered', value: selectedCompany.created_at ? new Date(selectedCompany.created_at).toLocaleDateString() : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#7a92a8' }}>{row.label}</span>
                  <span style={{ color: row.color || '#fff', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '16px', borderTop: '1px solid #d6e6f2', paddingTop: '14px' }}>
              <label style={{ color: '#7a92a8', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Asset Limit</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="number" value={selectedCompany.asset_limit || 10}
                  onChange={e => setSelectedCompany(prev => ({ ...prev, asset_limit: parseInt(e.target.value) }))}
                  style={{ width: '80px', padding: '7px 10px', backgroundColor: '#E9F1FA', color: '#1a2b3c', border: '1px solid #00ABE4', borderRadius: '5px', fontSize: '14px' }} />
                <button style={btnStyle('#00ABE4')} onClick={() => saveAssetLimit(selectedCompany)}>{saving ? '...' : '🔒 Save'}</button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #d6e6f2', paddingTop: '14px', marginBottom: '16px' }}>
              <div style={{ color: '#7a92a8', fontSize: '12px', marginBottom: '10px' }}>FEATURE ACCESS</div>
              {FEATURES.map(f => {
                const enabled = selectedCompany.features?.[f.key] !== false;
                return (
                  <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#fff', fontSize: '13px' }}>{f.label}</span>
                    <button onClick={() => toggleFeature(selectedCompany, f.key)} style={{ padding: '4px 12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, backgroundColor: enabled ? '#e8eaed' : '#f0f0f0', color: enabled ? '#1a2b3c' : '#9aa0a8', border: `1px solid ${enabled ? '#c0c8d0' : '#dde0e3'}` }}>
                      {enabled ? '✓ ON' : '✕ OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid #d6e6f2', paddingTop: '14px' }}>
              <div style={{ color: '#7a92a8', fontSize: '12px', marginBottom: '10px' }}>ACCOUNT ACTIONS</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedCompany.status !== 'active' && <button style={btnStyle('#16a34a')} onClick={() => setStatus(selectedCompany.id, 'active')}>🔒 Activate</button>}
                {selectedCompany.status !== 'suspended' && <button style={btnStyle('#dc2626')} onClick={() => setStatus(selectedCompany.id, 'suspended')}>🔒 Suspend</button>}
                {selectedCompany.status !== 'pending' && <button style={btnStyle('#f0a500')} onClick={() => setStatus(selectedCompany.id, 'pending')}>🔒 Set Pending</button>}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #d6e6f2', paddingTop: '14px', marginTop: '4px' }}>
              <div style={{ color: '#7a92a8', fontSize: '12px', marginBottom: '10px' }}>DATA</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button style={btnStyle('#3d5166')} onClick={() => exportCompanyProfile(selectedCompany)}>Export Profile</button>
                <button style={{ ...btnStyle('#dc2626'), opacity: deleting ? 0.6 : 1 }} disabled={deleting} onClick={() => handleDeleteCompany(selectedCompany)}>
                  {deleting ? 'Deleting...' : 'Delete Company'}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#7a92a8', marginTop: '8px', lineHeight: '1.5' }}>
                Delete exports a full JSON backup to Downloads first, then permanently removes all company data.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MasterAdmin;
