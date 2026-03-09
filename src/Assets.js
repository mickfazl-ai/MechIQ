import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import Depreciation from './Depreciation';
import { QRCodeCanvas } from 'qrcode.react';

// ─── Sub-tab styles ───────────────────────────────────────────────────────────
const TAB_BAR = {
  display: 'flex', gap: '4px', marginBottom: '24px',
  borderBottom: '2px solid #E9F1FA', paddingBottom: '0',
};
const TAB_BTN = (active) => ({
  padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  border: 'none', background: 'transparent',
  color: active ? '#00ABE4' : '#7a92a8',
  borderBottom: active ? '2px solid #00ABE4' : '2px solid transparent',
  marginBottom: '-2px', borderRadius: '4px 4px 0 0', transition: 'color 0.15s',
});

// ─── QR Print Modal (unchanged) ──────────────────────────────────────────────
function QRPrintModal({ asset, onClose }) {
  const hiddenQrRef = useRef(null);
  const qrValue = `https://maintain-iq.vercel.app/asset/${asset.id}`;

  const handlePrint = () => {
    const canvas = hiddenQrRef.current?.querySelector('canvas');
    if (!canvas) { alert('QR code not ready, please wait a moment and try again.'); return; }
    const qrDataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Label - ${asset.asset_number}</title>
  <style>
    @page { size: 85.6mm 54mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 85.6mm; height: 54mm; background: #000000 !important;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    .card { width: 85.6mm; height: 54mm; background: #000000 !important;
      display: flex; flex-direction: row; align-items: center; padding: 5mm; gap: 4mm; }
    .qr-block { flex-shrink: 0; width: 36mm; height: 36mm; background: #ffffff; padding: 1.5mm; border-radius: 1.5mm; }
    .qr-block img { width: 100%; height: 100%; display: block; }
    .text-block { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 36mm; }
    .label-company { font-family: Arial, sans-serif; font-size: 6pt; color: #777777; letter-spacing: 0.5px; }
    .label-number { font-family: Arial, sans-serif; font-size: 22pt; font-weight: 900; color: #00ABE4; line-height: 1; letter-spacing: 1px; }
    .label-name { font-family: Arial, sans-serif; font-size: 9.5pt; font-weight: 700; color: #ffffff; }
    .label-meta { font-family: Arial, sans-serif; font-size: 6.5pt; color: #888888; }
    .label-brand { font-family: Arial, sans-serif; font-size: 9pt; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-align: right; }
    .label-brand .iq { color: #00ABE4; }
  </style>
</head>
<body>
  <div class="card">
    <div class="qr-block"><img src="${qrDataUrl}" /></div>
    <div class="text-block">
      <div>
        <div class="label-company">COMPANY: ${(asset.company_id || '').substring(0, 8).toUpperCase()}</div>
        <div class="label-number">${asset.asset_number || 'AST-0000'}</div>
        <div class="label-name">${asset.name}</div>
        <div class="label-meta">${asset.type} · ${asset.location}</div>
      </div>
      <div class="label-brand">MECH<span class="iq">IQ</span></div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', border: '1px solid #d6e6f2', borderRadius: '12px', padding: '28px', width: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#1a2b3c', margin: 0 }}>QR Label Preview</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div ref={hiddenQrRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <QRCodeCanvas value={qrValue} size={300} level="H" />
        </div>
        <div style={{ background: '#000', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '6px', padding: '5px', flexShrink: 0, width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QRCodeCanvas value={qrValue} size={80} level="H" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, height: '90px' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#666', letterSpacing: '0.5px' }}>COMPANY: {(asset.company_id || '').substring(0, 8).toUpperCase()}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#00ABE4', letterSpacing: '1px', lineHeight: 1.1 }}>{asset.asset_number || 'AST-0000'}</div>
              <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>{asset.name}</div>
              <div style={{ fontSize: '9px', color: '#666' }}>{asset.type} · {asset.location}</div>
            </div>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '2px', textAlign: 'right' }}>MECH<span style={{ color: '#00ABE4' }}>IQ</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#E9F1FA', border: '1px solid #d6e6f2', color: '#3d5166', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handlePrint} style={{ background: '#00ABE4', border: 'none', color: '#fff', padding: '8px 22px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>Print Label</button>
        </div>
      </div>
    </div>
  );
}

// ─── Units tab (original assets table) ───────────────────────────────────────
function UnitsTab({ userRole, onViewAsset }) {
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingHours, setEditingHours] = useState('');
  const [newAsset, setNewAsset] = useState({ name: '', type: '', location: '', status: 'Running', hourly_rate: '', target_hours: 8 });
  const [loading, setLoading] = useState(true);
  const [printAsset, setPrintAsset] = useState(null);

  useEffect(() => { if (userRole?.company_id) fetchAssets(); }, [userRole]);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('assets').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    if (error) console.log('Error fetching assets:', error);
    else setAssets(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (newAsset.name && newAsset.type && newAsset.location) {
      const { error } = await supabase.from('assets').insert([{ ...newAsset, company_id: userRole.company_id }]);
      if (error) alert('Error: ' + error.message);
      else { fetchAssets(); setNewAsset({ name: '', type: '', location: '', status: 'Running', hourly_rate: '', target_hours: 8 }); setShowForm(false); }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchAssets();
    }
  };

  const saveTargetHours = async (id) => {
    const { error } = await supabase.from('assets').update({ target_hours: parseFloat(editingHours) }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else { fetchAssets(); setEditingId(null); }
  };

  return (
    <div>
      {printAsset && <QRPrintModal asset={printAsset} onClose={() => setPrintAsset(null)} />}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        {userRole?.role !== 'technician' && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Asset</button>
        )}
      </div>
      {showForm && (
        <div className="form-card">
          <h3>Register New Asset</h3>
          <div className="form-grid">
            <input placeholder="Asset Name" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
            <select value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
              <option value="">Select Type</option>
              <option>Mobile Plant</option>
              <option>Fixed Plant</option>
              <option>Drilling Plant</option>
              <option>Small Machinery</option>
            </select>
            <input placeholder="Location / Site" value={newAsset.location} onChange={e => setNewAsset({...newAsset, location: e.target.value})} />
            <select value={newAsset.status} onChange={e => setNewAsset({...newAsset, status: e.target.value})}>
              <option>Running</option>
              <option>Down</option>
              <option>Maintenance</option>
            </select>
            <input placeholder="Hourly Rate ($/hr)" type="number" value={newAsset.hourly_rate} onChange={e => setNewAsset({...newAsset, hourly_rate: e.target.value})} />
            <input placeholder="Target Hours/Day (e.g. 8)" type="number" value={newAsset.target_hours} onChange={e => setNewAsset({...newAsset, target_hours: e.target.value})} />
          </div>
          <button className="btn-primary" onClick={handleAdd}>Save Asset</button>
        </div>
      )}
      {loading ? <p style={{color:'#7a92a8'}}>Loading assets...</p> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset No.</th>
              <th>Asset Name</th>
              <th>Type</th>
              <th>Location</th>
              <th>Hourly Rate</th>
              <th>Target Hrs/Day</th>
              <th>Status</th>
              <th>View</th>
              <th>QR</th>
              {userRole?.role !== 'technician' && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => (
              <tr key={asset.id}>
                <td style={{color:'#00ABE4', fontWeight:'bold'}}>{asset.asset_number || '-'}</td>
                <td>{asset.name}</td>
                <td>{asset.type}</td>
                <td>{asset.location}</td>
                <td>{asset.hourly_rate ? `$${asset.hourly_rate}/hr` : '-'}</td>
                <td>
                  {editingId === asset.id ? (
                    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                      <input type="number" value={editingHours} onChange={e => setEditingHours(e.target.value)}
                        style={{width:'60px', padding:'4px', backgroundColor:'#E9F1FA', color:'#1a2b3c', border:'1px solid #00ABE4', borderRadius:'4px'}} />
                      <button className="btn-primary" style={{padding:'3px 8px', fontSize:'12px'}} onClick={() => saveTargetHours(asset.id)}>✓</button>
                      <button onClick={() => setEditingId(null)} style={{background:'transparent', color:'#7a92a8', border:'none', cursor:'pointer'}}>✕</button>
                    </div>
                  ) : (
                    <span onClick={() => { setEditingId(asset.id); setEditingHours(asset.target_hours || 8); }}
                      style={{cursor:'pointer', color:'#00ABE4'}} title="Click to edit">
                      {asset.target_hours || 8} hrs
                    </span>
                  )}
                </td>
                <td><span className={`status-badge ${asset.status.toLowerCase()}`}>{asset.status}</span></td>
                <td>
                  <button className="btn-primary" style={{fontSize:'12px', padding:'4px 10px'}} onClick={() => onViewAsset && onViewAsset(asset.id)}>
                    View
                  </button>
                </td>
                <td>
                  <button onClick={() => setPrintAsset(asset)} style={{ background: '#E9F1FA', border: '1px solid #d6e6f2', color: '#00ABE4', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    QR
                  </button>
                </td>
                {userRole?.role !== 'technician' && (
                  <td><button className="btn-delete" onClick={() => handleDelete(asset.id, asset.name)}>Delete</button></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────
// ─── Onboarding Tab ───────────────────────────────────────────────────────────
const STEP_LABELS = ['Basic Info', 'Specifications', 'Registration', 'Purchase Details', 'QR Code'];

function StepIndicator({ current, total, labels }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', padding: '0 4px' }}>
      {labels.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < total - 1 ? 'none' : 1 }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                backgroundColor: done ? '#16a34a' : active ? '#00ABE4' : '#d6e6f2',
                color: done || active ? '#fff' : '#7a92a8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                boxShadow: active ? '0 0 0 3px rgba(0,171,228,0.2)' : 'none',
              }}>
                {done ? '\u2713' : i + 1}
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px', color: active ? '#00ABE4' : done ? '#16a34a' : '#7a92a8', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>
                {label}
              </div>
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: '2px', backgroundColor: done ? '#16a34a' : '#d6e6f2', margin: '0 6px', marginBottom: '18px', transition: 'background-color 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FieldGroup({ title, children, optional }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid #E9F1FA' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#7a92a8', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</span>
        {optional && <span style={{ fontSize: '10px', color: '#00ABE4', fontWeight: 600, backgroundColor: '#e8f7fd', padding: '1px 7px', borderRadius: '10px' }}>Optional</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3d5166', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const iStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #d6e6f2',
  borderRadius: '6px', fontSize: '13px', color: '#1a2b3c',
  backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Barlow, sans-serif',
};
const iStyleFocus = { ...iStyle, borderColor: '#00ABE4', boxShadow: '0 0 0 3px rgba(0,171,228,0.1)' };

function FInput({ value, onChange, placeholder, type = 'text', required, readOnly }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required} readOnly={readOnly}
      style={readOnly ? { ...iStyle, backgroundColor: '#f5f8fb', color: '#7a92a8' } : focused ? iStyleFocus : iStyle}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    />
  );
}

// ── Depreciation calculator ───────────────────────────────────────────────────
function calcDepreciation(purchasePrice, purchaseDate, year) {
  if (!purchasePrice || purchasePrice <= 0) return null;
  const now = new Date();
  let ageYears = 0;
  if (purchaseDate) {
    ageYears = (now - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25);
  } else if (year) {
    ageYears = now.getFullYear() - parseInt(year);
  }
  if (ageYears < 0) ageYears = 0;
  // Straight-line over 10 years, 10% residual
  const usefulLife = 10;
  const residualRate = 0.10;
  const residualValue = purchasePrice * residualRate;
  const annualDepreciation = (purchasePrice - residualValue) / usefulLife;
  const accumulatedDepreciation = Math.min(annualDepreciation * ageYears, purchasePrice - residualValue);
  const currentValue = Math.max(purchasePrice - accumulatedDepreciation, residualValue);
  const depreciationRate = ((purchasePrice - currentValue) / purchasePrice) * 100;
  const yearsRemaining = Math.max(usefulLife - ageYears, 0);
  return {
    purchasePrice,
    currentValue: Math.round(currentValue),
    residualValue: Math.round(residualValue),
    accumulatedDepreciation: Math.round(accumulatedDepreciation),
    annualDepreciation: Math.round(annualDepreciation),
    depreciationRate: Math.round(depreciationRate * 10) / 10,
    ageYears: Math.round(ageYears * 10) / 10,
    yearsRemaining: Math.round(yearsRemaining * 10) / 10,
  };
}

function OnboardingTab({ userRole, onComplete }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAsset, setSavedAsset] = useState(null);
  const [hasRego, setHasRego] = useState(false);
  const qrRef = useRef(null);

  const isAdmin = userRole?.role === 'admin' || userRole?.role === 'master';

  const emptyForm = {
    name: '', asset_number: '', type: '', make: '', model: '',
    location: '', status: 'Active', year: '', colour: '',
    vin: '', serial_number: '', engine_number: '', engine_model: '',
    hours: '', target_hours: '8', hourly_rate: '',
    // Registration (step 2 - optional)
    registration: '', registration_expiry: '', license_class: '',
    registration_state: '', tare_weight: '', gvm: '', insurance_policy: '',
    insurance_expiry: '',
    // Purchase / admin (step 3)
    purchase_date: '', purchase_price: '', supplier: '', warranty_expiry: '', notes: '',
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    supabase.from('assets').select('asset_number').eq('company_id', userRole.company_id)
      .then(({ data }) => {
        const nums = (data || []).map(a => parseInt((a.asset_number || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        setForm(f => ({ ...f, asset_number: `AST-${String(next).padStart(4, '0')}` }));
      });
  }, [userRole.company_id]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const depr = calcDepreciation(
    parseFloat(form.purchase_price),
    form.purchase_date,
    form.year
  );

  const canProceed = () => {
    if (step === 0) return form.name.trim() && form.type.trim() && form.asset_number.trim();
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      company_id: userRole.company_id,
      name: form.name, asset_number: form.asset_number, type: form.type,
      make: form.make, model: form.model, location: form.location,
      status: form.status, year: parseInt(form.year) || null, colour: form.colour,
      vin: form.vin, serial_number: form.serial_number,
      engine_number: form.engine_number, engine_model: form.engine_model,
      hours: parseFloat(form.hours) || 0,
      target_hours: parseFloat(form.target_hours) || 8,
      hourly_rate: parseFloat(form.hourly_rate) || null,
      registration: hasRego ? form.registration : null,
      registration_expiry: hasRego && form.registration_expiry ? form.registration_expiry : null,
      license_class: hasRego ? form.license_class : null,
      registration_state: hasRego ? form.registration_state : null,
      tare_weight: hasRego && form.tare_weight ? parseFloat(form.tare_weight) : null,
      gvm: hasRego && form.gvm ? parseFloat(form.gvm) : null,
      insurance_policy: hasRego ? form.insurance_policy : null,
      insurance_expiry: hasRego && form.insurance_expiry ? form.insurance_expiry : null,
      notes: form.notes,
      ...(isAdmin ? {
        purchase_date: form.purchase_date || null,
        purchase_price: parseFloat(form.purchase_price) || null,
        supplier: form.supplier,
        warranty_expiry: form.warranty_expiry || null,
        // Store depreciation snapshot at time of onboarding
        depreciation_snapshot: depr ? JSON.stringify(depr) : null,
      } : {}),
    };
    const { data, error } = await supabase.from('assets').insert([payload]).select().single();
    setSaving(false);
    if (error) { alert('Error saving asset: ' + error.message); return; }
    setSavedAsset(data);
    setStep(4);
  };

  const handlePrintQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const qrDataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html><head>
  <title>QR Label - ${savedAsset.asset_number}</title>
  <style>
    @page { size: 85.6mm 54mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 85.6mm; height: 54mm; background: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .card { width: 85.6mm; height: 54mm; background: #000 !important; display: flex; align-items: center; padding: 5mm; gap: 4mm; }
    .qr-block { flex-shrink: 0; width: 36mm; height: 36mm; background: #fff; padding: 1.5mm; border-radius: 1.5mm; }
    .qr-block img { width: 100%; height: 100%; display: block; }
    .text-block { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 36mm; }
    .lc { font-family: Arial; font-size: 6pt; color: #777; letter-spacing: 0.5px; }
    .ln { font-family: Arial; font-size: 22pt; font-weight: 900; color: #00ABE4; line-height: 1; }
    .lname { font-family: Arial; font-size: 9.5pt; font-weight: 700; color: #fff; }
    .lmeta { font-family: Arial; font-size: 6.5pt; color: #888; }
    .lbrand { font-family: Arial; font-size: 9pt; font-weight: 900; color: #fff; letter-spacing: 2px; text-align: right; }
    .lbrand .iq { color: #00ABE4; }
  </style>
</head><body>
  <div class="card">
    <div class="qr-block"><img src="${qrDataUrl}" /></div>
    <div class="text-block">
      <div class="lc">MECH IQ \u00B7 ASSET TAG</div>
      <div class="ln">${savedAsset.asset_number}</div>
      <div class="lname">${savedAsset.name}</div>
      <div class="lmeta">${savedAsset.type}${savedAsset.make ? ' \u00B7 ' + savedAsset.make : ''}</div>
      <div class="lbrand">MECH <span class="iq">IQ</span></div>
    </div>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    win.document.close();
  };

  const handleOnboardAnother = () => {
    setForm(emptyForm); setSavedAsset(null); setStep(0); setHasRego(false);
    supabase.from('assets').select('asset_number').eq('company_id', userRole.company_id)
      .then(({ data }) => {
        const nums = (data || []).map(a => parseInt((a.asset_number || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        setForm(f => ({ ...f, asset_number: `AST-${String(next).padStart(4, '0')}` }));
      });
  };

  // ── Step 0: Basic Info ───────────────────────────────────────────────────────
  const renderStep0 = () => (
    <>
      <FieldGroup title="Identity">
        <Field label="Asset Name" required>
          <FInput value={form.name} onChange={set('name')} placeholder="e.g. CAT 320 Excavator, Ford Ranger, Generator 1" required />
        </Field>
        <Field label="Asset Number" required>
          <FInput value={form.asset_number} onChange={set('asset_number')} placeholder="AST-0001" required />
        </Field>
        <Field label="Asset Type" required>
          <FInput value={form.type} onChange={set('type')} placeholder="e.g. Excavator, Truck, Compressor, Vehicle..." required />
        </Field>
        <Field label="Status">
          <FInput value={form.status} onChange={set('status')} placeholder="e.g. Active, Down, Standby..." />
        </Field>
      </FieldGroup>
      <FieldGroup title="Details" optional>
        <Field label="Make">
          <FInput value={form.make} onChange={set('make')} placeholder="e.g. CAT, Ford, Honda, Ingersoll Rand..." />
        </Field>
        <Field label="Model">
          <FInput value={form.model} onChange={set('model')} placeholder="e.g. 320GC, Ranger XL, XP185..." />
        </Field>
        <Field label="Year">
          <FInput value={form.year} onChange={set('year')} placeholder="e.g. 2021" type="number" />
        </Field>
        <Field label="Colour">
          <FInput value={form.colour} onChange={set('colour')} placeholder="e.g. Yellow, White, Blue" />
        </Field>
        <Field label="Location / Site" fullWidth>
          <FInput value={form.location} onChange={set('location')} placeholder="e.g. Main Workshop, Site A, Depot 2" />
        </Field>
      </FieldGroup>
    </>
  );

  // ── Step 1: Specifications ───────────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <FieldGroup title="Identification Numbers" optional>
        <Field label="VIN / Chassis Number">
          <FInput value={form.vin} onChange={set('vin')} placeholder="e.g. 1HGBH41JXMN109186" />
        </Field>
        <Field label="Serial Number">
          <FInput value={form.serial_number} onChange={set('serial_number')} placeholder="e.g. SN-XXXXXXXX" />
        </Field>
        <Field label="Engine Number">
          <FInput value={form.engine_number} onChange={set('engine_number')} placeholder="e.g. ENG-XXXXXXX" />
        </Field>
        <Field label="Engine Model">
          <FInput value={form.engine_model} onChange={set('engine_model')} placeholder="e.g. Cummins QSB6.7" />
        </Field>
      </FieldGroup>
      <FieldGroup title="Hours & Operating Rates" optional>
        <Field label="Current Hours / Odometer">
          <FInput value={form.hours} onChange={set('hours')} placeholder="e.g. 4250" type="number" />
        </Field>
        <Field label="Target Hours / Day">
          <FInput value={form.target_hours} onChange={set('target_hours')} placeholder="e.g. 8" type="number" />
        </Field>
        <Field label="Hourly / Day Rate ($/hr)" fullWidth>
          <FInput value={form.hourly_rate} onChange={set('hourly_rate')} placeholder="e.g. 185" type="number" />
        </Field>
      </FieldGroup>
    </>
  );

  // ── Step 2: Registration (optional) ─────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#3d5166', marginBottom: '12px', fontWeight: 600 }}>
          Does this asset have vehicle registration?
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[true, false].map(val => (
            <button
              key={String(val)}
              onClick={() => setHasRego(val)}
              style={{
                padding: '10px 28px', borderRadius: '8px', border: '2px solid',
                borderColor: hasRego === val ? '#00ABE4' : '#d6e6f2',
                backgroundColor: hasRego === val ? '#e8f7fd' : '#fff',
                color: hasRego === val ? '#00ABE4' : '#7a92a8',
                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              }}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {hasRego && (
        <>
          <FieldGroup title="Registration Details">
            <Field label="Registration Number" required>
              <FInput value={form.registration} onChange={set('registration')} placeholder="e.g. ABC123" />
            </Field>
            <Field label="Registration State">
              <FInput value={form.registration_state} onChange={set('registration_state')} placeholder="e.g. QLD, NSW, WA" />
            </Field>
            <Field label="Registration Expiry">
              <FInput value={form.registration_expiry} onChange={set('registration_expiry')} type="date" />
            </Field>
            <Field label="Licence Class">
              <FInput value={form.license_class} onChange={set('license_class')} placeholder="e.g. LR, MR, HR, HC" />
            </Field>
            <Field label="Tare Weight (kg)">
              <FInput value={form.tare_weight} onChange={set('tare_weight')} placeholder="e.g. 2100" type="number" />
            </Field>
            <Field label="GVM (kg)">
              <FInput value={form.gvm} onChange={set('gvm')} placeholder="e.g. 3500" type="number" />
            </Field>
          </FieldGroup>
          <FieldGroup title="Insurance" optional>
            <Field label="Insurance Policy #">
              <FInput value={form.insurance_policy} onChange={set('insurance_policy')} placeholder="e.g. POL-2024-XXXX" />
            </Field>
            <Field label="Insurance Expiry">
              <FInput value={form.insurance_expiry} onChange={set('insurance_expiry')} type="date" />
            </Field>
          </FieldGroup>
        </>
      )}

      {!hasRego && (
        <div style={{ padding: '32px', textAlign: 'center', color: '#7a92a8', backgroundColor: '#f8fbfd', borderRadius: '8px', border: '1px dashed #d6e6f2' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>No registration required</div>
          <div style={{ fontSize: '13px' }}>Click Next to continue to purchase details.</div>
        </div>
      )}
    </>
  );

  // ── Step 3: Purchase & Depreciation ─────────────────────────────────────────
  const renderStep3 = () => (
    <>
      {isAdmin ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px' }}>
            <span style={{ fontSize: '15px' }}>🔒</span>
            <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>Admin Only — purchase price and depreciation visible to admins only</span>
          </div>
          <FieldGroup title="Purchase Information" optional>
            <Field label="Purchase Date">
              <FInput value={form.purchase_date} onChange={set('purchase_date')} type="date" />
            </Field>
            <Field label="Purchase Price ($)">
              <FInput value={form.purchase_price} onChange={set('purchase_price')} placeholder="e.g. 320000" type="number" />
            </Field>
            <Field label="Supplier / Dealer" fullWidth>
              <FInput value={form.supplier} onChange={set('supplier')} placeholder="e.g. WesTrac, Coates, local dealer" />
            </Field>
            <Field label="Warranty Expiry" fullWidth>
              <FInput value={form.warranty_expiry} onChange={set('warranty_expiry')} type="date" />
            </Field>
          </FieldGroup>

          {/* Live depreciation preview */}
          {depr ? (
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#E9F1FA', borderRadius: '10px', border: '1px solid #d6e6f2' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#7a92a8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
                Depreciation Preview (Straight-Line, 10yr, 10% Residual)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Purchase Price', value: `$${depr.purchasePrice.toLocaleString()}` },
                  { label: 'Current Value', value: `$${depr.currentValue.toLocaleString()}`, highlight: true },
                  { label: 'Residual Value', value: `$${depr.residualValue.toLocaleString()}` },
                  { label: 'Asset Age', value: `${depr.ageYears} yrs` },
                  { label: 'Annual Depr.', value: `$${depr.annualDepreciation.toLocaleString()}/yr` },
                  { label: 'Depreciated', value: `${depr.depreciationRate}%`, warn: depr.depreciationRate > 70 },
                ].map(({ label, value, highlight, warn }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#7a92a8', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: warn ? '#dc2626' : highlight ? '#00ABE4' : '#1a2b3c' }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#7a92a8', textAlign: 'center' }}>
                This snapshot will be saved with the asset and visible in the Depreciation tab.
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', backgroundColor: '#f8fbfd', borderRadius: '8px', border: '1px dashed #d6e6f2', textAlign: 'center', color: '#7a92a8', fontSize: '13px', marginBottom: '16px' }}>
              Enter a purchase price above to see an automatic depreciation preview.
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 14px', backgroundColor: '#E9F1FA', border: '1px solid #d6e6f2', borderRadius: '8px' }}>
          <span style={{ fontSize: '15px' }}>🔒</span>
          <span style={{ fontSize: '12px', color: '#3d5166', fontWeight: 600 }}>Purchase and depreciation details are visible to admins only.</span>
        </div>
      )}

      <FieldGroup title="Notes" optional>
        <Field label="Additional Notes" fullWidth>
          <textarea value={form.notes} onChange={set('notes')}
            placeholder="Any additional notes about this asset..."
            style={{ ...iStyle, minHeight: '80px', resize: 'vertical' }} />
        </Field>
      </FieldGroup>
    </>
  );

  // ── Step 4: QR Done ──────────────────────────────────────────────────────────
  const renderStep4 = () => {
    if (!savedAsset) return null;
    const qrValue = `https://maintain-iq.vercel.app/asset/${savedAsset.id}`;
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>\uD83C\uDF89</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#1a2b3c', marginBottom: '4px' }}>{savedAsset.asset_number} onboarded!</div>
        <div style={{ fontSize: '14px', color: '#7a92a8', marginBottom: '32px' }}>{savedAsset.name}</div>
        <div style={{ display: 'inline-block', padding: '20px', backgroundColor: '#fff', border: '2px solid #d6e6f2', borderRadius: '16px', marginBottom: '24px' }}>
          <div ref={qrRef}><QRCodeCanvas value={qrValue} size={180} level="H" /></div>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#7a92a8', fontFamily: 'monospace' }}>{qrValue}</div>
        </div>
        <div style={{ backgroundColor: '#E9F1FA', borderRadius: '10px', padding: '16px', marginBottom: '28px', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          {[
            ['Asset Number', savedAsset.asset_number],
            ['Type', savedAsset.type],
            ['Make / Model', [savedAsset.make, savedAsset.model].filter(Boolean).join(' ') || '\u2014'],
            ['Location', savedAsset.location || '\u2014'],
            ['Serial No.', savedAsset.serial_number || '\u2014'],
            ['VIN', savedAsset.vin || '\u2014'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: '10px', color: '#7a92a8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a2b3c' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handlePrintQR} style={{ backgroundColor: '#00ABE4', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Print QR Label</button>
          <button onClick={handleOnboardAnother} style={{ backgroundColor: '#fff', color: '#00ABE4', border: '2px solid #00ABE4', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Onboard Another</button>
          {onComplete && <button onClick={onComplete} style={{ backgroundColor: '#E9F1FA', color: '#3d5166', border: '1px solid #d6e6f2', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Go to Units</button>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a2b3c', margin: '0 0 4px' }}>Asset Onboarding</h2>
      <p style={{ fontSize: '13px', color: '#7a92a8', margin: '0 0 24px' }}>Register any asset, vehicle, or equipment and generate its QR tag.</p>
      <StepIndicator current={step} total={STEP_LABELS.length} labels={STEP_LABELS} />
      <div style={{ backgroundColor: '#fff', border: '1px solid #d6e6f2', borderRadius: '12px', padding: '28px' }}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step < 4 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E9F1FA' }}>
            <button onClick={() => setStep(s => s - 1)} disabled={step === 0}
              style={{ backgroundColor: '#E9F1FA', color: step === 0 ? '#b0c4d4' : '#3d5166', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: step === 0 ? 'default' : 'pointer' }}>
              Back
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                style={{ backgroundColor: canProceed() ? '#00ABE4' : '#d6e6f2', color: canProceed() ? '#fff' : '#7a92a8', border: 'none', padding: '10px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: canProceed() ? 'pointer' : 'default', transition: 'all 0.15s' }}>
                Next
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Saving...' : 'Save & Generate QR'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Placeholder (for tabs not yet built) ────────────────────────────────────
function PlaceholderTab({ label }) {
  return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#7a92a8' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#3d5166', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '13px' }}>This section is coming soon.</div>
    </div>
  );
}

// ─── Main Assets component ────────────────────────────────────────────────────
const TABS = [
  { id: 'units',        label: 'Units' },
  { id: 'onboarding',  label: 'Onboarding' },
  { id: 'depreciation',label: 'Depreciation' },
  { id: 'tracker',     label: 'Tracker' },
];

function Assets({ userRole, onViewAsset, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'units');

  // If navbar sends a new initialTab (e.g. clicking Depreciation), switch to it
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const renderTab = () => {
    switch (activeTab) {
      case 'units':        return <UnitsTab userRole={userRole} onViewAsset={onViewAsset} />;
      case 'onboarding':  return <OnboardingTab userRole={userRole} onComplete={() => setActiveTab('units')} />;
      case 'depreciation':return <Depreciation userRole={userRole} />;
      case 'tracker':     return <PlaceholderTab label="Tracker" />;
      default:            return <UnitsTab userRole={userRole} onViewAsset={onViewAsset} />;
    }
  };

  return (
    <div className="assets">
      <div className="page-header">
        <h2>Assets</h2>
      </div>
      <div style={TAB_BAR}>
        {TABS.map(t => (
          <button key={t.id} style={TAB_BTN(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  );
}

export default Assets;
