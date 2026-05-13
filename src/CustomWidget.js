// ─── MechIQ Custom Widget System ─────────────────────────────────────────────
// Widget builder + renderer for user-created dashboard widgets.
// Stores configs in Supabase custom_widgets table, renders with recharts.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = [
  '#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#84cc16','#f97316','#ec4899','#14b8a6',
];

// ─── Display types ────────────────────────────────────────────────────────────
const DISPLAY_TYPES = [
  { id:'kpi',  label:'KPI Number', icon:'#️⃣', desc:'Single big number with trend' },
  { id:'bar',  label:'Bar Chart',  icon:'📊', desc:'Compare values across categories' },
  { id:'line', label:'Line Chart', icon:'📈', desc:'Trends over time' },
  { id:'pie',  label:'Pie Chart',  icon:'🥧', desc:'Show proportions' },
  { id:'list', label:'List',       icon:'📋', desc:'Scrollable item list' },
];

// ─── Data source definitions ──────────────────────────────────────────────────
export const DATA_SOURCES = {
  assets: {
    label: 'Assets / Fleet', icon: '🚛', table: 'assets',
    metrics: {
      total:           { label: 'Total Fleet Count',     kpi: true,  chart: false },
      by_status:       { label: 'Assets by Status',      kpi: false, chart: true,  list: true },
      by_type:         { label: 'Assets by Type',        kpi: false, chart: true },
      by_location:     { label: 'Assets by Location',    kpi: false, chart: true },
      running_count:   { label: 'Running / Active',      kpi: true,  chart: false },
      down_count:      { label: 'Assets Down',           kpi: true,  chart: false, urgent: true },
      utilisation_pct: { label: 'Fleet Utilisation %',   kpi: true,  chart: false },
    },
  },
  maintenance: {
    label: 'Maintenance Tasks', icon: '🔧', table: 'maintenance',
    metrics: {
      overdue:         { label: 'Overdue Services',      kpi: true,  chart: false, urgent: true },
      due_soon:        { label: 'Due Soon',              kpi: true,  chart: false, warn: true },
      by_status:       { label: 'Tasks by Status',       kpi: false, chart: true },
      by_asset:        { label: 'Tasks by Asset',        kpi: false, chart: true },
      completed_month: { label: 'Completed This Month',  kpi: true,  chart: false },
    },
  },
  work_orders: {
    label: 'Work Orders', icon: '📝', table: 'work_orders',
    metrics: {
      open_count:      { label: 'Open Work Orders',      kpi: true,  chart: false, warn: true },
      critical_count:  { label: 'Critical WOs',          kpi: true,  chart: false, urgent: true },
      by_priority:     { label: 'WOs by Priority',       kpi: false, chart: true },
      by_status:       { label: 'WOs by Status',         kpi: false, chart: true },
      by_asset:        { label: 'WOs by Asset',          kpi: false, chart: true },
      recent_list:     { label: 'Recent Work Orders',    kpi: false, chart: false, list: true },
    },
  },
  service_schedules: {
    label: 'Service Schedules', icon: '📅', table: 'service_schedules',
    metrics: {
      overdue:         { label: 'Predicted Overdue',     kpi: true,  chart: false, urgent: true },
      due_week:        { label: 'Predicted Due This Week',kpi: true, chart: false, warn: true },
      due_month:       { label: 'Predicted Due This Month',kpi: true, chart: false },
      by_asset:        { label: 'Schedules by Asset',    kpi: false, chart: true },
    },
  },
  prestarts: {
    label: 'Prestarts', icon: '📋', table: 'form_submissions',
    metrics: {
      total_today:     { label: 'Submitted Today',       kpi: true,  chart: false },
      defect_rate:     { label: 'Defect Rate This Week %',kpi: true, chart: false, warn: true },
      defects_count:   { label: 'Defects Found (30d)',   kpi: true,  chart: false, urgent: true },
      by_asset:        { label: 'Prestarts by Asset',    kpi: false, chart: true },
      trend_daily:     { label: 'Daily Submission Trend',kpi: false, chart: true, line: true },
      recent_defects:  { label: 'Recent Defects List',   kpi: false, chart: false, list: true },
    },
  },
  downtime: {
    label: 'Downtime', icon: '⬇', table: 'downtime',
    metrics: {
      hours_month:     { label: 'Hours Lost This Month', kpi: true,  chart: false, urgent: true },
      incidents_month: { label: 'Incidents This Month',  kpi: true,  chart: false, warn: true },
      by_asset:        { label: 'Downtime by Asset',     kpi: false, chart: true },
      by_category:     { label: 'Downtime by Category',  kpi: false, chart: true },
      trend_weekly:    { label: 'Weekly Downtime Trend', kpi: false, chart: true,  line: true },
    },
  },
  parts: {
    label: 'Parts & Stock', icon: '🔩', table: 'parts_inventory',
    metrics: {
      low_stock:       { label: 'Low Stock Items',       kpi: true,  chart: false, warn: true },
      total_value:     { label: 'Total Inventory Value', kpi: true,  chart: false },
      by_category:     { label: 'Parts by Category',     kpi: false, chart: true },
      low_stock_list:  { label: 'Low Stock List',        kpi: false, chart: false, list: true },
    },
  },
  oil_samples: {
    label: 'Oil Sampling', icon: '🧪', table: 'oil_samples',
    metrics: {
      alert_count:     { label: 'Critical Alerts',       kpi: true,  chart: false, urgent: true },
      caution_count:   { label: 'Caution Samples',       kpi: true,  chart: false, warn: true },
      by_asset:        { label: 'Samples by Asset',      kpi: false, chart: true },
      recent_list:     { label: 'Recent Alert List',     kpi: false, chart: false, list: true },
    },
  },
};

