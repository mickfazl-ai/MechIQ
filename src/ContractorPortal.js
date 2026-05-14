import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes cp-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .cp { min-height:100vh; background:#f4f7fa; font-family:'Inter',system-ui,sans-serif; }
  .cp-nav { background:#fff; border-bottom:1px solid #e5eaf0; padding:0 24px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
  .cp-logo { font-size:18px; font-weight:800; letter-spacing:2px; color:#1a2b3c; }
  .cp-logo span { color:#1976D2; }
  .cp-badge { font-size:10px; fontweight:700; padding:3px 10px; borderRadius:20px; background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
  .cp-inner { max-width:960px; margin:0 auto; padding:32px 20px; }
  .cp-card { background:#fff; border:1px solid #e5eaf0; border-radius:14px; padding:28px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.05); animation:cp-up 0.3s ease; }
  .cp-h1 { font-size:24px; font-weight:800; color:#1a2b3c; margin-bottom:6px; }
  .cp-sub { font-size:14px; color:#6b7a8d; margin-bottom:24px; }
  .cp-label { display:block; font-size:10px; font-weight:700; color:#6b7a8d; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:5px; }
  .cp-inp { width:100%; padding:10px 13px; border:1px solid #dde2ea; border-radius:8px; font-size:14px; font-family:inherit; color:#1a2b3c; background:#f8fafc; outline:none; box-sizing:border-box; transition:border-color 0.15s; }
  .cp-inp:focus { border-color:#1976D2; background:#fff; box-shadow:0 0 0 3px rgba(25,118,210,0.1); }
  .cp-btn { padding:11px 24px; background:linear-gradient(135deg,#1976D2,#1565C0); color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.18s; }
  .cp-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(25,118,210,0.3); }
  .cp-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; box-shadow:none; }
  .cp-btn-ghost { padding:10px 20px; background:transparent; color:#6b7a8d; border:1px solid #dde2ea; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; }
  .cp-btn-ghost:hover { border-color:#1976D2; color:#1976D2; }
  .cp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; }
  .cp-err { padding:10px 14px; background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; font-size:13px; color:#e11d48; margin-bottom:14px; }
  .cp-ok  { padding:10px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; font-size:13px; color:#16a34a; margin-bottom:14px; }
  .cp-status { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .cp-status.pending  { background:#fffbeb; color:#d97706; border:1px solid #fde68a; }
  .cp-status.approved { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
  .cp-status.rejected { background:#fff1f2; color:#e11d48; border:1px solid #fecdd3; }
  .cp-status.compliant{ background:#f0f7ff; color:#2d8cf0; border:1px solid #93c5fd; }
  .cp-pin { display:flex; gap:10px; }
  .cp-pin input { width:44px; height:52px; text-align:center; font-size:22px; font-weight:800; border:2px solid #dde2ea; border-radius:10px; font-family:inherit; color:#1a2b3c; background:#f8fafc; outline:none; transition:all 0.15s; }
  .cp-pin input:focus { border-color:#1976D2; background:#fff; box-shadow:0 0 0 3px rgba(25,118,210,0.1); }
`;

const STATUS_LABELS = { pending:'Pending Review', approved:'Approved', rejected:'Rejected', compliant:'Compliant & On Site' };

// ─── Pin Input component ──────────────────────────────────────────────────────
function PinInput({ value, onChange }) {
  const refs = Array.from({length:6}, () => React.useRef(null));
  const digits = (value+'      ').slice(0,6).split('');
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits]; next[i] = ' ';
      onChange(next.join('').trimEnd());
      if (i > 0) refs[i-1].current?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = [...digits]; next[i] = e.key;
      onChange(next.join('').trimEnd());
      if (i < 5) refs[i+1].current?.focus();
    }
  };
  return (
    <div className="cp-pin">
      {digits.map((d,i) => (
        <input key={i} ref={refs[i]} maxLength={1} value={d.trim()} onChange={()=>{}}
          onKeyDown={e => handleKey(i,e)}
          onFocus={e => e.target.select()} />
      ))}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pin,   setPin]   = useState('');
  const [err,   setErr]   = useState('');
  const [busy,  setBusy]  = useState(false);

  const handle = async () => {
    if (!email.trim() || pin.length < 6) { setErr('Please enter your email and 6-digit PIN'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabase
      .from('contractor_accounts')
      .select('*')
      .ilike('email', email.trim())
      .eq('pin', pin)
      .single();
    if (error || !data) { setErr('Invalid email or PIN — contact your site administrator'); setBusy(false); return; }
    sessionStorage.setItem('mechiq_contractor', JSON.stringify({ id: data.id, company_name: data.company_name, contact_name: data.contact_name, email: data.email, company_id: data.company_id }));
    onLogin(data);
    setBusy(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(25,118,210,0.2)', borderTop:'2px solid #1976D2', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:420, backdropFilter:'blur(20px)', boxShadow:'0 0 60px rgba(25,118,210,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'system-ui', fontSize:22, fontWeight:800, letterSpacing:3, color:'#fff', marginBottom:6 }}>MECH<span style={{color:'#1976D2'}}>IQ</span></div>
          <div style={{ fontSize:13, color:'rgba(200,216,232,0.55)', letterSpacing:1 }}>CONTRACTOR PORTAL</div>
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'rgba(200,216,232,0.55)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Email Address</label>
          <input style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(25,118,210,0.2)', borderRadius:8, color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
            type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} autoFocus />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'rgba(200,216,232,0.55)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>6-Digit PIN</label>
          <div style={{ display:'flex', gap:8 }}>
            {Array.from({length:6}).map((_,i) => (
              <input key={i} maxLength={1} style={{ flex:1, height:50, textAlign:'center', fontSize:20, fontWeight:800, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(25,118,210,0.2)', borderRadius:8, color:'#fff', fontFamily:'inherit', outline:'none' }}
                value={pin[i]||''} onChange={e => {
                  const v = e.target.value.replace(/\D/,'');
                  const arr = pin.split('');
                  arr[i] = v; setPin(arr.join('').slice(0,6));
                  if (v && i<5) e.target.nextSibling?.focus();
                }}
                onKeyDown={e => { if(e.key==='Backspace'&&!pin[i]&&i>0) e.target.previousSibling?.focus(); }}
              />
            ))}
          </div>
        </div>
        {err && <div style={{ padding:'10px 14px', background:'rgba(225,29,72,0.1)', border:'1px solid rgba(225,29,72,0.3)', borderRadius:8, fontSize:13, color:'#fb7185', marginBottom:14 }}>{err}</div>}
        <button onClick={handle} disabled={busy} style={{ width:'100%', padding:'13px', background:busy?'rgba(25,118,210,0.4)':'linear-gradient(135deg,#1976D2,#1565C0)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', transition:'all 0.2s', boxShadow:'0 0 24px rgba(25,118,210,0.25)' }}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'rgba(200,216,232,0.3)' }}>
          Don't have an account? Contact your site administrator.
        </div>
      </div>
    </div>
  );
}

// ─── Submit Plant Form ────────────────────────────────────────────────────────
function SubmitPlantForm({ contractor, onSubmitted, onCancel }) {
  const [form, setForm] = useState({ name:'', type:'', make:'', model:'', year:'', serial_number:'', capacity:'', hire_type:'dry', notes:'' });
  const [docs,   setDocs]   = useState([{ document_type:'Registration', file_url:'', expiry_date:'' }, { document_type:'Insurance', file_url:'', expiry_date:'' }, { document_type:'Service Record', file_url:'', expiry_date:'' }]);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setDoc = (i,k,v) => setDocs(d=>d.map((x,j)=>j===i?{...x,[k]:v}:x));
  const addDoc = () => setDocs(d=>[...d,{document_type:'',file_url:'',expiry_date:''}]);

  const submit = async () => {
    if (!form.name||!form.type||!form.make) { setErr('Please fill in Name, Type and Make'); return; }
    setSaving(true); setErr('');
    const { data: sub, error } = await supabase.from('plant_submissions').insert([{
      contractor_id: contractor.id,
      company_id:    contractor.company_id,
      ...form,
      year: form.year ? parseInt(form.year) : null,
      status: 'pending',
    }]).select().single();
    if (error) { setErr(error.message); setSaving(false); return; }
    // Save documents
    const validDocs = docs.filter(d=>d.document_type&&d.file_url);
    if (validDocs.length) {
      await supabase.from('submission_documents').insert(validDocs.map(d=>({ ...d, submission_id: sub.id })));
    }
    setSaving(false);
    onSubmitted();
  };

  const iStyle = { width:'100%', padding:'9px 12px', border:'1px solid #dde2ea', borderRadius:7, fontSize:13, color:'#1a2b3c', background:'#f8fafc', outline:'none', boxSizing:'border-box', fontFamily:'inherit' };
  const lStyle = { display:'block', fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 };

  return (
    <div className="cp-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:'#1a2b3c' }}>Submit Plant for Approval</div>
          <div style={{ fontSize:13, color:'#6b7a8d', marginTop:2 }}>Complete all details. Your site administrator will review and approve.</div>
        </div>
        <button onClick={onCancel} className="cp-btn-ghost">Cancel</button>
      </div>

      {err && <div className="cp-err">{err}</div>}

      {/* Hire type */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[['dry','Dry Hire'],['wet','Wet Hire']].map(([v,l]) => (
          <button key={v} onClick={()=>setForm(f=>({...f,hire_type:v}))}
            style={{ flex:1, padding:'10px', border:`2px solid ${form.hire_type===v?'#1976D2':'#dde2ea'}`, borderRadius:9, background:form.hire_type===v?'#f0fdff':'#f8fafc', color:form.hire_type===v?'#1976D2':'#6b7a8d', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}>
            {v === 'dry' ? '🔧 ' : '👷 '}{l}
          </button>
        ))}
      </div>

      {/* Plant details */}
      <div style={{ fontSize:12, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #f0f4f8' }}>Plant Details</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
        {[['Plant Name *','name','text'],['Type *','type','text'],['Make *','make','text'],['Model','model','text'],['Year','year','number'],['Serial Number','serial_number','text'],['Capacity','capacity','text']].map(([lbl,key,type]) => (
          <div key={key}>
            <label style={lStyle}>{lbl}</label>
            <input style={iStyle} type={type} value={form[key]} onChange={set(key)} placeholder={key==='type'?'e.g. EWP, Generator…':''} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={lStyle}>Notes / Special Requirements</label>
        <textarea style={{ ...iStyle, minHeight:70, resize:'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Any additional information about this plant…" />
      </div>

      {/* Documents */}
      <div style={{ fontSize:12, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #f0f4f8' }}>Supporting Documents</div>
      <div style={{ fontSize:12, color:'#a0b0b0', marginBottom:14 }}>Paste document URLs (Google Drive, Dropbox etc.) or enter document numbers. File upload coming soon.</div>
      {docs.map((d,i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 2fr auto auto', gap:8, marginBottom:8, alignItems:'center' }}>
          <input style={iStyle} value={d.document_type} onChange={e=>setDoc(i,'document_type',e.target.value)} placeholder="Document type" />
          <input style={iStyle} value={d.file_url} onChange={e=>setDoc(i,'file_url',e.target.value)} placeholder="URL or reference number" />
          <input style={{ ...iStyle, width:130 }} type="date" value={d.expiry_date} onChange={e=>setDoc(i,'expiry_date',e.target.value)} title="Expiry date" />
          <button onClick={()=>setDocs(d=>d.filter((_,j)=>j!==i))} style={{ padding:'8px 10px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:6, color:'#e11d48', fontWeight:700, cursor:'pointer', fontSize:12 }}>✕</button>
        </div>
      ))}
      <button onClick={addDoc} style={{ padding:'7px 16px', background:'transparent', border:'1px dashed #dde2ea', borderRadius:7, color:'#6b7a8d', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:20 }}>+ Add Document</button>

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={submit} disabled={saving} className="cp-btn">{saving?'Submitting…':'Submit for Approval'}</button>
        <button onClick={onCancel} className="cp-btn-ghost">Cancel</button>
      </div>
    </div>
  );
}

// ─── Plant Card ───────────────────────────────────────────────────────────────
function PlantCard({ sub, onViewDocs }) {
  const sc = { pending:'pending', approved:'approved', rejected:'rejected', compliant:'compliant' };
  const hrs = sub.hours ? Number(sub.hours).toLocaleString() + ' hrs' : '—';
  return (
    <div className="cp-card" style={{ borderLeft:`4px solid ${sub.status==='approved'||sub.status==='compliant'?'#1976D2':sub.status==='rejected'?'#e11d48':'#f59e0b'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'#1a2b3c' }}>{sub.name}</div>
          <div style={{ fontSize:12, color:'#6b7a8d', marginTop:2 }}>{[sub.make,sub.model].filter(Boolean).join(' ')} · {sub.type} · {sub.hire_type==='dry'?'Dry Hire':'Wet Hire'}</div>
        </div>
        <span className={`cp-status ${sc[sub.status]||'pending'}`}>{STATUS_LABELS[sub.status]||sub.status}</span>
      </div>
      {sub.serial_number && <div style={{ fontSize:12, color:'#a0b0b0', marginBottom:8 }}>Serial: {sub.serial_number}</div>}
      {(sub.status==='approved'||sub.status==='compliant') && (
        <div style={{ display:'flex', gap:20, padding:'10px 14px', background:'#f0fdff', border:'1px solid rgba(25,118,210,0.2)', borderRadius:8, marginBottom:12 }}>
          <div><div style={{ fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px' }}>Current Hours</div><div style={{ fontSize:18, fontWeight:800, color:'#1976D2', marginTop:2 }}>{hrs}</div></div>
          {sub.label_code && <div><div style={{ fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px' }}>Site Label</div><div style={{ fontSize:14, fontWeight:800, color:'#1a2b3c', fontFamily:'monospace', marginTop:2 }}>{sub.label_code}</div></div>}
          {sub.approved_at && <div><div style={{ fontSize:10, fontWeight:700, color:'#6b7a8d', textTransform:'uppercase', letterSpacing:'0.5px' }}>Approved</div><div style={{ fontSize:12, fontWeight:600, color:'#16a34a', marginTop:2 }}>{new Date(sub.approved_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'})}</div></div>}
        </div>
      )}
      {sub.status==='rejected' && sub.rejection_reason && (
        <div style={{ padding:'10px 14px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:8, marginBottom:12 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#e11d48', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Rejection Reason</div>
          <div style={{ fontSize:13, color:'#e11d48' }}>{sub.rejection_reason}</div>
        </div>
      )}
      <button onClick={()=>onViewDocs(sub)} style={{ padding:'5px 12px', background:'var(--surface-2,#f8fafc)', border:'1px solid #dde2ea', borderRadius:6, fontSize:11, fontWeight:700, color:'#6b7a8d', cursor:'pointer' }}>
        📄 View Documents
      </button>
      <div style={{ fontSize:11, color:'#c8d4e0', marginTop:8 }}>Submitted {new Date(sub.created_at).toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'})}</div>
    </div>
  );
}

// ─── Docs Modal ──────────────────────────────────────────────────────────────
function DocsModal({ sub, onClose }) {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    supabase.from('submission_documents').select('*').eq('submission_id', sub.id)
      .then(({data})=>setDocs(data||[]));
  },[sub]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:800, color:'#1a2b3c' }}>Documents — {sub.name}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#a0b0b0' }}>✕</button>
        </div>
        {docs.length===0 ? <div style={{ color:'#a0b0b0', fontSize:13 }}>No documents submitted.</div> : docs.map(d=>(
          <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f0f4f8' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a2b3c' }}>{d.document_type}</div>
              {d.expiry_date && <div style={{ fontSize:11, color:'#6b7a8d' }}>Expires: {d.expiry_date}</div>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {d.verified && <span style={{ fontSize:11, fontWeight:700, color:'#16a34a', background:'#f0fdf4', border:'1px solid #bbf7d0', padding:'2px 8px', borderRadius:20 }}>✓ Verified</span>}
              {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#1976D2', fontWeight:700 }}>View →</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────
export default function ContractorPortal() {
  const [contractor, setContractor] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('mechiq_contractor')||'null'); } catch { return null; }
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [view,        setView]        = useState('dashboard'); // dashboard | submit
  const [viewDocs,    setViewDocs]    = useState(null);

  useEffect(()=>{ if(!document.getElementById('cp-css')){ const s=document.createElement('style');s.id='cp-css';s.textContent=CSS;document.head.appendChild(s); } },[]);
  useEffect(()=>{ if(contractor) load(); },[contractor]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('plant_submissions').select('*')
      .eq('contractor_id', contractor.id).order('created_at',{ascending:false});
    setSubmissions(data||[]);
    setLoading(false);
  };

  const handleLogout = () => { sessionStorage.removeItem('mechiq_contractor'); setContractor(null); };

  if (!contractor) return <LoginScreen onLogin={c=>setContractor(c)} />;

  const counts = { pending: submissions.filter(s=>s.status==='pending').length, approved: submissions.filter(s=>s.status==='approved'||s.status==='compliant').length, rejected: submissions.filter(s=>s.status==='rejected').length };

  return (
    <div className="cp">
      <nav className="cp-nav">
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div className="cp-logo">MECH<span>IQ</span></div>
          <div style={{ width:1, height:20, background:'#e5eaf0' }} />
          <div style={{ fontSize:11, fontWeight:600, color:'#a0b0b0', letterSpacing:1.5, textTransform:'uppercase' }}>Contractor Portal</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#1a2b3c' }}>{contractor.contact_name}</div>
            <div style={{ fontSize:11, color:'#a0b0b0' }}>{contractor.company_name}</div>
          </div>
          <button onClick={handleLogout} style={{ padding:'6px 14px', background:'transparent', border:'1px solid #dde2ea', borderRadius:7, fontSize:12, fontWeight:600, color:'#6b7a8d', cursor:'pointer' }}>Sign Out</button>
        </div>
      </nav>

      <div className="cp-inner">
        {view === 'submit' ? (
          <SubmitPlantForm contractor={contractor} onSubmitted={()=>{load();setView('dashboard');}} onCancel={()=>setView('dashboard')} />
        ) : (
          <>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
              <div>
                <h1 className="cp-h1">Plant Register</h1>
                <p className="cp-sub">Submit and track your plant and equipment for site compliance approval.</p>
              </div>
              <button onClick={()=>setView('submit')} className="cp-btn">+ Submit Plant</button>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
              {[['Total Submitted', submissions.length,'#2d8cf0'],['Approved / On Site', counts.approved,'#16a34a'],['Pending Review', counts.pending,'#d97706']].map(([lbl,val,col])=>(
                <div key={lbl} style={{ background:'#fff', border:'1px solid #e5eaf0', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize:28, fontWeight:900, color:col, fontFamily:'system-ui' }}>{val}</div>
                  <div style={{ fontSize:12, color:'#6b7a8d', marginTop:3, letterSpacing:'0.3px' }}>{lbl}</div>
                </div>
              ))}
            </div>

            {/* Submissions */}
            {loading ? (
              <div style={{ textAlign:'center', padding:40, color:'#a0b0b0' }}>Loading…</div>
            ) : submissions.length === 0 ? (
              <div className="cp-card" style={{ textAlign:'center', padding:60 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🚛</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#1a2b3c', marginBottom:6 }}>No plant submitted yet</div>
                <div style={{ fontSize:13, color:'#6b7a8d', marginBottom:20 }}>Submit your plant and equipment for site compliance approval.</div>
                <button onClick={()=>setView('submit')} className="cp-btn">+ Submit Plant</button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(400px,1fr))', gap:16 }}>
                {submissions.map(s=><PlantCard key={s.id} sub={s} onViewDocs={setViewDocs} />)}
              </div>
            )}
          </>
        )}
      </div>

      {viewDocs && <DocsModal sub={viewDocs} onClose={()=>setViewDocs(null)} />}
    </div>
  );
}
