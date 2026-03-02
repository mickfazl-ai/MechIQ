import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { QRCodeCanvas } from 'qrcode.react';

function AssetPage({ assetId, userRole, onStartPrestart }) {
  const [asset, setAsset] = useState(null);
  const [recentPrestarts, setRecentPrestarts] = useState([]);
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [recentDowntime, setRecentDowntime] = useState([]);
  const [openWorkOrders, setOpenWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  useEffect(() => { if (assetId) fetchAssetData(); }, [assetId]);

  const fetchAssetData = async () => {
    setLoading(true);
    const { data: assetData } = await supabase.from('assets').select('*').eq('id', assetId).single();
    setAsset(assetData);
    if (assetData) {
      const [prestarts, maintenance, downtime, workorders] = await Promise.all([
        supabase.from('form_submissions').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('date', { ascending: false }).limit(5),
        supabase.from('maintenance').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('created_at', { ascending: false }).limit(5),
        supabase.from('downtime').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('date', { ascending: false }).limit(5),
        supabase.from('work_orders').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).neq('status', 'Complete').order('created_at', { ascending: false })
      ]);
      setRecentPrestarts(prestarts.data || []);
      setRecentMaintenance(maintenance.data || []);
      setRecentDowntime(downtime.data || []);
      setOpenWorkOrders(workorders.data || []);
    }
    setLoading(false);
  };

  const getPriorityColor = (p) => p === 'Critical' ? '#e94560' : p === 'High' ? '#ff6b00' : p === 'Medium' ? '#ffc800' : '#00c264';

  const handlePrint = () => {
  const canvas = document.querySelector('#qr-visible canvas');
  const qrDataUrl = canvas ? canvas.toDataURL() : '';
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>QR - ${asset.name}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
      .card {
        width: 85.6mm;
        height: 53.98mm;
        background: #0a0f0f;
        border-radius: 4mm;
        padding: 5mm;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 4mm;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: '';
        position: absolute;
        top: -10mm;
        right: -10mm;
        width: 35mm;
        height: 35mm;
        background: radial-gradient(circle, #00c2e020, transparent 70%);
        border-radius: 50%;
      }
      .qr-box {
        width: 30mm;
        height: 30mm;
        background: white;
        border-radius: 2mm;
        padding: 1.5mm;
        flex-shrink: 0;
      }
      .qr-box img { width: 100%; height: 100%; }
      .info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
      .company-id { font-size: 7pt; color: #a0b0b0; letter-spacing: 0.5px; margin-bottom: 1mm; }
      .asset-num { font-size: 14pt; font-weight: bold; color: #00c2e0; letter-spacing: 1px; margin-bottom: 1mm; }
      .asset-name { font-size: 9pt; font-weight: bold; color: white; margin-bottom: 1mm; }
      .asset-type { font-size: 7pt; color: #a0b0b0; }
      .brand { font-size: 8pt; font-weight: bold; color: #a0b0b0; margin-top: auto; }
      .brand span { color: #00c2e0; }
      @media print {
        body { background: white; margin: 0; }
        .card { margin: 0; }
      }
    </style></head>
    <body onload="window.print(); window.close();">
      <div class="card">
        <div class="qr-box">
          <img src="${qrDataUrl}" />
        </div>
        <div class="info">
          <div>
            <div class="company-id">COMPANY: ${userRole?.company_id?.substring(0,8).toUpperCase() || 'N/A'}</div>
            <div class="asset-num">${asset.asset_number || 'AST-0000'}</div>
            <div class="asset-name">${asset.name}</div>
            <div class="asset-type">${asset.type} · ${asset.location}</div>
          </div>
          <div class="brand">MAINTAIN<span>IQ</span></div>
        </div>
      </div>
    </body></html>
  `);
  win.document.close();
};

  if (loading) return <p style={{color:'#a0b0b0', padding:'20px'}}>Loading asset...</p>;
  if (!asset) return <p style={{color:'#a0b0b0', padding:'20px'}}>Asset not found</p>;

  const qrUrl = `${window.location.origin}?asset=${assetId}`;

  return (
    <div style={{padding:'0'}}>
      {/* Asset Header */}
      <div style={{background:'linear-gradient(135deg, #0d1515 0%, #1a2f2f 100%)', borderRadius:'8px', padding:'25px', marginBottom:'20px', border:'1px solid #1a2f2f'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'20px'}}>
          <div>
            <div style={{color:'#00c2e0', fontSize:'13px', marginBottom:'4px'}}>{asset.asset_number || 'AST-0000'}</div>
            <h2 style={{margin:'0 0 6px 0', fontSize:'26px'}}>{asset.name}</h2>
            <p style={{color:'#a0b0b0', margin:'0 0 12px 0'}}>{asset.type} · {asset.location}</p>
            <span className={`status-badge ${asset.status?.toLowerCase()}`}>{asset.status}</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'10px'}}>
            {/* Hidden print area */}
            <div id="qr-print-area" style={{display:'none'}}>
              <QRCodeCanvas value={qrUrl} size={120} bgColor="#ffffff" fgColor="#000000" />
            </div>
            <QRCodeCanvas value={qrUrl} size={120} bgColor="#ffffff" fgColor="#000000" style={{borderRadius:'6px', padding:'8px', backgroundColor:'white'}} />
            <button className="btn-primary" style={{fontSize:'12px', padding:'6px 14px'}} onClick={handlePrint}>🖨 Print QR Card</button>
          </div>
        </div>
        <div style={{display:'flex', gap:'20px', marginTop:'15px', flexWrap:'wrap'}}>
          <div style={{textAlign:'center'}}>
            <div style={{color:'#a0b0b0', fontSize:'11px'}}>TARGET HRS/DAY</div>
            <div style={{color:'#00c2e0', fontWeight:'bold', fontSize:'18px'}}>{asset.target_hours || 8}h</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{color:'#a0b0b0', fontSize:'11px'}}>HOURLY RATE</div>
            <div style={{color:'#00c264', fontWeight:'bold', fontSize:'18px'}}>${asset.hourly_rate || 0}/hr</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{color:'#a0b0b0', fontSize:'11px'}}>OPEN WORK ORDERS</div>
            <div style={{color: openWorkOrders.length > 0 ? '#e94560' : '#00c264', fontWeight:'bold', fontSize:'18px'}}>{openWorkOrders.length}</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{color:'#a0b0b0', fontSize:'11px'}}>LAST PRESTART</div>
            <div style={{color:'white', fontWeight:'bold', fontSize:'18px'}}>{recentPrestarts[0]?.date || 'None'}</div>
          </div>
        </div>
      </div>

      {/* Start Prestart Button */}
      <button className="btn-primary" style={{width:'100%', padding:'15px', fontSize:'16px', marginBottom:'20px', borderRadius:'8px'}}
        onClick={() => onStartPrestart(asset.name)}>
        ✓ Start Prestart for {asset.name}
      </button>

      {/* Open Work Orders */}
      {openWorkOrders.length > 0 && (
        <div className="form-card" style={{marginBottom:'20px'}}>
          <h3 style={{color:'#e94560', marginBottom:'12px'}}>⚠ Open Work Orders ({openWorkOrders.length})</h3>
          {openWorkOrders.map(wo => (
            <div key={wo.id} style={{padding:'10px', backgroundColor:'#0a0f0f', borderRadius:'4px', marginBottom:'8px', borderLeft:`3px solid ${getPriorityColor(wo.priority)}`}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                <span style={{color: getPriorityColor(wo.priority), fontWeight:'bold', fontSize:'12px'}}>{wo.priority}</span>
                <span style={{color:'#a0b0b0', fontSize:'12px'}}>{wo.status}</span>
              </div>
              <p style={{color:'white', margin:'0', fontSize:'13px'}}>{wo.defect_description}</p>
              {wo.assigned_to && <p style={{color:'#a0b0b0', margin:'4px 0 0 0', fontSize:'12px'}}>Assigned: {wo.assigned_to}</p>}
            </div>
          ))}
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px'}}>
        {/* Recent Prestarts */}
        <div className="form-card">
          <h3 style={{marginBottom:'12px'}}>Recent Prestarts</h3>
          {recentPrestarts.length === 0 ? <p style={{color:'#a0b0b0', fontSize:'13px'}}>No prestarts yet</p> : recentPrestarts.map(p => (
            <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1a2f2f'}}>
              <div>
                <div style={{color:'white', fontSize:'13px'}}>{p.date}</div>
                <div style={{color:'#a0b0b0', fontSize:'12px'}}>{p.operator_name}</div>
              </div>
              <span style={{color: p.defects_found ? '#e94560' : '#00c264', fontSize:'12px', fontWeight:'bold'}}>
                {p.defects_found ? '⚠ Defects' : '✓ Clear'}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Maintenance */}
        <div className="form-card">
          <h3 style={{marginBottom:'12px'}}>Recent Maintenance</h3>
          {recentMaintenance.length === 0 ? <p style={{color:'#a0b0b0', fontSize:'13px'}}>No maintenance records</p> : recentMaintenance.map(m => (
            <div key={m.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1a2f2f'}}>
              <div>
                <div style={{color:'white', fontSize:'13px'}}>{m.task}</div>
                <div style={{color:'#a0b0b0', fontSize:'12px'}}>{m.frequency}</div>
              </div>
              <span className={`pm-status ${m.status?.toLowerCase().replace(' ', '-')}`} style={{fontSize:'11px'}}>{m.status}</span>
            </div>
          ))}
        </div>

        {/* Recent Downtime */}
        <div className="form-card">
          <h3 style={{marginBottom:'12px'}}>Recent Downtime</h3>
          {recentDowntime.length === 0 ? <p style={{color:'#a0b0b0', fontSize:'13px'}}>No downtime recorded</p> : recentDowntime.map(d => (
            <div key={d.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1a2f2f'}}>
              <div>
                <div style={{color:'white', fontSize:'13px'}}>{d.description}</div>
                <div style={{color:'#a0b0b0', fontSize:'12px'}}>{d.date} · {d.category}</div>
              </div>
              <span style={{color:'#ff6b00', fontSize:'12px', fontWeight:'bold'}}>{d.hours}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AssetPage;