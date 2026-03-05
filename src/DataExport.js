import React, { useState } from 'react';
import { supabase } from './supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const CYAN = '#00ABE4';
const GREEN = '#166534';
const RED = '#dc2626';
const ORANGE = '#ff6b00';
const BORDER = '#d6e6f2';
const CARD = '#ffffff';

const DATASETS = [
  { id: 'assets',                   label: 'Assets',              table: 'assets',                   icon: '🏗️' },
  { id: 'downtime',                 label: 'Downtime Logs',       table: 'downtime',                 icon: '⏱️' },
  { id: 'maintenance',              label: 'Maintenance Tasks',   table: 'maintenance',              icon: '🔧' },
  { id: 'work_orders',              label: 'Work Orders',         table: 'work_orders',              icon: '📋' },
  { id: 'form_templates',           label: 'Prestart Templates',  table: 'form_templates',           icon: '📄' },
  { id: 'form_submissions',         label: 'Prestart Submissions',table: 'form_submissions',         icon: '✅' },
  { id: 'service_sheet_templates',  label: 'Service Templates',   table: 'service_sheet_templates',  icon: '🗂️' },
  { id: 'service_sheet_submissions',label: 'Service Submissions', table: 'service_sheet_submissions',icon: '🔩' },
  { id: 'user_roles',               label: 'Users',               table: 'user_roles',               icon: '👥' },
];

// Flatten JSON/object values to string for Excel
function flattenValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

function buildRows(data) {
  if (!data || data.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => flattenValue(row[h])));
  return { headers, rows };
}

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1515' } };
const HEADER_FONT = { bold: true, color: { argb: 'FF00C2E0' }, name: 'Arial', size: 10 };
const ROW_FONT    = { color: { argb: 'FFE0EAEA' }, name: 'Arial', size: 9 };
const ROW_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0F0F' } };
const ALT_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1515' } };
const BORDER_STYLE = { style: 'thin', color: { argb: 'FF1A2F2F' } };
const CELL_BORDER = { top: BORDER_STYLE, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE };

function styleSheet(sheet, headers, rowCount) {
  // Header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = CELL_BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  // Data rows
  for (let r = 2; r <= rowCount + 1; r++) {
    const row = sheet.getRow(r);
    row.height = 16;
    headers.forEach((_, i) => {
      const cell = row.getCell(i + 1);
      cell.font = ROW_FONT;
      cell.fill = r % 2 === 0 ? ROW_FILL : ALT_FILL;
      cell.border = CELL_BORDER;
      cell.alignment = { vertical: 'middle', wrapText: false };
    });
  }

  // Auto column width
  headers.forEach((h, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = Math.min(50, Math.max(12, h.length + 4));
  });
}

