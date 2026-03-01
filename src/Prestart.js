import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function Prestart({ userRole }) {
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [view, setView] = useState('list'); // list | fill | builder | history
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const sigCanvas = useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState('');

  const [form, setForm] = useState({
    asset: '', operator_name: '', site_area: '', hrs_start: '', date: new Date().toISOString().split('T')[0], notes: '', responses: {}
  });

  // Builder state
  const [builder, setBuilder] = useState({ name: '', description: '', sections: [] });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchTemplates();
      fetchSubmissions();
      fetchAssets();
    }
  }, [userRole]);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('form_templates').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase.from('form_submissions').select('*').eq('company_id', userRole.company_id).order('created_at', { ascending: false });
    setSubmissions(data || []);
  };

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('name').eq('company_id', userRole.company_id);
    setAssets(data || []);
  };

  const seedExcavatorTemplate = async () => {
    const template = {
      company_id: userRole.company_id,
      name: 'Excavator Prestart Checklist',
      description: 'Daily prestart inspection for excavators',
      sections: [
        {
          title: 'Fluid Levels',
          items: ['No fluid leaks', 'Engine oil level', 'Radiator level', 'Slew motor oil level', 'Hydraulic oil', 'Fuel level']
        },
        {
          title: 'Inspection List',
          items: ['Bucket teeth / pin wear', 'Grease lines / grease points lubricated', 'Tracks / chains / shoe wear', 'First aid kit', 'Track tension', 'Hydraulic hoses (check for rubbing)', 'Hydraulic rams checked', 'Hand rails/door handles', 'Radiator', 'Radiator hoses', 'Battery condition', 'Gauges working correctly', 'Mirrors', 'Lights', 'Horn and reverse alarm', 'Window / wipers', 'Seat / seat belts', 'Air conditioning', 'Fire extinguisher', 'Controls working correctly', 'Quick hitch working correctly']
        }
      ]
    };
    const { error } = await supabase.from('form_templates').insert([template]);
    if (!error) fetchTemplates();
  };

  const handleResponse = (sectionIdx, item, field, value) => {
    const key = `${sectionIdx}_${item}`;
    setForm(prev => ({
      ...prev,
      responses: { ...prev.responses, [key]: { ...prev.responses[key], [field]: value } }
    }));
  };

  const startSigning = () => {
    setIsSigning(true);
    setTimeout(() => {
      const canvas = sigCanvas.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#00c2e0';
      ctx.lineWidth = 2;
      let drawing = false;
      canvas.onmousedown = (e) => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
      canvas.onmousemove = (e) => { if (drawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
      canvas.onmouseup = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
      canvas.ontouchstart = (e) => { drawing = true; const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(t.clientX - r.left, t.clientY - r.top); e.preventDefault(); };
      canvas.ontouchmove = (e) => { if (drawing) { const t = e.touches[0]; const r = canvas.getBoundingClientRect(); ctx.lineTo(t.clientX - r.left, t.clientY - r.top); ctx.stroke(); } e.preventDefault(); };
      canvas.ontouchend = () => { drawing = false; setSignatureData(canvas.toDataURL()); };
    }, 100);
  };

  const clearSignature = () => {
    const canvas = sigCanvas.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleSubmit = async () => {
  if (!form.asset || !form.operator_name) { alert('Please select an asset and enter operator name'); return; }
  const defects_found = Object.values(form.responses).some(r => r.status === 'Defect');
  const { data: submission, error } = await supabase.from('form_submissions').insert([{
    company_id: userRole.company_id,
    template_id: selectedTemplate.id,
    asset: form.asset,
    operator_name: form.operator_name,
    site_area: form.site_area,
    hrs_start: form.hrs_start,
    date: form.date,
    notes: form.notes,
    responses: form.responses,
    operator_signature: signatureData,
    defects_found
  }]).select().single();
  if (error) { alert('Error: ' + error.message); return; }

  // Auto-create work orders for each defect found
  if (defects_found && submission) {
    const defectItems = [];
    selectedTemplate.sections.forEach((section, si) => {
      section.items.forEach(item => {
        const key = `${si}_${item}`;
        const resp = form.responses[key];
        if (resp?.status === 'Defect') {
          defectItems.push(`${item}${resp.comment ? ': ' + resp.comment : ''}`);
        }
      });
    });
    if (defectItems.length > 0) {
      await supabase.from('work_orders').insert([{
        company_id: userRole.company_id,
        asset: form.asset,
        defect_description: defectItems.join('\n'),
        priority: 'High',
        status: 'Open',
        source: 'prestart',
        prestart_id: submission.id,
        comments: `Auto-generated from prestart by ${form.operator_name} on ${form.date}`
      }]);
    }
  }

  fetchSubmissions();
  setView('list');
  setForm({ asset: '', operator_name: '', site_area: '', hrs_start: '', date: new Date().toISOString().split('T')[0], notes: '', responses: {} });
  setSignatureData('');
  if (defects_found) {
    alert('Prestart submitted. ⚠️ Defects found — a Work Order has been automatically created!');
  } else {
    alert('Prestart submitted successfully! ✓');
  }
};

  const exportPDF = (submission) => {
    const doc = new jsPDF();
    doc.setFillColor(13, 21, 21); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 194, 224); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('PRESTART CHECKLIST', 14, 20);
    doc.setTextColor(160, 176, 176); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Asset: ${submission.asset}   Operator: ${submission.operator_name}   Date: ${submission.date}`, 14, 30);
    doc.text(`Site: ${submission.site_area || '-'}   Hrs Start: ${submission.hrs_start || '-'}`, 14, 36);
    const template = templates.find(t => t.id === submission.template_id);
    let y = 45;
    if (template) {
      template.sections.forEach(section => {
        doc.setTextColor(0, 194, 224); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(section.title.toUpperCase(), 14, y); y += 6;
        const rows = section.items.map(item => {
          const key = `${template.sections.indexOf(section)}_${item}`;
          const r = submission.responses[key] || {};
          return [item, r.status || '-', r.comment || ''];
        });
        autoTable(doc, { startY: y, head: [['Item', 'Status', 'Comment']], body: rows, theme: 'plain', headStyles: { fillColor: [26, 47, 47], textColor: [160, 176, 176], fontSize: 8 }, bodyStyles: { fillColor: [13, 21, 21], textColor: [255, 255, 255], fontSize: 8 }, styles: { lineColor: [26, 47, 47], lineWidth: 0.1 } });
        y = doc.lastAutoTable.finalY + 8;
      });
    }
    if (submission.notes) { doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text('Notes: ' + submission.notes, 14, y); y += 10; }
    if (submission.operator_signature) { doc.text('Operator Signature:', 14, y); doc.addImage(submission.operator_signature, 'PNG', 14, y + 2, 60, 20); }
    doc.save(`Prestart-${submission.asset}-${submission.date}.pdf`);
  };

  const saveTemplate = async () => {
    if (!builder.name || builder.sections.length === 0) { alert('Please add a name and at least one section'); return; }
    const { error } = await supabase.from('form_templates').insert([{ ...builder, company_id: userRole.company_id }]);
    if (!error) { fetchTemplates(); setView('list'); setBuilder({ name: '', description: '', sections: [] }); }
  };

  const addSection = () => setBuilder(prev => ({ ...prev, sections: [...prev.sections, { title: '', items: [''] }] }));
  const addItem = (si) => setBuilder(prev => { const s = [...prev.sections]; s[si].items.push(''); return { ...prev, sections: s }; });
  const updateSection = (si, val) => setBuilder(prev => { const s = [...prev.sections]; s[si].title = val; return { ...prev, sections: s }; });
  const updateItem = (si, ii, val) => setBuilder(prev => { const s = [...prev.sections]; s[si].items[ii] = val; return { ...prev, sections: s }; });
  const removeItem = (si, ii) => setBuilder(prev => { const s = [...prev.sections]; s[si].items.splice(ii, 1); return { ...prev, sections: s }; });
  const removeSection = (si) => setBuilder(prev => { const s = [...prev.sections]; s.splice(si, 1); return { ...prev, sections: s }; });

  if (loading) return <p style={{color:'#a0b0b0', padding:'20px'}}>Loading...</p>;

  // FILL FORM VIEW
  if (view === 'fill' && selectedTemplate) return (
    <div className="prestart">
      <div className="page-header">
        <h2>{selectedTemplate.name}</h2>
        <button className="btn-primary" onClick={() => setView('list')}>← Back</button>
      </div>
      <div className="form-card">
        <div className="form-grid">
          <select value={form.asset} onChange={e => setForm({...form, asset: e.target.value})}>
            <option value="">Select Asset</option>
            {assets.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>
          <input placeholder="Operator Name" value={form.operator_name} onChange={e => setForm({...form, operator_name: e.target.value})} />
          <input placeholder="Site Area" value={form.site_area} onChange={e => setForm({...form, site_area: e.target.value})} />
          <input type="number" placeholder="Hours Start" value={form.hrs_start} onChange={e => setForm({...form, hrs_start: e.target.value})} />
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
        </div>
      </div>
      {selectedTemplate.sections.map((section, si) => (
        <div key={si} className="form-card" style={{marginTop:'15px'}}>
          <h3 style={{color:'#00c2e0', marginBottom:'15px'}}>{section.title}</h3>
          <table className="data-table">
            <thead><tr><th>Item</th><th>Status</th><th>Comment</th></tr></thead>
            <tbody>
              {section.items.map((item, ii) => {
                const key = `${si}_${item}`;
                const resp = form.responses[key] || {};
                return (
                  <tr key={ii}>
                    <td>{item}</td>
                    <td>
                      <select value={resp.status || ''} onChange={e => handleResponse(si, item, 'status', e.target.value)}
                        style={{backgroundColor: resp.status === 'OK' ? '#0a2a1a' : resp.status === 'Defect' ? '#2a0a0a' : '#0a0f0f', color: resp.status === 'OK' ? '#00c264' : resp.status === 'Defect' ? '#e94560' : 'white', border:'1px solid #1a2f2f', padding:'5px 10px', borderRadius:'4px'}}>
                        <option value="">Select</option>
                        <option value="OK">✓ OK</option>
                        <option value="Defect">✗ Defect</option>
                        <option value="NA">N/A</option>
                      </select>
                    </td>
                    <td><input placeholder="Comment..." value={resp.comment || ''} onChange={e => handleResponse(si, item, 'comment', e.target.value)} style={{backgroundColor:'#0a0f0f', color:'white', border:'1px solid #1a2f2f', padding:'5px 10px', borderRadius:'4px', width:'100%'}} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div className="form-card" style={{marginTop:'15px'}}>
        <h3 style={{marginBottom:'10px'}}>Comments / Additional Notes</h3>
        <textarea placeholder="Any general defects or notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
          style={{width:'100%', padding:'10px', borderRadius:'4px', border:'1px solid #1a2f2f', backgroundColor:'#0a0f0f', color:'white', minHeight:'80px', fontFamily:'Barlow, sans-serif', fontSize:'14px', marginBottom:'15px'}} />
        <h3 style={{marginBottom:'10px'}}>Operator Signature</h3>
        {!isSigning ? (
          <button className="btn-primary" onClick={startSigning}>Sign Here</button>
        ) : (
          <div>
            <canvas ref={sigCanvas} width={400} height={100} style={{border:'1px solid #1a2f2f', borderRadius:'4px', backgroundColor:'#0a0f0f', cursor:'crosshair', display:'block'}} />
            <button onClick={clearSignature} style={{marginTop:'8px', backgroundColor:'transparent', color:'#a0b0b0', border:'1px solid #1a2f2f', padding:'5px 12px', borderRadius:'4px', cursor:'pointer'}}>Clear</button>
          </div>
        )}
      </div>
      <button className="btn-primary" style={{marginTop:'20px', width:'100%', padding:'15px', fontSize:'16px'}} onClick={handleSubmit}>Submit Prestart</button>
    </div>
  );

  // BUILDER VIEW
  if (view === 'builder') return (
    <div className="prestart">
      <div className="page-header">
        <h2>Form Builder</h2>
        <button className="btn-primary" onClick={() => setView('list')}>← Back</button>
      </div>
      <div className="form-card">
        <input placeholder="Form Name (e.g. Truck Prestart)" value={builder.name} onChange={e => setBuilder({...builder, name: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'10px', backgroundColor:'#0a0f0f', color:'white', border:'1px solid #1a2f2f', borderRadius:'4px'}} />
        <input placeholder="Description (optional)" value={builder.description} onChange={e => setBuilder({...builder, description: e.target.value})} style={{width:'100%', padding:'10px', backgroundColor:'#0a0f0f', color:'white', border:'1px solid #1a2f2f', borderRadius:'4px'}} />
      </div>
      {builder.sections.map((section, si) => (
        <div key={si} className="form-card" style={{marginTop:'15px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <input placeholder="Section Title" value={section.title} onChange={e => updateSection(si, e.target.value)}
              style={{flex:1, marginRight:'10px', padding:'8px', backgroundColor:'#0a0f0f', color:'white', border:'1px solid #1a2f2f', borderRadius:'4px'}} />
            <button onClick={() => removeSection(si)} className="btn-delete">Remove Section</button>
          </div>
          {section.items.map((item, ii) => (
            <div key={ii} style={{display:'flex', gap:'10px', marginBottom:'8px'}}>
              <input placeholder={`Item ${ii + 1}`} value={item} onChange={e => updateItem(si, ii, e.target.value)}
                style={{flex:1, padding:'8px', backgroundColor:'#0a0f0f', color:'white', border:'1px solid #1a2f2f', borderRadius:'4px'}} />
              <button onClick={() => removeItem(si, ii)} className="btn-delete">✕</button>
            </div>
          ))}
          <button onClick={() => addItem(si)} style={{backgroundColor:'transparent', color:'#00c2e0', border:'1px dashed #00c2e0', padding:'6px 14px', borderRadius:'4px', cursor:'pointer', marginTop:'5px'}}>+ Add Item</button>
        </div>
      ))}
      <button onClick={addSection} style={{marginTop:'15px', backgroundColor:'transparent', color:'#00c2e0', border:'1px dashed #00c2e0', padding:'10px 20px', borderRadius:'4px', cursor:'pointer', width:'100%'}}>+ Add Section</button>
      <button className="btn-primary" style={{marginTop:'15px', width:'100%', padding:'14px'}} onClick={saveTemplate}>Save Form Template</button>
    </div>
  );

  // HISTORY VIEW
  if (view === 'history') return (
    <div className="prestart">
      <div className="page-header">
        <h2>Prestart History</h2>
        <button className="btn-primary" onClick={() => setView('list')}>← Back</button>
      </div>
      {submissions.length === 0 ? <p style={{color:'#a0b0b0'}}>No submissions yet</p> : (
        <table className="data-table">
          <thead><tr><th>Date</th><th>Asset</th><th>Operator</th><th>Site</th><th>Defects</th><th>Action</th></tr></thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.asset}</td>
                <td>{s.operator_name}</td>
                <td>{s.site_area || '-'}</td>
                <td><span style={{color: s.defects_found ? '#e94560' : '#00c264'}}>{s.defects_found ? '⚠ Defects' : '✓ Clear'}</span></td>
                <td><button className="btn-primary" style={{padding:'4px 10px', fontSize:'12px'}} onClick={() => exportPDF(s)}>PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // MAIN LIST VIEW
  return (
    <div className="prestart">
      <div className="page-header">
        <h2>Prestarts & Checklists</h2>
        <div style={{display:'flex', gap:'10px'}}>
          <button className="btn-primary" onClick={() => setView('history')}>View History</button>
          {userRole?.role !== 'technician' && <button className="btn-primary" onClick={() => setView('builder')}>+ Build Form</button>}
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="form-card" style={{textAlign:'center', padding:'40px'}}>
          <p style={{color:'#a0b0b0', marginBottom:'20px'}}>No form templates yet.</p>
          {userRole?.role !== 'technician' && (
            <button className="btn-primary" onClick={seedExcavatorTemplate}>+ Load Excavator Template</button>
          )}
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'15px', marginTop:'20px'}}>
          {templates.map(t => (
            <div key={t.id} className="form-card" style={{cursor:'pointer'}} onClick={() => { setSelectedTemplate(t); setView('fill'); }}>
              <h3 style={{color:'#00c2e0', marginBottom:'8px'}}>{t.name}</h3>
              <p style={{color:'#a0b0b0', fontSize:'13px', marginBottom:'12px'}}>{t.description}</p>
              <p style={{color:'#a0b0b0', fontSize:'12px'}}>{t.sections?.length || 0} sections · {t.sections?.reduce((sum, s) => sum + s.items.length, 0) || 0} items</p>
              <button className="btn-primary" style={{marginTop:'12px', width:'100%'}} onClick={e => { e.stopPropagation(); setSelectedTemplate(t); setView('fill'); }}>Start Prestart</button>
            </div>
          ))}
          {userRole?.role !== 'technician' && (
            <div className="form-card" style={{cursor:'pointer', border:'1px dashed #1a2f2f', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'120px'}} onClick={() => setView('builder')}>
              <p style={{color:'#00c2e0', fontSize:'16px'}}>+ Create New Form</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Prestart;
