import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const MASTER_PIN = '4900';
const FEATURES = [
  { key:'dashboard',    label:'Dashboard' },
  { key:'assets',       label:'Assets' },
  { key:'downtime',     label:'Downtime' },
  { key:'maintenance',  label:'Maintenance' },
  { key:'prestart',     label:'Prestarts' },
  { key:'scanner',      label:'Scanner' },
  { key:'reports',      label:'Reports' },
  { key:'users',        label:'Users' },
  { key:'form_builder', label:'Form Builder' },
];

const CSS = `
  @keyframes scan { 0%{top:-1px;opacity:0.7} 100%{top:100%;opacity:0} }
  @keyframes flicker { 0%,98%{opacity:1} 99%{opacity:0.6} 100%{opacity:1} }
  .ma-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .ma-card:hover { border-color: rgba(0,180,255,0.22); }
  .ma-card.selected { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 24px rgba(0,212,255,0.1); }
  .ma-card::before {
    content:''; position:absolute; top:0;left:0;right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(0,212,255,0.35),transparent);
    opacity:0; transition:opacity 0.2s;
  }
  .ma-card:hover::before, .ma-card.selected::before { opacity:1; }
  .ma-row { cursor:pointer; padding:18px 20px; transition:background 0.12s; }
  .ma-row:hover { background:var(--surface-2); }
  .feat-toggle {
    padding:4px 11px; border-radius:4px; border:none; cursor:pointer;
    font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    transition:all 0.15s; font-family:var(--font-display);
  }
  .feat-on  { background:rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .feat-off { background:rgba(255,51,102,0.08); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .feat-on:hover  { background:rgba(0,255,136,0.2); box-shadow:0 0 10px rgba(0,255,136,0.2); }
  .feat-off:hover { background:rgba(255,51,102,0.15); box-shadow:0 0 10px rgba(255,51,102,0.15); }
  .status-pill {
    display:inline-flex; align-items:center; gap:5px;
    padding:3px 9px; border-radius:4px;
    font-size:10px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    font-family:var(--font-display);
  }
  .pill-active    { background:rgba(0,255,136,0.1);  color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .pill-pending   { background:rgba(255,170,0,0.1);  color:#ffaa00; border:1px solid rgba(204,136,0,0.4); }
  .pill-suspended { background:rgba(255,51,102,0.1); color:#ff3366; border:1px solid rgba(204,34,68,0.4); }
  .tab-btn {
    padding:7px 16px; border-radius:6px; border:1px solid var(--border);
    background:transparent; color:var(--text-muted); cursor:pointer;
    font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
    transition:all 0.15s; font-family:var(--font-display);
  }
  .tab-btn.active { background:var(--accent-glow); color:var(--accent); border-color:var(--accent-dark); }
  .tab-btn:hover:not(.active) { color:var(--text-secondary); border-color:rgba(0,180,255,0.2); }
  .ma-action {
    padding:7px 14px; border-radius:6px; border:none; cursor:pointer;
    font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    transition:all 0.15s; font-family:var(--font-display);
  }
  .ma-action.approve  { background:rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .ma-action.reject   { background:rgba(255,51,102,0.1); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .ma-action.suspend  { background:rgba(255,51,102,0.1); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .ma-action.activate { background:rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,204,106,0.4); }
  .ma-action.pending  { background:rgba(255,170,0,0.1);  color:#ffaa00; border:1px solid rgba(204,136,0,0.3); }
  .ma-action.export   { background:rgba(0,212,255,0.08); color:var(--accent); border:1px solid var(--accent-dark); }
  .ma-action.danger   { background:rgba(255,51,102,0.08); color:#ff3366; border:1px solid rgba(204,34,68,0.3); }
  .ma-action.restore  { background:rgba(170,85,255,0.1); color:#aa55ff; border:1px solid rgba(136,68,204,0.3); }
  .ma-action:hover { filter:brightness(1.2); transform:translateY(-1px); }
  .ma-action:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
`;

