import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
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
      case 'onboarding':  return <PlaceholderTab label="Onboarding" />;
      case 'depreciation':return <PlaceholderTab label="Depreciation" />;
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