function addCoverSheet(wb, companyName, exportedSets, totalRows) {
  const sheet = wb.addWorksheet('📊 Export Summary');
  sheet.properties.tabColor = { argb: 'FF00C2E0' };

  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 40;

  const title = sheet.getCell('A1');
  title.value = 'MECH IQ — DATA EXPORT';
  title.font = { bold: true, size: 16, color: { argb: 'FF00C2E0' }, name: 'Arial' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1515' } };

  sheet.getCell('A2').value = 'Company:';
  sheet.getCell('B2').value = companyName || 'Unknown';
  sheet.getCell('A3').value = 'Export Date:';
  sheet.getCell('B3').value = new Date().toLocaleString('en-AU');
  sheet.getCell('A4').value = 'Total Records:';
  sheet.getCell('B4').value = totalRows;

  [['A2','B2'],['A3','B3'],['A4','B4']].forEach(([a, b]) => {
    sheet.getCell(a).font = { bold: true, color: { argb: 'FF8FA8A8' }, name: 'Arial', size: 10 };
    sheet.getCell(b).font = { color: { argb: 'FFE0EAEA' }, name: 'Arial', size: 10 };
    sheet.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0F0F' } };
    sheet.getCell(b).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0F0F' } };
  });

  sheet.getCell('A6').value = 'Sheet';
  sheet.getCell('B6').value = 'Records Exported';
  sheet.getCell('A6').font = HEADER_FONT;
  sheet.getCell('B6').font = HEADER_FONT;
  sheet.getCell('A6').fill = HEADER_FILL;
  sheet.getCell('B6').fill = HEADER_FILL;

  exportedSets.forEach(({ label, count }, i) => {
    const row = 7 + i;
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = count;
    sheet.getCell(`A${row}`).font = ROW_FONT;
    sheet.getCell(`B${row}`).font = { ...ROW_FONT, color: { argb: 'FF00C264' } };
    sheet.getCell(`A${row}`).fill = i % 2 === 0 ? ROW_FILL : ALT_FILL;
    sheet.getCell(`B${row}`).fill = i % 2 === 0 ? ROW_FILL : ALT_FILL;
  });

  const footer = sheet.getCell(`A${8 + exportedSets.length}`);
  footer.value = '© ' + new Date().getFullYear() + ' Mech IQ — Coastline Mechanical. All rights reserved.';
  footer.font = { italic: true, color: { argb: 'FF4A6A6A' }, size: 8, name: 'Arial' };
  footer.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF060B0B' } };
}

export default function DataExport({ userRole }) {
  const [selected, setSelected] = useState(new Set(DATASETS.map(d => d.id)));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [lastExport, setLastExport] = useState(null);
  const [error, setError] = useState(null);

  console.log('DataExport rendering, userRole:', userRole);
const isAdmin = userRole?.role === 'admin' || userRole?.role === 'master';

  const toggleAll = () => {
    if (selected.size === DATASETS.length) setSelected(new Set());
    else setSelected(new Set(DATASETS.map(d => d.id)));
  };

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleExport = async () => {
    if (selected.size === 0) { setError('Please select at least one dataset to export.'); return; }
    setLoading(true);
    setError(null);
    setProgress('Initialising export...');

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Mech IQ';
      wb.lastModifiedBy = userRole?.name || 'Admin';
      wb.created = new Date();
      wb.modified = new Date();

      const exportedSets = [];
      let totalRows = 0;
      const companyId = userRole?.company_id;

      // Fetch company name
      let companyName = 'Unknown';
      if (companyId) {
        const { data: co } = await supabase.from('companies').select('name').eq('id', companyId).single();
        if (co) companyName = co.name;
      }

      for (const ds of DATASETS) {
        if (!selected.has(ds.id)) continue;
        setProgress(`Fetching ${ds.label}...`);

        const { data, error: fetchErr } = await supabase
          .from(ds.table)
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (fetchErr) {
          console.warn(`Skipping ${ds.table}:`, fetchErr.message);
          exportedSets.push({ label: ds.label, count: 0 });
          continue;
        }

        const { headers, rows } = buildRows(data || []);
        const sheet = wb.addWorksheet(ds.icon + ' ' + ds.label);

        if (headers.length > 0) {
          sheet.addRow(headers);
          rows.forEach(row => sheet.addRow(row));
          styleSheet(sheet, headers, rows.length);
        } else {
          sheet.addRow(['No data found']);
          sheet.getCell('A1').font = { color: { argb: 'FF8FA8A8' }, italic: true, name: 'Arial' };
          sheet.getCell('A1').fill = ROW_FILL;
        }

        exportedSets.push({ label: ds.label, count: rows.length });
        totalRows += rows.length;
        setProgress(`Exported ${ds.label} (${rows.length} records)`);
      }

      // Add cover sheet last (inserted at position 0)
      addCoverSheet(wb, companyName, exportedSets, totalRows);

      // Move cover sheet to front
      wb.worksheets.unshift(wb.worksheets.pop());

      setProgress('Generating Excel file...');
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `MechIQ-Export-${companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, filename);

      setLastExport({ date: new Date().toLocaleString('en-AU'), filename, totalRows, sheets: exportedSets.length });
      setProgress('');
    } catch (err) {
      setError('Export failed: ' + err.message);
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: '#ffffff',
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 20,
  };

  if (!isAdmin) {
    return (
      <div style={{ fontFamily: 'Barlow, sans-serif', color: '#e0eaea', padding: '40px 28px', textAlign: 'center' }}>
        <p style={{ color: '#8fa8a8' }}>Data export is available to administrators only.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Barlow, sans-serif', color: '#e0eaea', padding: '24px 28px', maxWidth: 900 }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a2b3c" }}>Data Export</h1>
        <p style={{ margin: '6px 0 0', color: '#7a92a8', fontSize: 14 }}>
          Export all your company data as a multi-sheet Excel workbook for backup or offline access
        </p>
      </div>

      {/* Dataset Selection */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2b3c', letterSpacing: '0.04em' }}>
            SELECT DATASETS
          </h3>
          <button
            onClick={toggleAll}
            style={{ background: '#f0f4f8', border: '1px solid #d6e6f2', color: '#3d5166', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'Barlow, sans-serif' }}
          >
            {selected.size === DATASETS.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {DATASETS.map(ds => {
            const on = selected.has(ds.id);
            return (
              <div
                key={ds.id}
                onClick={() => toggle(ds.id)}
                onMouseEnter={e => { if (!selected.has(ds.id)) e.currentTarget.style.background = '#f0f4f8'; }}
                onMouseLeave={e => { if (!selected.has(ds.id)) e.currentTarget.style.background = '#ffffff'; }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `1px solid ${on ? '#00ABE4' : '#d6e6f2'}`,
                  background: on ? '#e6f4ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: on ? '0 0 0 2px #00ABE422' : 'none',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `2px solid ${on ? '#00ABE4' : '#c0cdd8'}`,
                  background: on ? CYAN : 'transparent',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 15 }}>{ds.icon}</span>
                <span style={{ color: on ? '#1a2b3c' : '#7a92a8', fontSize: 13, fontWeight: on ? 600 : 400 }}>
                  {ds.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Info */}
      <div style={{ ...cardStyle, background: '#f8fafc', border: `1px solid ${CYAN}22` }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#8fa8a8', letterSpacing: '0.05em' }}>
          WHAT YOU'LL GET
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '📊', label: 'Export Summary sheet', desc: 'Cover page with record counts' },
            { icon: '🗄️', label: 'One sheet per dataset', desc: 'All your data, fully formatted' },
            { icon: '🔒', label: 'Company data only', desc: 'Isolated to your account' },
            { icon: '💾', label: 'XLSX format', desc: 'Opens in Excel, Google Sheets' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2b3c' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#7a92a8', marginTop: 2 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: `1px solid ${RED}44`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Progress */}
      {loading && progress && (
        <div style={{ background: '#f0f7ff', border: `1px solid ${CYAN}33`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #1a2f2f', borderTopColor: CYAN, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          <span style={{ color: '#0077cc', fontSize: 13 }}>{progress}</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Last Export */}
      {lastExport && !loading && (
        <div style={{ background: '#f0faf5', border: `1px solid ${GREEN}44`, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ color: '#166534', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>✓ Export complete</div>
          <div style={{ color: '#8fa8a8', fontSize: 12 }}>
            {lastExport.filename} — {lastExport.totalRows} records across {lastExport.sheets} sheets — {lastExport.date}
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        className="btn-primary"
        style={{
          padding: '14px 40px',
          fontSize: 15,
          fontWeight: 700,
          background: loading ? '#1a2f2f' : `linear-gradient(135deg, ${CYAN}, #0090a8)`,
          color: loading ? '#8fa8a8' : '#000',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: selected.size === 0 ? 0.5 : 1,
          width: '100%',
          borderRadius: 8,
          border: 'none',
          letterSpacing: '0.05em',
        }}
        onClick={handleExport}
        disabled={loading || selected.size === 0}
      >
        {loading ? `Exporting... (${progress || 'please wait'})` : `⬇ Export ${selected.size} Dataset${selected.size !== 1 ? 's' : ''} to Excel`}
      </button>

      <p style={{ color: '#7a92a8', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
        Data is exported directly from your Supabase database. No data leaves your account except to your local download.
      </p>
    </div>
  );
}
