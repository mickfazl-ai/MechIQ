// ─── MechIQ Form Editor — Admin Only ─────────────────────────────────────────
// Visual template editor with live mobile QR-scan preview.
// Supports both Prestart and Service Sheet template types.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { pythonAIFetch } from './pythonApi';

// ─── Item type definitions ────────────────────────────────────────────────────
const ITEM_TYPES = [
  { id: 'check',       label: 'Checkbox',    icon: '☑',  desc: 'Pass / Fail check item' },
  { id: 'number',      label: 'Number',      icon: '#',   desc: 'Numeric reading or value' },
  { id: 'text',        label: 'Text',        icon: 'Aa',  desc: 'Short text response' },
  { id: 'photo',       label: 'Photo',       icon: '📷',  desc: 'Camera capture' },
  { id: 'temperature', label: 'Temperature', icon: '🌡',  desc: 'Temperature reading' },
  { id: 'fluid',       label: 'Fluid Level', icon: '💧',  desc: 'Fluid level check' },
  { id: 'pressure',    label: 'Pressure',    icon: '⊙',  desc: 'Pressure reading' },
  { id: 'measurement', label: 'Measurement', icon: '📏',  desc: 'Generic measurement' },
];

const TYPE_MAP = Object.fromEntries(ITEM_TYPES.map(t => [t.id, t]));

