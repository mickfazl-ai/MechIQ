import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabase';

const S = `
  .ps { font-family:'Barlow',sans-serif; color:#1a2433; max-width:860px; }
  .ps-head { margin-bottom:24px; }
  .ps-title { font-size:22px; font-weight:800; color:#1a2433; margin-bottom:4px; }
  .ps-sub { font-size:13px; color:#6b7a8d; }

  /* Upload zone */
  .ps-zone { border:2px dashed #c8d0db; border-radius:8px; padding:40px 24px; text-align:center; cursor:pointer; transition:all 0.15s; background:#fafbfc; }
  .ps-zone:hover,.ps-zone.drag { border-color:#2d8cf0; background:#f0f7ff; }
  .ps-zone-icon { font-size:36px; margin-bottom:12px; }
  .ps-zone-txt { font-size:15px; font-weight:600; color:#3a4a5c; margin-bottom:6px; }
  .ps-zone-sub { font-size:12px; color:#8a96a3; }
  .ps-zone-btns { display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap; }
  .ps-zone-btn { padding:9px 20px; border-radius:5px; border:1px solid #c8d0db; background:#fff; color:#3a4a5c; font-size:13px; font-weight:600; cursor:pointer; font-family:'Barlow',sans-serif; transition:all 0.13s; }
  .ps-zone-btn:hover { border-color:#2d8cf0; color:#2d8cf0; }
  .ps-zone-btn.primary { background:#2d8cf0; border-color:#2d8cf0; color:#fff; }
  .ps-zone-btn.primary:hover { background:#1a7de8; }

  /* Preview */
  .ps-preview { position:relative; border-radius:8px; overflow:hidden; border:1px solid #dde2ea; margin-bottom:16px; }
  .ps-preview img { width:100%; max-height:400px; object-fit:contain; background:#f4f6f9; display:block; }
  .ps-preview-lbl { position:absolute; top:8px; left:8px; background:rgba(26,36,51,0.7); color:#fff; font-size:10px; font-weight:700; padding:3px 8px; border-radius:3px; letter-spacing:0.5px; }
  .ps-preview-change { position:absolute; top:8px; right:8px; background:#fff; border:1px solid #dde2ea; color:#3a4a5c; font-size:11px; font-weight:600; padding:4px 10px; border-radius:3px; cursor:pointer; font-family:'Barlow',sans-serif; }

  /* Scanning state */
  .ps-scanning { text-align:center; padding:40px; }
  .ps-spin { width:40px; height:40px; border:3px solid #e8ecf2; border-top-color:#2d8cf0; border-radius:50%; animation:ps-spin 0.7s linear infinite; margin:0 auto 16px; }
  @keyframes ps-spin { to { transform:rotate(360deg); } }
  .ps-scanning-txt { font-size:15px; font-weight:600; color:#1a2433; margin-bottom:6px; }
  .ps-scanning-sub { font-size:13px; color:#6b7a8d; }
  .ps-steps { display:flex; flex-direction:column; gap:6px; margin-top:16px; max-width:280px; margin-left:auto; margin-right:auto; }
  .ps-step { display:flex; align-items:center; gap:10px; font-size:12px; color:#6b7a8d; }
  .ps-step.done { color:#2d8cf0; }
  .ps-step.active { color:#1a2433; font-weight:600; }
  .ps-step-dot { width:8px; height:8px; border-radius:50%; background:#dde2ea; flex-shrink:0; }
  .ps-step.done .ps-step-dot { background:#2d8cf0; }
  .ps-step.active .ps-step-dot { background:#2d8cf0; }

  /* Extraction review */
  .ps-review { }
  .ps-review-banner { display:flex; align-items:center; gap:10px; padding:12px 16px; background:#f0f7ff; border:1px solid #bdd6f5; border-radius:6px; margin-bottom:20px; }
  .ps-review-banner-icon { font-size:18px; }
  .ps-review-banner-txt { font-size:13px; color:#1a5fa8; font-weight:600; }
  .ps-review-banner-sub { font-size:12px; color:#3a7ec4; margin-top:1px; }
  .ps-warn-banner { background:#fff8e6; border-color:#f5c842; }
  .ps-warn-banner .ps-review-banner-txt { color:#7a5500; }
  .ps-warn-banner .ps-review-banner-sub { color:#9a7010; }

  .ps-section { margin-bottom:24px; }
  .ps-section-title { font-size:11px; font-weight:700; color:#8a96a3; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #eaecf0; }
  .ps-fields { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .ps-field { }
  .ps-field.full { grid-column:1/-1; }
  .ps-lbl { display:block; font-size:10px; font-weight:700; color:#8a96a3; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px; }
  .ps-inp { width:100%; padding:8px 10px; border:1px solid #dde2ea; border-radius:4px; background:#fff; color:#1a2433; font-size:13px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; transition:border-color 0.13s; }
  .ps-inp:focus { border-color:#2d8cf0; box-shadow:0 0 0 3px rgba(45,140,240,0.1); }
  .ps-inp.warn { border-color:#f5a623; background:#fffcf0; }
  .ps-sel { width:100%; padding:8px 10px; border:1px solid #dde2ea; border-radius:4px; background:#fff; color:#1a2433; font-size:13px; font-family:'Barlow',sans-serif; outline:none; }

  /* Asset match */
  .ps-match { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:5px; border:1px solid; margin-bottom:10px; }
  .ps-match.found { background:#f0fdf4; border-color:#86efac; }
  .ps-match.notfound { background:#fff8f0; border-color:#fdba74; }
  .ps-match-icon { font-size:14px; }
  .ps-match-txt { font-size:13px; font-weight:600; }
  .ps-match.found .ps-match-txt { color:#166534; }
  .ps-match.notfound .ps-match-txt { color:#9a3412; }
  .ps-match-sub { font-size:11px; color:#6b7a8d; margin-top:1px; }

  /* Checklist review */
  .ps-checks { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
  .ps-check { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:4px; border:1px solid #eaecf0; background:#fafbfc; }
  .ps-check.ok  { background:#f0fdf4; border-color:#bbf7d0; }
  .ps-check.fail{ background:#fff5f5; border-color:#fecaca; }
  .ps-check.unknown { background:#fffbeb; border-color:#fde68a; }
  .ps-check-name { font-size:12px; font-weight:500; color:#1a2433; flex:1; }
  .ps-check-status { font-size:10px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
  .ps-check.ok     .ps-check-status { color:#166534; }
  .ps-check.fail   .ps-check-status { color:#991b1b; }
  .ps-check.unknown .ps-check-status { color:#92400e; }
  .ps-check-toggle { background:none; border:1px solid #c8d0db; border-radius:3px; padding:2px 7px; font-size:10px; cursor:pointer; font-family:'Barlow',sans-serif; font-weight:600; }

  /* Actions */
  .ps-actions { display:flex; gap:10px; padding-top:16px; border-top:1px solid #eaecf0; flex-wrap:wrap; }
  .ps-btn { padding:10px 24px; border-radius:5px; border:none; font-size:13px; font-weight:700; cursor:pointer; font-family:'Barlow',sans-serif; transition:all 0.13s; }
  .ps-btn.primary { background:#2d8cf0; color:#fff; }
  .ps-btn.primary:hover { background:#1a7de8; }
  .ps-btn.primary:disabled { opacity:0.5; cursor:not-allowed; }
  .ps-btn.secondary { background:#fff; color:#3a4a5c; border:1px solid #c8d0db; }
  .ps-btn.secondary:hover { border-color:#2d8cf0; color:#2d8cf0; }

  /* Success */
  .ps-success { text-align:center; padding:40px 20px; }
  .ps-success-icon { font-size:48px; margin-bottom:16px; }
  .ps-success-title { font-size:20px; font-weight:800; color:#1a2433; margin-bottom:8px; }
  .ps-success-sub { font-size:14px; color:#6b7a8d; margin-bottom:20px; line-height:1.7; }
  .ps-success-items { display:flex; flex-direction:column; gap:6px; max-width:340px; margin:0 auto 24px; }
  .ps-success-item { display:flex; align-items:center; gap:10px; padding:8px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:5px; font-size:13px; color:#166534; font-weight:600; }

  /* Error */
  .ps-error { padding:20px; background:#fff5f5; border:1px solid #fecaca; border-radius:6px; margin-bottom:16px; }
  .ps-error-title { font-size:13px; font-weight:700; color:#991b1b; margin-bottom:4px; }
  .ps-error-msg { font-size:12px; color:#b91c1c; }
`;

