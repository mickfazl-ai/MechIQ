import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function Reports({ companyId, userRole }) {
  const [activeTab, setActiveTab] = useState('downtime-log');
  const [downtimeData, setDowntimeData] = useState([]);
  const [assetCount, setAssetCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [assets, setAssets] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Downtime form state
  const [showForm, setShowForm] = useState(false);
  const [newDowntime, setNewDowntime] = useState({
    asset: '', date: '', start_time: '', end_time: '', category: '', description: '', reported_by: ''
  });

  const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };
  const [dateRange, setDateRange] = useState(getDefaultDates());

  useEffect(() => { if (companyId) fetchReportData(); }, [companyId]);

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

  // Downtime CRUD
  const handleAddDowntime = async () => {
    if (!newDowntime.asset || !newDowntime.date || !newDowntime.description) {
      alert('Please fill in asset, date and description'); return;
    }
    const start = new Date(`2000/01/01 ${newDowntime.start_time}`);
    const end = new Date(`2000/01/01 ${newDowntime.end_time}`);
    const hours = ((end - start) / 3600000).toFixed(1);
    const assetData = assets.find(a => a.name === newDowntime.asset);
    const cost = assetData?.hourly_rate ? (parseFloat(hours) * parseFloat(assetData.hourly_rate)).toFixed(2) : 0;
    const { error } = await supabase.from('downtime').insert([{ ...newDowntime, hours, cost, company_id: companyId }]);
    if (error) { alert('Error: ' + error.message); return; }
    setNewDowntime({ asset: '', date: '', start_time: '', end_time: '', category: '', description: '', reported_by: '' });
    setShowForm(false);
    fetchReportData();
  };

  const handleDeleteDowntime = async (id) => {
    if (!window.confirm('Delete this downtime record?')) return;
    const { error } = await supabase.from('downtime').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    fetchReportData();
  };

  const getFilteredData = () => downtimeData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);

  const getCategoryTotals = () => {
    const totals = {};
    downtimeData.forEach(d => { if (d.category) totals[d.category] = (totals[d.category] || 0) + parseFloat(d.hours || 0); });
    return Object.entries(totals).map(([category, hours]) => ({ category, hours: hours.toFixed(1) })).sort((a, b) => b.hours - a.hours);
  };

  const getAssetTotals = () => {
    const totals = {};
    downtimeData.forEach(d => {
      if (d.asset) totals[d.asset] = { hours: (totals[d.asset]?.hours || 0) + parseFloat(d.hours || 0), cost: (totals[d.asset]?.cost || 0) + parseFloat(d.cost || 0) };
    });
    return Object.entries(totals).map(([asset, data]) => ({ asset, hours: data.hours.toFixed(1), cost: data.cost.toFixed(2) })).sort((a, b) => b.hours - a.hours).slice(0, 6);
  };

  const getAvailabilityData = () => {
    const filteredSubs = submissions.filter(s => s.date >= dateRange.start && s.date <= dateRange.end);
    return assets.map(asset => {
      const assetSubs = filteredSubs.filter(s => s.asset === asset.name).sort((a, b) => a.date.localeCompare(b.date));
      let totalRunHours = 0;
      for (let i = 1; i < assetSubs.length; i++) {
        const diff = parseFloat(assetSubs[i].hrs_start || 0) - parseFloat(assetSubs[i-1].hrs_start || 0);
        if (diff > 0 && diff < 24) totalRunHours += diff;
      }
      const days = Math.max(1, Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)));
      const targetHours = (asset.target_hours || 8) * days;
      const utilisation = targetHours > 0 ? Math.min(100, (totalRunHours / targetHours) * 100) : 0;
      return { asset: asset.name, totalRunHours: totalRunHours.toFixed(1), targetHours: targetHours.toFixed(1), utilisation: utilisation.toFixed(1), prestartCount: assetSubs.length, targetPerDay: asset.target_hours || 8 };
    });
  };

  const getUtilisationByPeriod = (period) => {
    const now = new Date();
    let start, end = now.toISOString().split('T')[0];
    if (period === 'daily') { start = end; }
    else if (period === 'weekly') { const s = new Date(); s.setDate(s.getDate() - 7); start = s.toISOString().split('T')[0]; }
    else { const s = new Date(now.getFullYear(), now.getMonth(), 1); start = s.toISOString().split('T')[0]; }
    const filteredSubs = submissions.filter(s => s.date >= start && s.date <= end);
    return assets.map(asset => {
      const assetSubs = filteredSubs.filter(s => s.asset === asset.name).sort((a, b) => a.date.localeCompare(b.date));
      let totalRunHours = 0;
      for (let i = 1; i < assetSubs.length; i++) {
        const diff = parseFloat(assetSubs[i].hrs_start || 0) - parseFloat(assetSubs[i-1].hrs_start || 0);
        if (diff > 0 && diff < 24) totalRunHours += diff;
      }
      const days = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1);
      const targetHours = (asset.target_hours || 8) * days;
      const utilisation = targetHours > 0 ? Math.min(100, (totalRunHours / targetHours) * 100) : 0;
      return { asset: asset.name, totalRunHours: totalRunHours.toFixed(1), targetHours: targetHours.toFixed(1), utilisation: utilisation.toFixed(1) };
    });
  };

  const getUtilColour = (pct) => pct >= 80 ? '#00c264' : pct >= 50 ? '#ffc800' : '#e94560';

  const filteredData = getFilteredData();
  const filteredHours = filteredData.reduce((sum, d) => sum + parseFloat(d.hours || 0), 0);
  const filteredCost = filteredData.reduce((sum, d) => sum + parseFloat(d.cost || 0), 0);
  const maxHours = Math.max(...getCategoryTotals().map(i => parseFloat(i.hours)), ...getAssetTotals().map(i => parseFloat(i.hours)), 1);
  const barColors = ['#00c2e0', '#ff6b00', '#ffc800', '#00c264', '#a0b0b0', '#e94560'];

  const exportDowntimePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.text('MECH IQ', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('by Coastline Machine Management', 14, 27);
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('DOWNTIME REPORT', 14, 40);
    doc.setTextColor(160, 176, 176); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Period: ' + dateRange.start + ' to ' + dateRange.end, 14, 48);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-AU'), 14, 54);
    doc.setDrawColor(26, 47, 47); doc.line(14, 58, 196, 58);
    doc.setFillColor(26, 47, 47); doc.rect(14, 62, 55, 20, 'F'); doc.rect(74, 62, 55, 20, 'F'); doc.rect(134, 62, 62, 20, 'F');
    doc.setTextColor(160, 176, 176); doc.setFontSize(8);
    doc.text('TOTAL EVENTS', 18, 68); doc.text('HOURS LOST', 78, 68); doc.text('TOTAL COST', 138, 68);
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(String(filteredData.length), 18, 78); doc.text(filteredHours.toFixed(1) + 'h', 78, 78);
    doc.setTextColor(255, 107, 0); doc.text('$' + filteredCost.toLocaleString('en-AU', { minimumFractionDigits: 2 }), 138, 78);
    doc.setTextColor(0, 194, 224); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('DOWNTIME EVENTS', 14, 95);
    if (filteredData.length === 0) {
      doc.setTextColor(160, 176, 176); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text('No downtime events recorded for this period.', 14, 105);
    } else {
      autoTable(doc, { startY: 98, head: [['Asset', 'Date', 'Category', 'Hours', 'Cost', 'Description']], body: filteredData.map(d => [d.asset, d.date, d.category, d.hours + 'h', '$' + parseFloat(d.cost || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 }), d.description]), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 9 }, alternateRowStyles: { fillColor: [20, 30, 30] }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
    }
    const finalY = doc.lastAutoTable?.finalY || 105;
    doc.setTextColor(0, 194, 224); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('DOWNTIME BY CATEGORY', 14, finalY + 15);
    autoTable(doc, { startY: finalY + 18, head: [['Category', 'Hours Lost']], body: getCategoryTotals().map(c => [c.category, c.hours + 'h']), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 9 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
    doc.setTextColor(160, 176, 176); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Generated by Mech IQ - mechiq.coastlinemm.com.au', 14, 285);
    doc.save('MechIQ-Downtime-' + dateRange.start + '-to-' + dateRange.end + '.pdf');
  };

  const exportAvailabilityPDF = () => {
    const availData = getAvailabilityData();
    const doc = new jsPDF();
    doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.text('MECH IQ', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('by Coastline Machine Management', 14, 27);
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('MACHINE AVAILABILITY REPORT', 14, 40);
    doc.setTextColor(160, 176, 176); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text('Period: ' + dateRange.start + ' to ' + dateRange.end, 14, 48);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-AU'), 14, 54);
    doc.setDrawColor(26, 47, 47); doc.line(14, 58, 196, 58);
    doc.setTextColor(0, 194, 224); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('UTILISATION BY MACHINE', 14, 68);
    autoTable(doc, { startY: 72, head: [['Machine', 'Run Hours', 'Target Hours', 'Utilisation %', 'Prestarts']], body: availData.map(a => [a.asset, a.totalRunHours + 'h', a.targetHours + 'h', a.utilisation + '%', a.prestartCount]), theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 9 }, alternateRowStyles: { fillColor: [20, 30, 30] }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
    doc.setTextColor(160, 176, 176); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Generated by Mech IQ - mechiq.coastlinemm.com.au', 14, 285);
    doc.save('MechIQ-Availability-' + dateRange.start + '-to-' + dateRange.end + '.pdf');
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mech IQ';
    const blue = '1E6FA8'; const lightBlue = 'D6EAF8'; const white = 'FFFFFF'; const dark = '1A1A1A'; const border = 'BBCFDD';
    const colHeader = (cell) => { cell.font = { bold: true, color: { argb: white }, size: 9, name: 'Calibri' }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blue } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; cell.border = { bottom: { style: 'thin', color: { argb: white } } }; };
    const dataCell = (cell, isAlt) => { cell.font = { color: { argb: dark }, size: 9, name: 'Calibri' }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? lightBlue : white } }; cell.alignment = { vertical: 'middle', indent: 1 }; cell.border = { bottom: { style: 'hair', color: { argb: border } } }; };
    const numCell = (cell, isAlt, color) => { cell.font = { bold: true, color: { argb: color || blue }, size: 9, name: 'Calibri' }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? lightBlue : white } }; cell.alignment = { vertical: 'middle', horizontal: 'right' }; cell.border = { bottom: { style: 'hair', color: { argb: border } } }; };
    const addHeader = (ws, title, numCols) => {
      ws.addRow([]);
      const r1 = ws.addRow(['MECH IQ  —  ' + title]); r1.height = 35;
      ws.mergeCells(r1.number, 1, r1.number, numCols);
      r1.getCell(1).font = { bold: true, color: { argb: white }, size: 18, name: 'Calibri' };
      r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blue } };
      r1.getCell(1).alignment = { vertical: 'middle', indent: 1 };
      const r2 = ws.addRow(['Coastline Machine Management  |  ' + dateRange.start + ' to ' + dateRange.end + '  |  Generated: ' + new Date().toLocaleDateString('en-AU')]); r2.height = 20;
      ws.mergeCells(r2.number, 1, r2.number, numCols);
      r2.getCell(1).font = { italic: true, color: { argb: white }, size: 9, name: 'Calibri' };
      r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E86C1' } };
      r2.getCell(1).alignment = { vertical: 'middle', indent: 1 };
      ws.addRow([]).height = 6;
    };

    const availData = getAvailabilityData();
    const av = wb.addWorksheet('Machine Availability', { properties: { tabColor: { argb: '00C264' } } });
    av.views = [{ showGridLines: false }];
    addHeader(av, 'MACHINE AVAILABILITY', 5);
    const avh = av.addRow(['Machine', 'Run Hours', 'Target Hours', 'Utilisation %', 'Prestarts']); avh.height = 22;
    ['A', 'B', 'C', 'D', 'E'].forEach(c => colHeader(avh.getCell(c)));
    availData.forEach((a, i) => {
      const r = av.addRow([a.asset, parseFloat(a.totalRunHours), parseFloat(a.targetHours), parseFloat(a.utilisation), a.prestartCount]); r.height = 18;
      dataCell(r.getCell('A'), i % 2 !== 0); numCell(r.getCell('B'), i % 2 !== 0, blue);
      numCell(r.getCell('C'), i % 2 !== 0, dark);
      const utilColor = parseFloat(a.utilisation) >= 80 ? '00C264' : parseFloat(a.utilisation) >= 50 ? 'FFC800' : 'E94560';
      numCell(r.getCell('D'), i % 2 !== 0, utilColor); numCell(r.getCell('E'), i % 2 !== 0, dark);
    });
    av.columns = [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 12 }];

    const ss = wb.addWorksheet('Summary', { properties: { tabColor: { argb: blue } } });
    ss.views = [{ showGridLines: false }];
    addHeader(ss, 'SUMMARY REPORT', 4);
    const sh = ss.addRow(['TOTAL EVENTS', 'HOURS LOST', 'TOTAL COST ($)']); sh.height = 22;
    ['A', 'B', 'C'].forEach(c => colHeader(sh.getCell(c)));
    const sv = ss.addRow([filteredData.length, parseFloat(filteredHours.toFixed(1)), parseFloat(filteredCost.toFixed(2))]); sv.height = 30;
    ['A', 'B', 'C'].forEach((col, idx) => { const colors = [dark, blue, 'CC4400']; sv.getCell(col).font = { bold: true, color: { argb: colors[idx] }, size: 20, name: 'Calibri' }; sv.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } }; sv.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' }; });
    ss.columns = [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 16 }];

    const es = wb.addWorksheet('All Events', { properties: { tabColor: { argb: '2E86C1' } } });
    es.views = [{ showGridLines: false }];
    addHeader(es, 'ALL DOWNTIME EVENTS', 9);
    const eh = es.addRow(['Asset', 'Date', 'Start', 'End', 'Hours', 'Cost ($)', 'Category', 'Description', 'Reported By']); eh.height = 22;
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach(c => colHeader(eh.getCell(c)));
    filteredData.forEach((d, i) => {
      const r = es.addRow([d.asset, d.date, d.start_time, d.end_time, parseFloat(d.hours || 0), parseFloat(d.cost || 0), d.category, d.description, d.reported_by]); r.height = 18;
      dataCell(r.getCell('A'), i % 2 !== 0); dataCell(r.getCell('B'), i % 2 !== 0); dataCell(r.getCell('C'), i % 2 !== 0); dataCell(r.getCell('D'), i % 2 !== 0);
      numCell(r.getCell('E'), i % 2 !== 0, blue); numCell(r.getCell('F'), i % 2 !== 0, 'CC4400');
      dataCell(r.getCell('G'), i % 2 !== 0); dataCell(r.getCell('H'), i % 2 !== 0); dataCell(r.getCell('I'), i % 2 !== 0);
    });
    es.columns = [{ width: 16 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 16 }, { width: 42 }, { width: 16 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'MechIQ-Report-' + dateRange.start + '-to-' + dateRange.end + '.xlsx');
  };

  if (loading) return <p style={{ color: '#a0b0b0', padding: '20px' }}>Loading report data...</p>;

  const availabilityData = getAvailabilityData();
  const avgUtilisation = availabilityData.length > 0
    ? (availabilityData.reduce((sum, a) => sum + parseFloat(a.utilisation), 0) / availabilityData.length).toFixed(1)
    : 0;
  const totalDowntimeCost = downtimeData.reduce((sum, d) => sum + parseFloat(d.cost || 0), 0);

  const TABS = [
    { id: 'downtime-log', label: '📋 Downtime Log' },
    { id: 'downtime', label: '📊 Downtime Analysis' },
    { id: 'availability', label: '⚙️ Machine Availability' },
  ];

  return (
    <div className="reports">
      <div className="page-header">
        <h2>Reports & Analysis</h2>
      </div>

      {/* Summary Cards */}
      <div className="report-summary">
        <div className="report-card">
          <h4>Total Downtime Hours</h4>
          <p className="report-number">{totalHours}h</p>
          <span className="report-sub">All time</span>
        </div>
        <div className="report-card">
          <h4>Total Downtime Cost</h4>
          <p className="report-number" style={{ color: '#ff6b00' }}>${parseFloat(totalCost).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</p>
          <span className="report-sub">All time</span>
        </div>
        <div className="report-card">
          <h4>Total Assets</h4>
          <p className="report-number">{assetCount}</p>
          <span className="report-sub">Registered machines</span>
        </div>
        <div className="report-card">
          <h4>Avg Utilisation</h4>
          <p className="report-number" style={{ color: getUtilColour(parseFloat(avgUtilisation)) }}>{avgUtilisation}%</p>
          <span className="report-sub">Fleet average</span>
        </div>
      </div>

      {/* Date Range + Export */}
      <div className="weekly-report">
        <div className="weekly-header">
          <h3>Report Period</h3>
          <div className="week-selector">
            <button className="btn-primary" onClick={activeTab === 'availability' ? exportAvailabilityPDF : exportDowntimePDF}>Export PDF</button>
            <button className="btn-excel" onClick={exportExcel}>Export Excel</button>
          </div>
        </div>
        <div className="date-range-selector">
          <div className="date-field"><label>From</label><input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} /></div>
          <div className="date-field"><label>To</label><input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} /></div>
          <div className="date-shortcuts">
            <button className="week-btn" onClick={() => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 7); setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }); }}>Last 7 Days</button>
            <button className="week-btn" onClick={() => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 30); setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }); }}>Last 30 Days</button>
            <button className="week-btn" onClick={() => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); setDateRange({ start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }); }}>This Month</button>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '0', marginTop: '20px', marginBottom: '20px', borderBottom: '2px solid #1a2f2f' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '12px 24px', backgroundColor: 'transparent', color: activeTab === tab.id ? '#00c2e0' : '#a0b0b0', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #00c2e0' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === tab.id ? 'bold' : 'normal', fontSize: '14px', marginBottom: '-2px', fontFamily: 'Barlow, sans-serif', letterSpacing: '0.5px' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* DOWNTIME LOG TAB */}
      {activeTab === 'downtime-log' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="cost-banner" style={{ margin: 0 }}>
              <span>Total Downtime Cost:</span>
              <span className="cost-total">${totalDowntimeCost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Log Downtime</button>
          </div>

          {showForm && (
            <div className="form-card" style={{ marginBottom: '20px' }}>
              <h3>Log New Downtime Event</h3>
              <div className="form-grid">
                <select value={newDowntime.asset} onChange={e => setNewDowntime({ ...newDowntime, asset: e.target.value })}>
                  <option value="">Select Asset</option>
                  {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
                <input type="date" value={newDowntime.date} onChange={e => setNewDowntime({ ...newDowntime, date: e.target.value })} />
                <input type="time" value={newDowntime.start_time} onChange={e => setNewDowntime({ ...newDowntime, start_time: e.target.value })} />
                <input type="time" value={newDowntime.end_time} onChange={e => setNewDowntime({ ...newDowntime, end_time: e.target.value })} />
                <select value={newDowntime.category} onChange={e => setNewDowntime({ ...newDowntime, category: e.target.value })}>
                  <option value="">Fault Category</option>
                  <option>Mechanical</option>
                  <option>Electrical</option>
                  <option>Operator Error</option>
                  <option>Scheduled</option>
                  <option>Environmental</option>
                  <option>Other</option>
                </select>
                <input placeholder="Reported By" value={newDowntime.reported_by} onChange={e => setNewDowntime({ ...newDowntime, reported_by: e.target.value })} />
              </div>
              <textarea placeholder="Fault Description" value={newDowntime.description} onChange={e => setNewDowntime({ ...newDowntime, description: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #1a2f2f', backgroundColor: '#0a0f0f', color: 'white', marginBottom: '15px', fontSize: '14px', minHeight: '80px', fontFamily: 'Barlow, sans-serif' }} />
              <button className="btn-primary" onClick={handleAddDowntime}>Save Downtime</button>
            </div>
          )}

          <table className="data-table">
            <thead>
              <tr><th>Asset</th><th>Date</th><th>Start</th><th>End</th><th>Hours</th><th>Cost</th><th>Category</th><th>Description</th><th>Reported By</th><th>Action</th></tr>
            </thead>
            <tbody>
              {downtimeData.length === 0
                ? <tr><td colSpan={10} style={{ color: '#a0b0b0', textAlign: 'center' }}>No downtime records yet</td></tr>
                : downtimeData.map(d => (
                  <tr key={d.id}>
                    <td>{d.asset}</td><td>{d.date}</td><td>{d.start_time}</td><td>{d.end_time}</td>
                    <td><span className="hours-badge">{d.hours}h</span></td>
                    <td><span className="cost-badge">${parseFloat(d.cost || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></td>
                    <td><span className="category-badge">{d.category}</span></td>
                    <td>{d.description}</td><td>{d.reported_by}</td>
                    <td><button className="btn-delete" onClick={() => handleDeleteDowntime(d.id)}>Delete</button></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* DOWNTIME ANALYSIS TAB */}
      {activeTab === 'downtime' && (
        <div>
          <div className="weekly-stats" style={{ marginTop: '15px' }}>
            <div className="weekly-stat"><span className="weekly-stat-label">Events</span><span className="weekly-stat-value">{filteredData.length}</span></div>
            <div className="weekly-stat"><span className="weekly-stat-label">Hours Lost</span><span className="weekly-stat-value">{filteredHours.toFixed(1)}h</span></div>
            <div className="weekly-stat"><span className="weekly-stat-label">Total Cost</span><span className="weekly-stat-value" style={{ color: '#ff6b00' }}>${filteredCost.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></div>
          </div>
          {filteredData.length === 0 ? <p style={{ color: '#a0b0b0', marginTop: '15px' }}>No downtime events for this period</p> : (
            <table className="data-table" style={{ marginTop: '15px' }}>
              <thead><tr><th>Asset</th><th>Date</th><th>Category</th><th>Hours</th><th>Cost</th><th>Description</th></tr></thead>
              <tbody>
                {filteredData.map(d => (
                  <tr key={d.id}>
                    <td>{d.asset}</td><td>{d.date}</td>
                    <td><span className="category-badge">{d.category}</span></td>
                    <td><span className="hours-badge">{d.hours}h</span></td>
                    <td><span className="cost-badge">${parseFloat(d.cost || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></td>
                    <td>{d.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="charts-grid" style={{ marginTop: '30px' }}>
            <div className="chart-card">
              <h3>Downtime by Fault Category</h3>
              {getCategoryTotals().length === 0 ? <p style={{ color: '#a0b0b0' }}>No data yet</p> : getCategoryTotals().map((item, index) => (
                <div key={item.category} className="bar-row">
                  <span className="bar-label">{item.category}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: (parseFloat(item.hours) / maxHours) * 100 + '%', backgroundColor: barColors[index % barColors.length] }} /></div>
                  <span className="bar-value">{item.hours}h</span>
                </div>
              ))}
            </div>
            <div className="chart-card">
              <h3>Downtime Cost by Asset</h3>
              {getAssetTotals().length === 0 ? <p style={{ color: '#a0b0b0' }}>No data yet</p> : getAssetTotals().map((item, index) => (
                <div key={item.asset} className="bar-row">
                  <span className="bar-label">{item.asset}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: (parseFloat(item.hours) / maxHours) * 100 + '%', backgroundColor: barColors[index % barColors.length] }} /></div>
                  <span className="bar-value">${parseFloat(item.cost).toLocaleString('en-AU', { minimumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MACHINE AVAILABILITY TAB */}
      {activeTab === 'availability' && (
        <div style={{ marginTop: '15px' }}>
          <div className="weekly-stats">
            <div className="weekly-stat"><span className="weekly-stat-label">Fleet Avg Utilisation</span><span className="weekly-stat-value" style={{ color: getUtilColour(parseFloat(avgUtilisation)) }}>{avgUtilisation}%</span></div>
            <div className="weekly-stat"><span className="weekly-stat-label">Machines Tracked</span><span className="weekly-stat-value">{availabilityData.filter(a => a.prestartCount > 0).length}</span></div>
            <div className="weekly-stat"><span className="weekly-stat-label">Total Prestarts</span><span className="weekly-stat-value">{availabilityData.reduce((sum, a) => sum + a.prestartCount, 0)}</span></div>
          </div>
          <div className="charts-grid" style={{ marginTop: '20px' }}>
            {['daily', 'weekly', 'monthly'].map(period => (
              <div key={period} className="chart-card">
                <h3>{period === 'daily' ? "Today's" : period === 'weekly' ? 'Last 7 Days' : 'This Month'} Utilisation</h3>
                {getUtilisationByPeriod(period).filter(a => parseFloat(a.totalRunHours) > 0).length === 0
                  ? <p style={{ color: '#a0b0b0', fontSize: '13px' }}>No prestart data for this period</p>
                  : getUtilisationByPeriod(period).map(a => (
                    <div key={a.asset} className="bar-row">
                      <span className="bar-label">{a.asset}</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: Math.min(100, parseFloat(a.utilisation)) + '%', backgroundColor: getUtilColour(parseFloat(a.utilisation)) }} /></div>
                      <span className="bar-value" style={{ color: getUtilColour(parseFloat(a.utilisation)) }}>{a.utilisation}%</span>
                    </div>
                  ))
                }
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '12px', color: '#fff' }}>Machine Utilisation Detail</h3>
            {availabilityData.length === 0 ? <p style={{ color: '#a0b0b0' }}>No assets registered yet</p> : (
              <table className="data-table">
                <thead><tr><th>Machine</th><th>Run Hours</th><th>Target Hours</th><th>Utilisation</th><th>Prestarts</th><th>Target/Day</th></tr></thead>
                <tbody>
                  {availabilityData.map(a => (
                    <tr key={a.asset}>
                      <td>{a.asset}</td><td>{a.totalRunHours}h</td><td>{a.targetHours}h</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '8px', backgroundColor: '#1a2f2f', borderRadius: '4px' }}>
                            <div style={{ width: Math.min(100, parseFloat(a.utilisation)) + '%', height: '100%', backgroundColor: getUtilColour(parseFloat(a.utilisation)), borderRadius: '4px' }} />
                          </div>
                          <span style={{ color: getUtilColour(parseFloat(a.utilisation)), fontWeight: 'bold' }}>{a.utilisation}%</span>
                        </div>
                      </td>
                      <td>{a.prestartCount}</td><td>{a.targetPerDay}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
