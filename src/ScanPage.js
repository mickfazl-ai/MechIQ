import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700;800;900&display=swap');
  .sp { min-height:100vh; background:#09111f; color:#dde3ed; font-family:'Barlow',sans-serif; display:flex; flex-direction:column; align-items:center; padding:24px 16px 60px; }
  .sp-logo { font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900; letter-spacing:5px; color:#dde3ed; margin-bottom:20px; }
  .sp-logo em { color:#1e88e5; font-style:normal; }
  .sp-card { background:#0f1b2d; border:1px solid rgba(255,255,255,0.09); border-top:3px solid #1e88e5; border-radius:6px; width:100%; max-width:440px; padding:24px 20px; box-shadow:0 20px 60px rgba(0,0,0,0.5); margin-bottom:16px; }
  .sp-co-logo { width:64px; height:64px; object-fit:contain; border-radius:4px; display:block; margin:0 auto 12px; }
  .sp-co-name { font-size:11px; font-weight:600; color:rgba(221,227,237,0.4); text-align:center; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:16px; }
  .sp-asset-name { font-family:'Barlow Condensed',sans-serif; font-size:26px; font-weight:800; text-align:center; margin-bottom:4px; }
  .sp-asset-meta { font-size:12px; color:rgba(221,227,237,0.4); text-align:center; margin-bottom:20px; }
  .sp-divider { width:36px; height:2px; background:#1e88e5; margin:0 auto 16px; }
  .sp-btn { width:100%; padding:16px; border-radius:4px; border:none; cursor:pointer; font-family:'Barlow',sans-serif; font-size:14px; font-weight:700; letter-spacing:0.5px; transition:all 0.15s; display:flex; flex-direction:column; align-items:center; gap:3px; margin-bottom:10px; }
  .sp-btn:last-child { margin-bottom:0; }
  .sp-btn-sub { font-size:10px; font-weight:400; opacity:0.7; }
  .sp-btn-p { background:#1e88e5; color:#fff; }
  .sp-btn-s { background:rgba(255,255,255,0.06); color:#dde3ed; border:1px solid rgba(255,255,255,0.12); }
  .sp-btn-j { background:rgba(255,165,0,0.12); color:#ffa500; border:1px solid rgba(255,165,0,0.25); }

  /* Form styles */
  .sp-form-wrap { width:100%; max-width:440px; }
  .sp-form-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .sp-form-title { font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:800; text-transform:uppercase; letter-spacing:1px; }
  .sp-form-title em { color:#1e88e5; font-style:normal; }
  .sp-back { background:none; border:1px solid rgba(255,255,255,0.12); border-radius:3px; padding:5px 12px; color:rgba(221,227,237,0.5); cursor:pointer; font-size:12px; font-family:'Barlow',sans-serif; }
  .sp-asset-tag { background:rgba(30,136,229,0.1); border:1px solid rgba(30,136,229,0.2); border-radius:3px; padding:9px 12px; margin-bottom:16px; font-size:13px; color:rgba(221,227,237,0.7); }
  .sp-asset-tag strong { color:#dde3ed; }
  .sp-fl { margin-bottom:14px; }
  .sp-lbl { display:block; font-size:10px; font-weight:700; color:rgba(221,227,237,0.35); letter-spacing:1.5px; text-transform:uppercase; margin-bottom:5px; }
  .sp-inp { width:100%; padding:10px 11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:3px; color:#dde3ed; font-size:14px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; }
  .sp-inp:focus { border-color:#1e88e5; }
  .sp-inp::placeholder { color:rgba(255,255,255,0.18); }
  .sp-select { width:100%; padding:10px 11px; background:#0f1b2d; border:1px solid rgba(255,255,255,0.1); border-radius:3px; color:#dde3ed; font-size:14px; font-family:'Barlow',sans-serif; outline:none; }

  /* Section */
  .sp-section { margin-bottom:18px; }
  .sp-section-title { font-size:11px; font-weight:700; color:#1e88e5; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px; padding-bottom:5px; border-bottom:1px solid rgba(30,136,229,0.2); }

  /* Check items */
  .sp-check { display:flex; align-items:flex-start; gap:10px; padding:9px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:3px; cursor:pointer; margin-bottom:5px; transition:all 0.1s; }
  .sp-check.ok { border-color:rgba(30,196,100,0.3); background:rgba(30,196,100,0.05); }
  .sp-check.fail { border-color:rgba(239,83,80,0.35); background:rgba(239,83,80,0.06); }
  .sp-check input[type=checkbox] { width:16px; height:16px; accent-color:#1e88e5; flex-shrink:0; margin-top:1px; cursor:pointer; }
  .sp-check-label { flex:1; font-size:13px; color:#dde3ed; line-height:1.3; }
  .sp-check-status { font-size:10px; margin-top:2px; }
  .sp-flag-btn { background:none; border:1px solid rgba(239,83,80,0.35); border-radius:3px; color:rgba(239,83,80,0.7); padding:2px 7px; font-size:10px; cursor:pointer; flex-shrink:0; font-family:'Barlow',sans-serif; margin-top:1px; }
  .sp-flag-btn.active { background:rgba(239,83,80,0.2); color:#ef5350; border-color:#ef5350; }

  /* Number/text inputs inline */
  .sp-item-inp { padding:5px 8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:3px; color:#dde3ed; font-size:13px; font-family:'Barlow',sans-serif; outline:none; width:100px; }

  /* Parts table */
  .sp-parts { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
  .sp-parts th { padding:5px 8px; text-align:left; color:rgba(221,227,237,0.4); font-size:10px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid rgba(255,255,255,0.08); }
  .sp-parts td { padding:7px 8px; border-bottom:1px solid rgba(255,255,255,0.05); color:#dde3ed; }

  .sp-sig { width:100%; height:72px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:3px; display:flex; align-items:center; justify-content:center; color:rgba(221,227,237,0.3); font-size:13px; cursor:pointer; }
  .sp-sig.done { background:rgba(30,136,229,0.07); border-color:rgba(30,136,229,0.3); color:#64b5f6; }
  .sp-submit { width:100%; padding:14px; background:#1e88e5; border:none; border-radius:3px; color:#fff; font-size:14px; font-weight:700; letter-spacing:0.5px; cursor:pointer; font-family:'Barlow',sans-serif; margin-top:16px; transition:background 0.15s; }
  .sp-submit:hover { background:#1565c0; }
  .sp-submit:disabled { opacity:0.35; cursor:not-allowed; }
  .sp-ok { text-align:center; padding:24px 0; }
  .sp-ok-icon { font-size:44px; margin-bottom:12px; }
  .sp-ok-msg { font-size:17px; font-weight:700; margin-bottom:5px; }
  .sp-ok-sub { font-size:12px; color:rgba(221,227,237,0.4); }
  .sp-err { text-align:center; color:rgba(221,227,237,0.4); font-size:14px; padding:20px 0; }

  .sp-tmpl-pick { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
  .sp-tmpl-item { padding:12px 14px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:4px; cursor:pointer; transition:all 0.1s; }
  .sp-tmpl-item:hover { background:rgba(30,136,229,0.08); border-color:rgba(30,136,229,0.3); }
  .sp-tmpl-name { font-size:14px; font-weight:700; color:#dde3ed; margin-bottom:2px; }
  .sp-tmpl-meta { font-size:11px; color:rgba(221,227,237,0.4); }
`;

// ─── Prestart Form ─────────────────────────────────────────────────────────────
function PrestartForm({ asset, company, template, onClose, accentColor }) {
  const [operator, setOperator] = useState('');
  const [hours,    setHours]    = useState('');
  const [notes,    setNotes]    = useState('');
  const [signed,   setSigned]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);
  const [responses, setResponses] = useState({});
  const [issues,   setIssues]   = useState({});

  const sections = template?.sections || [];

  const setResp = (key, val) => setResponses(r => ({ ...r, [key]: val }));
  const toggleIssue = (key) => setIssues(i => ({ ...i, [key]: !i[key] }));

  const submit = async () => {
    setBusy(true);
    try {
      const failedItems = Object.entries(issues).filter(([,v])=>v).map(([k])=>k);
      const payload = {
        company_id:         asset.company_id,
        template_id:        template?.id || null,
        asset:              asset.name,
        operator_name:      operator,
        hrs_start:          parseFloat(hours) || null,
        date:               new Date().toISOString().split('T')[0],
        notes,
        responses,
        defects_found:      failedItems.length > 0,
        operator_signature: null,
        site_area:          asset.location || '',
      };
      const { error: psErr } = await supabase.from('form_submissions').insert([payload]);
      if (psErr) { alert('Submit failed: ' + psErr.message); return; }
      // Update asset hours
      if (hours && parseFloat(hours) > 0) {
        try { await supabase.from('assets').update({ hours: parseFloat(hours) }).eq('id', asset.id); } catch(e) {}
        try {
          await supabase.from('asset_hours_log').insert({
            company_id: asset.company_id, asset_id: asset.id, asset_name: asset.name,
            hours: parseFloat(hours), source: 'prestart', recorded_by: operator,
            notes: 'Prestart via QR scan ' + new Date().toLocaleDateString('en-AU'),
          });
        } catch(e) {}
      }
      if (failedItems.length > 0) {
        try {
          await supabase.from('work_orders').insert([{
            company_id:  asset.company_id,
            asset_id:    asset.id,
            asset:       asset.name,
            title:       `Prestart defects — ${asset.name}`,
            description: 'Items flagged: ' + failedItems.join(', '),
            priority:    'High',
            status:      'open',
            created_at:  new Date().toISOString(),
          }]);
        } catch(e) {}
      }
      setDone(true);
    } catch (err) {
      alert('Submit failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  if (done) return (
    <div className="sp-form-wrap">
      <div className="sp-card">
        <div className="sp-ok">
          <div className="sp-ok-icon">✓</div>
          <div className="sp-ok-msg">Prestart submitted</div>
          <div className="sp-ok-sub">{asset.name} · {new Date().toLocaleDateString('en-AU')}</div>
          <button className="sp-submit" style={{ marginTop:20 }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sp-form-wrap">
      <div className="sp-card">
        <div className="sp-form-head">
          <div className="sp-form-title">Pre<em>start</em> {template?.name && `— ${template.name}`}</div>
          <button className="sp-back" onClick={onClose}>← Back</button>
        </div>
        <div className="sp-asset-tag"><strong>{asset.name}</strong> · {asset.asset_number || ''}</div>

        <div className="sp-fl">
          <label className="sp-lbl">Operator name</label>
          <input className="sp-inp" placeholder="Your full name" value={operator} onChange={e=>setOperator(e.target.value)} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Current hours</label>
          <input className="sp-inp" type="number" placeholder="e.g. 1234" value={hours} onChange={e=>setHours(e.target.value)} />
        </div>

        {sections.length > 0 ? sections.map((sec, si) => (
          <div key={si} className="sp-section">
            <div className="sp-section-title">{sec.title}</div>
            {(sec.items||[]).map((item, ii) => {
              const key = `${si}_${item.label||ii}`;
              const resp = responses[key];
              const isChecked = !!resp;
              const isFail = !!issues[key];
              if ((item.type||'check') === 'check') return (
                <div key={ii} className={`sp-check${isChecked && !isFail ? ' ok' : isFail ? ' fail' : ''}`}
                  onClick={() => setResp(key, isChecked ? undefined : 'ok')}>
                  <input type="checkbox" checked={isChecked} onChange={()=>{}} />
                  <div style={{flex:1}}>
                    <div className="sp-check-label">{item.label}</div>
                    {isChecked && !isFail && <div className="sp-check-status" style={{color:'#4caf50'}}>✓ Satisfactory</div>}
                    {isFail && <div className="sp-check-status" style={{color:'#ef5350'}}>⚠ Issue noted</div>}
                  </div>
                  {isChecked && <button className={`sp-flag-btn${isFail?' active':''}`} onClick={e=>{e.stopPropagation();toggleIssue(key);}}>⚠</button>}
                </div>
              );
              if (item.type === 'number') return (
                <div key={ii} className="sp-fl">
                  <label className="sp-lbl">{item.label}</label>
                  <input className="sp-item-inp" type="number" value={resp||''} onChange={e=>setResp(key,e.target.value)} />
                </div>
              );
              if (item.type === 'text') return (
                <div key={ii} className="sp-fl">
                  <label className="sp-lbl">{item.label}</label>
                  <input className="sp-inp" value={resp||''} onChange={e=>setResp(key,e.target.value)} />
                </div>
              );
              if (item.type === 'photo') return (
                <div key={ii} className="sp-fl">
                  <label className="sp-lbl">{item.label}</label>
                  <div style={{fontSize:12,color:'rgba(221,227,237,0.35)',padding:'8px 0'}}>📷 Photo upload available in app</div>
                </div>
              );
              return null;
            })}
          </div>
        )) : (
          <div style={{color:'rgba(221,227,237,0.4)',fontSize:13,marginBottom:16}}>No checklist items — this template has no sections.</div>
        )}

        <div className="sp-fl">
          <label className="sp-lbl">Notes / defects</label>
          <textarea className="sp-inp" rows={3} placeholder="Any defects or concerns..." value={notes} onChange={e=>setNotes(e.target.value)} style={{resize:'vertical'}} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Operator signature</label>
          <div className={`sp-sig${signed?' done':''}`} onClick={()=>setSigned(true)}>
            {signed ? `Signed — ${operator||'Operator'} · ${new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}` : 'Tap to sign'}
          </div>
        </div>
        <button className="sp-submit" style={{background:accentColor}} onClick={submit}
          disabled={busy||!operator||!hours||!signed}>
          {busy ? 'Submitting…' : 'Submit Prestart'}
        </button>
      </div>
    </div>
  );
}

// ─── Service Sheet Form ────────────────────────────────────────────────────────
function ServiceForm({ asset, company, template, onClose, accentColor }) {
  const [tech,     setTech]     = useState('');
  const [hours,    setHours]    = useState('');
  const [notes,    setNotes]    = useState('');
  const [signed,   setSigned]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);
  const [responses,setResponses]= useState({});
  const [parts,    setParts]    = useState((template?.parts_template||[]).map(p=>({...p,used:false,qty:p.quantity||1})));

  const sections = template?.sections || [];
  const setResp = (key, val) => setResponses(r => ({ ...r, [key]: val }));

  const submit = async () => {
    setBusy(true);
    try {
      const { error: ssErr } = await supabase.from('service_sheet_submissions').insert([{
        company_id:         asset.company_id,
        template_id:        template?.id || null,
        asset:              asset.name,
        asset_id:           asset.id,
        technician:         tech,
        date:               new Date().toISOString().split('T')[0],
        service_type:       template?.service_type || '',
        responses,
        notes,
        parts:              parts.filter(p=>p.used).map(p=>({ name:p.description, qty:p.qty, cost:0, part_id:null })),
        labour:             template?.labour_items?.map(l=>({ description:l.description, hours:l.estimated_hours })) || [],
        total_parts_cost:   0,
        total_labour_hours: (template?.labour_items||[]).reduce((s,l)=>s+(parseFloat(l.estimated_hours)||0),0),
        operator_signature: null,
      }]);
      if (ssErr) { alert('Submit failed: ' + ssErr.message); return; }
      // Update asset hours
      if (hours && parseFloat(hours) > 0) {
        try { await supabase.from('assets').update({ hours: parseFloat(hours) }).eq('id', asset.id); } catch(e) {}
      }
      setDone(true);
    } catch (err) {
      alert('Submit failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  };

  if (done) return (
    <div className="sp-form-wrap">
      <div className="sp-card">
        <div className="sp-ok">
          <div className="sp-ok-icon">✓</div>
          <div className="sp-ok-msg">Service sheet submitted</div>
          <div className="sp-ok-sub">{asset.name} · {template?.service_type}</div>
          <button className="sp-submit" style={{marginTop:20}} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sp-form-wrap">
      <div className="sp-card">
        <div className="sp-form-head">
          <div className="sp-form-title">Service <em>{template?.service_type||'Sheet'}</em></div>
          <button className="sp-back" onClick={onClose}>← Back</button>
        </div>
        <div className="sp-asset-tag"><strong>{asset.name}</strong> · {asset.asset_number||''}</div>

        <div className="sp-fl">
          <label className="sp-lbl">Technician name</label>
          <input className="sp-inp" placeholder="Your name" value={tech} onChange={e=>setTech(e.target.value)} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Hours at service</label>
          <input className="sp-inp" type="number" placeholder="Current hours" value={hours} onChange={e=>setHours(e.target.value)} />
        </div>

        {sections.map((sec, si) => (
          <div key={si} className="sp-section">
            <div className="sp-section-title">{sec.title}</div>
            {(sec.items||[]).map((item, ii) => {
              const key = `${si}_${item.label||ii}`;
              const resp = responses[key];
              if ((item.type||'check') === 'check') return (
                <div key={ii} className={`sp-check${resp==='ok'?' ok':''}`}
                  onClick={() => setResp(key, resp==='ok' ? undefined : 'ok')}>
                  <input type="checkbox" checked={resp==='ok'} onChange={()=>{}} />
                  <div className="sp-check-label">{item.label}</div>
                </div>
              );
              if (item.type==='number') return (
                <div key={ii} className="sp-fl">
                  <label className="sp-lbl">{item.label}</label>
                  <input className="sp-item-inp" type="number" value={resp||''} onChange={e=>setResp(key,e.target.value)} />
                </div>
              );
              if (item.type==='text') return (
                <div key={ii} className="sp-fl">
                  <label className="sp-lbl">{item.label}</label>
                  <input className="sp-inp" value={resp||''} onChange={e=>setResp(key,e.target.value)} />
                </div>
              );
              return null;
            })}
          </div>
        ))}

        {parts.length > 0 && (
          <div className="sp-section">
            <div className="sp-section-title">Parts Used</div>
            <table className="sp-parts">
              <thead><tr><th>Part</th><th>Part No.</th><th>Qty</th><th>Used</th></tr></thead>
              <tbody>
                {parts.map((p,i) => (
                  <tr key={i}>
                    <td>{p.description}</td>
                    <td style={{color:'rgba(221,227,237,0.5)'}}>{p.part_number||'—'}</td>
                    <td><input type="number" className="sp-item-inp" style={{width:56}} value={p.qty} onChange={e=>setParts(ps=>ps.map((x,j)=>j===i?{...x,qty:e.target.value}:x))} /></td>
                    <td><input type="checkbox" checked={!!p.used} onChange={()=>setParts(ps=>ps.map((x,j)=>j===i?{...x,used:!x.used}:x))} style={{width:16,height:16,accentColor:'#1e88e5'}} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="sp-fl">
          <label className="sp-lbl">Notes</label>
          <textarea className="sp-inp" rows={3} placeholder="Service notes..." value={notes} onChange={e=>setNotes(e.target.value)} style={{resize:'vertical'}} />
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Technician signature</label>
          <div className={`sp-sig${signed?' done':''}`} onClick={()=>setSigned(true)}>
            {signed ? `Signed — ${tech||'Technician'} · ${new Date().toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'})}` : 'Tap to sign'}
          </div>
        </div>
        <button className="sp-submit" style={{background:accentColor}} onClick={submit}
          disabled={busy||!tech||!hours||!signed}>
          {busy ? 'Submitting…' : 'Submit Service Sheet'}
        </button>
      </div>
    </div>
  );
}

// ─── Job Card Form ─────────────────────────────────────────────────────────────
function JobCardForm({ asset, company, onClose, accentColor }) {
  const [requester, setRequester] = useState('');
  const [priority,  setPriority]  = useState('Medium');
  const [category,  setCategory]  = useState('Mechanical');
  const [description,setDescription]=useState('');
  const [busy,      setBusy]      = useState(false);
  const [done,      setDone]      = useState(false);

  const submit = async () => {
    if (!requester || !description) return;
    setBusy(true);
    await supabase.from('work_orders').insert([{
      company_id:    asset.company_id,
      asset_id:      asset.id,
      asset_name:    asset.name,
      title:         `${category} — ${asset.name}`,
      description,
      priority,
      category,
      operator_name: requester,
      status:        'open',
      created_at:    new Date().toISOString(),
    }]);
    setBusy(false); setDone(true);
  };

  if (done) return (
    <div className="sp-form-wrap">
      <div className="sp-card">
        <div className="sp-ok">
          <div className="sp-ok-icon">✓</div>
          <div className="sp-ok-msg">Job card submitted</div>
          <div className="sp-ok-sub">{asset.name} · your maintenance team has been notified</div>
          <button className="sp-submit" style={{marginTop:20}} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sp-form-wrap">
      <div className="sp-card">
        <div className="sp-form-head">
          <div className="sp-form-title">Job <em>Card</em></div>
          <button className="sp-back" onClick={onClose}>← Back</button>
        </div>
        <div className="sp-asset-tag"><strong>{asset.name}</strong></div>
        <div className="sp-fl">
          <label className="sp-lbl">Reported by</label>
          <input className="sp-inp" placeholder="Your name" value={requester} onChange={e=>setRequester(e.target.value)} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div>
            <label className="sp-lbl">Priority</label>
            <select className="sp-select" value={priority} onChange={e=>setPriority(e.target.value)}>
              {['Low','Medium','High','Critical'].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="sp-lbl">Category</label>
            <select className="sp-select" value={category} onChange={e=>setCategory(e.target.value)}>
              {['Mechanical','Hydraulic','Electrical','Tyres','Bodywork','Fluids','Operator Defect','Other'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="sp-fl">
          <label className="sp-lbl">Description of fault</label>
          <textarea className="sp-inp" rows={5} placeholder="Describe the issue, location, symptoms..." value={description} onChange={e=>setDescription(e.target.value)} style={{resize:'vertical'}} />
        </div>
        <button className="sp-submit" onClick={submit} disabled={busy||!requester||!description}>
          {busy ? 'Submitting…' : 'Submit Job Card'}
        </button>
      </div>
    </div>
  );
}

// ─── Main ScanPage ─────────────────────────────────────────────────────────────
export default function ScanPage({ assetId, partId }) {
  const [asset,      setAsset]      = useState(null);
  const [company,    setCompany]    = useState(null);
  const [branding,   setBranding]   = useState(null);
  const [prestarts,  setPrestarts]  = useState([]);
  const [services,   setServices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState('menu'); // menu | prestart | service | jobcard
  const [selTemplate,setSelTemplate]= useState(null);

  const id   = assetId || partId;
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
      const numId = /^\d+$/.test(id) ? parseInt(id,10) : id;
      const { data: a } = await supabase.from('assets').select('*').eq('id', numId).single();
      if (!a) { setLoading(false); return; }
      setAsset(a);

      // Load assigned templates
      const [{ data: pt }, { data: st }, { data: co }, { data: br }] = await Promise.all([
        // First try asset-specific templates, fall back to all company templates
        supabase.from('form_templates').select('*').eq('company_id', a.company_id).order('created_at', { ascending: false }),
        supabase.from('service_sheet_templates').select('*').eq('company_id', a.company_id).order('created_at', { ascending: false }),
        supabase.from('companies').select('*').eq('id', a.company_id).single(),
        supabase.from('company_branding').select('*').eq('company_id', a.company_id).maybeSingle(),
      ]);
      // Filter to asset-assigned templates, fall back to all if none assigned to this asset
      const assignedPt = (pt||[]).filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(numId));
      const assignedSt = (st||[]).filter(t => Array.isArray(t.asset_ids) && t.asset_ids.includes(numId));
      setPrestarts(assignedPt.length > 0 ? assignedPt : (pt||[]));
      setServices(assignedSt.length > 0 ? assignedSt : (st||[]));
      setCompany(co || null);
      setBranding(br || null);

      // Auto-open if only one prestart template
      if ((pt||[]).length === 1 && (st||[]).length === 0) {
        setSelTemplate(pt[0]); setView('prestart');
      }
      setLoading(false);
    })();
  }, [id]);

  const accentColor = branding?.primary_color || '#1e88e5';

  if (loading) return (
    <div className="sp" style={{justifyContent:'center'}}>
      <div className="sp-logo">MECH<em>IQ</em></div>
      <div style={{color:'rgba(221,227,237,0.4)',fontSize:13}}>Loading…</div>
    </div>
  );

  if (!asset) return (
    <div className="sp" style={{justifyContent:'center'}}>
      <div className="sp-logo">MECH<em>IQ</em></div>
      <div className="sp-card">
        <div className="sp-err">Asset not found.<br/>This QR code may be unregistered.</div>
      </div>
    </div>
  );

  if (view === 'prestart' && selTemplate) return (
    <div className="sp">
      <div className="sp-logo">MECH<em>IQ</em></div>
      <PrestartForm asset={asset} company={company} template={selTemplate} onClose={()=>{setView('menu');setSelTemplate(null);}} accentColor={accentColor} />
    </div>
  );

  if (view === 'service' && selTemplate) return (
    <div className="sp">
      <div className="sp-logo">MECH<em>IQ</em></div>
      <ServiceForm asset={asset} company={company} template={selTemplate} onClose={()=>{setView('menu');setSelTemplate(null);}} accentColor={accentColor} />
    </div>
  );

  if (view === 'jobcard') return (
    <div className="sp">
      <div className="sp-logo">MECH<em>IQ</em></div>
      <JobCardForm asset={asset} company={company} onClose={()=>setView('menu')} accentColor={accentColor} />
    </div>
  );

  // ── Menu ──
  return (
    <div className="sp">
      <div className="sp-logo">MECH<em>IQ</em></div>
      <div className="sp-card" style={{borderTopColor:accentColor}}>
        {branding?.logo_url && <img src={branding.logo_url} alt={company?.company_name} className="sp-co-logo" />}
        {company && <div className="sp-co-name">{company.company_name}</div>}
        <div className="sp-divider" style={{background:accentColor}} />
        <div className="sp-asset-name">{asset.name}</div>
        <div className="sp-asset-meta">
          {asset.asset_number && <span>{asset.asset_number} · </span>}
          {asset.make && <span>{asset.make} {asset.model||''} · </span>}
          {asset.location && <span>{asset.location}</span>}
        </div>

        {/* Prestart templates */}
        {prestarts.length > 0 && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(221,227,237,0.35)',letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>Prestart Checklists</div>
            {prestarts.map(t => (
              <button key={t.id} className="sp-btn sp-btn-p" style={{background:accentColor}} onClick={()=>{setSelTemplate(t);setView('prestart');}}>
                ✓ {t.name}
                <span className="sp-btn-sub">{(t.sections||[]).length} section{(t.sections||[]).length!==1?'s':''} · Daily inspection</span>
              </button>
            ))}
          </>
        )}

        {/* Service sheet templates */}
        {services.length > 0 && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(221,227,237,0.35)',letterSpacing:1.5,textTransform:'uppercase',marginBottom:8,marginTop:prestarts.length?12:0}}>Service Sheets</div>
            {services.map(t => (
              <button key={t.id} className="sp-btn sp-btn-s" onClick={()=>{setSelTemplate(t);setView('service');}}>
                🔧 {t.name}
                <span className="sp-btn-sub">{t.service_type||'Scheduled service'}</span>
              </button>
            ))}
          </>
        )}

        {/* Fallback if nothing assigned */}
        {prestarts.length === 0 && services.length === 0 && (
          <div style={{textAlign:'center',padding:'10px 0 16px'}}>
            <div style={{fontSize:12,color:'rgba(221,227,237,0.35)',marginBottom:16}}>No forms assigned to this asset yet.</div>
          </div>
        )}

        {/* Job card always available */}
        <div style={{marginTop:8,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button className="sp-btn sp-btn-j" onClick={()=>setView('jobcard')}>
            ⚠ Log Fault / Job Card
            <span className="sp-btn-sub">Report a defect or maintenance request</span>
          </button>
        </div>
      </div>
      <div style={{marginTop:8,fontSize:11,color:'rgba(221,227,237,0.18)'}}>Powered by MECH<span style={{color:accentColor}}>IQ</span></div>
    </div>
  );
}