function PinModal({ onConfirm, onCancel, actionLabel }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const confirm = () => {
    if (pin === MASTER_PIN) onConfirm();
    else { setErr('Invalid authorization code'); setPin(''); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, backdropFilter:'blur(8px)' }}>
      <div style={{ background:'var(--surface)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:16, padding:36, width:360, textAlign:'center', boxShadow:'0 0 60px rgba(0,212,255,0.15)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,var(--accent),transparent)' }} />
        <div style={{ fontSize:11, color:'var(--accent)', letterSpacing:'3px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:8 }}>Authorization Required</div>
        <div style={{ fontSize:15, color:'var(--text-secondary)', marginBottom:24, fontFamily:'var(--font-display)', lineHeight:1.5 }}>{actionLabel}</div>
        <input type="password" placeholder="Enter PIN" value={pin}
          onChange={e => { setPin(e.target.value); setErr(''); }}
          onKeyDown={e => e.key==='Enter' && confirm()}
          autoFocus
          style={{ width:'100%', padding:'14px', background:'var(--surface-2)', color:'var(--text-primary)', border:`1px solid ${err?'var(--red-border)':'rgba(0,212,255,0.25)'}`, borderRadius:8, fontSize:22, textAlign:'center', letterSpacing:'10px', fontFamily:'var(--font-mono)', boxSizing:'border-box', marginBottom:8 }}
        />
        {err && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8, fontFamily:'var(--font-display)' }}>{err}</div>}
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <button onClick={onCancel} className="ma-action pending" style={{ flex:1 }}>Cancel</button>
          <button onClick={confirm} className="ma-action approve" style={{ flex:1 }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function MasterAdmin() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('all');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [pinAction, setPinAction] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!document.getElementById('ma-css')) {
      const s = document.createElement('style'); s.id='ma-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending:false });
    setCompanies(data || []);
    setLoading(false);
  };

  const requirePin = (label, action) => setPinAction({ label, onConfirm:() => { setPinAction(null); action(); } });

  const updateCompany = async (id, updates) => {
    setSaving(true);
    const { error } = await supabase.from('companies').update(updates).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
      await fetchCompanies();
      if (selected?.id === id) setSelected(prev => ({ ...prev, ...updates }));
    }
    setSaving(false);
  };

  const setStatus = (id, status) => {
    const labels = { active:'Activate this company', suspended:'Suspend this company', pending:'Set to pending review' };
    requirePin(labels[status]||'Change status', () => updateCompany(id, { status }));
  };

  const toggleFeature = (company, key) => {
    const current = company.features?.[key] !== false;
    const feat = FEATURES.find(f => f.key===key)?.label;
    requirePin(`${current?'Disable':'Enable'} "${feat}" for ${company.name}`, () => {
      const updated = { ...company.features, [key]: !current };
      updateCompany(company.id, { features:updated });
      if (selected?.id === company.id) setSelected(prev => ({ ...prev, features:updated }));
    });
  };

  const saveAssetLimit = (company) => requirePin(`Set asset limit to ${company.asset_limit}`, () => updateCompany(company.id, { asset_limit:company.asset_limit }));

  const exportProfile = async (company) => {
    try {
      const cid = company.id;
      const q = async (t) => { try { const { data } = await supabase.from(t).select('*').eq('company_id', cid); return data||[]; } catch { return []; } };
      const [users,assets,maint,wos,downtime,formT,formS,svcT,svcS,oil] = await Promise.all([
        q('user_roles'),q('assets'),q('maintenance'),q('work_orders'),q('downtime'),
        q('form_templates'),q('form_submissions'),q('service_sheet_templates'),q('service_sheet_submissions'),q('oil_samples'),
      ]);
      const profile = { exported_at:new Date().toISOString(), company, users, assets, maintenance:maint, work_orders:wos, downtime, form_templates:formT, form_submissions:formS, service_templates:svcT, service_submissions:svcS, oil_samples:oil };
      const blob = new Blob([JSON.stringify(profile,null,2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url;
      a.download=`MechIQ_${company.name.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      return true;
    } catch(e) { alert('Export failed: '+e.message); return false; }
  };

  const handleRestore = () => requirePin('Restore / re-create your Master Admin record', async () => {
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { alert('Not logged in'); return; }
    const { error } = await supabase.from('user_roles').upsert(
      { email:user.email, name:user.email.split('@')[0], role:'master', company_id:null },
      { onConflict:'email' }
    );
    if (error) alert('Error: '+error.message);
    else alert('Master admin restored — refresh to continue.');
  });

  const handleDelete = (company) => requirePin(`PERMANENTLY DELETE "${company.name}" — cannot be undone`, async () => {
    setDeleting(true);
    const exported = await exportProfile(company);
    if (!exported) { setDeleting(false); return; }
    const cid = company.id;
    const tables = ['oil_samples','service_sheet_submissions','service_sheet_templates','form_submissions','form_templates','downtime','work_orders','maintenance','assets'];
    for (const t of tables) await supabase.from(t).delete().eq('company_id', cid);
    await supabase.from('user_roles').delete().eq('company_id', cid).neq('role','master');
    const { error } = await supabase.from('companies').delete().eq('id', cid);
    if (error) { alert('Error: '+error.message); setDeleting(false); return; }
    setDeleting(false); setSelected(null); await fetchCompanies();
    alert(`"${company.name}" deleted. Profile downloaded.`);
  });

  const filtered = companies.filter(c => {
    const matchTab = tab==='all' || c.status===tab;
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.contact_name?.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = { all:companies.length, pending:companies.filter(c=>c.status==='pending').length, active:companies.filter(c=>c.status==='active').length, suspended:companies.filter(c=>c.status==='suspended').length };

  const pillClass = (s) => `status-pill pill-${s||'pending'}`;
  const statusDot = (s) => ({ active:'#00ff88', pending:'#ffaa00', suspended:'#ff3366' }[s]||'#7ab8e8');

  return (
    <div style={{ maxWidth:1200, margin:'0 auto' }}>
      {pinAction && <PinModal actionLabel={pinAction.label} onConfirm={pinAction.onConfirm} onCancel={() => setPinAction(null)} />}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--purple)', letterSpacing:'3px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:4 }}>◈ MASTER CONTROL</div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:38, fontWeight:900, color:'var(--text-primary)', letterSpacing:'2px', textTransform:'uppercase', margin:0, lineHeight:1 }}>Command Panel</h2>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6, fontFamily:'var(--font-display)' }}>Manage company registrations, access levels and platform features</div>
        </div>
        <button className="ma-action restore" onClick={handleRestore} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px' }}>
          <span style={{ fontSize:14 }}>⬡</span> Restore Master Admin
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Companies',  value:counts.all,       color:'var(--accent)',   glow:'rgba(0,212,255,0.15)' },
          { label:'Pending Approval', value:counts.pending,   color:'var(--amber)',  glow:'rgba(255,170,0,0.15)' },
          { label:'Active',           value:counts.active,    color:'var(--green)',  glow:'rgba(0,255,136,0.15)' },
          { label:'Suspended',        value:counts.suspended, color:'var(--red)',    glow:'rgba(255,51,102,0.15)' },
        ].map(s => (
          <div key={s.label} className="ma-card" style={{ padding:'20px 22px', boxShadow:`0 0 20px ${s.glow}`, borderColor:s.glow.replace('0.15','0.3') }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:s.color, opacity:0.6 }} />
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:800, color:s.color, lineHeight:1, textShadow:`0 0 20px ${s.glow.replace('0.15','0.5')}` }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'1px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'1fr', gap:20 }}>

        {/* Left — company list */}
        <div>
          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            {['all','pending','active','suspended'].map(t => (
              <button key={t} className={`tab-btn${tab===t?' active':''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)} ({counts[t]})
              </button>
            ))}
            <div style={{ marginLeft:'auto', position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-muted)' }}>⌕</span>
              <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft:32, width:200, background:'var(--surface-2)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, padding:'8px 12px 8px 30px', fontFamily:'var(--font-display)' }}
              />
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[0,1,2].map(i => <div key={i} className="ma-card" style={{ height:90, animation:'shimmer 1.5s infinite linear', background:'linear-gradient(90deg,var(--surface-2) 25%,var(--surface-3) 50%,var(--surface-2) 75%)', backgroundSize:'200% 100%' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontFamily:'var(--font-display)' }}>No companies found matching the current filter.</div>
          ) : filtered.map((c,i) => (
            <div key={c.id} className={`ma-card${selected?.id===c.id?' selected':''}`}
              style={{ marginBottom:10, opacity:0, animation:`fadeUp 0.35s ease ${i*40}ms forwards` }}
              onClick={() => setSelected(c)}>
              <div className="ma-row">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:statusDot(c.status), boxShadow:`0 0 6px ${statusDot(c.status)}`, flexShrink:0 }} />
                      <span style={{ color:'var(--text-primary)', fontWeight:700, fontSize:15, fontFamily:'var(--font-display)', letterSpacing:'0.3px' }}>{c.name}</span>
                      <span className={pillClass(c.status)}>{c.status||'pending'}</span>
                      {c.plan && <span style={{ padding:'2px 8px', borderRadius:4, background:'var(--surface-2)', color:'var(--text-muted)', fontSize:10, fontWeight:600, border:'1px solid var(--border)', fontFamily:'var(--font-display)', letterSpacing:'0.5px', textTransform:'uppercase' }}>{c.plan}</span>}
                    </div>
                    <div style={{ color:'var(--text-muted)', fontSize:12, fontFamily:'var(--font-display)', display:'flex', gap:12, flexWrap:'wrap' }}>
                      {c.industry && <span>{c.industry}</span>}
                      {c.contact_name && <span>· {c.contact_name}</span>}
                      {c.phone && <span>· {c.phone}</span>}
                      {c.abn && <span style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>· ABN {c.abn}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                    {c.status==='pending' && (<>
                      <button className="ma-action approve" onClick={() => setStatus(c.id,'active')}>✓ Approve</button>
                      <button className="ma-action reject"  onClick={() => setStatus(c.id,'suspended')}>✕ Reject</button>
                    </>)}
                    {c.status==='active'    && <button className="ma-action suspend"  onClick={() => setStatus(c.id,'suspended')}>Suspend</button>}
                    {c.status==='suspended' && <button className="ma-action activate" onClick={() => setStatus(c.id,'active')}>Reactivate</button>}
                  </div>
                </div>
                {/* Feature pills */}
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
                  {FEATURES.map(f => {
                    const on = c.features?.[f.key] !== false;
                    return (
                      <span key={f.key} style={{ padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'0.5px', background:on?'rgba(0,212,255,0.07)':'var(--surface-2)', color:on?'var(--accent)':'var(--text-faint)', border:`1px solid ${on?'rgba(0,212,255,0.2)':'var(--border)'}` }}>
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right — detail panel */}
        {selected && (
          <div className="ma-card" style={{ height:'fit-content', position:'sticky', top:20 }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,var(--accent),transparent)' }} />
            <div style={{ padding:'20px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--accent)', letterSpacing:'2px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:4 }}>Company Detail</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px' }}>{selected.name}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', width:32, height:32, borderRadius:6, cursor:'pointer', fontSize:14, transition:'all 0.15s' }}>✕</button>
              </div>
            </div>

            <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
              {[
                { label:'Status',     value:selected.status,     color:statusDot(selected.status) },
                { label:'Plan',       value:selected.plan||'—' },
                { label:'Industry',   value:selected.industry },
                { label:'Contact',    value:selected.contact_name },
                { label:'Phone',      value:selected.phone },
                { label:'ABN',        value:selected.abn||'—',   mono:true },
                { label:'Address',    value:selected.address||'—' },
                { label:'Registered', value:selected.created_at?new Date(selected.created_at).toLocaleDateString('en-AU'):'—' },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                  <span style={{ color:'var(--text-muted)', fontFamily:'var(--font-display)', letterSpacing:'0.3px' }}>{row.label}</span>
                  <span style={{ color:row.color||'var(--text-primary)', fontWeight:600, fontFamily:row.mono?'var(--font-mono)':'var(--font-body)', fontSize:row.mono?11:13 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Asset limit */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10 }}>Asset Limit</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="number" value={selected.asset_limit||10}
                  onChange={e => setSelected(prev => ({ ...prev, asset_limit:parseInt(e.target.value) }))}
                  style={{ width:80, padding:'8px 10px', textAlign:'center' }}
                />
                <button className="ma-action export" onClick={() => saveAssetLimit(selected)}>{saving?'…':'Save Limit'}</button>
              </div>
            </div>

            {/* Features */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:12 }}>Feature Access</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {FEATURES.map(f => {
                  const on = selected.features?.[f.key] !== false;
                  return (
                    <div key={f.key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'var(--text-secondary)', fontSize:13, fontFamily:'var(--font-display)' }}>{f.label}</span>
                      <button className={`feat-toggle feat-${on?'on':'off'}`} onClick={() => toggleFeature(selected, f.key)}>
                        {on?'✓ Active':'✕ Locked'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10 }}>Account Actions</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {selected.status!=='active'    && <button className="ma-action activate" onClick={() => setStatus(selected.id,'active')}>Activate</button>}
                {selected.status!=='suspended' && <button className="ma-action suspend"  onClick={() => setStatus(selected.id,'suspended')}>Suspend</button>}
                {selected.status!=='pending'   && <button className="ma-action pending"  onClick={() => setStatus(selected.id,'pending')}>Set Pending</button>}
              </div>
            </div>

            {/* Data */}
            <div style={{ padding:'16px 22px' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'var(--font-display)', fontWeight:700, marginBottom:10 }}>Data Management</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="ma-action export" onClick={() => exportProfile(selected)}>Export JSON</button>
                <button className="ma-action danger" disabled={deleting} onClick={() => handleDelete(selected)}>{deleting?'Deleting…':'Delete Company'}</button>
              </div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:10, lineHeight:1.6, fontFamily:'var(--font-display)' }}>
                Delete exports a full data backup first, then permanently removes all company records.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MasterAdmin;
