import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// ─── Condition badge ──────────────────────────────────────────────────────────
function ConditionBadge({ condition }) {
  const map = {
    Normal:   { bg: 'var(--green-bg)', color: 'var(--green)', dot: 'var(--green)' },
    Monitor:  { bg: '#fef9c3', color: 'var(--amber)', dot: 'var(--amber)' },
    Critical: { bg: 'var(--red-bg)', color: 'var(--red)', dot: 'var(--red)' },
  };
  const s = map[condition] || { bg: 'var(--surface-2)', color: 'var(--text-muted)', dot: 'var(--text-muted)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', backgroundColor: s.bg, color: s.color, fontWeight: 700, fontSize: '12px' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: s.dot, display: 'inline-block' }} />
      {condition || 'Pending'}
    </span>
  );
}

// ─── Wear metals display ──────────────────────────────────────────────────────
const METAL_LABELS = { fe: 'Iron', cu: 'Copper', al: 'Aluminium', cr: 'Chromium', pb: 'Lead', sn: 'Tin', si: 'Silicon', na: 'Sodium', mo: 'Molybdenum', ni: 'Nickel' };
const METAL_LIMITS = { fe: 100, cu: 30, al: 20, cr: 15, pb: 15, sn: 10, si: 25, na: 30, mo: 50, ni: 10 };

