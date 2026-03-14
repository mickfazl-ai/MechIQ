import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
  @keyframes barGrow {
    from { width: 0 !important; }
  }
  .r-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 22px 24px;
    box-shadow: var(--shadow-sm);
  }
  .r-input {
    padding: 9px 12px; border: 1px solid rgba(0,180,255,0.12); border-radius: 8px;
    font-size: 13px; color: var(--text-primary); background: var(--surface);
    font-family: inherit; outline: none; transition: border-color 0.15s;
  }
  .r-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,171,228,0.12); }
  .r-btn {
    padding: 9px 18px; background: #00ABE4; color: #fff; border: none;
    border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: inherit; letter-spacing: 0.4px; box-shadow: 0 3px 10px rgba(0,171,228,0.3);
    transition: all 0.15s; white-space: nowrap;
  }
  .r-btn:hover { background: #0096cc; transform: translateY(-1px); }
  .r-btn-ghost {
    padding: 9px 16px; background: var(--surface); color: var(--text-secondary);
    border: 1px solid rgba(0,180,255,0.12); border-radius: 8px; font-size: 12px;
    font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s;
    white-space: nowrap;
  }
  .r-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .r-btn-green { background: #16a34a; box-shadow: 0 3px 10px rgba(22,163,74,0.3); }
  .r-btn-green:hover { background: #15803d; }
  .r-tab {
    padding: 8px 20px; border: none; background: transparent; border-radius: 8px;
    font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
    color: var(--text-muted); transition: all 0.15s; letter-spacing: 0.3px;
  }
  .r-tab.active { background: var(--surface); color: var(--accent); box-shadow: 0 1px 6px rgba(0,0,0,0.1); }
  .r-row { transition: background 0.1s; }
  .r-row:hover td { background: var(--surface-2) !important; }
  .r-bar {
    height: 8px; border-radius: 99px; animation: barGrow 0.8s cubic-bezier(0.16,1,0.3,1);
    transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
  }
`;

// ─── Shared helpers ────────────────────────────────────────────────────────────
function SectionHead({ title, count, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:13, borderBottom:'1.5px solid #eaf3fb' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text-primary)' }}>{title}</span>
        {count !== undefined && <span style={{ background:'rgba(0,212,255,0.1)', color:'var(--accent)', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{count}</span>}
      </div>
      {action}
    </div>
  );
}

function Sk({ w = '100%', h = '13px', r = '6px' }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:'linear-gradient(90deg,#edf2f8 25%,#f5f8fd 50%,#edf2f8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear' }} />;
}

function Empty({ icon, title, desc }) {
  return (
    <div style={{ textAlign:'center', padding:'44px 20px' }}>
      <div style={{ fontSize:36, marginBottom:12, opacity:0.3 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--text-muted)', maxWidth:220, margin:'0 auto', lineHeight:1.65 }}>{desc}</div>
    </div>
  );
}

function TableHead({ cols }) {
  return (
    <thead>
      <tr style={{ borderBottom:'2px solid #eaf3fb' }}>
        {cols.map(c => <th key={c} style={{ textAlign:'left', padding:'0 12px 11px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase', whiteSpace:'nowrap' }}>{c}</th>)}
      </tr>
    </thead>
  );
}

function Td({ children, style }) {
  return <td style={{ padding:'11px 12px 11px 0', fontSize:13, color:'var(--text-secondary)', ...style }}>{children}</td>;
}

function Chip({ text, color, bg }) {
  return <span style={{ padding:'3px 9px', borderRadius:6, background:bg||'var(--surface-2)', color:color||'var(--text-secondary)', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{text}</span>;
}

function BarChart({ items, maxVal, valueKey, labelKey, colors }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {items.map((item, i) => {
        const pct = Math.min(100, maxVal > 0 ? (parseFloat(item[valueKey]) / maxVal) * 100 : 0);
        const color = colors[i % colors.length];
        return (
          <div key={item[labelKey]}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:12 }}>{item[labelKey]}</span>
              <span style={{ fontSize:11, fontWeight:700, color, flexShrink:0 }}>{item[valueKey]}</span>
            </div>
            <div style={{ height:8, background:'var(--surface-2)', borderRadius:99, overflow:'hidden' }}>
              <div className="r-bar" style={{ width:`${pct}%`, background:color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CHART_COLORS = ['var(--accent)','#ea580c','var(--amber)','var(--green)','var(--purple)','var(--red)'];

// ─── Main ──────────────────────────────────────────────────────────────────────
function Reports({ companyId, userRole, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'downtime-log');
  const [downtimeData, setDowntimeData] = useState([]);
  const [assetCount, setAssetCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [assets, setAssets] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newDowntime, setNewDowntime] = useState({ asset:'', date:'', start_time:'', end_time:'', category:'', description:'', reported_by:'' });

  const getDefaultDates = () => {
    const end = new Date(), start = new Date();
    start.setDate(start.getDate() - 30);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };
  const [dateRange, setDateRange] = useState(getDefaultDates());

  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  useEffect(() => { if (companyId) fetchReportData(); }, [companyId]);
  useEffect(() => {
    if (!document.getElementById('reports-css')) {
      const s = document.createElement('style'); s.id = 'reports-css'; s.textContent = CSS; document.head.appendChild(s);
    }
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    const { data: assetData } = await supabase.from('assets').select('*').eq('company_id', companyId);
    setAssets(assetData || []);
    setAssetCount(assetData?.length || 0);
    const { data: downtime } = await supabase.from('downtime').select('*').eq('company_id', companyId).order('date', { ascending: false });
    if (downtime) {
      setDowntimeData(downtime);
      setTotalHours(downtime.reduce((sum, d) => sum + parseFloat(d.hours || 0), 0).toFixed(1));
      setTotalCost(downtime.reduce((sum, d) => sum + parseFloat(d.cost || 0), 0).toFixed(2));
    }
    const { data: subs } = await supabase.from('form_submissions').select('*').eq('company_id', companyId).order('date', { ascending: true });
    setSubmissions(subs || []);
    setLoading(false);
  };

  const handleAddDowntime = async () => {
    if (!newDowntime.asset || !newDowntime.date || !newDowntime.description) { alert('Please fill in asset, date and description'); return; }
    const start = new Date(`2000/01/01 ${newDowntime.start_time}`);
    const end = new Date(`2000/01/01 ${newDowntime.end_time}`);
    const hours = ((end - start) / 3600000).toFixed(1);
    const assetData = assets.find(a => a.name === newDowntime.asset);
    const cost = assetData?.hourly_rate ? (parseFloat(hours) * parseFloat(assetData.hourly_rate)).toFixed(2) : 0;
    const { error } = await supabase.from('downtime').insert([{ ...newDowntime, hours, cost, company_id: companyId }]);
    if (error) { alert('Error: ' + error.message); return; }
    setNewDowntime({ asset:'', date:'', start_time:'', end_time:'', category:'', description:'', reported_by:'' });
    setShowForm(false);
    fetchReportData();
  };

  const handleDeleteDowntime = async (id) => {
    if (!window.confirm('Delete this downtime record?')) return;
    const { error } = await supabase.from('downtime').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    fetchReportData();
  };

  const getFilteredData  = () => downtimeData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
  const getCategoryTotals = () => {
    const totals = {};
    downtimeData.forEach(d => { if (d.category) totals[d.category] = (totals[d.category] || 0) + parseFloat(d.hours || 0); });
    return Object.entries(totals).map(([category, hours]) => ({ category, hours: hours.toFixed(1) })).sort((a,b) => b.hours - a.hours);
  };
  const getAssetTotals = () => {
    const totals = {};
    downtimeData.forEach(d => { if (d.asset) totals[d.asset] = { hours:(totals[d.asset]?.hours||0)+parseFloat(d.hours||0), cost:(totals[d.asset]?.cost||0)+parseFloat(d.cost||0) }; });
    return Object.entries(totals).map(([asset,data]) => ({ asset, hours:data.hours.toFixed(1), cost:data.cost.toFixed(2) })).sort((a,b)=>b.hours-a.hours).slice(0,6);
  };
  const getAvailabilityData = () => {
    const filteredSubs = submissions.filter(s => s.date >= dateRange.start && s.date <= dateRange.end);
    return assets.map(asset => {
      const assetSubs = filteredSubs.filter(s => s.asset === asset.name).sort((a,b) => a.date.localeCompare(b.date));
      let totalRunHours = 0;
      for (let i = 1; i < assetSubs.length; i++) {
        const diff = parseFloat(assetSubs[i].hrs_start||0) - parseFloat(assetSubs[i-1].hrs_start||0);
        if (diff > 0 && diff < 24) totalRunHours += diff;
      }
      const days = Math.max(1, Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000*60*60*24)));
      const targetHours = (asset.target_hours||8) * days;
      const utilisation = targetHours > 0 ? Math.min(100, (totalRunHours / targetHours) * 100) : 0;
      return { asset:asset.name, totalRunHours:totalRunHours.toFixed(1), targetHours:targetHours.toFixed(1), utilisation:utilisation.toFixed(1), prestartCount:assetSubs.length, targetPerDay:asset.target_hours||8 };
    });
  };
  const getUtilisationByPeriod = (period) => {
    const now = new Date(); let start, end = now.toISOString().split('T')[0];
    if (period==='daily') { start = end; }
    else if (period==='weekly') { const s=new Date(); s.setDate(s.getDate()-7); start=s.toISOString().split('T')[0]; }
    else { const s=new Date(now.getFullYear(),now.getMonth(),1); start=s.toISOString().split('T')[0]; }
    const filteredSubs = submissions.filter(s => s.date >= start && s.date <= end);
    return assets.map(asset => {
      const assetSubs = filteredSubs.filter(s => s.asset===asset.name).sort((a,b)=>a.date.localeCompare(b.date));
      let totalRunHours = 0;
      for (let i=1;i<assetSubs.length;i++) { const diff=parseFloat(assetSubs[i].hrs_start||0)-parseFloat(assetSubs[i-1].hrs_start||0); if(diff>0&&diff<24) totalRunHours+=diff; }
      const days=Math.max(1,Math.ceil((new Date(end)-new Date(start))/(1000*60*60*24))+1);
      const targetHours=(asset.target_hours||8)*days;
      const utilisation=targetHours>0?Math.min(100,(totalRunHours/targetHours)*100):0;
      return { asset:asset.name, totalRunHours:totalRunHours.toFixed(1), targetHours:targetHours.toFixed(1), utilisation:utilisation.toFixed(1) };
    });
  };
  const getUtilColour = pct => pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

  // ── Export functions (unchanged logic) ────────────────────────────────────────
  const exportDowntimePDF = () => {
    const filteredData = getFilteredData();
    const filteredHours = filteredData.reduce((sum,d)=>sum+parseFloat(d.hours||0),0);
    const filteredCost = filteredData.reduce((sum,d)=>sum+parseFloat(d.cost||0),0);
    const doc = new jsPDF();
    doc.setFillColor(13,21,21); doc.rect(0,0,210,297,'F');
    doc.setTextColor(0,194,224); doc.setFontSize(28); doc.setFont('helvetica','bold'); doc.text('MECH IQ',14,20);
    doc.setTextColor(160,176,176); doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('by Coastline Machine Management',14,27);
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.text('DOWNTIME REPORT',14,40);
    doc.setTextColor(160,176,176); doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Period: '+dateRange.start+' to '+dateRange.end,14,48);
    doc.text('Generated: '+new Date().toLocaleDateString('en-AU'),14,54);
    doc.setDrawColor(26,47,47); doc.line(14,58,196,58);
    doc.setFillColor(26,47,47); doc.rect(14,62,55,20,'F'); doc.rect(74,62,55,20,'F'); doc.rect(134,62,62,20,'F');
    doc.setTextColor(160,176,176); doc.setFontSize(8);
    doc.text('TOTAL EVENTS',18,68); doc.text('HOURS LOST',78,68); doc.text('TOTAL COST',138,68);
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text(String(filteredData.length),18,78); doc.text(filteredHours.toFixed(1)+'h',78,78);
    doc.setTextColor(255,107,0); doc.text('$'+filteredCost.toLocaleString('en-AU',{minimumFractionDigits:2}),138,78);
    doc.setTextColor(0,194,224); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('DOWNTIME EVENTS',14,95);
    if (filteredData.length===0) { doc.setTextColor(160,176,176); doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('No downtime events recorded for this period.',14,105); }
    else { autoTable(doc,{startY:98,head:[['Asset','Date','Category','Hours','Cost','Description']],body:filteredData.map(d=>[d.asset,d.date,d.category,d.hours+'h','$'+parseFloat(d.cost||0).toLocaleString('en-AU',{minimumFractionDigits:2}),d.description]),theme:'plain',headStyles:{fillColor:[26,47,47],textColor:[160,176,176],fontSize:8,fontStyle:'bold'},bodyStyles:{fillColor:[13,21,21],textColor:[255,255,255],fontSize:9},alternateRowStyles:{fillColor:[20,30,30]},styles:{lineColor:[26,47,47],lineWidth:0.1}}); }
    const finalY=doc.lastAutoTable?.finalY||105;
    doc.setTextColor(0,194,224); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('DOWNTIME BY CATEGORY',14,finalY+15);
    autoTable(doc,{startY:finalY+18,head:[['Category','Hours Lost']],body:getCategoryTotals().map(c=>[c.category,c.hours+'h']),theme:'plain',headStyles:{fillColor:[26,47,47],textColor:[160,176,176],fontSize:8,fontStyle:'bold'},bodyStyles:{fillColor:[13,21,21],textColor:[255,255,255],fontSize:9},styles:{lineColor:[26,47,47],lineWidth:0.1}});
    doc.setTextColor(160,176,176); doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text('Generated by Mech IQ - mechiq.coastlinemm.com.au',14,285);
    doc.save('MechIQ-Downtime-'+dateRange.start+'-to-'+dateRange.end+'.pdf');
  };

  const exportAvailabilityPDF = () => {
    const availData = getAvailabilityData();
    const doc = new jsPDF();
    doc.setFillColor(13,21,21); doc.rect(0,0,210,297,'F');
    doc.setTextColor(0,194,224); doc.setFontSize(28); doc.setFont('helvetica','bold'); doc.text('MECH IQ',14,20);
    doc.setTextColor(160,176,176); doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.text('by Coastline Machine Management',14,27);
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.text('MACHINE AVAILABILITY REPORT',14,40);
    doc.setTextColor(160,176,176); doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Period: '+dateRange.start+' to '+dateRange.end,14,48); doc.text('Generated: '+new Date().toLocaleDateString('en-AU'),14,54);
    doc.setDrawColor(26,47,47); doc.line(14,58,196,58);
    doc.setTextColor(0,194,224); doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.text('UTILISATION BY MACHINE',14,68);
    autoTable(doc,{startY:72,head:[['Machine','Run Hours','Target Hours','Utilisation %','Prestarts']],body:availData.map(a=>[a.asset,a.totalRunHours+'h',a.targetHours+'h',a.utilisation+'%',a.prestartCount]),theme:'plain',headStyles:{fillColor:[26,47,47],textColor:[160,176,176],fontSize:8,fontStyle:'bold'},bodyStyles:{fillColor:[13,21,21],textColor:[255,255,255],fontSize:9},alternateRowStyles:{fillColor:[20,30,30]},styles:{lineColor:[26,47,47],lineWidth:0.1}});
    doc.setTextColor(160,176,176); doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text('Generated by Mech IQ - mechiq.coastlinemm.com.au',14,285);
    doc.save('MechIQ-Availability-'+dateRange.start+'-to-'+dateRange.end+'.pdf');
  };

  const exportExcel = async () => {
    const filteredData = getFilteredData();
    const filteredHours = filteredData.reduce((sum,d)=>sum+parseFloat(d.hours||0),0);
    const filteredCost = filteredData.reduce((sum,d)=>sum+parseFloat(d.cost||0),0);
    const wb = new ExcelJS.Workbook(); wb.creator='Mech IQ';
    const blue='1E6FA8',lightBlue='D6EAF8',white='FFFFFF',dark='1A1A1A',border='BBCFDD';
    const colHeader=(cell)=>{cell.font={bold:true,color:{argb:white},size:9,name:'Calibri'};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:blue}};cell.alignment={vertical:'middle',horizontal:'center'};cell.border={bottom:{style:'thin',color:{argb:white}}};};
    const dataCell=(cell,isAlt)=>{cell.font={color:{argb:dark},size:9,name:'Calibri'};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:isAlt?lightBlue:white}};cell.alignment={vertical:'middle',indent:1};cell.border={bottom:{style:'hair',color:{argb:border}}};};
    const numCell=(cell,isAlt,color)=>{cell.font={bold:true,color:{argb:color||blue},size:9,name:'Calibri'};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:isAlt?lightBlue:white}};cell.alignment={vertical:'middle',horizontal:'right'};cell.border={bottom:{style:'hair',color:{argb:border}}};};
    const addHeader=(ws,title,numCols)=>{ws.addRow([]);const r1=ws.addRow(['MECH IQ  —  '+title]);r1.height=35;ws.mergeCells(r1.number,1,r1.number,numCols);r1.getCell(1).font={bold:true,color:{argb:white},size:18,name:'Calibri'};r1.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:blue}};r1.getCell(1).alignment={vertical:'middle',indent:1};const r2=ws.addRow(['Coastline Machine Management  |  '+dateRange.start+' to '+dateRange.end+'  |  Generated: '+new Date().toLocaleDateString('en-AU')]);r2.height=20;ws.mergeCells(r2.number,1,r2.number,numCols);r2.getCell(1).font={italic:true,color:{argb:white},size:9,name:'Calibri'};r2.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'2E86C1'}};r2.getCell(1).alignment={vertical:'middle',indent:1};ws.addRow([]).height=6;};
    const availData = getAvailabilityData();
    const av=wb.addWorksheet('Machine Availability',{properties:{tabColor:{argb:'00C264'}}});av.views=[{showGridLines:false}];addHeader(av,'MACHINE AVAILABILITY',5);
    const avh=av.addRow(['Machine','Run Hours','Target Hours','Utilisation %','Prestarts']);avh.height=22;['A','B','C','D','E'].forEach(c=>colHeader(avh.getCell(c)));
    availData.forEach((a,i)=>{const r=av.addRow([a.asset,parseFloat(a.totalRunHours),parseFloat(a.targetHours),parseFloat(a.utilisation),a.prestartCount]);r.height=18;dataCell(r.getCell('A'),i%2!==0);numCell(r.getCell('B'),i%2!==0,blue);numCell(r.getCell('C'),i%2!==0,dark);const utilColor=parseFloat(a.utilisation)>=80?'00C264':parseFloat(a.utilisation)>=50?'FFC800':'E94560';numCell(r.getCell('D'),i%2!==0,utilColor);numCell(r.getCell('E'),i%2!==0,dark);});
    av.columns=[{width:24},{width:14},{width:14},{width:16},{width:12}];
    const ss=wb.addWorksheet('Summary',{properties:{tabColor:{argb:blue}}});ss.views=[{showGridLines:false}];addHeader(ss,'SUMMARY REPORT',4);
    const sh=ss.addRow(['TOTAL EVENTS','HOURS LOST','TOTAL COST ($)']);sh.height=22;['A','B','C'].forEach(c=>colHeader(sh.getCell(c)));
    const sv=ss.addRow([filteredData.length,parseFloat(filteredHours.toFixed(1)),parseFloat(filteredCost.toFixed(2))]);sv.height=30;['A','B','C'].forEach((col,idx)=>{const colors=[dark,blue,'CC4400'];sv.getCell(col).font={bold:true,color:{argb:colors[idx]},size:20,name:'Calibri'};sv.getCell(col).fill={type:'pattern',pattern:'solid',fgColor:{argb:lightBlue}};sv.getCell(col).alignment={vertical:'middle',horizontal:'center'};});
    ss.columns=[{width:28},{width:14},{width:14},{width:16}];
    const es=wb.addWorksheet('All Events',{properties:{tabColor:{argb:'2E86C1'}}});es.views=[{showGridLines:false}];addHeader(es,'ALL DOWNTIME EVENTS',9);
    const eh=es.addRow(['Asset','Date','Start','End','Hours','Cost ($)','Category','Description','Reported By']);eh.height=22;['A','B','C','D','E','F','G','H','I'].forEach(c=>colHeader(eh.getCell(c)));
    filteredData.forEach((d,i)=>{const r=es.addRow([d.asset,d.date,d.start_time,d.end_time,parseFloat(d.hours||0),parseFloat(d.cost||0),d.category,d.description,d.reported_by]);r.height=18;['A','B','C','D'].forEach(col=>dataCell(r.getCell(col),i%2!==0));numCell(r.getCell('E'),i%2!==0,blue);numCell(r.getCell('F'),i%2!==0,'CC4400');['G','H','I'].forEach(col=>dataCell(r.getCell(col),i%2!==0));});
    es.columns=[{width:16},{width:12},{width:10},{width:10},{width:10},{width:12},{width:16},{width:42},{width:16}];
    const buffer=await wb.xlsx.writeBuffer();
    const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    saveAs(blob,'MechIQ-Report-'+dateRange.start+'-to-'+dateRange.end+'.xlsx');
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const filteredData    = getFilteredData();
  const filteredHours   = filteredData.reduce((sum,d) => sum+parseFloat(d.hours||0), 0);
  const filteredCost    = filteredData.reduce((sum,d) => sum+parseFloat(d.cost||0), 0);
  const catTotals       = getCategoryTotals();
  const assetTotals     = getAssetTotals();
  const maxCatHours     = Math.max(...catTotals.map(i=>parseFloat(i.hours)), 1);
  const maxAssetHours   = Math.max(...assetTotals.map(i=>parseFloat(i.hours)), 1);
  const totalDownCost   = downtimeData.reduce((sum,d) => sum+parseFloat(d.cost||0), 0);
  const availabilityData = getAvailabilityData();
  const avgUtilisation   = availabilityData.length > 0
    ? (availabilityData.reduce((sum,a) => sum+parseFloat(a.utilisation), 0) / availabilityData.length).toFixed(1)
    : 0;

  const iStyle = {
    padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8,
    fontSize:13, color:'var(--text-primary)', background:'var(--surface)', fontFamily:'inherit',
    outline:'none', boxSizing:'border-box', width:'100%',
  };

  const TABS = [
    { id:'downtime-log',  label:'Downtime Log' },
    { id:'downtime',      label:'Downtime Analysis' },
    { id:'availability',  label:'Machine Availability' },
  ];

  const shortcutBtn = (label, fn) => (
    <button onClick={fn} style={{ padding:'6px 13px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, fontSize:11, fontWeight:700, color:'var(--text-secondary)', cursor:'pointer', fontFamily:'inherit', transition:'all 0.12s' }}
      onMouseOver={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
      {label}
    </button>
  );

  return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0, lineHeight:1 }}>Reports</h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0', fontWeight:500 }}>Downtime analysis, machine availability & export</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="r-btn r-btn-green" onClick={activeTab==='availability' ? exportAvailabilityPDF : exportDowntimePDF}>Export PDF</button>
          <button className="r-btn" onClick={exportExcel}>Export Excel</button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[0,1,2,3].map(i => <div key={i} className="r-card" style={{ padding:'18px 20px' }}><Sk w="50%" h="11px" /><div style={{marginTop:10}}><Sk w="35%" h="32px" r="6px" /></div></div>)}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Downtime', value:`${totalHours}h`, color:'var(--red)', bg:'var(--red-bg)', sub:'all time' },
            { label:'Total Cost',     value:`$${parseFloat(totalCost).toLocaleString('en-AU',{minimumFractionDigits:0})}`, color:'#ea580c', bg:'#ffedd5', sub:'all time' },
            { label:'Total Assets',   value:assetCount, color:'var(--accent)', bg:'rgba(0,212,255,0.1)', sub:'registered' },
            { label:'Avg Utilisation',value:`${avgUtilisation}%`, color:getUtilColour(parseFloat(avgUtilisation)), bg: parseFloat(avgUtilisation)>=80?'var(--green-bg)':parseFloat(avgUtilisation)>=50?'var(--amber-bg)':'var(--red-bg)', sub:'fleet average' },
          ].map((s,i) => (
            <div key={s.label} className="r-card" style={{ padding:'16px 20px', opacity:0, animation:`fadeUp 0.4s ease ${i*60}ms forwards` }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:10 }}>{s.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontFamily:"var(--font-display)", fontSize:34, fontWeight:800, color:s.color, background:s.bg, padding:'2px 10px', borderRadius:8, lineHeight:1.2 }}>{s.value}</span>
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:6 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Date range picker ── */}
      <div className="r-card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', whiteSpace:'nowrap' }}>Report Period</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input className="r-input" type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start:e.target.value})} />
            <span style={{ color:'var(--text-muted)', fontSize:12 }}>→</span>
            <input className="r-input" type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end:e.target.value})} />
          </div>
          <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
            {shortcutBtn('Last 7 Days', () => { const e=new Date(),s=new Date(); s.setDate(s.getDate()-7); setDateRange({start:s.toISOString().split('T')[0],end:e.toISOString().split('T')[0]}); })}
            {shortcutBtn('Last 30 Days', () => { const e=new Date(),s=new Date(); s.setDate(s.getDate()-30); setDateRange({start:s.toISOString().split('T')[0],end:e.toISOString().split('T')[0]}); })}
            {shortcutBtn('This Month', () => { const now=new Date(),s=new Date(now.getFullYear(),now.getMonth(),1); setDateRange({start:s.toISOString().split('T')[0],end:now.toISOString().split('T')[0]}); })}
          </div>
        </div>
      </div>


      {/* ══ DOWNTIME LOG ══ */}
      {activeTab === 'downtime-log' && (
        <div>
          <div className="r-card">
            <SectionHead
              title="Downtime Log"
              count={downtimeData.length}
              action={
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:800, color:'#ea580c' }}>
                    ${totalDownCost.toLocaleString('en-AU',{minimumFractionDigits:0})} total cost
                  </span>
                  <button className="r-btn" onClick={() => setShowForm(s=>!s)}>{showForm ? '✕ Cancel' : '+ Log Downtime'}</button>
                </div>
              }
            />

            {showForm && (
              <div style={{ background:'#f8fbfe', border:'1px solid #eaf3fb', borderRadius:10, padding:'18px 20px', marginBottom:18 }}>
                <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:13, marginBottom:12 }}>Log New Downtime Event</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                  <select style={iStyle} value={newDowntime.asset} onChange={e => setNewDowntime({...newDowntime,asset:e.target.value})}>
                    <option value="">Select Asset</option>
                    {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                  <input style={iStyle} type="date" value={newDowntime.date} onChange={e => setNewDowntime({...newDowntime,date:e.target.value})} />
                  <select style={iStyle} value={newDowntime.category} onChange={e => setNewDowntime({...newDowntime,category:e.target.value})}>
                    <option value="">Fault Category</option>
                    <option>Mechanical</option><option>Electrical</option><option>Operator Error</option>
                    <option>Scheduled</option><option>Environmental</option><option>Other</option>
                  </select>
                  <input style={iStyle} type="time" placeholder="Start time" value={newDowntime.start_time} onChange={e => setNewDowntime({...newDowntime,start_time:e.target.value})} />
                  <input style={iStyle} type="time" placeholder="End time" value={newDowntime.end_time} onChange={e => setNewDowntime({...newDowntime,end_time:e.target.value})} />
                  <input style={iStyle} placeholder="Reported by" value={newDowntime.reported_by} onChange={e => setNewDowntime({...newDowntime,reported_by:e.target.value})} />
                </div>
                <textarea style={{ ...iStyle, minHeight:72, resize:'vertical', marginBottom:12 }} placeholder="Fault description *" value={newDowntime.description} onChange={e => setNewDowntime({...newDowntime,description:e.target.value})} />
                <div style={{ display:'flex', gap:8 }}>
                  <button className="r-btn" onClick={handleAddDowntime}>Save Downtime</button>
                  <button className="r-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 3fr', gap:12, padding:'12px 0', borderBottom:'1px solid #eaf3fb' }}>{[0,1,2,3,4].map(j => <Sk key={j} h="13px" w={['75%','55%','50%','40%','80%'][j]} />)}</div>)}
              </div>
            ) : downtimeData.length === 0 ? (
              <Empty icon="📋" title="No downtime recorded" desc="Log downtime events to track cost and identify patterns across your fleet." />
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <TableHead cols={['Asset','Date','Category','Hours','Cost','Description','Reported By','']} />
                  <tbody>
                    {downtimeData.map((d,i) => (
                      <tr key={d.id} className="r-row" style={{ borderBottom:'1px solid #eaf3fb', opacity:0, animation:`fadeUp 0.3s ease ${i*30}ms forwards` }}>
                        <Td style={{ fontWeight:700, color:'var(--text-primary)', whiteSpace:'nowrap' }}>{d.asset}</Td>
                        <Td style={{ whiteSpace:'nowrap' }}>{d.date}</Td>
                        <Td><Chip text={d.category} color="#3d5166" bg="#f0f5fa" /></Td>
                        <Td><Chip text={`${d.hours}h`} color="#d97706" bg="#fef3c7" /></Td>
                        <Td><span style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:800, color:'#ea580c' }}>${parseFloat(d.cost||0).toLocaleString('en-AU',{minimumFractionDigits:0})}</span></Td>
                        <Td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.description}</Td>
                        <Td style={{ color:'var(--text-muted)' }}>{d.reported_by||'—'}</Td>
                        <Td>
                          <button onClick={() => handleDeleteDowntime(d.id)} style={{ padding:'4px 11px', background:'var(--surface)', color:'var(--red)', border:'1.5px solid #fecaca', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Delete</button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ DOWNTIME ANALYSIS ══ */}
      {activeTab === 'downtime' && (
        <div>
          {/* Period stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Events in Period',   value:filteredData.length,                          color:'var(--accent)', bg:'rgba(0,212,255,0.1)' },
              { label:'Hours Lost',         value:`${filteredHours.toFixed(1)}h`,               color:'var(--amber)', bg:'var(--amber-bg)' },
              { label:'Cost in Period',     value:`$${filteredCost.toLocaleString('en-AU',{minimumFractionDigits:0})}`, color:'#ea580c', bg:'#ffedd5' },
            ].map((s,i) => (
              <div key={s.label} className="r-card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12, opacity:0, animation:`fadeUp 0.4s ease ${i*60}ms forwards` }}>
                <span style={{ fontFamily:"var(--font-display)", fontSize:30, fontWeight:800, color:s.color, background:s.bg, padding:'2px 12px', borderRadius:8, lineHeight:1.3 }}>{s.value}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
            <div className="r-card">
              <SectionHead title="By Fault Category" />
              {catTotals.length === 0 ? <Empty icon="📊" title="No data" desc="No downtime data for this period." /> : (
                <BarChart items={catTotals} maxVal={maxCatHours} valueKey="hours" labelKey="category" colors={CHART_COLORS} />
              )}
            </div>
            <div className="r-card">
              <SectionHead title="By Asset (hours)" />
              {assetTotals.length === 0 ? <Empty icon="📊" title="No data" desc="No downtime data for this period." /> : (
                <BarChart items={assetTotals} maxVal={maxAssetHours} valueKey="hours" labelKey="asset" colors={CHART_COLORS} />
              )}
            </div>
          </div>

          {/* Table */}
          <div className="r-card">
            <SectionHead title="Events in Period" count={filteredData.length} />
            {filteredData.length === 0 ? (
              <Empty icon="✅" title="No events" desc="No downtime events recorded in this date range." />
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <TableHead cols={['Asset','Date','Category','Hours','Cost','Description']} />
                  <tbody>
                    {filteredData.map((d,i) => (
                      <tr key={d.id} className="r-row" style={{ borderBottom:'1px solid #eaf3fb' }}>
                        <Td style={{ fontWeight:700, color:'var(--text-primary)' }}>{d.asset}</Td>
                        <Td style={{ whiteSpace:'nowrap' }}>{d.date}</Td>
                        <Td><Chip text={d.category} /></Td>
                        <Td><Chip text={`${d.hours}h`} color="#d97706" bg="#fef3c7" /></Td>
                        <Td><span style={{ fontWeight:800, color:'#ea580c', fontFamily:"var(--font-display)", fontSize:14 }}>${parseFloat(d.cost||0).toLocaleString('en-AU',{minimumFractionDigits:0})}</span></Td>
                        <Td>{d.description}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MACHINE AVAILABILITY ══ */}
      {activeTab === 'availability' && (
        <div>
          {/* Fleet stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Fleet Avg Utilisation', value:`${avgUtilisation}%`, color:getUtilColour(parseFloat(avgUtilisation)), bg:parseFloat(avgUtilisation)>=80?'var(--green-bg)':parseFloat(avgUtilisation)>=50?'var(--amber-bg)':'var(--red-bg)' },
              { label:'Machines Tracked',       value:availabilityData.filter(a=>a.prestartCount>0).length, color:'var(--accent)', bg:'rgba(0,212,255,0.1)' },
              { label:'Total Prestarts',         value:availabilityData.reduce((sum,a)=>sum+a.prestartCount,0), color:'var(--purple)', bg:'var(--purple-bg)' },
            ].map((s,i) => (
              <div key={s.label} className="r-card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontFamily:"var(--font-display)", fontSize:30, fontWeight:800, color:s.color, background:s.bg, padding:'2px 12px', borderRadius:8, lineHeight:1.3 }}>{s.value}</span>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Period charts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
            {['daily','weekly','monthly'].map(period => {
              const data = getUtilisationByPeriod(period).filter(a => parseFloat(a.totalRunHours) > 0);
              const label = period==='daily' ? "Today" : period==='weekly' ? 'Last 7 Days' : 'This Month';
              return (
                <div key={period} className="r-card">
                  <SectionHead title={`${label} Utilisation`} />
                  {data.length === 0 ? (
                    <div style={{ fontSize:12, color:'var(--text-muted)', padding:'16px 0' }}>No prestart data for this period.</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {data.map(a => {
                        const pct = Math.min(100, parseFloat(a.utilisation));
                        const color = getUtilColour(pct);
                        return (
                          <div key={a.asset}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, paddingRight:8 }}>{a.asset}</span>
                              <span style={{ fontSize:11, fontWeight:800, color, flexShrink:0 }}>{a.utilisation}%</span>
                            </div>
                            <div style={{ height:7, background:'var(--surface-2)', borderRadius:99, overflow:'hidden' }}>
                              <div className="r-bar" style={{ width:`${pct}%`, background:color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail table */}
          <div className="r-card">
            <SectionHead title="Utilisation Detail" count={availabilityData.length} />
            {availabilityData.length === 0 ? (
              <Empty icon="⚙️" title="No assets" desc="Register assets to see utilisation data." />
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <TableHead cols={['Machine','Run Hours','Target Hours','Utilisation','Prestarts','Target/Day']} />
                  <tbody>
                    {availabilityData.map((a,i) => {
                      const pct = Math.min(100, parseFloat(a.utilisation));
                      const color = getUtilColour(pct);
                      return (
                        <tr key={a.asset} className="r-row" style={{ borderBottom:'1px solid #eaf3fb', opacity:0, animation:`fadeUp 0.3s ease ${i*35}ms forwards` }}>
                          <Td style={{ fontWeight:700, color:'var(--text-primary)' }}>{a.asset}</Td>
                          <Td><Chip text={`${a.totalRunHours}h`} color="#00ABE4" bg="#e0f4ff" /></Td>
                          <Td style={{ color:'var(--text-muted)' }}>{a.targetHours}h</Td>
                          <Td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:80, height:7, background:'var(--surface-2)', borderRadius:99, overflow:'hidden', flexShrink:0 }}>
                                <div className="r-bar" style={{ width:`${pct}%`, background:color }} />
                              </div>
                              <span style={{ fontSize:12, fontWeight:800, color }}>{a.utilisation}%</span>
                            </div>
                          </Td>
                          <Td>{a.prestartCount}</Td>
                          <Td>{a.targetPerDay}h/day</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default Reports;