// ─── Data fetcher ─────────────────────────────────────────────────────────────
async function fetchWidgetData(config, companyId) {
  // Support both legacy metric (string) and new metrics (array)
  const metricsArr = Array.isArray(config.metrics)
    ? config.metrics
    : [config.metrics || config.metric || 'total'].filter(Boolean);
  const { dataSource, timeRange = '30d' } = config;

  // Fetch all selected metrics and combine
  if (metricsArr.length > 1 && config.displayType === 'kpi') {
    const results = await Promise.all(metricsArr.map(m => fetchWidgetData({ ...config, metrics: [m], metric: m }, companyId)));
    const combined = results.filter(Boolean);
    // For multi-metric KPI: show as grouped list of values
    const srcDef = DATA_SOURCES[dataSource] || {};
    return {
      multiKpi: combined.map((r, i) => ({
        label: srcDef.metrics?.[metricsArr[i]]?.label || metricsArr[i],
        kpi: r?.kpi,
        suffix: r?.suffix || '',
        prefix: r?.prefix || '',
        urgent: srcDef.metrics?.[metricsArr[i]]?.urgent,
        warn: srcDef.metrics?.[metricsArr[i]]?.warn,
      }))
    };
  }
  if (metricsArr.length > 1 && (config.displayType === 'bar' || config.displayType === 'line')) {
    const results = await Promise.all(metricsArr.map(m => fetchWidgetData({ ...config, metrics: [m], metric: m }, companyId)));
    // Merge chart data arrays
    const allNames = new Set();
    results.forEach(r => (r?.chart || []).forEach(d => allNames.add(d.name)));
    const merged = Array.from(allNames).map(name => {
      const pt = { name };
      results.forEach((r, i) => {
        const found = (r?.chart || []).find(d => d.name === name);
        pt[metricsArr[i]] = found?.value || 0;
      });
      return pt;
    });
    return { chart: merged, multiKey: metricsArr };
  }

  const metric = metricsArr[0];
  const cid = companyId;
  const now = new Date();
  const cutoff = new Date(now);
  if (timeRange === '7d') cutoff.setDate(now.getDate() - 7);
  else if (timeRange === '30d') cutoff.setDate(now.getDate() - 30);
  else if (timeRange === '90d') cutoff.setDate(now.getDate() - 90);
  const cutoffStr = cutoff.toISOString();
  const todayStr = now.toISOString().split('T')[0];
  const monthStart = now.toISOString().slice(0, 7);

  // ── ASSETS ────────────────────────────────────────────────────────────────
  if (dataSource === 'assets') {
    const { data } = await supabase.from('assets').select('*').eq('company_id', cid);
    const rows = data || [];
    if (metric === 'total') return { kpi: rows.length };
    if (metric === 'running_count') return { kpi: rows.filter(a => /running|active/i.test(a.status || '')).length };
    if (metric === 'down_count') return { kpi: rows.filter(a => /down|offline|breakdown/i.test(a.status || '')).length };
    if (metric === 'utilisation_pct') {
      const running = rows.filter(a => /running|active/i.test(a.status || '')).length;
      return { kpi: rows.length > 0 ? Math.round((running / rows.length) * 100) : 0, suffix: '%' };
    }
    if (metric === 'by_status') {
      const map = {};
      rows.forEach(a => { const s = a.status || 'Unknown'; map[s] = (map[s] || 0) + 1; });
      return { chart: Object.entries(map).map(([name, value]) => ({ name, value })) };
    }
    if (metric === 'by_type') {
      const map = {};
      rows.forEach(a => { const t = a.type || 'Unknown'; map[t] = (map[t] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value})) };
    }
    if (metric === 'by_location') {
      const map = {};
      rows.forEach(a => { const l = a.location || 'Unknown'; map[l] = (map[l] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
  }

  // ── MAINTENANCE ───────────────────────────────────────────────────────────
  if (dataSource === 'maintenance') {
    const { data } = await supabase.from('maintenance').select('*').eq('company_id', cid);
    const rows = data || [];
    if (metric === 'overdue') return { kpi: rows.filter(m => /overdue/i.test(m.status || '')).length };
    if (metric === 'due_soon') return { kpi: rows.filter(m => /due.soon/i.test(m.status || '')).length };
    if (metric === 'completed_month') return { kpi: rows.filter(m => /complet/i.test(m.status || '') && (m.updated_at||'').startsWith(monthStart)).length };
    if (metric === 'by_status') {
      const map = {};
      rows.forEach(m => { const s = m.status || 'Unknown'; map[s] = (map[s] || 0) + 1; });
      return { chart: Object.entries(map).map(([name,value])=>({name,value})) };
    }
    if (metric === 'by_asset') {
      const map = {};
      rows.forEach(m => { const a = m.asset || 'Unknown'; map[a] = (map[a] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
  }

  // ── WORK ORDERS ───────────────────────────────────────────────────────────
  if (dataSource === 'work_orders') {
    const { data } = await supabase.from('work_orders').select('*').eq('company_id', cid);
    const rows = data || [];
    const open = rows.filter(w => !/complet/i.test(w.status || ''));
    if (metric === 'open_count') return { kpi: open.length };
    if (metric === 'critical_count') return { kpi: open.filter(w => /critical/i.test(w.priority || '')).length };
    if (metric === 'by_priority') {
      const map = {};
      open.forEach(w => { const p = w.priority || 'Unknown'; map[p] = (map[p] || 0) + 1; });
      return { chart: Object.entries(map).map(([name,value])=>({name,value})) };
    }
    if (metric === 'by_status') {
      const map = {};
      rows.forEach(w => { const s = w.status || 'Unknown'; map[s] = (map[s] || 0) + 1; });
      return { chart: Object.entries(map).map(([name,value])=>({name,value})) };
    }
    if (metric === 'by_asset') {
      const map = {};
      open.forEach(w => { const a = w.asset || 'Unknown'; map[a] = (map[a] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
    if (metric === 'recent_list') return { list: open.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8).map(w=>({ primary: w.title || w.defect_description || '—', secondary: `${w.asset || '—'} · ${w.priority || '—'} · ${w.status || '—'}`, color: /critical/i.test(w.priority||'') ? 'var(--red)' : 'var(--amber)' })) };
  }

  // ── SERVICE SCHEDULES ─────────────────────────────────────────────────────
  if (dataSource === 'service_schedules') {
    const { data } = await supabase.from('service_schedules').select('*').eq('company_id', cid);
    const rows = data || [];
    const today = todayStr;
    const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7);
    const weekStr = weekAhead.toISOString().split('T')[0];
    const monthAhead = new Date(); monthAhead.setDate(monthAhead.getDate() + 30);
    const monthStr = monthAhead.toISOString().split('T')[0];
    const withPred = rows.filter(s => s.predicted_date);
    if (metric === 'overdue') return { kpi: withPred.filter(s => s.predicted_date < today).length };
    if (metric === 'due_week') return { kpi: withPred.filter(s => s.predicted_date >= today && s.predicted_date <= weekStr).length };
    if (metric === 'due_month') return { kpi: withPred.filter(s => s.predicted_date >= today && s.predicted_date <= monthStr).length };
    if (metric === 'by_asset') {
      const map = {};
      rows.forEach(s => { const a = s.asset_name || 'Unknown'; map[a] = (map[a] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
  }

  // ── PRESTARTS ─────────────────────────────────────────────────────────────
  if (dataSource === 'prestarts') {
    const { data } = await supabase.from('form_submissions').select('*').eq('company_id', cid).gte('created_at', cutoffStr);
    const rows = data || [];
    if (metric === 'total_today') return { kpi: rows.filter(s => (s.date || '').startsWith(todayStr)).length };
    if (metric === 'defect_rate') {
      const week = rows.filter(s => new Date(s.created_at) >= new Date(Date.now() - 7*86400000));
      return { kpi: week.length > 0 ? Math.round((week.filter(s=>s.defects_found).length / week.length) * 100) : 0, suffix: '%' };
    }
    if (metric === 'defects_count') return { kpi: rows.filter(s => s.defects_found).length };
    if (metric === 'by_asset') {
      const map = {};
      rows.forEach(s => { const a = s.asset || 'Unknown'; map[a] = (map[a] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
    if (metric === 'trend_daily') {
      const map = {};
      for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); map[d.toISOString().split('T')[0]] = 0; }
      rows.forEach(s => { const d = (s.date || s.created_at || '').slice(0,10); if (map[d] !== undefined) map[d]++; });
      return { chart: Object.entries(map).map(([name,value])=>({ name: name.slice(5), value })), line: true };
    }
    if (metric === 'recent_defects') return { list: rows.filter(s=>s.defects_found).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8).map(s=>({ primary: s.asset || '—', secondary: `${s.operator_name || '—'} · ${s.date || '—'}`, color: 'var(--red)' })) };
  }

  // ── DOWNTIME ──────────────────────────────────────────────────────────────
  if (dataSource === 'downtime') {
    const { data } = await supabase.from('downtime').select('*').eq('company_id', cid);
    const rows = data || [];
    const monthRows = rows.filter(d => (d.created_at || '').startsWith(monthStart));
    if (metric === 'hours_month') return { kpi: Math.round(monthRows.reduce((s,d) => s + (parseFloat(d.duration_hours) || 0), 0)), suffix: 'h' };
    if (metric === 'incidents_month') return { kpi: monthRows.length };
    if (metric === 'by_asset') {
      const map = {};
      rows.forEach(d => { const a = d.asset || 'Unknown'; map[a] = (map[a] || 0) + (parseFloat(d.duration_hours) || 1); });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value:Math.round(value)})) };
    }
    if (metric === 'by_category') {
      const map = {};
      rows.forEach(d => { const c = d.category || 'Unknown'; map[c] = (map[c] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value})) };
    }
    if (metric === 'trend_weekly') {
      const map = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i*7);
        map[d.toISOString().split('T')[0].slice(0,7)] = 0;
      }
      rows.forEach(d => {
        const wk = (d.created_at||'').slice(0,7);
        if (map[wk] !== undefined) map[wk] += parseFloat(d.duration_hours) || 1;
      });
      return { chart: Object.entries(map).map(([name,value])=>({name,value:Math.round(value)})), line: true };
    }
  }

  // ── PARTS ─────────────────────────────────────────────────────────────────
  if (dataSource === 'parts') {
    const { data } = await supabase.from('parts_inventory').select('*').eq('company_id', cid);
    const rows = data || [];
    const lowStock = rows.filter(p => p.min_quantity && p.quantity <= p.min_quantity);
    if (metric === 'low_stock') return { kpi: lowStock.length };
    if (metric === 'total_value') return { kpi: Math.round(rows.reduce((s,p)=>s+(parseFloat(p.quantity||0)*parseFloat(p.unit_cost||0)),0)), prefix: '$' };
    if (metric === 'by_category') {
      const map = {};
      rows.forEach(p => { const c = p.category || 'Uncategorised'; map[c] = (map[c] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
    if (metric === 'low_stock_list') return { list: lowStock.slice(0,8).map(p=>({ primary: p.name || '—', secondary: `${p.quantity} left (min: ${p.min_quantity}) · ${p.category || '—'}`, color: 'var(--amber)' })) };
  }

  // ── OIL SAMPLES ───────────────────────────────────────────────────────────
  if (dataSource === 'oil_samples') {
    const { data } = await supabase.from('oil_samples').select('*').eq('company_id', cid);
    const rows = data || [];
    if (metric === 'alert_count') return { kpi: rows.filter(s => s.overall_status === 'CRITICAL').length };
    if (metric === 'caution_count') return { kpi: rows.filter(s => s.overall_status === 'CAUTION').length };
    if (metric === 'by_asset') {
      const map = {};
      rows.forEach(s => { const a = s.asset_name || 'Unknown'; map[a] = (map[a] || 0) + 1; });
      return { chart: Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value})) };
    }
    if (metric === 'recent_list') return { list: rows.filter(s => s.overall_status !== 'NORMAL').sort((a,b)=>new Date(b.sample_date||b.created_at)-new Date(a.sample_date||a.created_at)).slice(0,8).map(s=>({ primary: s.asset_name || '—', secondary: `${s.component || '—'} · ${s.overall_status || '—'} · ${s.sample_date || '—'}`, color: s.overall_status === 'CRITICAL' ? 'var(--red)' : 'var(--amber)' })) };
  }

  return null;
}

// ─── Single Custom Widget ─────────────────────────────────────────────────────
export function WidgetCustom({ config, companyId, onEdit, onDelete, isAdmin }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId || !config) return;
    setLoading(true);
    fetchWidgetData(config, companyId)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [config, companyId]);

  const src = DATA_SOURCES[config.dataSource];
  const metricDef = src?.metrics?.[config.metric] || {};
  const color = config.color || 'var(--accent)';
  const isUrgent = metricDef.urgent && data?.kpi > 0;
  const isWarn = metricDef.warn && data?.kpi > 0;

  const headerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  };
  const titleStyle = {
    fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.8px',
  };

  const renderContent = () => {
    if (loading) return <div style={{ height: 60, background: 'var(--surface-2)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />;
    if (error) return <div style={{ color: 'var(--red)', fontSize: 12 }}>Error: {error}</div>;
    if (!data) return <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>No data</div>;

    // ── Multi-KPI (multiple metrics combined) ────────────────────────────
    if (data.multiKpi) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.multiKpi.length, 3)}, 1fr)`, gap: 12 }}>
          {data.multiKpi.map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: item.kpi > 999 ? 28 : 38, fontWeight: 900, color: item.urgent && item.kpi > 0 ? 'var(--red)' : item.warn && item.kpi > 0 ? 'var(--amber)' : color, lineHeight: 1, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                {item.prefix}{typeof item.kpi === 'number' ? item.kpi.toLocaleString() : (item.kpi ?? '—')}{item.suffix}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      );
    }

    // ── Single KPI ────────────────────────────────────────────────────────
    if (config.displayType === 'kpi' && data.kpi !== undefined) {
      return (
        <div>
          <div style={{ fontSize: 52, fontWeight: 900, color: isUrgent ? 'var(--red)' : isWarn ? 'var(--amber)' : color, lineHeight: 1, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
            {data.prefix || ''}{typeof data.kpi === 'number' ? data.kpi.toLocaleString() : data.kpi}{data.suffix || ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{src?.label}</div>
        </div>
      );
    }

    // ── BAR CHART ─────────────────────────────────────────────────────────
    if ((config.displayType === 'bar' || config.displayType === 'pie') && data.chart) {
      if (config.displayType === 'pie') {
        return (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.chart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {data.chart.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Count']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data.chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(14,165,233,0.05)' }} />
            {data.multiKey ? (
              data.multiKey.map((key, ki) => (
                <Bar key={key} dataKey={key} name={DATA_SOURCES[config.dataSource]?.metrics?.[key]?.label || key} radius={[4,4,0,0]} fill={PALETTE[ki % PALETTE.length]} />
              ))
            ) : (
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.chart.map((_, i) => <Cell key={i} fill={i === 0 ? color : PALETTE[i % PALETTE.length]} />)}
              </Bar>
            )}
            {data.multiKey && <Legend wrapperStyle={{ fontSize: 10 }} />}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // ── LINE CHART ────────────────────────────────────────────────────────
    if (config.displayType === 'line' && data.chart) {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // ── LIST ──────────────────────────────────────────────────────────────
    if (config.displayType === 'list' && data.list) {
      return (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {data.list.length === 0 && <div style={{ color: 'var(--text-faint)', fontSize: 12, fontStyle: 'italic' }}>Nothing to show</div>}
          {data.list.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < data.list.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color || color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.primary}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.secondary}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>Configure display type</div>;
  };

  return (
    <div className="widget-card" style={{ borderTop: `3px solid ${color}`, position: 'relative' }}>
      {/* Tint corner */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${color}10, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{config.icon || src?.icon || '📊'}</span>
          <span style={titleStyle}>{config.label}</span>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onEdit} title="Edit widget" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 13, padding: '2px 5px' }}>✏️</button>
            <button onClick={onDelete} title="Delete widget" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 13, padding: '2px 5px' }}>🗑</button>
          </div>
        )}
      </div>
      {renderContent()}
    </div>
  );
}

// ─── Widget Builder Modal ─────────────────────────────────────────────────────
export function WidgetBuilderModal({ onSave, onClose, editConfig, companyId }) {
  const blankConfig = { label: '', icon: '📊', displayType: 'kpi', dataSource: 'assets', metrics: ['total'], color: '#0ea5e9', size: 'md', timeRange: '30d' };
  const [step, setStep] = useState(1); // 1=type, 2=source+metric, 3=style
  const [config, setConfig] = useState(editConfig ? { ...blankConfig, ...editConfig } : blankConfig);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const upd = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  // Auto-suggest label when metric changes
  useEffect(() => {
    const src = DATA_SOURCES[config.dataSource];
    const firstMetric = Array.isArray(config.metrics) ? config.metrics[0] : config.metrics;
    const metricLabel = src?.metrics?.[firstMetric]?.label || '';
    if (metricLabel && !editConfig) upd('label', metricLabel);
  }, [config.dataSource, config.metric]);

  // Live preview
  useEffect(() => {
    if (step !== 3) return;
    setPreviewLoading(true);
    fetchWidgetData(config, companyId)
      .then(d => { setPreview(d); setPreviewLoading(false); })
      .catch(() => setPreviewLoading(false));
  }, [step, config.dataSource, config.metric, companyId]);

  const srcDef = DATA_SOURCES[config.dataSource] || {};
  const firstMetric = Array.isArray(config.metrics) ? config.metrics[0] : (config.metrics || 'total');
  const metricDef = srcDef.metrics?.[firstMetric] || {};

  // Filter display types to what makes sense for the selected metric
  const availableDisplayTypes = DISPLAY_TYPES.filter(t => {
    if (t.id === 'kpi') return metricDef.kpi !== false;
    if (t.id === 'list') return metricDef.list === true;
    if (t.id === 'line') return metricDef.line === true;
    if (t.id === 'bar' || t.id === 'pie') return metricDef.chart === true;
    return true;
  });

  // Auto-fix displayType if not available for selected metric
  useEffect(() => {
    const fm = Array.isArray(config.metrics) ? config.metrics[0] : config.metrics;
    const md = srcDef?.metrics?.[fm] || {};
    const available = DISPLAY_TYPES.filter(t => {
      if (t.id === 'kpi') return md.kpi !== false;
      if (t.id === 'list') return md.list === true;
      if (t.id === 'line') return md.line === true;
      if (t.id === 'bar' || t.id === 'pie') return md.chart === true;
      return false;
    }).map(t => t.id);
    if (!available.includes(config.displayType) && available.length > 0) {
      upd('displayType', available[0]);
    }
  }, [config.metrics]);

  const save = async () => {
    if (!config.label.trim()) { alert('Please give the widget a name.'); return; }
    setSaving(true);
    // Store entire config as jsonb — avoids camelCase/snake_case column mapping
    const payload = { company_id: companyId, config };
    let id = editConfig?.id;
    let error;
    if (id) {
      ({ error } = await supabase.from('custom_widgets').update(payload).eq('id', id));
    } else {
      const { data: d, error: e } = await supabase.from('custom_widgets').insert([payload]).select().single();
      if (d) id = d.id;
      error = e;
    }
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    onSave({ ...config, id });
  };

  const iStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  const ICONS = ['📊','📈','📉','🔧','🚛','⚠️','✅','📋','🔩','🧪','💰','⏱','🔥','🎯','📅','💧','⬇','🔴','🟡','🟢'];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 399 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 560, maxWidth: '95vw', maxHeight: '90vh',
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        zIndex: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{editConfig ? 'Edit Widget' : 'Create Widget'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Step {step} of 3 — {['Pick display type','Choose data','Style & name'][step-1]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${(step/3)*100}%`, background: 'var(--accent)', transition: 'width 0.3s ease', borderRadius: 2 }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── Step 1: Display Type ── */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>How do you want to display this data?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {DISPLAY_TYPES.map(t => (
                  <button key={t.id} onClick={() => { upd('displayType', t.id); setStep(2); }}
                    style={{ padding: '16px', background: config.displayType === t.id ? 'rgba(14,165,233,0.08)' : 'var(--surface)', border: `1.5px solid ${config.displayType === t.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Data Source + Metric ── */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>What data should this widget show?</div>

              {/* Data source grid */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Data Source</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {Object.entries(DATA_SOURCES).map(([id, src]) => (
                    <button key={id} onClick={() => { upd('dataSource', id); upd('metric', Object.keys(src.metrics)[0]); }}
                      style={{ padding: '10px 8px', background: config.dataSource === id ? 'rgba(14,165,233,0.08)' : 'var(--surface)', border: `1.5px solid ${config.dataSource === id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{src.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: config.dataSource === id ? 'var(--accent)' : 'var(--text-secondary)' }}>{src.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metric picker */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Metric</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8, fontStyle: 'italic' }}>Select one or more — they'll be combined into a single widget</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(srcDef.metrics || {}).map(([id, m]) => {
                    const compatible = config.displayType === 'kpi' ? m.kpi !== false
                      : config.displayType === 'list' ? m.list === true
                      : config.displayType === 'line' ? m.line === true || m.chart === true
                      : m.chart === true || m.list === true;
                    if (!compatible) return null;
                    const selected = Array.isArray(config.metrics) ? config.metrics.includes(id) : config.metrics === id;
                    const toggleMetric = () => {
                      const curr = Array.isArray(config.metrics) ? config.metrics : [config.metrics].filter(Boolean);
                      const next = selected ? curr.filter(x => x !== id) : [...curr, id];
                      upd('metrics', next.length > 0 ? next : [id]);
                    };
                    return (
                      <button key={id} onClick={toggleMetric}
                        style={{ padding: '10px 14px', background: selected ? 'rgba(14,165,233,0.08)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.12s' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 13, color: selected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: selected ? 700 : 400 }}>{m.label}</span>
                        {(m.urgent || m.warn) && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: m.urgent ? 'var(--red)' : 'var(--amber)', background: m.urgent ? 'var(--red-bg)' : 'var(--amber-bg)', padding: '2px 7px', borderRadius: 10 }}>{m.urgent ? 'Critical' : 'Warning'}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time range (for trend/historical metrics) */}
              {(metricDef.line || config.displayType === 'line') && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Time Range</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['all','All Time']].map(([id,label])=>(
                      <button key={id} onClick={()=>upd('timeRange',id)}
                        style={{ padding:'6px 14px', borderRadius:6, border:`1px solid ${config.timeRange===id?'var(--accent)':'var(--border)'}`, background:config.timeRange===id?'rgba(14,165,233,0.08)':'var(--surface)', fontSize:12, fontWeight:600, color:config.timeRange===id?'var(--accent)':'var(--text-muted)', cursor:'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Style & Name ── */}
          {step === 3 && (
            <div style={{ display: 'flex', gap: 16 }}>
              {/* Left: config */}
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Widget Name</label>
                  <input value={config.label} onChange={e=>upd('label',e.target.value)} placeholder="e.g. Fleet Down Count" style={iStyle} autoFocus />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Icon</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ICONS.map(ic => (
                      <button key={ic} onClick={()=>upd('icon',ic)}
                        style={{ width:36, height:36, fontSize:18, border:`2px solid ${config.icon===ic?'var(--accent)':'var(--border)'}`, borderRadius:8, background:config.icon===ic?'rgba(14,165,233,0.08)':'var(--surface)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Accent Colour</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {PALETTE.map(c => (
                      <button key={c} onClick={()=>upd('color',c)}
                        style={{ width:28, height:28, borderRadius:'50%', background:c, border:`3px solid ${config.color===c?'var(--text-primary)':'transparent'}`, cursor:'pointer', transition:'all 0.1s' }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Size</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['sm','Small'],['md','Medium'],['lg','Full Width']].map(([id,label])=>(
                      <button key={id} onClick={()=>upd('size',id)}
                        style={{ flex:1, padding:'8px', borderRadius:8, border:`1px solid ${config.size===id?'var(--accent)':'var(--border)'}`, background:config.size===id?'rgba(14,165,233,0.08)':'var(--surface)', fontSize:12, fontWeight:600, color:config.size===id?'var(--accent)':'var(--text-muted)', cursor:'pointer' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: live preview */}
              <div style={{ width: 200, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Preview</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--surface)', borderTop: `3px solid ${config.color}`, minHeight: 100 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>{config.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{config.label || 'Widget Name'}</span>
                  </div>
                  {previewLoading ? (
                    <div style={{ height: 40, background: 'var(--surface-2)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
                  ) : preview?.kpi !== undefined ? (
                    <div style={{ fontSize: 36, fontWeight: 900, color: config.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                      {preview.prefix || ''}{preview.kpi?.toLocaleString()}{preview.suffix || ''}
                    </div>
                  ) : preview?.chart ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{preview.chart.length} categories</div>
                  ) : preview?.list ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{preview.list.length} items</div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>No data yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => step > 1 ? setStep(s=>s-1) : onClose()}
            style={{ padding: '9px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3].map(s => <div key={s} style={{ width: s===step?20:6, height:6, borderRadius:3, background:s<=step?'var(--accent)':'var(--border)', transition:'all 0.2s' }} />)}
          </div>
          {step < 3 ? (
            <button onClick={() => setStep(s=>s+1)}
              style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Next →
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              style={{ padding: '9px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving…' : editConfig ? 'Update Widget' : '✓ Add to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
