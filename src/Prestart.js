import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  .ps-card {
    background: var(--surface);
    border: 1px solid #eaf3fb;
    border-radius: 14px;
    padding: 22px 24px;
    box-shadow: 0 2px 10px rgba(0,100,180,0.07);
    margin-bottom: 16px;
  }
  .ps-input {
    width: 100%; padding: 10px 13px;
    border: 1px solid var(--border); border-radius: 8px;
    font-size: 13px; color: var(--text-primary); background: var(--surface);
    outline: none; box-sizing: border-box; font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ps-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,171,228,0.12); }
  .ps-input::placeholder { color: #b0c4d4; }
  .ps-btn {
    padding: 9px 20px; background: var(--accent); color: #fff; border: none;
    border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: inherit; letter-spacing: 0.4px;
    box-shadow: 0 3px 10px rgba(0,171,228,0.3); transition: all 0.15s;
  }
  .ps-btn:hover { background: #0096cc; transform: translateY(-1px); }
  .ps-btn-ghost {
    padding: 9px 18px; background: var(--surface); color: var(--text-secondary);
    border: 1px solid var(--border); border-radius: 8px; font-size: 12px;
    font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .ps-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .ps-btn-green { background: #16a34a; box-shadow: 0 3px 10px rgba(22,163,74,0.3); }
  .ps-btn-green:hover { background: #15803d; }
  .ps-btn-danger { background: #dc2626; box-shadow: 0 3px 10px rgba(220,38,38,0.2); }
  .ps-btn-danger:hover { background: #b91c1c; }
  .ps-template-card {
    background: var(--surface); border: 1.5px solid #eaf3fb; border-radius: 14px;
    padding: 22px; cursor: pointer; transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0,100,180,0.06);
  }
  .ps-template-card:hover {
    border-color: var(--accent); transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,100,180,0.13);
  }
  .ps-template-new {
    background: var(--surface); border: 2px dashed #d6e6f2; border-radius: 14px;
    padding: 22px; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; min-height: 140px;
  }
  .ps-template-new:hover { border-color: var(--accent); }
  .ps-check-row { transition: background 0.1s; }
  .ps-check-row:hover td { background: #f4f8fd !important; }
  .ps-status-ok     { background: #dcfce7; color: #16a34a; }
  .ps-status-defect { background: #fee2e2; color: #dc2626; }
  .ps-status-na     { background: #f0f5fa; color: var(--text-muted); }
  .ps-status-empty  { background: #f8fbfe; color: #b0c4d4; }
  .ps-history-row { transition: background 0.1s; }
  .ps-history-row:hover td { background: #f4f8fd !important; }
`;

const iStyle = {
  width:'100%', padding:'10px 13px', border:'1.5px solid #d6e6f2', borderRadius:8,
  fontSize:13, color:'var(--text-primary)', background:'var(--surface)', fontFamily:'inherit',
  outline:'none', boxSizing:'border-box', transition:'border-color 0.15s',
};

function SectionHead({ title, sub, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, paddingBottom:13, borderBottom:'1.5px solid #eaf3fb' }}>
      <div>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text-primary)', display:'block' }}>{title}</span>
        {sub && <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'block' }}>{sub}</span>}
      </div>
      {action}
    </div>
  );
}

function Empty({ icon, title, desc, action }) {
  return (
    <div style={{ textAlign:'center', padding:'44px 20px' }}>
      <div style={{ fontSize:36, marginBottom:12, opacity:0.3 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--text-muted)', maxWidth:240, margin:'0 auto 16px', lineHeight:1.65 }}>{desc}</div>
      {action}
    </div>
  );
}

function Sk({ w = '100%', h = '13px', r = '6px' }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:'linear-gradient(90deg,#edf2f8 25%,#f5f8fd 50%,#edf2f8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear' }} />;
}

function Label({ children }) {
  return <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:5 }}>{children}</label>;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function Prestart({ userRole, preloadAsset, preloadAssetId, onClearPreload }) {
  const [templates, setTemplates]     = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assets, setAssets]           = useState([]);
  const [view, setView]               = useState('list');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading]         = useState(true);
  const sigCanvas = useRef(null);
  const [isSigning, setIsSigning]     = useState(false);
  const [signatureData, setSignatureData] = useState('');

  const [form, setForm] = useState({
    asset:'', asset_id:'', operator_name:'', site_area:'',
    hrs_start:'', date:new Date().toISOString().split('T')[0], notes:'', responses:{}
  });
  const [builder, setBuilder] = useState({ name:'', description:'', sections:[] });

  useEffect(() => {
    if (!document.getElementById('prestart-css')) {
      const s = document.createElement('style'); s.id='prestart-css'; s.textContent=CSS; document.head.appendChild(s);
    }
    if (userRole?.company_id) { fetchTemplates(); fetchSubmissions(); fetchAssets(); }
  }, [userRole]);

  useEffect(() => { if (preloadAsset) setForm(prev => ({...prev, asset:preloadAsset})); }, [preloadAsset]);

  useEffect(() => {
    if (preloadAssetId && assets.length > 0) {
      const found = assets.find(a => a.id === preloadAssetId);
      if (found) {
        setForm(prev => ({ ...prev, asset:found.name, asset_id:found.id, site_area:found.location||'', operator_name:userRole?.name||'', date:new Date().toISOString().split('T')[0] }));
        if (templates.length === 1) { setSelectedTemplate(templates[0]); setView('fill'); }
        else if (templates.length > 1) { setView('select-template'); }
      }
    }
  }, [preloadAssetId, assets, templates]);

  const fetchTemplates   = async () => { const { data } = await supabase.from('form_templates').select('*').eq('company_id', userRole.company_id).order('created_at',{ascending:false}); setTemplates(data||[]); setLoading(false); };
  const fetchSubmissions = async () => { const { data } = await supabase.from('form_submissions').select('*').eq('company_id', userRole.company_id).order('created_at',{ascending:false}); setSubmissions(data||[]); };
  const fetchAssets      = async () => { const { data } = await supabase.from('assets').select('id, name, location').eq('company_id', userRole.company_id); setAssets(data||[]); };

  const seedExcavatorTemplate = async () => {
    const template = {
      company_id: userRole.company_id, name:'Excavator Prestart Checklist', description:'Daily prestart inspection for excavators',
      sections: [
        { title:'Fluid Levels', items:['No fluid leaks','Engine oil level','Radiator level','Slew motor oil level','Hydraulic oil','Fuel level'] },
        { title:'Inspection List', items:['Bucket teeth / pin wear','Grease lines / grease points lubricated','Tracks / chains / shoe wear','First aid kit','Track tension','Hydraulic hoses (check for rubbing)','Hydraulic rams checked','Hand rails/door handles','Radiator','Radiator hoses','Battery condition','Gauges working correctly','Mirrors','Lights','Horn and reverse alarm','Window / wipers','Seat / seat belts','Air conditioning','Fire extinguisher','Controls working correctly','Quick hitch working correctly'] },
      ]
    };
    const { error } = await supabase.from('form_templates').insert([template]);
    if (!error) fetchTemplates();
  };

  const handleResponse = (si, item, field, value) => {
    const key = `${si}_${item}`;
    setForm(prev => ({...prev, responses:{...prev.responses, [key]:{...prev.responses[key], [field]:value}}}));
  };

  const startSigning = () => {
    setIsSigning(true);
    setTimeout(() => {
      const canvas = sigCanvas.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'var(--accent)'; ctx.lineWidth = 2;
      let drawing = false;
      canvas.onmousedown = e => { drawing=true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY); };
      canvas.onmousemove = e => { if(drawing){ctx.lineTo(e.offsetX,e.offsetY);ctx.stroke();} };
      canvas.onmouseup   = () => { drawing=false; setSignatureData(canvas.toDataURL()); };
      canvas.ontouchstart = e => { drawing=true; const t=e.touches[0],r=canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(t.clientX-r.left,t.clientY-r.top); e.preventDefault(); };
      canvas.ontouchmove  = e => { if(drawing){const t=e.touches[0],r=canvas.getBoundingClientRect(); ctx.lineTo(t.clientX-r.left,t.clientY-r.top); ctx.stroke();} e.preventDefault(); };
      canvas.ontouchend   = () => { drawing=false; setSignatureData(canvas.toDataURL()); };
    }, 100);
  };

  const clearSignature = () => {
    const canvas = sigCanvas.current;
    if (canvas) canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    setSignatureData('');
  };

  const handleSubmit = async () => {
    if (!form.asset || !form.operator_name) { alert('Please select an asset and enter operator name'); return; }
    const defects_found = Object.values(form.responses).some(r => r.status === 'Defect');
    const { data: submission, error } = await supabase.from('form_submissions').insert([{
      company_id:userRole.company_id, template_id:selectedTemplate.id,
      asset:form.asset, operator_name:form.operator_name, site_area:form.site_area,
      hrs_start:form.hrs_start, date:form.date, notes:form.notes,
      responses:form.responses, operator_signature:signatureData, defects_found
    }]).select().single();
    if (error) { alert('Error: '+error.message); return; }
    if (defects_found && submission) {
      const defectItems = [];
      selectedTemplate.sections.forEach((section, si) => {
        section.items.forEach(item => { const key=`${si}_${item}`; const resp=form.responses[key]; if(resp?.status==='Defect') defectItems.push(`${item}${resp.comment?': '+resp.comment:''}`); });
      });
      if (defectItems.length > 0) {
        await supabase.from('work_orders').insert([{ company_id:userRole.company_id, asset:form.asset, defect_description:defectItems.join('\n'), priority:'High', status:'Open', source:'prestart', prestart_id:submission.id, comments:`Auto-generated from prestart by ${form.operator_name} on ${form.date}` }]);
      }
    }
    fetchSubmissions();
    setView('list');
    setForm({ asset:'', asset_id:'', operator_name:'', site_area:'', hrs_start:'', date:new Date().toISOString().split('T')[0], notes:'', responses:{} });
    setSignatureData('');
    if (onClearPreload) onClearPreload();
    if (defects_found) alert('Prestart submitted. Defects found — a Work Order has been automatically created!');
    else alert('Prestart submitted successfully!');
  };

  const exportPDF = (submission) => {
    const doc = new jsPDF();
    doc.setFillColor(13,21,21); doc.rect(0,0,210,297,'F');
    doc.setTextColor(0,194,224); doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.text('MECH IQ — PRESTART CHECKLIST',14,20);
    doc.setTextColor(160,176,176); doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text(`Asset: ${submission.asset}   Operator: ${submission.operator_name}   Date: ${submission.date}`,14,30);
    doc.text(`Site: ${submission.site_area||'-'}   Hrs Start: ${submission.hrs_start||'-'}`,14,36);
    const template = templates.find(t => t.id===submission.template_id);
    let y = 45;
    if (template) {
      template.sections.forEach(section => {
        doc.setTextColor(0,194,224); doc.setFontSize(11); doc.setFont('helvetica','bold');
        doc.text(section.title.toUpperCase(),14,y); y+=6;
        const rows = section.items.map(item => { const key=`${template.sections.indexOf(section)}_${item}`; const r=submission.responses[key]||{}; return[item,r.status||'-',r.comment||'']; });
        autoTable(doc,{startY:y,head:[['Item','Status','Comment']],body:rows,theme:'plain',headStyles:{fillColor:[26,47,47],textColor:[160,176,176],fontSize:8},bodyStyles:{fillColor:[13,21,21],textColor:[255,255,255],fontSize:8},styles:{lineColor:[26,47,47],lineWidth:0.1}});
        y=doc.lastAutoTable.finalY+8;
      });
    }
    if (submission.notes) { doc.setTextColor(255,255,255); doc.setFontSize(9); doc.text('Notes: '+submission.notes,14,y); y+=10; }
    if (submission.operator_signature) { doc.text('Operator Signature:',14,y); doc.addImage(submission.operator_signature,'PNG',14,y+2,60,20); }
    doc.save(`MechIQ-Prestart-${submission.asset}-${submission.date}.pdf`);
  };

  const saveTemplate = async () => {
    if (!builder.name || builder.sections.length===0) { alert('Please add a name and at least one section'); return; }
    const { error } = await supabase.from('form_templates').insert([{...builder, company_id:userRole.company_id}]);
    if (!error) { fetchTemplates(); setView('list'); setBuilder({name:'',description:'',sections:[]}); }
  };

  const addSection    = () => setBuilder(prev => ({...prev, sections:[...prev.sections, {title:'',items:['']}]}));
  const addItem       = si => setBuilder(prev => { const s=[...prev.sections]; s[si].items.push(''); return{...prev,sections:s}; });
  const updateSection = (si,val) => setBuilder(prev => { const s=[...prev.sections]; s[si].title=val; return{...prev,sections:s}; });
  const updateItem    = (si,ii,val) => setBuilder(prev => { const s=[...prev.sections]; s[si].items[ii]=val; return{...prev,sections:s}; });
  const removeItem    = (si,ii) => setBuilder(prev => { const s=[...prev.sections]; s[si].items.splice(ii,1); return{...prev,sections:s}; });
  const removeSection = si => setBuilder(prev => { const s=[...prev.sections]; s.splice(si,1); return{...prev,sections:s}; });

  const goBack = () => { setView('list'); if (onClearPreload) onClearPreload(); };

  // ── Loading ──
  if (loading) return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginTop:8 }}>
        {[0,1,2].map(i => <div key={i} className="ps-card"><Sk w="60%" h="14px" /><div style={{marginTop:8}}><Sk w="40%" h="11px" /></div><div style={{marginTop:16}}><Sk w="100%" h="32px" r="8px" /></div></div>)}
      </div>
    </div>
  );

  // ── Select template ──
  if (view === 'select-template') return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0 }}>Select Checklist</h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0' }}>Asset: <strong style={{ color:'var(--accent)' }}>{form.asset}</strong></p>
        </div>
        <button className="ps-btn-ghost" onClick={goBack}>← Back</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {templates.map(t => (
          <div key={t.id} className="ps-template-card" onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>{t.name}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, lineHeight:1.5 }}>{t.description}</div>
            <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:16 }}>{t.sections?.length||0} sections · {t.sections?.reduce((s,sec)=>s+sec.items.length,0)||0} items</div>
            <button className="ps-btn" style={{ width:'100%' }}>Start Prestart →</button>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Fill form ──
  if (view === 'fill' && selectedTemplate) {
    const totalItems   = selectedTemplate.sections.reduce((s,sec)=>s+sec.items.length,0);
    const answered     = Object.keys(form.responses).length;
    const defectCount  = Object.values(form.responses).filter(r=>r.status==='Defect').length;
    const pct          = totalItems > 0 ? Math.round((answered/totalItems)*100) : 0;

    return (
      <div style={{ animation:'fadeUp 0.4s ease both' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20 }}>
          <div>
            <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0 }}>{selectedTemplate.name}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0' }}>{answered}/{totalItems} items answered · {defectCount > 0 ? <span style={{ color:'var(--red)', fontWeight:700 }}>{defectCount} defects found</span> : 'no defects'}</p>
          </div>
          <button className="ps-btn-ghost" onClick={goBack}>← Back</button>
        </div>

        {/* Progress */}
        <div style={{ height:5, background:'var(--surface-2)', borderRadius:99, marginBottom:20, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background:defectCount>0?'var(--red)':'var(--accent)', width:`${pct}%`, transition:'width 0.4s ease' }} />
        </div>

        {/* Details */}
        <div className="ps-card">
          <SectionHead title="Prestart Details" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div><Label>Asset</Label>
              <select style={iStyle} value={form.asset} onChange={e => setForm({...form, asset:e.target.value})}>
                <option value="">Select Asset</option>
                {assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div><Label>Operator Name</Label>
              <input style={iStyle} placeholder="Operator Name" value={form.operator_name} onChange={e => setForm({...form, operator_name:e.target.value})} />
            </div>
            <div><Label>Site / Location</Label>
              <input style={iStyle} placeholder="Site area" value={form.site_area} onChange={e => setForm({...form, site_area:e.target.value})} />
            </div>
            <div><Label>Hours Start</Label>
              <input style={iStyle} type="number" placeholder="e.g. 1250" value={form.hrs_start} onChange={e => setForm({...form, hrs_start:e.target.value})} />
            </div>
            <div><Label>Date</Label>
              <input style={iStyle} type="date" value={form.date} onChange={e => setForm({...form, date:e.target.value})} />
            </div>
          </div>
        </div>

        {/* Checklist sections */}
        {selectedTemplate.sections.map((section, si) => (
          <div key={si} className="ps-card">
            <SectionHead title={section.title} sub={`${section.items.length} items`} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #eaf3fb' }}>
                    {['Inspection Item','Status','Comment'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'0 12px 11px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item, ii) => {
                    const key  = `${si}_${item}`;
                    const resp = form.responses[key] || {};
                    const statusClass = resp.status==='OK' ? 'ps-status-ok' : resp.status==='Defect' ? 'ps-status-defect' : resp.status==='NA' ? 'ps-status-na' : 'ps-status-empty';
                    return (
                      <tr key={ii} className="ps-check-row" style={{ borderBottom:'1px solid #eaf3fb' }}>
                        <td style={{ padding:'10px 12px 10px 0', fontSize:13, color:'var(--text-primary)', fontWeight:500 }}>{item}</td>
                        <td style={{ padding:'10px 12px 10px 0', width:130 }}>
                          <select className={`ps-input ${statusClass}`} style={{ fontWeight:700 }} value={resp.status||''} onChange={e => handleResponse(si, item, 'status', e.target.value)}>
                            <option value="">— Select —</option>
                            <option value="OK">✓ OK</option>
                            <option value="Defect">✗ Defect</option>
                            <option value="NA">N/A</option>
                          </select>
                        </td>
                        <td style={{ padding:'10px 0' }}>
                          <input className="ps-input" placeholder="Comment (optional)" value={resp.comment||''} onChange={e => handleResponse(si, item, 'comment', e.target.value)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Notes + Signature */}
        <div className="ps-card">
          <SectionHead title="Notes & Signature" />
          <div style={{ marginBottom:16 }}>
            <Label>Additional Notes</Label>
            <textarea style={{ ...iStyle, minHeight:80, resize:'vertical' }} placeholder="Any general defects or additional notes…" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} />
          </div>
          <div>
            <Label>Operator Signature</Label>
            {!isSigning ? (
              <button className="ps-btn" onClick={startSigning}>Sign Here</button>
            ) : (
              <div>
                <canvas ref={sigCanvas} width={420} height={100} style={{ border:'1.5px solid #d6e6f2', borderRadius:8, background:'#f8fbfe', cursor:'crosshair', display:'block' }} />
                <button onClick={clearSignature} className="ps-btn-ghost" style={{ marginTop:8, padding:'6px 14px', fontSize:11 }}>Clear Signature</button>
                {signatureData && <span style={{ marginLeft:10, fontSize:11, color:'var(--green)', fontWeight:700 }}>✓ Signed</span>}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button className="ps-btn ps-btn-green" style={{ width:'100%', padding:'14px', fontSize:14, marginBottom:20 }} onClick={handleSubmit}>
          Submit Prestart Checklist
        </button>
      </div>
    );
  }

  // ── Builder ──
  if (view === 'builder') return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0 }}>Form Builder</h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0' }}>Create a reusable checklist template</p>
        </div>
        <button className="ps-btn-ghost" onClick={() => setView('list')}>← Back</button>
      </div>

      <div className="ps-card">
        <SectionHead title="Template Details" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div><Label>Template Name</Label><input style={iStyle} placeholder="e.g. Truck Prestart Checklist" value={builder.name} onChange={e => setBuilder({...builder,name:e.target.value})} /></div>
          <div><Label>Description</Label><input style={iStyle} placeholder="Brief description (optional)" value={builder.description} onChange={e => setBuilder({...builder,description:e.target.value})} /></div>
        </div>
      </div>

      {builder.sections.map((section, si) => (
        <div key={si} className="ps-card">
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
            <input style={{ ...iStyle, flex:1 }} placeholder="Section Title" value={section.title} onChange={e => updateSection(si,e.target.value)} />
            <button onClick={() => removeSection(si)} style={{ padding:'8px 13px', background:'var(--surface)', color:'var(--red)', border:'1.5px solid #fecaca', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Remove</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
            {section.items.map((item, ii) => (
              <div key={ii} style={{ display:'flex', gap:8 }}>
                <input style={{ ...iStyle, flex:1 }} placeholder={`Item ${ii+1}`} value={item} onChange={e => updateItem(si,ii,e.target.value)} />
                <button onClick={() => removeItem(si,ii)} style={{ padding:'8px 12px', background:'var(--surface)', color:'var(--text-muted)', border:'1.5px solid #d6e6f2', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => addItem(si)} style={{ padding:'7px 16px', background:'transparent', color:'var(--accent)', border:'1.5px dashed var(--accent)', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>+ Add Item</button>
        </div>
      ))}

      <button onClick={addSection} style={{ width:'100%', padding:'12px', background:'transparent', color:'var(--accent)', border:'2px dashed #d6e6f2', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:14 }}>+ Add Section</button>
      <button className="ps-btn" style={{ width:'100%', padding:'13px', fontSize:13 }} onClick={saveTemplate}>Save Template</button>
    </div>
  );

  // ── History ──
  if (view === 'history') return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0 }}>Prestart History</h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0' }}>{submissions.length} total submission{submissions.length!==1?'s':''}</p>
        </div>
        <button className="ps-btn-ghost" onClick={() => setView('list')}>← Back</button>
      </div>

      <div className="ps-card" style={{ marginBottom:0 }}>
        {submissions.length === 0 ? (
          <Empty icon="📋" title="No submissions yet" desc="Completed prestarts will appear here." />
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #eaf3fb' }}>
                  {['Date','Asset','Operator','Site','Hrs Start','Result',''].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'0 12px 11px 0', fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:'1.2px', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s,i) => (
                  <tr key={s.id} className="ps-history-row" style={{ borderBottom:'1px solid #eaf3fb', opacity:0, animation:`fadeUp 0.3s ease ${i*35}ms forwards` }}>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:13, color:'var(--text-primary)', fontWeight:600, whiteSpace:'nowrap' }}>{s.date}</td>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{s.asset}</td>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:13, color:'var(--text-secondary)' }}>{s.operator_name}</td>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:12, color:'var(--text-muted)' }}>{s.site_area||'—'}</td>
                    <td style={{ padding:'11px 12px 11px 0', fontSize:12, color:'var(--text-muted)' }}>{s.hrs_start||'—'}</td>
                    <td style={{ padding:'11px 12px 11px 0' }}>
                      {s.defects_found ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--red-bg)', color:'var(--red)', fontSize:11, fontWeight:700 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)' }} />Defects
                        </span>
                      ) : (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:'var(--green-bg)', color:'var(--green)', fontSize:11, fontWeight:700 }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)' }} />Clear
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'11px 0' }}>
                      <button className="ps-btn" style={{ padding:'5px 13px', fontSize:11, boxShadow:'none' }} onClick={() => exportPDF(s)}>PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── Main list ──
  return (
    <div style={{ animation:'fadeUp 0.4s ease both' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:'var(--text-primary)', letterSpacing:'1px', textTransform:'uppercase', margin:0 }}>Prestarts & Checklists</h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'5px 0 0' }}>{templates.length} template{templates.length!==1?'s':''} · {submissions.length} submission{submissions.length!==1?'s':''}</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="ps-btn-ghost" onClick={() => setView('history')}>View History</button>
          {userRole?.role !== 'technician' && <button className="ps-btn" onClick={() => setView('builder')}>+ Build Form</button>}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Templates',  value:templates.length,                                  color:'var(--accent)', bg:'#e0f4ff' },
          { label:'Submissions',value:submissions.length,                                 color:'var(--purple)', bg:'var(--purple-bg)' },
          { label:'Defects Found',value:submissions.filter(s=>s.defects_found).length,  color:'var(--red)', bg:'var(--red-bg)' },
        ].map((s,i) => (
          <div key={s.label} className="ps-card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14, marginBottom:0, opacity:0, animation:`fadeUp 0.4s ease ${i*60}ms forwards` }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800, color:s.color, background:s.bg, padding:'2px 12px', borderRadius:8, lineHeight:1.3 }}>{s.value}</span>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Templates */}
      {templates.length === 0 ? (
        <div className="ps-card" style={{ textAlign:'center', padding:'48px 20px' }}>
          <Empty
            icon="📋"
            title="No form templates yet"
            desc="Create your first checklist template or load the default excavator template."
            action={userRole?.role !== 'technician' && (
              <button className="ps-btn" onClick={seedExcavatorTemplate}>+ Load Excavator Template</button>
            )}
          />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {templates.map((t,i) => (
            <div key={t.id} className="ps-template-card" style={{ opacity:0, animation:`fadeUp 0.4s ease ${i*60}ms forwards` }} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, color:'var(--text-primary)', marginBottom:6 }}>{t.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>{t.description}</div>
              <div style={{ fontSize:11, color:'var(--text-faint)', marginBottom:16 }}>
                {t.sections?.length||0} sections · {t.sections?.reduce((s,sec)=>s+sec.items.length,0)||0} items
              </div>
              <button className="ps-btn" style={{ width:'100%' }} onClick={e => { e.stopPropagation(); setSelectedTemplate(t); setView('fill'); }}>Start Prestart →</button>
            </div>
          ))}
          {userRole?.role !== 'technician' && (
            <div className="ps-template-new" onClick={() => setView('builder')}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8, opacity:0.3 }}>+</div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)' }}>Create New Form</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Prestart;