// ─── Phone Preview (renders real ScanPage dark-theme styles) ─────────────────
const PREVIEW_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap');
  .pv-wrap { background:#F9FAFB; min-height:100%; padding:16px 14px 32px; font-family:'Barlow',sans-serif; color:#111827; }
  .pv-topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .pv-logo { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:14px; letter-spacing:4px; color:#111827; }
  .pv-logo em { color:#1e88e5; font-style:normal; }
  .pv-form-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
  .pv-form-title em { color:#1e88e5; font-style:normal; }
  .pv-asset-tag { background:rgba(30,136,229,0.1); border:1px solid rgba(30,136,229,0.2); border-radius:3px; padding:8px 10px; margin-bottom:14px; font-size:11px; color:rgba(221,227,237,0.7); }
  .pv-asset-tag strong { color:#111827; font-weight:700; }
  .pv-fl { margin-bottom:12px; }
  .pv-lbl { display:block; font-size:9px; font-weight:700; color:rgba(221,227,237,0.35); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:4px; }
  .pv-inp { width:100%; padding:9px 10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:3px; color:rgba(221,227,237,0.4); font-size:12px; box-sizing:border-box; }
  .pv-section { margin-bottom:16px; }
  .pv-sec-hd { font-size:9px; font-weight:700; color:#1e88e5; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(30,136,229,0.2); }
  .pv-check { display:flex; align-items:flex-start; gap:8px; padding:8px 9px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); border-radius:3px; margin-bottom:4px; }
  .pv-chk-box { width:13px; height:13px; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.2); border-radius:2px; flex-shrink:0; margin-top:1px; }
  .pv-chk-lbl { flex:1; font-size:11px; color:#c8d0dc; line-height:1.4; }
  .pv-flag { background:none; border:1px solid rgba(239,83,80,0.3); border-radius:2px; color:rgba(239,83,80,0.6); padding:1px 6px; font-size:9px; flex-shrink:0; }
  .pv-inp-item { margin-bottom:4px; padding:7px 9px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); border-radius:3px; }
  .pv-inp-item-lbl { font-size:9px; color:rgba(221,227,237,0.4); text-transform:uppercase; letter-spacing:1px; margin-bottom:3px; }
  .pv-inp-item-val { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:2px; padding:3px 7px; color:rgba(221,227,237,0.25); font-size:11px; display:inline-block; min-width:70px; }
  .pv-photo-item { margin-bottom:4px; padding:10px 9px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); border-radius:3px; display:flex; align-items:center; gap:8px; }
  .pv-photo-icon { font-size:16px; opacity:0.5; }
  .pv-photo-lbl { font-size:11px; color:rgba(221,227,237,0.4); }
  .pv-submit { width:100%; padding:12px; background:#1e88e5; border:none; border-radius:3px; color:#fff; font-size:13px; font-weight:700; letter-spacing:0.5px; cursor:pointer; margin-top:16px; text-align:center; }
`;

function MobilePreview({ builder, mode }) {
  const sections = builder?.sections || [];
  const hasContent = sections.length > 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#F9FAFB', borderRadius: 8 }}>
      <style>{PREVIEW_CSS}</style>
      <div className="pv-wrap">
        <div className="pv-topbar">
          <div className="pv-logo">MECH<em>IQ</em></div>
          <div style={{ fontSize: 9, color: 'rgba(221,227,237,0.25)', letterSpacing: 1 }}>LIVE PREVIEW</div>
        </div>
        <div className="pv-form-title">
          {mode === 'prestart'
            ? <>Pre<em>start</em> {builder?.name ? `— ${builder.name}` : ''}</>
            : <>Service <em>{builder?.service_type || 'Sheet'}</em></>}
        </div>
        <div className="pv-asset-tag">
          <strong>CAT 320 Excavator</strong> · Earthworks · Site A
        </div>

        {/* Operator / Hrs fields */}
        <div className="pv-fl">
          <label className="pv-lbl">Operator Name</label>
          <div className="pv-inp" style={{ fontSize: 12, color: 'rgba(221,227,237,0.2)' }}>e.g. J. Smith</div>
        </div>
        <div className="pv-fl">
          <label className="pv-lbl">{mode === 'prestart' ? 'Hours Start' : 'Odometer / Hours'}</label>
          <div className="pv-inp" style={{ fontSize: 12, color: 'rgba(221,227,237,0.2)' }}>0</div>
        </div>

        {!hasContent && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(221,227,237,0.2)', fontSize: 12 }}>
            Add sections to preview the form
          </div>
        )}

        {sections.map((section, si) => (
          <div key={si} className="pv-section">
            <div className="pv-sec-hd">{section.title || `Section ${si + 1}`}</div>
            {(section.items || []).map((item, ii) => {
              const type = item.type || 'check';
              const label = item.label || `Item ${ii + 1}`;
              if (type === 'check') return (
                <div key={ii} className="pv-check">
                  <div className="pv-chk-box" />
                  <div className="pv-chk-lbl">{label}{item.required && <span style={{ color: '#ef5350', marginLeft: 3 }}>*</span>}</div>
                  <div className="pv-flag">⚑</div>
                </div>
              );
              if (type === 'photo') return (
                <div key={ii} className="pv-photo-item">
                  <div className="pv-photo-icon">📷</div>
                  <div className="pv-photo-lbl">{label}{item.required && <span style={{ color: '#ef5350', marginLeft: 3 }}>*</span>}</div>
                </div>
              );
              const unit = type === 'temperature' ? '°C' : type === 'pressure' ? 'PSI' : type === 'fluid' ? 'L' : '';
              return (
                <div key={ii} className="pv-inp-item">
                  <div className="pv-inp-item-lbl">{label}{item.required && <span style={{ color: '#ef5350', marginLeft: 3 }}>*</span>}</div>
                  <div className="pv-inp-item-val">{unit || (type === 'text' ? '—' : '0')}</div>
                </div>
              );
            })}
            {(section.items || []).length === 0 && (
              <div style={{ padding: '8px 9px', color: 'rgba(221,227,237,0.15)', fontSize: 10, fontStyle: 'italic' }}>
                No items yet
              </div>
            )}
          </div>
        ))}

        {hasContent && (
          <div className="pv-submit">
            Submit {mode === 'prestart' ? 'Prestart' : 'Service Sheet'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, si, ii, isActive, onSelect, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const typeInfo = TYPE_MAP[item.type] || TYPE_MAP.check;
  const iStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 10px',
    background: isActive ? 'rgba(14,165,233,0.08)' : 'var(--surface)',
    border: `1px solid ${isActive ? 'rgba(14,165,233,0.4)' : 'var(--border)'}`,
    borderRadius: 7, cursor: 'pointer', transition: 'all 0.12s',
    marginBottom: 4,
  };
  return (
    <div style={iStyle} onClick={onSelect}>
      {/* Drag handle / reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}
          style={{ background: 'none', border: 'none', cursor: isFirst ? 'not-allowed' : 'pointer', color: 'var(--text-faint)', fontSize: 10, padding: '1px 3px', lineHeight: 1, opacity: isFirst ? 0.3 : 0.7 }}>▲</button>
        <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}
          style={{ background: 'none', border: 'none', cursor: isLast ? 'not-allowed' : 'pointer', color: 'var(--text-faint)', fontSize: 10, padding: '1px 3px', lineHeight: 1, opacity: isLast ? 0.3 : 0.7 }}>▼</button>
      </div>
      {/* Type pill */}
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: `${typeInfo.color}18`, color: typeInfo.color, flexShrink: 0, letterSpacing: '0.3px', border: `1px solid ${typeInfo.color}30` }}>{typeInfo.label}</span>
      {/* Label (editable inline) */}
      <input
        value={item.label || ''}
        onChange={e => { e.stopPropagation(); onUpdate({ ...item, label: e.target.value }); }}
        onClick={e => e.stopPropagation()}
        placeholder={`Item ${ii + 1} label…`}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }}
      />
      {item.required && (
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>REQ</span>
      )}
      {/* Type select */}
      <select
        value={item.type || 'check'}
        onChange={e => { e.stopPropagation(); onUpdate({ ...item, type: e.target.value }); }}
        onClick={e => e.stopPropagation()}
        style={{ flexShrink: 0, padding: '4px 6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
      >
        {ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      {/* Required toggle */}
      <button
        onClick={e => { e.stopPropagation(); onUpdate({ ...item, required: !item.required }); }}
        title={item.required ? 'Required — click to make optional' : 'Optional — click to make required'}
        style={{ flexShrink: 0, padding: '3px 7px', background: item.required ? 'var(--red-bg)' : 'var(--surface-2)', border: `1px solid ${item.required ? 'var(--red-border)' : 'var(--border)'}`, borderRadius: 4, fontSize: 10, fontWeight: 700, color: item.required ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer' }}
      >
        {item.required ? '★ Req' : '☆ Opt'}
      </button>
      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ flexShrink: 0, background: 'none', border: '1px solid transparent', borderRadius: 4, padding: '3px 7px', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        title="Remove item"
      >✕</button>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ section, si, isActive, onSelect, onUpdate, onRemove, onAddItem, onMoveUp, onMoveDown, onUpdateItem, onRemoveItem, onMoveItemUp, onMoveItemDown, isFirst, isLast, activeItemKey, onSelectItem }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
      background: 'var(--surface)',
      boxShadow: isActive ? '0 0 0 2px rgba(14,165,233,0.12)' : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {/* Section header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: isActive ? 'rgba(14,165,233,0.06)' : 'var(--surface-2)', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid var(--border)' }}
        onClick={() => { onSelect(); setCollapsed(c => !c); }}
      >
        {/* Section reorder */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}
            style={{ background: 'none', border: 'none', cursor: isFirst ? 'not-allowed' : 'pointer', color: 'var(--text-faint)', fontSize: 11, padding: '1px 4px', opacity: isFirst ? 0.3 : 0.8 }}>↑</button>
          <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}
            style={{ background: 'none', border: 'none', cursor: isLast ? 'not-allowed' : 'pointer', color: 'var(--text-faint)', fontSize: 11, padding: '1px 4px', opacity: isLast ? 0.3 : 0.8 }}>↓</button>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>§</span>
        {/* Section title input */}
        <input
          value={section.title || ''}
          onChange={e => { e.stopPropagation(); onUpdate({ ...section, title: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder={`Section ${si + 1} title…`}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit' }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          {(section.items || []).length} item{(section.items || []).length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 14, padding: '0 4px', flexShrink: 0 }}
          title="Delete section"
        >🗑</button>
        <span style={{ color: 'var(--text-faint)', fontSize: 11, flexShrink: 0 }}>{collapsed ? '▶' : '▼'}</span>
      </div>

      {/* Section items */}
      {!collapsed && (
        <div style={{ padding: '10px 12px' }}>
          {(section.items || []).map((item, ii) => (
            <ItemRow
              key={ii}
              item={item}
              si={si}
              ii={ii}
              isActive={activeItemKey === `${si}_${ii}`}
              onSelect={() => onSelectItem(`${si}_${ii}`)}
              onUpdate={v => onUpdateItem(si, ii, v)}
              onRemove={() => onRemoveItem(si, ii)}
              onMoveUp={() => onMoveItemUp(si, ii)}
              onMoveDown={() => onMoveItemDown(si, ii)}
              isFirst={ii === 0}
              isLast={ii === (section.items || []).length - 1}
            />
          ))}
          {(section.items || []).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', padding: '6px 0', textAlign: 'center' }}>
              No items — add one below
            </div>
          )}
          <button
            onClick={() => onAddItem(si)}
            style={{ marginTop: 6, padding: '6px 14px', background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            + Add Item
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Form Editor Tab ─────────────────────────────────────────────────────
export default function FormEditorTab({ userRole }) {
  const isAdmin = ['admin', 'master', 'supervisor'].includes(userRole?.role);

  const [mode, setMode] = useState('prestart');
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [builder, setBuilder] = useState({ name: '', description: '', service_type: '', sections: [], asset_ids: [] });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [activeItemKey, setActiveItemKey] = useState(null);
  const [assets, setAssets] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userRole?.company_id) { loadTemplates(); loadAssets(); }
  }, [userRole, mode]);

  const loadTemplates = async () => {
    const table = mode === 'prestart' ? 'form_templates' : 'service_sheet_templates';
    const { data } = await supabase.from(table).select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setTemplates(data || []);
  };

  const loadAssets = async () => {
    const { data } = await supabase.from('assets').select('id,name,location').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const selectTemplate = (t) => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setSelectedId(t.id);
    setBuilder(JSON.parse(JSON.stringify({ ...t, sections: t.sections || [] })));
    setDirty(false); setActiveSection(null); setActiveItemKey(null);
  };

  const newTemplate = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setSelectedId(null);
    setBuilder({ name: '', description: '', service_type: '', sections: [], asset_ids: [] });
    setDirty(false); setActiveSection(null); setActiveItemKey(null);
  };

  const updateBuilder = (changes) => { setBuilder(b => ({ ...b, ...changes })); setDirty(true); };

  const save = async () => {
    if (!builder.name.trim()) { alert('Please give the template a name.'); return; }
    setSaving(true);
    const table = mode === 'prestart' ? 'form_templates' : 'service_sheet_templates';
    const payload = { ...builder, company_id: userRole.company_id };
    let error, newId;
    if (selectedId) {
      ({ error } = await supabase.from(table).update(payload).eq('id', selectedId));
    } else {
      const { data: d, error: e } = await supabase.from(table).insert([payload]).select().single();
      error = e; if (d) { newId = d.id; setSelectedId(d.id); }
    }
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
    loadTemplates();
  };

  const deleteTemplate = async () => {
    if (!selectedId || !window.confirm('Delete this template? This cannot be undone.')) return;
    const table = mode === 'prestart' ? 'form_templates' : 'service_sheet_templates';
    await supabase.from(table).delete().eq('id', selectedId);
    newTemplate(); loadTemplates();
  };

  // Section ops
  const addSection = () => {
    const idx = builder.sections.length;
    updateBuilder({ sections: [...builder.sections, { title: '', items: [] }] });
    setActiveSection(idx);
  };

  const updateSection = (si, v) => {
    setBuilder(b => ({ ...b, sections: b.sections.map((s, i) => i === si ? v : s) }));
    setDirty(true);
  };

  const removeSection = (si) => {
    setBuilder(b => ({ ...b, sections: b.sections.filter((_, i) => i !== si) }));
    setActiveSection(null); setActiveItemKey(null); setDirty(true);
  };

  const moveSection = (si, dir) => {
    const to = si + dir;
    if (to < 0 || to >= builder.sections.length) return;
    const s = [...builder.sections]; [s[si], s[to]] = [s[to], s[si]];
    setBuilder(b => ({ ...b, sections: s })); setActiveSection(to); setDirty(true);
  };

  // Item ops
  const addItem = (si) => {
    const ii = (builder.sections[si]?.items || []).length;
    setBuilder(b => ({ ...b, sections: b.sections.map((s, i) => i === si ? { ...s, items: [...(s.items||[]), { label: '', type: 'check', required: false }] } : s) }));
    setActiveItemKey(`${si}_${ii}`); setDirty(true);
  };

  const updateItem = (si, ii, v) => {
    setBuilder(b => ({ ...b, sections: b.sections.map((s, i) => i === si ? { ...s, items: s.items.map((item, j) => j === ii ? v : item) } : s) }));
    setDirty(true);
  };

  const removeItem = (si, ii) => {
    setBuilder(b => ({ ...b, sections: b.sections.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s) }));
    setActiveItemKey(null); setDirty(true);
  };

  const moveItem = (si, ii, dir) => {
    const to = ii + dir;
    const items = [...builder.sections[si].items];
    if (to < 0 || to >= items.length) return;
    [items[ii], items[to]] = [items[to], items[ii]];
    setBuilder(b => ({ ...b, sections: b.sections.map((s, i) => i === si ? { ...s, items } : s) }));
    setActiveItemKey(`${si}_${to}`); setDirty(true);
  };

  // AI generate
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const prompt = mode === 'prestart'
        ? `Generate a prestart checklist template for: ${aiPrompt}. Return ONLY valid JSON:\n{"name":"Name","description":"Desc","sections":[{"title":"Section","items":[{"label":"Item","type":"check","required":false}]}]}\nTypes: check, number, text, photo, temperature, fluid, pressure, measurement`
        : `Generate a service sheet template for: ${aiPrompt}. Return ONLY valid JSON:\n{"name":"Name","description":"Desc","service_type":"250hr Service","sections":[{"title":"Section","items":[{"label":"Item","type":"check","required":false}]}],"parts_template":[],"labour_items":[]}\nTypes: check, number, text, photo, temperature, fluid, pressure, measurement`;
      const resp = await pythonAIFetch({ method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) });
      const data = await resp.json();
      const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
      if (parsed.sections) {
        setBuilder(b => ({ ...b, ...parsed }));
        setDirty(true); setShowAiPrompt(false); setAiPrompt('');
      }
    } catch (e) { alert('AI generate failed: ' + e.message); }
    finally { setAiLoading(false); }
  };

  const totalItems = builder.sections.reduce((n, s) => n + (s.items?.length || 0), 0);

  if (!isAdmin) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      🔒 Form Editor is only available to Admins.
    </div>
  );

  const iStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 160px)', minHeight: 600, overflow: 'hidden' }}>



      {/* ── Centre: Builder ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Builder toolbar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          {/* Template picker row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
              {[['prestart', 'Prestarts'], ['service', 'Service']].map(([id, label]) => (
                <button key={id} onClick={() => setMode(id)}
                  style={{ padding: '5px 12px', border: 'none', borderRadius: 6, background: mode === id ? 'var(--accent)' : 'transparent', color: mode === id ? '#fff' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
            {/* Template dropdown */}
            <select
              value={selectedId || ''}
              onChange={e => {
                const t = templates.find(t => t.id === e.target.value);
                if (t) selectTemplate(t); else newTemplate();
              }}
              style={{ flex: 1, padding: '7px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option value="">— New template —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name || 'Untitled'} ({(t.sections||[]).length}s · {(t.sections||[]).reduce((n,s)=>n+(s.items?.length||0),0)} items)
                </option>
              ))}
            </select>
            <button onClick={newTemplate}
              style={{ padding: '7px 14px', background: 'linear-gradient(135deg,var(--accent),#1565C0)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              + New
            </button>
          </div>
          {/* Name / save row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              value={builder.name}
              onChange={e => updateBuilder({ name: e.target.value })}
              placeholder="Template name…"
              style={{ ...iStyle, fontSize: 15, fontWeight: 700, border: 'none', padding: '4px 0', background: 'transparent', borderBottom: '2px solid var(--border)' }}
            />
          </div>
          {mode === 'service' && (
            <input value={builder.service_type || ''} onChange={e => updateBuilder({ service_type: e.target.value })}
              placeholder="Service type e.g. 250hr"
              style={{ ...iStyle, width: 160, flexShrink: 0 }} />
          )}
          <button onClick={() => setShowAiPrompt(p => !p)}
            style={{ padding: '8px 14px', background: showAiPrompt ? 'var(--accent)' : 'var(--surface-2)', color: showAiPrompt ? '#fff' : 'var(--accent)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            🤖 AI Generate
          </button>
          <button onClick={save} disabled={saving || !dirty}
            style={{ padding: '8px 18px', background: dirty ? 'var(--accent)' : 'var(--surface-2)', color: dirty ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', flexShrink: 0, opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
            {saving ? '⏳ Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
          {selectedId && (
            <button onClick={deleteTemplate}
              style={{ padding: '8px 12px', background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Del
            </button>
          )}
          </div>{/* end name/save row */}
        </div>

        {/* AI Prompt bar */}
        {showAiPrompt && (
          <div style={{ padding: '10px 16px', background: 'rgba(14,165,233,0.05)', borderBottom: '1px solid rgba(14,165,233,0.2)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateWithAI()}
              placeholder={mode === 'prestart' ? 'e.g. CAT 320 excavator daily prestart…' : 'e.g. 500hr service Komatsu PC200…'}
              style={{ ...iStyle, flex: 1 }}
              autoFocus
            />
            <button onClick={generateWithAI} disabled={aiLoading || !aiPrompt.trim()}
              style={{ padding: '8px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? '⏳ Generating…' : 'Generate'}
            </button>
          </div>
        )}

        {/* Description */}
        <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
          <input value={builder.description || ''} onChange={e => updateBuilder({ description: e.target.value })}
            placeholder="Description (optional)"
            style={{ ...iStyle, fontSize: 12, color: 'var(--text-muted)' }} />
        </div>

        {/* Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {builder.sections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-faint)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>No sections yet</div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>Add a section to start building your form, or use AI Generate.</div>
              <button onClick={addSection}
                style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + Add First Section
              </button>
            </div>
          )}

          {builder.sections.map((section, si) => (
            <SectionCard
              key={si}
              section={section}
              si={si}
              isActive={activeSection === si}
              onSelect={() => setActiveSection(si)}
              onUpdate={v => updateSection(si, v)}
              onRemove={() => removeSection(si)}
              onAddItem={addItem}
              onMoveUp={() => moveSection(si, -1)}
              onMoveDown={() => moveSection(si, 1)}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onMoveItemUp={(_, ii) => moveItem(si, ii, -1)}
              onMoveItemDown={(_, ii) => moveItem(si, ii, 1)}
              isFirst={si === 0}
              isLast={si === builder.sections.length - 1}
              activeItemKey={activeItemKey}
              onSelectItem={setActiveItemKey}
            />
          ))}

          {builder.sections.length > 0 && (
            <button onClick={addSection}
              style={{ width: '100%', padding: '9px', background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
              + Add Section
            </button>
          )}
        </div>

        {/* Footer stats */}
        {builder.sections.length > 0 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16, flexShrink: 0 }}>
            <span>{builder.sections.length} section{builder.sections.length !== 1 ? 's' : ''}</span>
            <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            <span>{builder.sections.reduce((n, s) => n + (s.items?.filter(i => i.required).length || 0), 0)} required</span>
            {dirty && <span style={{ color: 'var(--amber)', fontWeight: 700 }}>● Unsaved changes</span>}
          </div>
        )}
      </div>

      {/* ── Right: Phone preview ──────────────────────────────────────────── */}
      <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
          📱 Mobile Preview — QR Scan View
        </div>
        {/* Phone frame */}
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 240, borderRadius: 24, border: '2px solid #E5E7EB', boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)', overflow: 'hidden', background: '#F9FAFB',
            position: 'relative',
          }}>
            {/* Phone notch */}
            <div style={{ height: 24, background: '#1a202c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 60, height: 8, background: '#2d3748', borderRadius: 10 }} />
            </div>
            {/* Screen */}
            <div style={{ height: 520, overflowY: 'auto' }}>
              <MobilePreview builder={builder} mode={mode} />
            </div>
            {/* Home bar */}
            <div style={{ height: 20, background: '#1a202c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 50, height: 4, background: '#2d3748', borderRadius: 10 }} />
            </div>
          </div>
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
          Live preview · matches QR scan experience
        </div>
      </div>
    </div>
  );
}
