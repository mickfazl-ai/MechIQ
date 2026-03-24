import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const CSS = `
  .sp { min-height:100vh; background:#09111f; color:#dde3ed; font-family:'Barlow',sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; }
  .sp-card { background:#0f1b2d; border:1px solid rgba(255,255,255,0.09); border-top:2px solid #1e88e5; border-radius:4px; width:100%; max-width:400px; padding:32px 28px; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
  .sp-logo { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; letter-spacing:5px; text-align:center; margin-bottom:24px; color:#dde3ed; }
  .sp-logo em { color:#1e88e5; font-style:normal; }
  .sp-co-logo { width:80px; height:80px; object-fit:contain; border-radius:4px; display:block; margin:0 auto 16px; }
  .sp-co-name { font-size:13px; font-weight:600; color:rgba(221,227,237,0.45); text-align:center; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px; }
  .sp-divider { width:40px; height:2px; background:#1e88e5; margin:0 auto 20px; }
  .sp-asset-name { font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:800; text-align:center; color:#dde3ed; letter-spacing:0.5px; margin-bottom:6px; }
  .sp-asset-meta { font-size:12px; color:rgba(221,227,237,0.4); text-align:center; margin-bottom:24px; }
  .sp-btns { display:flex; flex-direction:column; gap:10px; }
  .sp-btn { width:100%; padding:16px; border-radius:3px; border:none; cursor:pointer; font-family:'Barlow',sans-serif; font-size:14px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; transition:all 0.15s; display:flex; flex-direction:column; align-items:center; gap:4px; }
  .sp-btn-sub { font-size:10px; font-weight:400; letter-spacing:0; text-transform:none; opacity:0.7; }
  .sp-btn-p { background:#1e88e5; color:#fff; }
  .sp-btn-p:hover { background:#1565c0; }
  .sp-btn-j { background:rgba(255,255,255,0.06); color:#dde3ed; border:1px solid rgba(255,255,255,0.12); }
  .sp-btn-j:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.25); }
  .sp-err { text-align:center; color:rgba(221,227,237,0.4); font-size:14px; padding:20px 0; }
  .sp-back { margin-top:16px; text-align:center; }
  .sp-back a { font-size:11px; color:rgba(221,227,237,0.3); text-decoration:none; }

  /* Form overlay */
  .sp-form-wrap { position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:100; display:flex; align-items:flex-end; justify-content:center; padding:0; }
  .sp-form { background:#0f1b2d; border-top:2px solid #1e88e5; width:100%; max-width:480px; max-height:92vh; overflow-y:auto; padding:24px 20px 40px; border-radius:4px 4px 0 0; }
  .sp-form-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .sp-form-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#dde3ed; }
  .sp-form-title em { color:#1e88e5; font-style:normal; }
  .sp-form-close { background:none; border:1px solid rgba(255,255,255,0.1); border-radius:2px; width:30px; height:30px; color:rgba(221,227,237,0.4); cursor:pointer; font-size:14px; }
  .sp-form-asset { background:rgba(30,136,229,0.08); border:1px solid rgba(30,136,229,0.2); border-radius:3px; padding:10px 14px; margin-bottom:18px; font-size:13px; color:rgba(221,227,237,0.7); }
  .sp-form-asset strong { color:#dde3ed; }
  .sp-fl { margin-bottom:14px; }
  .sp-lbl { display:block; font-size:10px; font-weight:700; color:rgba(221,227,237,0.3); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:5px; }
  .sp-inp { width:100%; padding:10px 11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:2px; color:#dde3ed; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; }
  .sp-inp:focus { border-color:#1e88e5; box-shadow:0 0 0 3px rgba(30,136,229,0.1); }
  .sp-inp::placeholder { color:rgba(255,255,255,0.18); }
  .sp-select { width:100%; padding:10px 11px; background:#0f1b2d; border:1px solid rgba(255,255,255,0.1); border-radius:2px; color:#dde3ed; font-size:14px; font-family:'Barlow',sans-serif; outline:none; }
  .sp-select:focus { border-color:#1e88e5; }
  .sp-checks { display:flex; flex-direction:column; gap:8px; }
  .sp-check { display:flex; align-items:center; gap:10px; padding:8px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:2px; cursor:pointer; }
  .sp-check input { width:16px; height:16px; accent-color:#1e88e5; flex-shrink:0; }
  .sp-check-info { flex:1; }
  .sp-check-name { font-size:13px; color:#dde3ed; font-weight:500; }
  .sp-check-ok { font-size:11px; color:rgba(30,196,100,0.8); margin-top:1px; }
  .sp-check-issue { font-size:11px; color:rgba(239,83,80,0.8); margin-top:1px; }
  .sp-check.fail { border-color:rgba(239,83,80,0.3); background:rgba(239,83,80,0.04); }
  .sp-sig-area { width:100%; height:80px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:2px; display:flex; align-items:center; justify-content:center; color:rgba(221,227,237,0.3); font-size:12px; cursor:pointer; }
  .sp-sig-area.signed { background:rgba(30,136,229,0.06); border-color:rgba(30,136,229,0.3); color:#64b5f6; }
  .sp-submit { width:100%; padding:14px; background:#1e88e5; border:none; border-radius:2px; color:#fff; font-size:13px; font-weight:700; letter-spacing:1px; text-transform:uppercase; cursor:pointer; font-family:'Barlow',sans-serif; margin-top:8px; transition:background 0.15s; }
  .sp-submit:hover { background:#1565c0; }
  .sp-submit:disabled { opacity:0.4; cursor:not-allowed; }
  .sp-ok { text-align:center; padding:20px 0; }
  .sp-ok-icon { font-size:40px; margin-bottom:12px; }
  .sp-ok-msg { font-size:16px; font-weight:600; color:#dde3ed; margin-bottom:6px; }
  .sp-ok-sub { font-size:13px; color:rgba(221,227,237,0.4); }
`;

