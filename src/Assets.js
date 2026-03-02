import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import QRCode from 'qrcode.react';

function QRPrintModal({ asset, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const qrCanvas = printRef.current?.querySelector('canvas');
    if (!qrCanvas) {
      alert('QR code not ready, please try again.');
      return;
    }
    const qrDataUrl = qrCanvas.toDataURL('image/png');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${asset.asset_number}</title>
          <style>
            @page {
              size: 85.6mm 54mm;
              margin: 0;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 85.6mm;
              height: 54mm;
              background: #000;
              font-family: 'Arial', sans-serif;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 6mm 5mm;
            }
            .qr-wrap {
              flex-shrink: 0;
              width: 36mm;
              height: 36mm;
              background: #fff;
              border-radius: 3mm;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2mm;
            }
            .qr-wrap img {
              width: 100%;
              height: 100%;
            }
            .info {
              flex: 1;
              padding-left: 4mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
            }
            .company {
              font-size: 7pt;
              color: #888;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .asset-number {
              font-size: 16pt;
              font-weight: 900;
              color: #00c2e0;
              letter-spacing: 1px;
              margin: 1mm 0;
              line-height: 1;
            }
            .asset-name {
              font-size: 9pt;
              color: #fff;
              font-weight: 600;
            }
            .asset-meta {
              font-size: 7pt;
              color: #888;
              margin-top: 1mm;
            }
            .branding {
              font-size: 9pt;
              font-weight: 700;
              color: #fff;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .branding span {
              color: #00c2e0;
            }
            .bottom {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
            }
            .scan-text {
              font-size: 6pt;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="qr-wrap">
            <img src="${qrDataUrl}" />
          </div>
          <div class="info">
            <div>
              <div class="company">COMPANY: ${asset.company_id?.substring(0, 8).toUpperCase() || 'N/A'}</div>
              <div class="asset-number">${asset.asset_number || 'AST-0000'}</div>
              <div class="asset-name">${asset.name}</div>
              <div class="asset-meta">${asset.type} · ${asset.location}</div>
            </div>
            <div class="bottom">
              <div class="scan-text">Scan to view asset</div>
              <div class="branding">MAINTAIN<span>IQ</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const qrValue = `https://maintain-iq.vercel.app/asset/${asset.id}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#0a1a1a', border: '1px solid #1a3a3a', borderRadius: '12px',
        padding: '28px', minWidth: '360px', maxWidth: '440px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>QR Label Preview</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Preview Card */}
        <div ref={printRef} style={{
          background: '#000', borderRadius: '10px', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '14px',
          width: '100%', minHeight: '100px', marginBottom: '20px'
        }}>
          {/* QR Code */}
          <div style={{
            background: '#fff', borderRadius: '6px', padding: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <QRCode value={qrValue} size={100} level="H" />
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1 }}>
            <div>
              <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                COMPANY: {asset.company_id?.substring(0, 8).toUpperCase()}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#00c2e0', letterSpacing: '1px', lineHeight: 1.1, margin: '2px 0' }}>
                {asset.asset_number || 'AST-0000'}
              </div>
              <div style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>{asset.name}</div>
              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                {asset.type} · {asset.location}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
              <div style={{ fontSize: '8px', color: '#444' }}>Scan to view asset</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>
                MAINTAIN<span style={{ color: '#00c2e0' }}>IQ</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid #1a3a3a',
            color: '#a0b0b0', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer'
          }}>Cancel</button>
          <button onClick={handlePrint} style={{
            background: '#00c2e0', border: 'none', color: '#000',
            padding: '8px 22px', borderRadius: '6px', cursor: 'pointer',
            fontWeight: 700, fontSize: '14px'
          }}>🖨️ Print Label</button>
        </div>
      </div>
    </div>
  );
}

function Assets({ userRole, onViewAsset }) {
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingHours, setEditingHours] = useState('');
  const [newAsset, setNewAsset] = useState({ name: '', type: '', location: '', status: 'Running', hourly_rate: '', target_hours: 8 });
  const [loading, setLoading] = useState(true);
  const [printAsset, setPrintAsset] = useState(null);

  useEffect(() => {
    if (userRole?.company_id) fetchAssets();
  }, [userRole]);

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
      else {
        fetchAssets();
        setNewAsset({ name: '', type: '', location: '', status: 'Running', hourly_rate: '', target_hours: 8 });
        setShowForm(false);
      }
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
    <div className="assets">
      {printAsset && <QRPrintModal asset={printAsset} onClose={() => setPrintAsset(null)} />}

      <div className="page-header">
        <h2>Assets</h2>
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

      {loading ? <p style={{color:'#a0b0b0'}}>Loading assets...</p> : (
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
                <td style={{color:'#00c2e0', fontWeight:'bold'}}>{asset.asset_number || '-'}</td>
                <td>{asset.name}</td>
                <td>{asset.type}</td>
                <td>{asset.location}</td>
                <td>{asset.hourly_rate ? `$${asset.hourly_rate}/hr` : '-'}</td>
                <td>
                  {editingId === asset.id ? (
                    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                      <input type="number" value={editingHours} onChange={e => setEditingHours(e.target.value)}
                        style={{width:'60px', padding:'4px', backgroundColor:'#0a0f0f', color:'white', border:'1px solid #1a2f2f', borderRadius:'4px'}} />
                      <button className="btn-primary" style={{padding:'3px 8px', fontSize:'12px'}} onClick={() => saveTargetHours(asset.id)}>✓</button>
                      <button onClick={() => setEditingId(null)} style={{background:'transparent', color:'#a0b0b0', border:'none', cursor:'pointer'}}>✕</button>
                    </div>
                  ) : (
                    <span onClick={() => { setEditingId(asset.id); setEditingHours(asset.target_hours || 8); }}
                      style={{cursor:'pointer', color:'#00c2e0'}} title="Click to edit">
                      {asset.target_hours || 8} hrs
                    </span>
                  )}
                </td>
                <td><span className={`status-badge ${asset.status.toLowerCase()}`}>{asset.status}</span></td>
                <td>
                  <button className="btn-primary" style={{fontSize:'12px', padding:'4px 10px'}} onClick={() => onViewAsset && onViewAsset(asset.id)}>
                    📋 View
                  </button>
                </td>
                <td>
                  <button
                    onClick={() => setPrintAsset(asset)}
                    style={{
                      background: 'transparent', border: '1px solid #1a3a3a',
                      color: '#00c2e0', padding: '4px 10px', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '12px'
                    }}
                    title="Print QR Label"
                  >
                    🏷️ QR
                  </button>
                </td>
                {userRole?.role !== 'technician' && (
                  <td>
                    <button className="btn-delete" onClick={() => handleDelete(asset.id, asset.name)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Assets;