const SCAN_STEPS = [
  'Reading image...',
  'Extracting asset information...',
  'Processing checklist items...',
  'Identifying hours and date...',
  'Structuring data...',
];

const CHECKLIST_ITEMS = [
  'Engine oil', 'Coolant', 'Hydraulic fluid', 'Fuel level',
  'Brakes', 'Lights', 'Horn', 'Seatbelt',
  'Tyres', 'Leaks', 'Controls', 'Fire extinguisher',
];

export default function PaperScan({ userRole }) {
  const [stage, setStage]         = useState('upload');   // upload | scanning | review | saving | done | error
  const [imgData, setImgData]     = useState(null);       // base64
  const [imgType, setImgType]     = useState('image/jpeg');
  const [fileName, setFileName]   = useState('');
  const [drag, setDrag]           = useState(false);
  const [scanStep, setScanStep]   = useState(0);
  const [extracted, setExtracted] = useState(null);
  const [matchedAsset, setMatchedAsset] = useState(null);
  const [assets, setAssets]       = useState([]);
  const [saving, setSaving]       = useState(false);
  const [done, setDone]           = useState(null);
  const [error, setError]         = useState(null);

  const fileRef    = useRef(null);
  const cameraRef  = useRef(null);
  const videoRef   = useRef(null);
  const [camera, setCamera] = useState(false);
  const streamRef  = useRef(null);

  useEffect(() => {
    if (!document.getElementById('ps-css')) {
      const s = document.createElement('style'); s.id='ps-css'; s.textContent=S;
      document.head.appendChild(s);
    }
    loadAssets();
    return () => stopCamera();
  }, []);

  const loadAssets = async () => {
    let q = supabase.from('assets').select('id,asset_name,asset_id,make,model,company_id').limit(200);
    if (userRole?.company_id) q = q.eq('company_id', userRole.company_id);
    const { data } = await q;
    if (data) setAssets(data);
  };

  /* ── Camera ─────────────────────────────────────────── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' }, audio:false });
      streamRef.current = stream;
      setCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch(e) {
      alert('Camera not available. Please upload an image instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    setCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current; if (!video) return;
    const cv = document.createElement('canvas');
    cv.width = video.videoWidth; cv.height = video.videoHeight;
    cv.getContext('2d').drawImage(video, 0, 0);
    const data = cv.toDataURL('image/jpeg', 0.92);
    setImgData(data.split(',')[1]);
    setImgType('image/jpeg');
    setFileName('camera-capture.jpg');
    stopCamera();
    setStage('upload');
  };

  /* ── File handling ───────────────────────────────────── */
  const handleFile = (file) => {
    if (!file) return;
    const isPDF = file.type === 'application/pdf';
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result.split(',')[1];
      setImgData(b64);
      setImgType(isPDF ? 'application/pdf' : file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* ── Claude Vision API call ──────────────────────────── */
  const scan = async () => {
    if (!imgData) return;
    setStage('scanning'); setScanStep(0); setError(null);

    // Animate steps
    const stepTimer = setInterval(() => {
      setScanStep(s => { if (s >= SCAN_STEPS.length - 1) { clearInterval(stepTimer); return s; } return s + 1; });
    }, 900);

    try {
      const prompt = `You are reading a paper prestart inspection form for a piece of heavy machinery or vehicle.

Extract ALL of the following information and return it as a JSON object with EXACTLY these fields:
{
  "asset_name": "name of asset or machine (string)",
  "asset_id": "machine ID, unit number, fleet number, or registration (string)",
  "operator_name": "name of operator or technician (string)",
  "date": "date in YYYY-MM-DD format if visible (string or null)",
  "current_hours": "current hours or odometer reading as a number (number or null)",
  "fuel_level": "fuel level percentage or description (string or null)",
  "checklist": {
    "engine_oil": "ok/fail/not_checked",
    "coolant": "ok/fail/not_checked",
    "hydraulic_fluid": "ok/fail/not_checked",
    "fuel": "ok/fail/not_checked",
    "brakes": "ok/fail/not_checked",
    "lights": "ok/fail/not_checked",
    "horn": "ok/fail/not_checked",
    "seatbelt": "ok/fail/not_checked",
    "tyres": "ok/fail/not_checked",
    "leaks": "ok/fail/not_checked",
    "controls": "ok/fail/not_checked",
    "fire_extinguisher": "ok/fail/not_checked"
  },
  "defects": "any defects, faults or notes written on the form (string or null)",
  "signed": true or false,
  "confidence": "high/medium/low — your confidence in the overall extraction"
}

Return ONLY the JSON. No explanation. If a field is not visible or legible, use null for strings and "not_checked" for checklist items.`;

      const body = {
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imgType === 'application/pdf' ? 'application/pdf' : imgType,
                data: imgData,
              }
            },
            { type: 'text', text: prompt }
          ]
        }]
      };

      const res = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      const raw = json.content?.[0]?.text || '';

      // Parse JSON from response
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse extraction response');
      const data = JSON.parse(match[0]);

      clearInterval(stepTimer);
      setScanStep(SCAN_STEPS.length - 1);

      // Match to asset in database
      const matched = findAsset(data.asset_name, data.asset_id);
      setMatchedAsset(matched);
      setExtracted({ ...data, asset_id_override: matched?.id || null });
      setStage('review');

    } catch(e) {
      clearInterval(stepTimer);
      setError(e.message);
      setStage('error');
    }
  };

  /* ── Asset matching ──────────────────────────────────── */
  const findAsset = (name, idTag) => {
    if (!name && !idTag) return null;
    const needle = (s) => (s||'').toLowerCase().trim();
    const n = needle(name), i = needle(idTag);

    // Exact match on ID tag first
    if (i) {
      const byId = assets.find(a => needle(a.asset_id) === i);
      if (byId) return byId;
    }
    // Exact match on name
    if (n) {
      const byName = assets.find(a => needle(a.asset_name) === n);
      if (byName) return byName;
    }
    // Partial match on name
    if (n) {
      const partial = assets.find(a => needle(a.asset_name).includes(n) || n.includes(needle(a.asset_name)));
      if (partial) return partial;
    }
    return null;
  };

  /* ── Update extracted field ──────────────────────────── */
  const setField = (key, val) => setExtracted(p => ({ ...p, [key]: val }));
  const setCheck = (key, val) => setExtracted(p => ({ ...p, checklist: { ...p.checklist, [key]: val } }));
  const cycleCheck = (key) => {
    const cur = extracted?.checklist?.[key] || 'not_checked';
    const next = cur === 'ok' ? 'fail' : cur === 'fail' ? 'not_checked' : 'ok';
    setCheck(key, next);
  };

  /* ── Save to Supabase ────────────────────────────────── */
  const save = async () => {
    if (!extracted) return;
    setSaving(true);

    const assetId = extracted.asset_id_override || matchedAsset?.id || null;
    const companyId = matchedAsset?.company_id || userRole?.company_id || null;
    const failed = Object.entries(extracted.checklist || {})
      .filter(([,v]) => v === 'fail')
      .map(([k]) => k.replace(/_/g,' '));

    try {
      // 1. Save prestart record
      const { error: psErr } = await supabase.from('prestarts').insert({
        asset_id:      assetId,
        company_id:    companyId,
        asset_name:    extracted.asset_name,
        asset_id_tag:  extracted.asset_id,
        operator_name: extracted.operator_name,
        date:          extracted.date || new Date().toISOString().split('T')[0],
        current_hours: extracted.current_hours ? parseFloat(extracted.current_hours) : null,
        fuel_level:    extracted.fuel_level,
        checklist:     extracted.checklist,
        failed_items:  failed,
        defects:       extracted.defects,
        signed:        extracted.signed || false,
        source:        'paper_scan',
        created_at:    new Date().toISOString(),
      });
      if (psErr) throw psErr;

      // 2. Update asset current hours
      if (assetId && extracted.current_hours) {
        await supabase.from('assets').update({
          current_hours: parseFloat(extracted.current_hours),
          updated_at: new Date().toISOString(),
        }).eq('id', assetId);
      }

      // 3. Recalculate service schedules based on new hours
      const servicesUpdated = [];
      if (assetId && extracted.current_hours) {
        const hrs = parseFloat(extracted.current_hours);
        const { data: schedules } = await supabase
          .from('service_schedules')
          .select('*')
          .eq('asset_id', assetId);

        if (schedules?.length) {
          for (const svc of schedules) {
            if (svc.interval_hours) {
              const lastDone = svc.last_done_hours || 0;
              const nextDue  = lastDone + svc.interval_hours;
              const hoursRemaining = nextDue - hrs;
              const status = hoursRemaining <= 0 ? 'overdue'
                           : hoursRemaining <= svc.interval_hours * 0.1 ? 'due_soon'
                           : 'ok';

              await supabase.from('service_schedules').update({
                current_hours:   hrs,
                next_due_hours:  nextDue,
                hours_remaining: hoursRemaining,
                status,
                updated_at: new Date().toISOString(),
              }).eq('id', svc.id);

              servicesUpdated.push(svc.service_name || svc.id);
            }
          }
        }
      }

      setSaving(false);
      setDone({
        assetName: extracted.asset_name || matchedAsset?.asset_name || 'Asset',
        hours: extracted.current_hours,
        failed,
        servicesUpdated,
        matched: !!matchedAsset,
      });
      setStage('done');

    } catch(e) {
      setSaving(false);
      setError(e.message);
      setStage('error');
    }
  };

  const reset = () => {
    setStage('upload'); setImgData(null); setExtracted(null);
    setMatchedAsset(null); setError(null); setDone(null); setScanStep(0);
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="ps">
      <div className="ps-head">
        <div className="ps-title">Paper Prestart Scanner</div>
        <div className="ps-sub">Photograph or upload a paper prestart form — AI extracts the data and updates asset hours automatically.</div>
      </div>

      {/* ── Upload stage ── */}
      {stage === 'upload' && !camera && (
        <>
          {!imgData ? (
            <div
              className={`ps-zone${drag ? ' drag' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="ps-zone-icon">📄</div>
              <div className="ps-zone-txt">Drop a photo or PDF here</div>
              <div className="ps-zone-sub">JPEG, PNG, HEIC or PDF · Max 10MB</div>
              <div className="ps-zone-btns" onClick={e => e.stopPropagation()}>
                <button className="ps-zone-btn primary" onClick={() => fileRef.current?.click()}>
                  Upload File
                </button>
                <button className="ps-zone-btn" onClick={startCamera}>
                  Use Camera
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:'none'}}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <>
              <div className="ps-preview">
                <img src={`data:${imgType};base64,${imgData}`} alt="Prestart form" />
                <div className="ps-preview-lbl">{fileName}</div>
                <button className="ps-preview-change" onClick={reset}>Change</button>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="ps-btn primary" onClick={scan}>
                  Scan & Extract Data →
                </button>
                <button className="ps-btn secondary" onClick={reset}>Cancel</button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Camera ── */}
      {camera && (
        <div style={{ position:'relative', borderRadius:8, overflow:'hidden', background:'#000', marginBottom:16 }}>
          <video ref={videoRef} autoPlay playsInline style={{ width:'100%', maxHeight:400, display:'block' }} />
          <div style={{ display:'flex', gap:10, padding:'12px', background:'rgba(0,0,0,0.5)', justifyContent:'center' }}>
            <button className="ps-btn primary" onClick={capturePhoto}>Capture Photo</button>
            <button className="ps-btn secondary" style={{color:'#fff',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)'}} onClick={stopCamera}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Scanning ── */}
      {stage === 'scanning' && (
        <div className="ps-scanning">
          <div className="ps-spin" />
          <div className="ps-scanning-txt">Reading your prestart form…</div>
          <div className="ps-scanning-sub">Claude Vision is extracting all fields</div>
          <div className="ps-steps">
            {SCAN_STEPS.map((s, i) => (
              <div key={i} className={`ps-step${i < scanStep ? ' done' : i === scanStep ? ' active' : ''}`}>
                <div className="ps-step-dot" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Review ── */}
      {stage === 'review' && extracted && (
        <div className="ps-review">
          {/* Confidence banner */}
          {extracted.confidence === 'low' ? (
            <div className="ps-review-banner ps-warn-banner">
              <div className="ps-review-banner-icon">⚠️</div>
              <div>
                <div className="ps-review-banner-txt">Low confidence extraction</div>
                <div className="ps-review-banner-sub">Some fields may be inaccurate — please review carefully before saving.</div>
              </div>
            </div>
          ) : (
            <div className="ps-review-banner">
              <div className="ps-review-banner-icon">✓</div>
              <div>
                <div className="ps-review-banner-txt">Extraction complete — review and confirm</div>
                <div className="ps-review-banner-sub">Edit any fields that were misread before saving.</div>
              </div>
            </div>
          )}

          {/* Asset match */}
          {matchedAsset ? (
            <div className="ps-match found" style={{marginBottom:16}}>
              <div className="ps-match-icon">✓</div>
              <div>
                <div className="ps-match-txt">Asset matched: {matchedAsset.asset_name}</div>
                <div className="ps-match-sub">ID: {matchedAsset.asset_id} · Hours will be updated on this asset</div>
              </div>
            </div>
          ) : (
            <div className="ps-match notfound" style={{marginBottom:16}}>
              <div className="ps-match-icon">!</div>
              <div>
                <div className="ps-match-txt">No asset match found for "{extracted.asset_name}"</div>
                <div className="ps-match-sub">Prestart will be saved but asset hours will not be updated. Select asset manually below.</div>
              </div>
            </div>
          )}

          {/* Asset override */}
          {!matchedAsset && (
            <div className="ps-section">
              <div className="ps-section-title">Select Asset Manually</div>
              <select className="ps-sel" value={extracted.asset_id_override || ''} onChange={e => {
                const a = assets.find(x => x.id === e.target.value);
                setMatchedAsset(a || null);
                setField('asset_id_override', e.target.value);
              }}>
                <option value="">— Select asset —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_name} {a.asset_id ? `· ${a.asset_id}` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Core fields */}
          <div className="ps-section">
            <div className="ps-section-title">Form Details</div>
            <div className="ps-fields">
              <div className="ps-field">
                <label className="ps-lbl">Asset / Machine Name</label>
                <input className={`ps-inp${!extracted.asset_name ? ' warn' : ''}`} value={extracted.asset_name||''} onChange={e=>setField('asset_name',e.target.value)} />
              </div>
              <div className="ps-field">
                <label className="ps-lbl">Machine ID / Fleet No.</label>
                <input className="ps-inp" value={extracted.asset_id||''} onChange={e=>setField('asset_id',e.target.value)} />
              </div>
              <div className="ps-field">
                <label className="ps-lbl">Operator Name</label>
                <input className={`ps-inp${!extracted.operator_name ? ' warn' : ''}`} value={extracted.operator_name||''} onChange={e=>setField('operator_name',e.target.value)} />
              </div>
              <div className="ps-field">
                <label className="ps-lbl">Date</label>
                <input className="ps-inp" type="date" value={extracted.date||''} onChange={e=>setField('date',e.target.value)} />
              </div>
              <div className="ps-field">
                <label className="ps-lbl">Current Hours / Odometer</label>
                <input className={`ps-inp${!extracted.current_hours ? ' warn' : ''}`} type="number" value={extracted.current_hours||''} onChange={e=>setField('current_hours',e.target.value)} placeholder="Hours or km" />
              </div>
              <div className="ps-field">
                <label className="ps-lbl">Fuel Level</label>
                <input className="ps-inp" value={extracted.fuel_level||''} onChange={e=>setField('fuel_level',e.target.value)} placeholder="e.g. 75%" />
              </div>
              <div className="ps-field full">
                <label className="ps-lbl">Defects / Notes</label>
                <textarea className="ps-inp" rows={3} value={extracted.defects||''} onChange={e=>setField('defects',e.target.value)} style={{resize:'vertical'}} placeholder="Any defects or notes recorded on the form…" />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="ps-section">
            <div className="ps-section-title">Inspection Checklist — click to cycle OK / Fail / Not checked</div>
            <div className="ps-checks">
              {Object.entries(extracted.checklist || {}).map(([key, val]) => (
                <div key={key} className={`ps-check ${val === 'ok' ? 'ok' : val === 'fail' ? 'fail' : 'unknown'}`}
                  onClick={() => cycleCheck(key)} style={{cursor:'pointer'}}>
                  <div className="ps-check-name">{key.replace(/_/g,' ')}</div>
                  <div className="ps-check-status">
                    {val === 'ok' ? '✓ OK' : val === 'fail' ? '✗ FAIL' : '? Unclear'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ps-actions">
            <button className="ps-btn primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm & Save →'}
            </button>
            <button className="ps-btn secondary" onClick={reset}>Discard</button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {stage === 'done' && done && (
        <div className="ps-success">
          <div className="ps-success-icon">✓</div>
          <div className="ps-success-title">Prestart saved successfully</div>
          <div className="ps-success-sub">
            {done.assetName} · {done.hours ? `${done.hours} hrs recorded` : 'Hours not recorded'}
            {done.failed.length > 0 && <><br/>⚠️ {done.failed.length} failed items recorded</>}
          </div>
          <div className="ps-success-items">
            <div className="ps-success-item">✓ Prestart record created</div>
            {done.hours && done.matched && <div className="ps-success-item">✓ Asset hours updated to {done.hours}</div>}
            {done.servicesUpdated.length > 0 && (
              <div className="ps-success-item">✓ {done.servicesUpdated.length} service schedule{done.servicesUpdated.length > 1 ? 's' : ''} recalculated</div>
            )}
            {!done.matched && <div style={{padding:'8px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:5, fontSize:13, color:'#92400e'}}>Asset not matched — link manually in Assets if needed</div>}
          </div>
          <button className="ps-btn primary" onClick={reset}>Scan Another Form</button>
        </div>
      )}

      {/* ── Error ── */}
      {stage === 'error' && (
        <>
          <div className="ps-error">
            <div className="ps-error-title">Extraction failed</div>
            <div className="ps-error-msg">{error}</div>
          </div>
          <div style={{display:'flex', gap:10}}>
            <button className="ps-btn primary" onClick={scan}>Try Again</button>
            <button className="ps-btn secondary" onClick={reset}>Start Over</button>
          </div>
        </>
      )}
    </div>
  );
}