function MetalBar({ metal, value }) {
  const limit = METAL_LIMITS[metal] || 100;
  const pct = Math.min((value / limit) * 100, 100);
  const color = pct > 90 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{METAL_LABELS[metal] || metal.toUpperCase()} ({metal.toUpperCase()})</span>
        <span style={{ color, fontWeight: 700 }}>{value ?? '—'} ppm</span>
      </div>
      <div style={{ height: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ─── Expanded sample row ──────────────────────────────────────────────────────
function SampleDetail({ sample }) {
  const metals = sample.wear_metals || {};
  const metalKeys = Object.keys(metals).filter(k => metals[k] != null && metals[k] > 0);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fbfd', borderTop: '1px solid #E9F1FA' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Wear Metals */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Wear Metals</div>
          {metalKeys.length > 0
            ? metalKeys.map(k => <MetalBar key={k} metal={k} value={metals[k]} />)
            : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No wear metal data</div>
          }
        </div>

        {/* Fluid Properties */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Fluid Properties</div>
          {[
            { label: 'Viscosity @40°C', value: sample.viscosity_40 ? `${sample.viscosity_40} cSt` : '—' },
            { label: 'Viscosity @100°C', value: sample.viscosity_100 ? `${sample.viscosity_100} cSt` : '—' },
            { label: 'Water Content', value: sample.water_ppm ? `${sample.water_ppm} ppm` : '—' },
            { label: 'Soot', value: sample.soot_percent ? `${sample.soot_percent}%` : '—' },
            { label: 'TBN', value: sample.tbn ?? '—' },
            { label: 'TAN', value: sample.tan ?? '—' },
            { label: 'Oil Hours', value: sample.oil_hours ? `${sample.oil_hours} hrs` : '—' },
            { label: 'Unit Hours', value: sample.unit_hours ? `${sample.unit_hours} hrs` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* AI Analysis */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>AI Analysis</div>
          <div style={{ marginBottom: '14px' }}>
            <ConditionBadge condition={sample.ai_condition} />
          </div>
          {sample.ai_analysis && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>SUMMARY</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sample.ai_analysis}</div>
            </div>
          )}
          {sample.ai_recommendations && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>RECOMMENDATIONS</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, backgroundColor: 'var(--surface-2)', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid var(--accent)' }}>
                {sample.ai_recommendations}
              </div>
            </div>
          )}
          {sample.lab_name && (
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>Lab: {sample.lab_name}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Asset Trend Modal ────────────────────────────────────────────────────────
function TrendModal({ assetNumber, samples, onClose }) {
  const assetSamples = samples
    .filter(s => s.asset_number === assetNumber)
    .sort((a, b) => new Date(a.sample_date) - new Date(b.sample_date));

  const chartData = assetSamples.map(s => ({
    date: s.sample_date,
    Fe: s.wear_metals?.fe ?? 0,
    Cu: s.wear_metals?.cu ?? 0,
    Al: s.wear_metals?.al ?? 0,
    Si: s.wear_metals?.si ?? 0,
  }));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{assetNumber} — Wear Metal Trends</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{assetSamples.length} samples on record</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Fe" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Cu" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Al" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Si" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Need at least 2 samples to show trends</div>
        )}
        <div style={{ marginTop: '20px' }}>
          {assetSamples.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #E9F1FA', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{s.sample_date}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.component}</span>
              <ConditionBadge condition={s.ai_condition} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main OilSampling component ───────────────────────────────────────────────
function OilSampling({ userRole }) {
  const [samples, setSamples] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [trendAsset, setTrendAsset] = useState(null);
  const [filterAsset, setFilterAsset] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterComponent, setFilterComponent] = useState('');

  useEffect(() => {
    if (userRole?.company_id) fetchData();
  }, [userRole]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from('oil_samples').select('*').eq('company_id', userRole.company_id).order('sample_date', { ascending: false }),
      supabase.from('assets').select('id, name, asset_number').eq('company_id', userRole.company_id),
    ]);
    setSamples(s || []);
    setAssets(a || []);
    setLoading(false);
  };

  const counts = {
    total: samples.length,
    normal: samples.filter(s => s.ai_condition === 'Normal').length,
    monitor: samples.filter(s => s.ai_condition === 'Monitor').length,
    critical: samples.filter(s => s.ai_condition === 'Critical').length,
  };

  const filtered = samples.filter(s => {
    if (filterAsset && s.asset_number !== filterAsset) return false;
    if (filterCondition && s.ai_condition !== filterCondition) return false;
    if (filterComponent && !s.component?.toLowerCase().includes(filterComponent.toLowerCase())) return false;
    return true;
  });

  const uniqueAssets = [...new Set(samples.map(s => s.asset_number).filter(Boolean))];
  const uniqueComponents = [...new Set(samples.map(s => s.component).filter(Boolean))];

  const cardStyle = (color) => ({
    backgroundColor: 'var(--surface)', border: `1px solid #d6e6f2`, borderRadius: '10px',
    padding: '18px', textAlign: 'center', borderTop: `3px solid ${color}`,
  });

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Oil Sampling</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>AI-powered oil analysis results — automatically extracted from lab reports</p>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', backgroundColor: 'var(--surface-2)', padding: '8px 14px', borderRadius: '8px' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '2px' }}>Submit reports to:</div>
          <div style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>
            oilsamples+{(userRole?.company_id || 'company').slice(0, 8)}@mechiq.com.au
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Samples', value: counts.total, color: 'var(--accent)' },
          { label: 'Normal', value: counts.normal, color: 'var(--green)' },
          { label: 'Monitor', value: counts.monitor, color: 'var(--amber)' },
          { label: 'Critical', value: counts.critical, color: 'var(--red)' },
        ].map(c => (
          <div key={c.label} style={cardStyle(c.color)}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)', backgroundColor: 'var(--surface)', cursor: 'pointer' }}>
          <option value="">All Assets</option>
          {uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)', backgroundColor: 'var(--surface)', cursor: 'pointer' }}>
          <option value="">All Conditions</option>
          <option value="Normal">Normal</option>
          <option value="Monitor">Monitor</option>
          <option value="Critical">Critical</option>
        </select>
        <select value={filterComponent} onChange={e => setFilterComponent(e.target.value)}
          style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)', backgroundColor: 'var(--surface)', cursor: 'pointer' }}>
          <option value="">All Components</option>
          {uniqueComponents.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterAsset || filterCondition || filterComponent) && (
          <button onClick={() => { setFilterAsset(''); setFilterCondition(''); setFilterComponent(''); }}
            style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-muted)', backgroundColor: 'var(--surface)', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading samples...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔬</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>No oil samples yet</div>
          <div style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Ask your oil analysis lab to email reports to your company address above. Results will appear here automatically within 6 hours.
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2)' }}>
                {['Date', 'Asset', 'Component', 'Condition', 'Key Metals (Fe/Cu/Al)', 'Lab', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(sample => (
                <React.Fragment key={sample.id}>
                  <tr
                    style={{ borderBottom: '1px solid #E9F1FA', cursor: 'pointer', backgroundColor: expandedId === sample.id ? '#f8fbfd' : '#fff' }}
                    onClick={() => setExpandedId(expandedId === sample.id ? null : sample.id)}
                  >
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{sample.sample_date || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{sample.asset_number || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sample.asset_name || ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{sample.component || '—'}</td>
                    <td style={{ padding: '12px 14px' }}><ConditionBadge condition={sample.ai_condition} /></td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {sample.wear_metals ? (
                        <span>
                          Fe: <strong>{sample.wear_metals.fe ?? '—'}</strong> &nbsp;
                          Cu: <strong>{sample.wear_metals.cu ?? '—'}</strong> &nbsp;
                          Al: <strong>{sample.wear_metals.al ?? '—'}</strong>
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>{sample.lab_name || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setTrendAsset(sample.asset_number); }}
                          style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Trends
                        </button>
                        <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{expandedId === sample.id ? '▲' : '▼'}</span>
                      </div>
                    </td>
                  </tr>
                  {expandedId === sample.id && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <SampleDetail sample={sample} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {trendAsset && (
        <TrendModal assetNumber={trendAsset} samples={samples} onClose={() => setTrendAsset(null)} />
      )}
    </div>
  );
}

export default OilSampling;