const PRESTART_ITEMS = [
  { id:'engine_oil', name:'Engine oil level', cat:'fluid' },
  { id:'coolant',    name:'Coolant level',    cat:'fluid' },
  { id:'hydraulic',  name:'Hydraulic fluid',  cat:'fluid' },
  { id:'fuel',       name:'Fuel level',       cat:'fluid' },
  { id:'brakes',     name:'Brake function',   cat:'safety' },
  { id:'lights',     name:'Lights operational', cat:'safety' },
  { id:'horn',       name:'Horn functional',  cat:'safety' },
  { id:'seatbelt',   name:'Seatbelt present', cat:'safety' },
  { id:'tyres',      name:'Tyre condition',   cat:'mechanical' },
  { id:'leaks',      name:'No visible leaks', cat:'mechanical' },
  { id:'controls',   name:'Controls operational', cat:'mechanical' },
  { id:'fire_ext',   name:'Fire extinguisher present', cat:'safety' },
];

function PrestartForm({ asset, company, onClose }) {
  const [operator, setOperator] = useState('');
  const [hours, setHours] = useState('');
  const [checks, setChecks] = useState({});
  const [issues, setIssues] = useState({});
  const [notes, setNotes] = useState('');
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const toggle = (id) => {
    setChecks(c => ({ ...c, [id]: !c[id] }));
  };
  const toggleIssue = (id) => {
    setIssues(i => ({ ...i, [id]: !i[id] }));
  };

  const submit = async () => {
    if (!operator || !hours || !signed) return;
    setBusy(true);
    const failedItems = PRESTART_ITEMS.filter(i => issues[i.id]).map(i => i.name);
    await supabase.from('scan_submissions').insert({
      type: 'prestart',
      asset_id: asset.id,
      company_id: asset.company_id,
      asset_name: asset.asset_name,
      asset_id_tag: asset.asset_id,
      operator_name: operator,
      current_hours: parseFloat(hours) || null,
      checklist: checks,
      failed_items: failedItems,
      notes,
      signed: true,
      submitted_at: new Date().toISOString(),
    });
    setBusy(false);
    setDone(true);
  };

  if (done) return (
    <div className="sp-form-wrap">
      <div className="sp-form">
        <div className="sp-ok">
          <div className="sp-ok-icon">✓</div>
          <div className="sp-ok-msg">Prestart submitted</div>
          <div className="sp-ok-sub">{asset.asset_name} · {new Date().toLocaleDateString('en-AU')}</div>
          <button className="sp-submit" style={{ marginTop:20 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sp-form-wrap" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sp-form">
        <div className="sp-form-head">
          <div className="sp-form-title">Pre<em>start</em></div>
          <button className="sp-form-close" onClick={onClose}>✕</button>
        </div>
        <div className="sp-form-asset">
          <strong>{asset.asset_name}</strong> · {asset.asset_type || 'Asset'} · {asset.asset_id || ''}
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Operator name</label>
          <input className="sp-inp" placeholder="Full name" value={operator} onChange={e => setOperator(e.target.value)} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Current hours / odometer</label>
          <input className="sp-inp" type="number" placeholder="Hours or km" value={hours} onChange={e => setHours(e.target.value)} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Inspection checklist</label>
          <div className="sp-checks">
            {PRESTART_ITEMS.map(item => (
              <label key={item.id} className={`sp-check${issues[item.id] ? ' fail' : ''}`}>
                <input type="checkbox" checked={!!checks[item.id]} onChange={() => toggle(item.id)} />
                <div className="sp-check-info">
                  <div className="sp-check-name">{item.name}</div>
                  {checks[item.id] && !issues[item.id] && <div className="sp-check-ok">Satisfactory</div>}
                  {issues[item.id] && <div className="sp-check-issue">Issue noted</div>}
                </div>
                {checks[item.id] && (
                  <input type="checkbox" checked={!!issues[item.id]} onChange={() => toggleIssue(item.id)}
                    title="Mark as issue" style={{ accentColor:'#ef5350' }} />
                )}
              </label>
            ))}
          </div>
          <div style={{ fontSize:10, color:'rgba(221,227,237,0.3)', marginTop:6 }}>Check each item. Tick the red box on the right if there is an issue.</div>
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Notes / defects</label>
          <textarea className="sp-inp" rows={3} placeholder="Describe any defects or concerns..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize:'vertical' }} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Operator signature</label>
          <div className={`sp-sig-area${signed ? ' signed' : ''}`} onClick={() => setSigned(true)}>
            {signed ? `Signed — ${operator || 'Operator'} · ${new Date().toLocaleTimeString('en-AU')}` : 'Tap to sign'}
          </div>
        </div>
        <button className="sp-submit" onClick={submit} disabled={busy || !operator || !hours || !signed}>
          {busy ? 'Submitting…' : 'Submit Prestart'}
        </button>
      </div>
    </div>
  );
}

function JobCardForm({ asset, company, onClose }) {
  const [requester, setRequester] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Mechanical');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!requester || !description) return;
    setBusy(true);
    await supabase.from('scan_submissions').insert({
      type: 'job_card',
      asset_id: asset.id,
      company_id: asset.company_id,
      asset_name: asset.asset_name,
      asset_id_tag: asset.asset_id,
      operator_name: requester,
      priority,
      category,
      description,
      submitted_at: new Date().toISOString(),
    });
    setBusy(false);
    setDone(true);
  };

  if (done) return (
    <div className="sp-form-wrap">
      <div className="sp-form">
        <div className="sp-ok">
          <div className="sp-ok-icon">✓</div>
          <div className="sp-ok-msg">Job card submitted</div>
          <div className="sp-ok-sub">{asset.asset_name} · your maintenance team has been notified</div>
          <button className="sp-submit" style={{ marginTop:20 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sp-form-wrap" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sp-form">
        <div className="sp-form-head">
          <div className="sp-form-title">Job <em>Card</em></div>
          <button className="sp-form-close" onClick={onClose}>✕</button>
        </div>
        <div className="sp-form-asset">
          <strong>{asset.asset_name}</strong> · {asset.asset_type || 'Asset'} · {asset.asset_id || ''}
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Reported by</label>
          <input className="sp-inp" placeholder="Your name" value={requester} onChange={e => setRequester(e.target.value)} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div>
            <label className="sp-lbl">Priority</label>
            <select className="sp-select" value={priority} onChange={e => setPriority(e.target.value)}>
              {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="sp-lbl">Category</label>
            <select className="sp-select" value={category} onChange={e => setCategory(e.target.value)}>
              {['Mechanical','Hydraulic','Electrical','Tyres','Bodywork','Fluids','Operator Defect','Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Description of fault / required work</label>
          <textarea className="sp-inp" rows={5} placeholder="Describe the issue, location on machine, symptoms observed..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize:'vertical' }} />
        </div>
        <button className="sp-submit" onClick={submit} disabled={busy || !requester || !description}>
          {busy ? 'Submitting…' : 'Submit Job Card'}
        </button>
      </div>
    </div>
  );
}

export default function ScanPage({ assetId, partId }) {
  const [asset, setAsset] = useState(null);
  const [company, setCompany] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // 'prestart' | 'jobcard' | null

  const id = assetId || partId;
  const mode = assetId ? 'asset' : 'part';

  useEffect(() => {
    if (!document.getElementById('sp-css')) {
      const s = document.createElement('style');
      s.id = 'sp-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      if (mode === 'asset') {
        const { data } = await supabase.from('assets').select('*').eq('id', id).single();
        if (data) {
          setAsset(data);
          const { data: co } = await supabase.from('companies').select('*').eq('id', data.company_id).single();
          if (co) setCompany(co);
          const { data: br } = await supabase.from('company_branding').select('*').eq('company_id', data.company_id).single();
          if (br) setBranding(br);
        }
      } else {
        const { data } = await supabase.from('parts').select('*').eq('id', id).single();
        if (data) {
          setAsset({ ...data, asset_name: data.part_name, asset_type: 'Part' });
          const { data: co } = await supabase.from('companies').select('*').eq('id', data.company_id).single();
          if (co) setCompany(co);
        }
      }
      setLoading(false);
    })();
  }, [id, mode]);

  const accentColor = branding?.primary_color || '#1e88e5';

  if (loading) return (
    <div className="sp">
      <div className="sp-logo">MECH<em>IQ</em></div>
      <div style={{ color:'rgba(221,227,237,0.4)', fontSize:13 }}>Loading…</div>
    </div>
  );

  if (!asset) return (
    <div className="sp">
      <div className="sp-logo">MECH<em>IQ</em></div>
      <div className="sp-card">
        <div className="sp-err">QR code not recognised.<br />This asset may have been removed.</div>
        <div className="sp-back"><a href="/">mechiq.com.au</a></div>
      </div>
    </div>
  );

  return (
    <div className="sp">
      <div className="sp-card" style={{ borderTopColor: accentColor }}>
        {branding?.logo_url && (
          <img src={branding.logo_url} alt={company?.company_name} className="sp-co-logo" />
        )}
        {company && <div className="sp-co-name">{company.company_name}</div>}
        <div className="sp-divider" style={{ background: accentColor }} />
        <div className="sp-asset-name">{asset.asset_name}</div>
        <div className="sp-asset-meta">
          {asset.asset_type && <span>{asset.asset_type}</span>}
          {asset.asset_id && <span> · {asset.asset_id}</span>}
          {asset.make && <span> · {asset.make} {asset.model}</span>}
        </div>
        {mode === 'asset' ? (
          <div className="sp-btns">
            <button className="sp-btn sp-btn-p" style={{ background: accentColor }} onClick={() => setForm('prestart')}>
              Prestart
              <span className="sp-btn-sub">Daily inspection checklist</span>
            </button>
            <button className="sp-btn sp-btn-j" onClick={() => setForm('jobcard')}>
              Job Card
              <span className="sp-btn-sub">Log a fault or maintenance request</span>
            </button>
          </div>
        ) : (
          <div className="sp-asset-meta" style={{ textAlign:'center', marginTop:8 }}>
            Scan this part to log usage or check stock levels.
          </div>
        )}
      </div>
      <div style={{ marginTop:16, fontSize:11, color:'rgba(221,227,237,0.2)' }}>
        Powered by MECH<span style={{ color: accentColor }}>IQ</span>
      </div>

      {form === 'prestart' && (
        <PrestartForm asset={asset} company={company} onClose={() => setForm(null)} />
      )}
      {form === 'jobcard' && (
        <JobCardForm asset={asset} company={company} onClose={() => setForm(null)} />
      )}
    </div>
  );
}
