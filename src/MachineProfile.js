import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { QRCodeCanvas } from 'qrcode.react';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.4); }
  }
  .mp-card {
    background: var(--surface);
    border: 1px solid #eaf3fb;
    border-radius: 14px;
    padding: 20px 22px;
    box-shadow: 0 2px 10px rgba(0,100,180,0.07);
  }
  .mp-row { transition: background 0.1s; }
  .mp-row:hover { background: #f4f8fd; }
  .mp-start-btn {
    width: 100%; padding: 14px; background: linear-gradient(135deg, var(--accent), #0096cc);
    color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 800;
    cursor: pointer; font-family: inherit; letter-spacing: 0.5px;
    box-shadow: 0 6px 20px rgba(0,171,228,0.35); transition: all 0.2s;
    margin-bottom: 20px;
  }
  .mp-start-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,171,228,0.45); }
`;

const STATUS_COLOR = {
  Running:     { c:'var(--green)', bg:'var(--green-bg)', pulse:false },
  Down:        { c:'var(--red)', bg:'var(--red-bg)', pulse:true  },
  Maintenance: { c:'var(--amber)', bg:'var(--amber-bg)', pulse:false },
  Active:      { c:'var(--green)', bg:'var(--green-bg)', pulse:false },
  Standby:     { c:'var(--purple)', bg:'var(--purple-bg)', pulse:false },
};

const PRIORITY_COLOR = { Critical:'var(--red)', High:'#ea580c', Medium:'var(--amber)', Low:'var(--green)' };

function StatusPill({ status }) {
  const s = STATUS_COLOR[status] || { c:'var(--text-muted)', bg:'#f1f5f9', pulse:false };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:s.bg, color:s.c, fontSize:12, fontWeight:700 }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.c, animation:s.pulse?'pulse-dot 1.8s ease-in-out infinite':'none' }} />
      {status}
    </span>
  );
}

function SectionHead({ title, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:'1.5px solid #eaf3fb' }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text-primary)' }}>{title}</span>
      {count !== undefined && <span style={{ background:'#e0f4ff', color:'var(--accent)', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{count}</span>}
    </div>
  );
}

function AssetPage({ assetId, userRole, onStartPrestart }) {
  const [asset, setAsset]                       = useState(null);
  const [recentPrestarts, setRecentPrestarts]   = useState([]);
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [recentDowntime, setRecentDowntime]     = useState([]);
  const [openWorkOrders, setOpenWorkOrders]     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const printRef = useRef();

  useEffect(() => {
    if (!document.getElementById('mp-css')) {
      const s = document.createElement('style'); s.id='mp-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    if (assetId) fetchAssetData();
  }, [assetId]);

  const fetchAssetData = async () => {
    setLoading(true);
    const { data: assetData } = await supabase.from('assets').select('*').eq('id', assetId).single();
    setAsset(assetData);
    if (assetData) {
      const [prestarts, maintenance, downtime, workorders] = await Promise.all([
        supabase.from('form_submissions').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('date',{ascending:false}).limit(5),
        supabase.from('maintenance').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('created_at',{ascending:false}).limit(5),
        supabase.from('downtime').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).order('date',{ascending:false}).limit(5),
        supabase.from('work_orders').select('*').eq('asset', assetData.name).eq('company_id', assetData.company_id).neq('status','Complete').order('created_at',{ascending:false}),
      ]);
      setRecentPrestarts(prestarts.data||[]);
      setRecentMaintenance(maintenance.data||[]);
      setRecentDowntime(downtime.data||[]);
      setOpenWorkOrders(workorders.data||[]);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    const canvas = document.querySelector('#qr-visible canvas');
    const qrDataUrl = canvas ? canvas.toDataURL() : '';
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR - ${asset.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
        .card { width: 85.6mm; height: 53.98mm; background: #0a0f0f; border-radius: 4mm; padding: 5mm; display: flex; flex-direction: row; align-items: center; gap: 4mm; position: relative; overflow: hidden; }
        .qr-box { width: 30mm; height: 30mm; background: white; border-radius: 2mm; padding: 1.5mm; flex-shrink: 0; }
        .qr-box img { width: 100%; height: 100%; }
        .info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .company-id { font-size: 7pt; color: #a0b0b0; margin-bottom: 1mm; }
        .asset-num { font-size: 14pt; font-weight: bold; color: #00c2e0; margin-bottom: 1mm; }
        .asset-name { font-size: 9pt; font-weight: bold; color: white; margin-bottom: 1mm; }
        .asset-type { font-size: 7pt; color: #a0b0b0; }
        .brand { font-size: 8pt; font-weight: bold; color: #a0b0b0; margin-top: auto; }
        .brand span { color: #00c2e0; }
        @media print { body { background: white; margin: 0; } }
      </style></head>
      <body onload="window.print(); window.close();">
        <div class="card">
          <div class="qr-box"><img src="${qrDataUrl}" /></div>
          <div class="info">
            <div>
              <div class="company-id">COMPANY: ${userRole?.company_id?.substring(0,8).toUpperCase()||'N/A'}</div>
              <div class="asset-num">${asset.asset_number||'AST-0000'}</div>
              <div class="asset-name">${asset.name}</div>
              <div class="asset-type">${asset.type} · ${asset.location}</div>
            </div>
            <div class="brand">MECH<span> IQ</span></div>
          </div>
        </div>
      </body></html>
    `);
    win.document.close();
  };

  if (loading) return (
    <div style={{ animation:'fadeUp 0.4s ease both', padding:'8px 0' }}>
      <div className="mp-card" style={{ marginBottom:16 }}>
        <div style={{ height:14, width:'30%', background:'linear-gradient(90deg,#edf2f8 25%,#f5f8fd 50%,#edf2f8 75%)', borderRadius:6, backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear', marginBottom:10 }} />
        <div style={{ height:28, width:'50%', background:'linear-gradient(90deg,#edf2f8 25%,#f5f8fd 50%,#edf2f8 75%)', borderRadius:6, backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear' }} />
      </div>
    </div>
  );

  if (!asset) return <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontSize:14 }}>Asset not found</div>;

  const qrUrl = `${window.location.origin}?asset=${assetId}`;

  return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>

      {/* ── Hero card ── */}
      <div className="mp-card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20 }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--accent)', letterSpacing:'1px', marginBottom:4 }}>{asset.asset_number||'AST-0000'}</div>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800, color:'var(--text-primary)', margin:'0 0 6px', letterSpacing:'0.5px', textTransform:'uppercase' }}>{asset.name}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'0 0 12px' }}>{asset.type}{asset.location ? ` · ${asset.location}` : ''}</p>
            <StatusPill status={asset.status} />
            <div style={{ display:'flex', gap:24, marginTop:18, flexWrap:'wrap' }}>
              {[
                { label:'Target Hrs/Day', value:`${asset.target_hours||8}h`, color:'var(--accent)' },
                { label:'Hourly Rate',    value:`$${asset.hourly_rate||0}/hr`, color:'var(--green)' },
                { label:'Open WOs',       value:openWorkOrders.length, color:openWorkOrders.length>0?'var(--red)':'var(--green)' },
                { label:'Last Prestart',  value:recentPrestarts[0]?.date||'None', color:'var(--text-secondary)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <div id="qr-visible" style={{ padding:10, background:'var(--surface)', borderRadius:10, border:'1px solid #eaf3fb', boxShadow:'0 2px 8px rgba(0,100,180,0.08)' }}>
              <QRCodeCanvas value={qrUrl} size={110} bgColor="#ffffff" fgColor="var(--text-primary)" />
            </div>
            <button onClick={handlePrint} style={{ padding:'6px 14px', background:'var(--surface)', color:'var(--text-secondary)', border:'1.5px solid #d6e6f2', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Print QR Card
            </button>
          </div>
        </div>
      </div>

      {/* ── Start prestart button ── */}
      <button className="mp-start-btn" onClick={() => onStartPrestart(asset.name)}>
        Start Prestart for {asset.name} →
      </button>

      {/* ── Open Work Orders ── */}
      {openWorkOrders.length > 0 && (
        <div className="mp-card" style={{ marginBottom:16, borderLeft:'3px solid #dc2626' }}>
          <SectionHead title="Open Work Orders" count={openWorkOrders.length} />
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {openWorkOrders.map(wo => {
              const pc = PRIORITY_COLOR[wo.priority] || 'var(--text-muted)';
              return (
                <div key={wo.id} style={{ padding:'11px 14px', background:'#fafcfe', borderRadius:8, borderLeft:`3px solid ${pc}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:pc, padding:'2px 8px', background:pc+'18', borderRadius:20 }}>{wo.priority}</span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{wo.status}</span>
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{wo.defect_description}</div>
                  {wo.assigned_to && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Assigned: {wo.assigned_to}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Activity grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14 }}>

        <div className="mp-card">
          <SectionHead title="Recent Prestarts" count={recentPrestarts.length} />
          {recentPrestarts.length === 0 ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>No prestarts yet</div>
          : recentPrestarts.map(p => (
            <div key={p.id} className="mp-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #eaf3fb' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{p.date}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{p.operator_name}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:p.defects_found?'var(--red-bg)':'var(--green-bg)', color:p.defects_found?'var(--red)':'var(--green)' }}>
                {p.defects_found ? 'Defects' : 'Clear'}
              </span>
            </div>
          ))}
        </div>

        <div className="mp-card">
          <SectionHead title="Recent Maintenance" count={recentMaintenance.length} />
          {recentMaintenance.length === 0 ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>No maintenance records</div>
          : recentMaintenance.map(m => {
            const sc = { Overdue:['var(--red)','var(--red-bg)'], 'Due Soon':['var(--amber)','var(--amber-bg)'], Upcoming:['var(--accent)','#e0f4ff'], Completed:['var(--green)','var(--green-bg)'] };
            const [c, bg] = sc[m.status] || ['var(--text-muted)','#f1f5f9'];
            return (
              <div key={m.id} className="mp-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #eaf3fb' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{m.task}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{m.frequency}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:bg, color:c, whiteSpace:'nowrap' }}>{m.status}</span>
              </div>
            );
          })}
        </div>

        <div className="mp-card">
          <SectionHead title="Recent Downtime" count={recentDowntime.length} />
          {recentDowntime.length === 0 ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>No downtime recorded</div>
          : recentDowntime.map(d => (
            <div key={d.id} className="mp-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'9px 0', borderBottom:'1px solid #eaf3fb' }}>
              <div style={{ flex:1, minWidth:0, paddingRight:10 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.description}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{d.date} · {d.category}</div>
              </div>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, color:'#ea580c', flexShrink:0 }}>{d.hours}h</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default AssetPage;
