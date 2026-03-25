import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';

/* ── Size presets (display pixels = mm * scale) ── */
const SIZES = [
  { id:'15x15',   mm:'15×15mm',   w:60,  h:60  },
  { id:'25x25',   mm:'25×25mm',   w:100, h:100 },
  { id:'50x25',   mm:'50×25mm',   w:200, h:100 },
  { id:'100x50',  mm:'100×50mm',  w:400, h:200 },
  { id:'150x100', mm:'150×100mm', w:600, h:400 },
  { id:'a4_2up',  mm:'A4 — 2-up', w:794, h:560, isSheet:true, cols:2, rows:4 },
  { id:'a4_4up',  mm:'A4 — 4-up', w:794, h:560, isSheet:true, cols:4, rows:6 },
];

const FONTS = ['Barlow', 'Arial', 'Helvetica', 'Verdana', 'Georgia', 'Courier New', 'Impact'];

/* Canvas display max width in the designer */
const MAX_DISPLAY = 700;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&display=swap');
  .ld-wrap { display:flex; flex-direction:column; height:calc(100vh - 64px); background:#f4f6f9; color:#1a2433; font-family:'Barlow',sans-serif; overflow:hidden; }
  .ld-topbar { height:44px; background:#f0f2f6; border-bottom:1px solid rgba(26,36,51,0.1); display:flex; align-items:center; padding:0 12px; gap:10px; flex-shrink:0; }
  .ld-topbar-title { font-size:12px; font-weight:700; color:rgba(26,36,51,0.5); letter-spacing:1px; text-transform:uppercase; }
  .ld-topbar-sep { width:1px; height:20px; background:rgba(26,36,51,0.1); }
  .ld-tb-btn { padding:5px 12px; border-radius:2px; border:1px solid rgba(26,36,51,0.15); background:transparent; color:rgba(26,36,51,0.6); font-size:11px; font-family:'Barlow',sans-serif; cursor:pointer; font-weight:600; letter-spacing:0.5px; transition:all 0.13s; }
  .ld-tb-btn:hover { border-color:rgba(255,255,255,0.24); color:#1a2433; }
  .ld-tb-btn.blue { background:#1e88e5; border-color:#1e88e5; color:#fff; }
  .ld-tb-btn.blue:hover { background:#1565c0; }
  .ld-tb-btn.red { border-color:rgba(239,83,80,0.3); color:#ef9a9a; }
  .ld-tb-btn.red:hover { border-color:rgba(239,83,80,0.6); background:rgba(239,83,80,0.08); }
  .ld-tb-input { padding:5px 8px; background:#f7f9fc; border:1px solid rgba(26,36,51,0.15); border-radius:2px; color:#1a2433; font-size:11px; font-family:'Barlow',sans-serif; outline:none; width:130px; }
  .ld-tb-input:focus { border-color:#1e88e5; }
  .ld-tb-spacer { flex:1; }

  .ld-body { display:flex; flex:1; overflow:hidden; }

  /* Left toolbar */
  .ld-tools { width:48px; background:#f0f2f6; border-right:1px solid rgba(26,36,51,0.1); display:flex; flex-direction:column; align-items:center; padding:8px 0; gap:3px; flex-shrink:0; }
  .ld-t { width:34px; height:34px; border-radius:3px; border:1px solid transparent; background:transparent; color:rgba(26,36,51,0.45); cursor:pointer; font-size:15px; display:flex; align-items:center; justify-content:center; transition:all 0.12s; font-family:'Barlow',sans-serif; font-weight:700; }
  .ld-t:hover { background:rgba(26,36,51,0.06); color:#1a2433; }
  .ld-t.on { background:rgba(30,136,229,0.18); border-color:rgba(30,136,229,0.4); color:#1e88e5; }
  .ld-t-sep { width:24px; height:1px; background:rgba(26,36,51,0.06); margin:3px 0; }
  .ld-t-lbl { font-size:8px; color:rgba(26,36,51,0.28); letter-spacing:0.5px; margin-top:1px; }

  /* Canvas area */
  .ld-center { flex:1; display:flex; flex-direction:column; align-items:center; overflow:auto; padding:16px; gap:10px; background:#e8ecf2; }
  .ld-size-row { display:flex; gap:5px; flex-wrap:wrap; justify-content:center; }
  .ld-sz { padding:4px 10px; border-radius:2px; border:1px solid rgba(26,36,51,0.14); background:transparent; color:rgba(26,36,51,0.48); font-size:10px; font-family:'Barlow',sans-serif; cursor:pointer; font-weight:600; letter-spacing:0.4px; transition:all 0.12s; }
  .ld-sz:hover { border-color:rgba(26,36,51,0.28); color:#1a2433; }
  .ld-sz.on { border-color:#1e88e5; background:rgba(30,136,229,0.12); color:#1e88e5; }
  .ld-canvas-outer { position:relative; flex-shrink:0; cursor:default; }
  .ld-cv { display:block; cursor:default; }

  /* Right props panel */
  .ld-props { width:210px; background:#f0f2f6; border-left:1px solid rgba(26,36,51,0.1); overflow-y:auto; flex-shrink:0; padding:10px; display:flex; flex-direction:column; gap:0; }
  .ld-ph { font-size:9px; font-weight:700; color:rgba(26,36,51,0.35); letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .ld-pf { margin-bottom:9px; }
  .ld-pl { display:block; font-size:9px; font-weight:700; color:rgba(26,36,51,0.35); letter-spacing:1.2px; text-transform:uppercase; margin-bottom:3px; }
  .ld-pi { width:100%; padding:5px 7px; background:#f7f9fc; border:1px solid rgba(26,36,51,0.14); border-radius:2px; color:#1a2433; font-size:12px; font-family:'Barlow',sans-serif; outline:none; box-sizing:border-box; }
  .ld-pi:focus { border-color:#1e88e5; }
  .ld-psel { width:100%; padding:5px 7px; background:#f0f2f6; border:1px solid rgba(26,36,51,0.14); border-radius:2px; color:#1a2433; font-size:12px; font-family:'Barlow',sans-serif; outline:none; }
  .ld-pcol { width:100%; height:28px; padding:2px; background:#f7f9fc; border:1px solid rgba(26,36,51,0.14); border-radius:2px; cursor:pointer; }
  .ld-pr { display:flex; gap:5px; }
  .ld-pr .ld-pi { flex:1; }
  .ld-psep { height:1px; background:rgba(26,36,51,0.08); margin:8px 0; }
  .ld-pdel { width:100%; padding:6px; background:rgba(239,83,80,0.08); border:1px solid rgba(239,83,80,0.22); border-radius:2px; color:#ef9a9a; font-size:10px; font-family:'Barlow',sans-serif; cursor:pointer; font-weight:600; letter-spacing:0.5px; transition:all 0.12s; margin-top:4px; }
  .ld-pdel:hover { background:rgba(239,83,80,0.16); }
  .ld-pdup { width:100%; padding:6px; background:#f7f9fc; border:1px solid rgba(26,36,51,0.15); border-radius:2px; color:rgba(26,36,51,0.6); font-size:10px; font-family:'Barlow',sans-serif; cursor:pointer; font-weight:600; letter-spacing:0.5px; transition:all 0.12s; margin-bottom:4px; }
  .ld-pdup:hover { border-color:rgba(255,255,255,0.22); color:#1a2433; }
  .ld-pchk { display:flex; align-items:center; gap:7px; font-size:12px; color:rgba(221,227,237,0.6); cursor:pointer; margin-bottom:6px; }
  .ld-pchk input { accent-color:#1e88e5; width:14px; height:14px; }
  .ld-no-sel { font-size:11px; color:rgba(26,36,51,0.28); padding:16px 4px; line-height:1.7; }
  .ld-bg-row { display:flex; align-items:center; gap:8px; padding:8px 0; border-top:1px solid rgba(26,36,51,0.1); }
  .ld-bg-lbl { font-size:10px; font-weight:600; color:rgba(26,36,51,0.42); letter-spacing:1px; text-transform:uppercase; flex:1; }

  /* Asset picker */
  .ld-asset-modal { position:fixed; inset:0; background:rgba(26,36,51,0.5); z-index:500; display:flex; align-items:center; justify-content:center; padding:16px; }
  .ld-asset-box { background:#ffffff; border:1px solid rgba(26,36,51,0.14); border-top:2px solid #1e88e5; border-radius:3px; width:100%; max-width:420px; max-height:70vh; display:flex; flex-direction:column; }
  .ld-asset-head { padding:14px 16px; border-bottom:1px solid rgba(26,36,51,0.1); display:flex; justify-content:space-between; align-items:center; }
  .ld-asset-title { font-size:14px; font-weight:700; color:#1a2433; letter-spacing:0.3px; }
  .ld-asset-close { background:none; border:none; color:rgba(26,36,51,0.42); cursor:pointer; font-size:14px; }
  .ld-asset-search { margin:10px 12px; padding:7px 10px; background:#f7f9fc; border:1px solid rgba(26,36,51,0.15); border-radius:2px; color:#1a2433; font-size:13px; font-family:'Barlow',sans-serif; outline:none; }
  .ld-asset-search:focus { border-color:#1e88e5; }
  .ld-asset-list { overflow-y:auto; flex:1; padding:4px 8px 10px; }
  .ld-asset-item { padding:8px 10px; border-radius:2px; border:1px solid rgba(26,36,51,0.1); margin-bottom:4px; cursor:pointer; transition:all 0.12s; }
  .ld-asset-item:hover { border-color:#1e88e5; background:rgba(30,136,229,0.07); }
  .ld-asset-name { font-size:13px; font-weight:600; color:#1a2433; }
  .ld-asset-sub { font-size:11px; color:rgba(26,36,51,0.45); margin-top:2px; }

  /* Templates sidebar section */
  .ld-tmpl-section { border-top:1px solid rgba(26,36,51,0.1); padding-top:10px; margin-top:6px; }
  .ld-tmpl-item { padding:6px 8px; border:1px solid rgba(26,36,51,0.09); border-radius:2px; margin-bottom:4px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:all 0.12s; }
  .ld-tmpl-item:hover { border-color:rgba(26,36,51,0.22); }
  .ld-tmpl-name { font-size:11px; color:rgba(26,36,51,0.6); }
  .ld-tmpl-size { font-size:10px; color:rgba(26,36,51,0.35); }
  .ld-tmpl-del { background:none; border:none; color:rgba(26,36,51,0.25); cursor:pointer; font-size:12px; padding:0 3px; }
  .ld-tmpl-del:hover { color:#ef9a9a; }
`;

function newId() { return Math.random().toString(36).slice(2,9); }
function qrUrl(data, px) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${px}x${px}&bgcolor=ffffff&color=000000&margin=2`;
}

export default function LabelDesigner({ userRole, companyId }) {
  const canvasRef = useRef(null);
  const imgCache  = useRef({});
  const dragRef   = useRef({ active:false });
  const [canvasCursor, setCanvasCursor] = useState('default');

  const updateCursor = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (tool !== 'select') { setCanvasCursor('crosshair'); return; }
    /* check if hovering a handle on selected element */
    if (selected) {
      const el = elements.find(x => x.id === selected);
      if (el) {
        const h = getHandle(el, cx, cy);
        if (h) { setCanvasCursor(handleCursor(h)); return; }
      }
    }
    /* check if hovering any element */
    const hit = getElAt(cx, cy);
    setCanvasCursor(hit ? 'move' : 'default');
  };

  const [sizeId, setSizeId]       = useState('50x25');
  const [elements, setElements]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [tool, setTool]           = useState('select');
  const [bgColor, setBgColor]     = useState('#ffffff');
  const [templates, setTemplates] = useState([]);
  const [assets, setAssets]       = useState([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [showAssets, setShowAssets]   = useState(false);
  const [tmplName, setTmplName]   = useState('');

  const size = SIZES.find(s => s.id === sizeId) || SIZES[2];

  /* ── Display scale so label fits in MAX_DISPLAY ── */
  const dispScale = Math.min(1, MAX_DISPLAY / size.w);
  const dispW = Math.round(size.w * dispScale);
  const dispH = Math.round(size.h * dispScale);

  useEffect(() => {
    if (!document.getElementById('ld-css')) {
      const s = document.createElement('style'); s.id='ld-css'; s.textContent=CSS;
      document.head.appendChild(s);
    }
    loadTemplates();
    loadAssets();

    /* Listen for "Design Label" click from MachineProfile */
    const handleAssetLabel = (e) => {
      const { assetId, assetName, qrUrl } = e.detail || {};
      if (!assetId) return;
      /* Switch to 50x25 size and apply asset preset with this asset's QR */
      setSizeId('50x25');
      const W=200, H=100;
      const id = (type) => Math.random().toString(36).slice(2,9);
      setElements([
        { id:id(), type:'rect',        x:0,      y:0,      w:W,      h:H*0.28, fill:'#0d1826', stroke:'transparent', strokeW:0, radius:0 },
        { id:id(), type:'mechiq_logo', x:3,      y:2,      w:W*0.4,  h:H*0.22, colorMain:'#ffffff', colorAccent:'#2d8cf0' },
        { id:id(), type:'text',        x:2,      y:H*0.30, w:W-4,    h:12,     text: assetName||'Asset Name', fontSize:9, fontFamily:'Barlow', color:'#1a2433', bold:true, italic:false, align:'left' },
        { id:id(), type:'qr',          x:2,      y:H*0.46, w:H*0.5,  h:H*0.5,  assetUrl: qrUrl||'https://mechiq.com.au/scan/'+assetId, assetId, assetLabel:assetName },
        { id:id(), type:'text',        x:H*0.55, y:H*0.48, w:W-H*0.58, h:10,   text:'Scan to start prestart', fontSize:6, fontFamily:'Barlow', color:'#555555', bold:false, italic:false, align:'left' },
        { id:id(), type:'line',        x:0,      y:H*0.28, w:W,      h:2,      fill:'#2d8cf0', strokeW:1.5 },
      ]);
      setSelected(null);
      setBgColor('#ffffff');
    };

    window.addEventListener('mechiq_open_label_designer', handleAssetLabel);

    /* Also check sessionStorage on mount (page reload case) */
    try {
      const preset = sessionStorage.getItem('labelDesigner_preset');
      if (preset) {
        const { assetId, assetName, qrUrl } = JSON.parse(preset);
        sessionStorage.removeItem('labelDesigner_preset');
        handleAssetLabel({ detail: { assetId, assetName, qrUrl } });
      }
    } catch(e) {}

    return () => window.removeEventListener('mechiq_open_label_designer', handleAssetLabel);
  }, []);

  const loadTemplates = async () => {
    let q = supabase.from('label_templates').select('*').order('created_at', { ascending:false });
    if (userRole !== 'master_admin' && companyId) q = q.eq('company_id', companyId);
    const { data } = await q;
    if (data) setTemplates(data);
  };

  const loadAssets = async () => {
    let q = supabase.from('assets').select('id,asset_name,asset_id,company_id').limit(100);
    if (userRole !== 'master_admin' && companyId) q = q.eq('company_id', companyId);
    const { data } = await q;
    if (data) setAssets(data);
  };

  /* ── Render ──────────────────────────────────────── */
  const render = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const sc  = dispScale;
    ctx.clearRect(0, 0, dispW, dispH);

    /* checkerboard for transparent bg */
    const sq = 8;
    for (let r=0; r*sq<dispH; r++) for (let c=0; c*sq<dispW; c++) {
      ctx.fillStyle = (r+c)%2===0 ? '#ccc' : '#fff';
      ctx.fillRect(c*sq, r*sq, sq, sq);
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, dispW, dispH);

    elements.forEach(el => {
      const x=el.x*sc, y=el.y*sc, w=el.w*sc, h=el.h*sc;

      if (el.type==='rect') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1e88e5';
        const r = Math.min((el.radius||0)*sc, w/2, h/2);
        if (r>0) {
          ctx.beginPath();
          ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
          ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r);
          ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(x,y,w,h);
        }
        if ((el.strokeW||0)>0) {
          ctx.strokeStyle = el.stroke||'#000';
          ctx.lineWidth   = el.strokeW*sc;
          if (r>0) ctx.stroke(); else ctx.strokeRect(x,y,w,h);
        }
        ctx.restore();
      }

      if (el.type==='text') {
        ctx.save();
        const fs = Math.max(6,(el.fontSize||10)*sc);
        ctx.font      = `${el.bold?'700':'400'} ${el.italic?'italic ':''} ${fs}px ${el.fontFamily||'Barlow'},Arial`;
        ctx.fillStyle = el.color||'#000000';
        ctx.textAlign = el.align||'left';
        ctx.textBaseline = 'top';
        const lines = (el.text||'').split('\n');
        lines.forEach((line,i) => {
          const tx = el.align==='center'?x+w/2 : el.align==='right'?x+w : x;
          ctx.fillText(line, tx, y+i*fs*1.3);
        });
        ctx.restore();
      }

      if (el.type==='circle') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1e88e5';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
        ctx.fill();
        if ((el.strokeW||0)>0) {
          ctx.strokeStyle = el.stroke||'#000';
          ctx.lineWidth   = el.strokeW*sc;
          ctx.stroke();
        }
        ctx.restore();
      }

      if (el.type==='triangle') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1e88e5';
        ctx.beginPath();
        ctx.moveTo(x+w/2, y);
        ctx.lineTo(x+w, y+h);
        ctx.lineTo(x, y+h);
        ctx.closePath();
        ctx.fill();
        if ((el.strokeW||0)>0) {
          ctx.strokeStyle = el.stroke||'#000';
          ctx.lineWidth   = el.strokeW*sc;
          ctx.stroke();
        }
        ctx.restore();
      }

      if (el.type==='line') {
        ctx.save();
        ctx.strokeStyle = el.fill || '#1a2433';
        ctx.lineWidth   = (el.strokeW||2)*sc;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y+h/2);
        ctx.lineTo(x+w, y+h/2);
        ctx.stroke();
        ctx.restore();
      }

      if (el.type==='star') {
        ctx.save();
        ctx.fillStyle = el.fill || '#f59e0b';
        const cx2=x+w/2, cy2=y+h/2, outerR=Math.min(w,h)/2, innerR=outerR*0.45, pts=5;
        ctx.beginPath();
        for (let i=0;i<pts*2;i++) {
          const ang = (i*Math.PI/pts) - Math.PI/2;
          const r   = i%2===0 ? outerR : innerR;
          if (i===0) ctx.moveTo(cx2+r*Math.cos(ang), cy2+r*Math.sin(ang));
          else ctx.lineTo(cx2+r*Math.cos(ang), cy2+r*Math.sin(ang));
        }
        ctx.closePath();
        ctx.fill();
        if ((el.strokeW||0)>0) { ctx.strokeStyle=el.stroke||'#000'; ctx.lineWidth=el.strokeW*sc; ctx.stroke(); }
        ctx.restore();
      }

      if (el.type==='arrow') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1a2433';
        const aw=w, ah=h, shaftH=ah*0.35, shaftY=y+ah/2-shaftH/2;
        const headW=aw*0.35, shaftW=aw-headW;
        ctx.beginPath();
        ctx.moveTo(x, shaftY);
        ctx.lineTo(x+shaftW, shaftY);
        ctx.lineTo(x+shaftW, y);
        ctx.lineTo(x+aw, y+ah/2);
        ctx.lineTo(x+shaftW, y+ah);
        ctx.lineTo(x+shaftW, shaftY+shaftH);
        ctx.lineTo(x, shaftY+shaftH);
        ctx.closePath();
        ctx.fill();
        if ((el.strokeW||0)>0) { ctx.strokeStyle=el.stroke||'#000'; ctx.lineWidth=el.strokeW*sc; ctx.stroke(); }
        ctx.restore();
      }

      if (el.type==='mechiq_logo') {
        ctx.save();
        const lx=x, ly=y, lw=w, lh=h;
        const fs = Math.max(6, lh*0.65);
        ctx.font = `900 ${fs}px 'Barlow Condensed', Arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        /* MECH in dark */
        ctx.fillStyle = el.colorMain || '#1a2433';
        ctx.fillText('MECH', lx, ly+lh/2);
        const mechW = ctx.measureText('MECH').width;
        /* IQ in blue */
        ctx.fillStyle = el.colorAccent || '#2d8cf0';
        ctx.fillText('IQ', lx+mechW+1, ly+lh/2);
        ctx.restore();
      }

      if (el.type==='qr') {
        const url  = el.assetUrl || 'https://mechiq.com.au';
        const px   = Math.max(60, Math.round(w));
        const key  = `${url}__${px}`;
        if (imgCache.current[key]) {
          ctx.drawImage(imgCache.current[key], x, y, w, h);
        } else {
          const img  = new Image();
          img.crossOrigin = 'anonymous';
          img.src  = qrUrl(url, px);
          img.onload = () => { imgCache.current[key]=img; render(); };
        }
      }

      if (el.type==='image' && el.src) {
        const key = el.src.slice(0,40);
        if (imgCache.current[key]) {
          ctx.drawImage(imgCache.current[key], x, y, w, h);
        } else {
          const img = new Image();
          img.src   = el.src;
          img.onload = () => { imgCache.current[key]=img; render(); };
        }
      }

      /* selection handles */
      if (el.id===selected) {
        ctx.save();
        /* dashed outline */
        ctx.strokeStyle='#1e88e5'; ctx.lineWidth=1.2;
        ctx.setLineDash([4,3]);
        ctx.strokeRect(x-2,y-2,w+4,h+4);
        ctx.setLineDash([]);
        /* 4 corners + 4 edge midpoints — white fill, blue border like Figma/Canva */
        const mx=x+w/2, my=y+h/2;
        const pts=[
          [x-2,y-2],[x+w+2,y-2],[x-2,y+h+2],[x+w+2,y+h+2], /* corners */
          [mx,y-2],[mx,y+h+2],[x-2,my],[x+w+2,my]            /* edge midpoints */
        ];
        pts.forEach(([hx,hy])=>{
          ctx.fillStyle='#ffffff';
          ctx.strokeStyle='#1e88e5';
          ctx.lineWidth=1.5;
          ctx.fillRect(hx-5,hy-5,10,10);
          ctx.strokeRect(hx-5,hy-5,10,10);
        });
        ctx.restore();
      }
    });
  }, [elements, selected, bgColor, dispW, dispH, dispScale]);

  useEffect(() => { render(); }, [render]);

  /* ── Canvas coords helpers ────────────────────────── */
  const toLabelCoords = (cx,cy) => ({ x:cx/dispScale, y:cy/dispScale });
  const getElAt = (cx,cy) => {
    for (let i=elements.length-1;i>=0;i--) {
      const e=elements[i], sc=dispScale;
      if (cx>=e.x*sc && cx<=(e.x+e.w)*sc && cy>=e.y*sc && cy<=(e.y+e.h)*sc) return e;
    }
    return null;
  };
  /* returns handle id: 'tl','tr','bl','br','tm','bm','ml','mr' or null */
  const getHandle = (el,cx,cy) => {
    const sc=dispScale, TOL=8;
    const ex=el.x*sc, ey=el.y*sc, ew=el.w*sc, eh=el.h*sc;
    const mx=ex+ew/2, my=ey+eh/2;
    const pts=[
      ['tl',ex,     ey     ],['tr',ex+ew,ey     ],
      ['bl',ex,     ey+eh  ],['br',ex+ew,ey+eh  ],
      ['tm',mx,     ey     ],['bm',mx,     ey+eh ],
      ['ml',ex,     my     ],['mr',ex+ew,  my    ],
    ];
    for(const [id,hx,hy] of pts){
      if(Math.abs(cx-hx)<=TOL && Math.abs(cy-hy)<=TOL) return id;
    }
    return null;
  };
  /* cursor for handle */
  const handleCursor = (h) => ({
    tl:'nwse-resize', tr:'nesw-resize', bl:'nesw-resize', br:'nwse-resize',
    tm:'ns-resize',   bm:'ns-resize',   ml:'ew-resize',   mr:'ew-resize',
  }[h] || 'default');

  /* ── Mouse handlers ───────────────────────────────── */
  const onDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = e.clientY - rect.top;

    if (tool==='select') {
      const el = getElAt(cx,cy);
      if (!el) { setSelected(null); return; }
      setSelected(el.id);
      const handle = getHandle(el,cx,cy);
      dragRef.current = {
        active:true, id:el.id,
        type: handle ? 'resize' : 'move',
        handle,
        sx:cx, sy:cy, ox:el.x, oy:el.y, ow:el.w, oh:el.h
      };
      return;
    }

    const { x, y } = toLabelCoords(cx,cy);
    let el;
    if (tool==='text')        el = { id:newId(), type:'text',        x, y, w:80,  h:16, text:'Label text', fontSize:10, fontFamily:'Barlow', color:'#000000', bold:false, italic:false, align:'left' };
    if (tool==='rect')        el = { id:newId(), type:'rect',        x, y, w:60,  h:20, fill:'#1e88e5', stroke:'#000000', strokeW:0, radius:0 };
    if (tool==='circle')      el = { id:newId(), type:'circle',      x, y, w:30,  h:30, fill:'#1e88e5', stroke:'#000000', strokeW:0 };
    if (tool==='triangle')    el = { id:newId(), type:'triangle',    x, y, w:40,  h:34, fill:'#1e88e5', stroke:'#000000', strokeW:0 };
    if (tool==='line')        el = { id:newId(), type:'line',        x, y, w:60,  h:4,  fill:'#1a2433', strokeW:2 };
    if (tool==='star')        el = { id:newId(), type:'star',        x, y, w:30,  h:30, fill:'#f59e0b', stroke:'#000000', strokeW:0 };
    if (tool==='arrow')       el = { id:newId(), type:'arrow',       x, y, w:50,  h:20, fill:'#1a2433', stroke:'#000000', strokeW:0 };
    if (tool==='mechiq_logo') el = { id:newId(), type:'mechiq_logo', x, y, w:60,  h:14, colorMain:'#1a2433', colorAccent:'#2d8cf0' };
    if (tool==='qr')          el = { id:newId(), type:'qr',          x, y, w:40,  h:40, assetUrl:'https://mechiq.com.au', assetId:null };
    if (tool==='image') { triggerImageUpload(); return; }
    if (el) { setElements(p=>[...p,el]); setSelected(el.id); setTool('select'); }
    if (tool==='qr')    setShowAssets(true);
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = e.clientY - rect.top;
    const dx   = (cx-d.sx)/dispScale;
    const dy   = (cy-d.sy)/dispScale;
    setElements(prev => prev.map(el => {
      if (el.id!==d.id) return el;
      if (d.type==='move') return { ...el, x:Math.max(0,d.ox+dx), y:Math.max(0,d.oy+dy) };
      if (d.type==='resize') {
        switch(d.handle) {
          case 'br': return { ...el, w:Math.max(6,d.ow+dx),    h:Math.max(6,d.oh+dy) };
          case 'bl': return { ...el, x:d.ox+dx, w:Math.max(6,d.ow-dx), h:Math.max(6,d.oh+dy) };
          case 'tr': return { ...el, y:d.oy+dy, w:Math.max(6,d.ow+dx), h:Math.max(6,d.oh-dy) };
          case 'tl': return { ...el, x:d.ox+dx, y:d.oy+dy, w:Math.max(6,d.ow-dx), h:Math.max(6,d.oh-dy) };
          case 'mr': return { ...el, w:Math.max(6,d.ow+dx) };
          case 'ml': return { ...el, x:d.ox+dx, w:Math.max(6,d.ow-dx) };
          case 'bm': return { ...el, h:Math.max(6,d.oh+dy) };
          case 'tm': return { ...el, y:d.oy+dy, h:Math.max(6,d.oh-dy) };
          default:   return el;
        }
      }
      return el;
    }));
  };

  const onUp = () => { dragRef.current.active=false; };

  /* ── Image upload ─────────────────────────────────── */
  const imgInputRef = useRef(null);
  const triggerImageUpload = () => imgInputRef.current?.click();
  const handleImageFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const el = { id:newId(), type:'image', x:4, y:4, w:40, h:40, src:ev.target.result };
      setElements(p=>[...p,el]); setSelected(el.id); setTool('select');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Selected element accessors ────────────────────── */
  const sel = elements.find(e=>e.id===selected);
  const upd = (k,v) => setElements(p=>p.map(e=>e.id===selected?{...e,[k]:v}:e));
  const delSel  = () => { setElements(p=>p.filter(e=>e.id!==selected)); setSelected(null); };
  const dupSel  = () => {
    if (!sel) return;
    const dup = { ...sel, id:newId(), x:sel.x+8, y:sel.y+8 };
    setElements(p=>[...p,dup]); setSelected(dup.id);
  };
  const bringFwd = () => setElements(p => {
    const i=p.findIndex(e=>e.id===selected); if (i<p.length-1) { const a=[...p]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; } return p;
  });
  const sendBack = () => setElements(p => {
    const i=p.findIndex(e=>e.id===selected); if (i>0) { const a=[...p]; [a[i],a[i-1]]=[a[i-1],a[i]]; return a; } return p;
  });

  /* ── Link asset to QR ─────────────────────────────── */
  const linkAsset = (asset) => {
    const url = `https://mechiq.com.au/scan/${asset.id}`;
    if (sel?.type==='qr') {
      upd('assetUrl', url); upd('assetId', asset.id); upd('assetLabel', asset.asset_name);
    } else {
      const el = { id:newId(), type:'qr', x:4, y:4, w:40, h:40, assetUrl:url, assetId:asset.id, assetLabel:asset.asset_name };
      setElements(p=>[...p,el]); setSelected(el.id);
    }
    setShowAssets(false);
  };

  /* ── Quick preset layouts ─────────────────────────── */
  const applyPreset = (preset) => {
    const W = size.w, H = size.h;
    if (preset==='asset') setElements([
      { id:newId(), type:'rect',        x:0,      y:0,      w:W,      h:H*0.28, fill:'#0d1826', stroke:'transparent', strokeW:0, radius:0 },
      { id:newId(), type:'mechiq_logo', x:3,      y:2,      w:W*0.4,  h:H*0.22, colorMain:'#ffffff', colorAccent:'#2d8cf0' },
      { id:newId(), type:'text',        x:2,      y:H*0.30, w:W-4,    h:12,     text:'ASSET NAME', fontSize:9, fontFamily:'Barlow', color:'#1a2433', bold:true, italic:false, align:'left' },
      { id:newId(), type:'qr',          x:2,      y:H*0.46, w:H*0.5,  h:H*0.5,  assetUrl:'https://mechiq.com.au/scan/', assetId:null },
      { id:newId(), type:'text',        x:H*0.55, y:H*0.48, w:W-H*0.58, h:10,   text:'ID: XXX-001', fontSize:7, fontFamily:'Barlow', color:'#333333', bold:false, italic:false, align:'left' },
      { id:newId(), type:'text',        x:H*0.55, y:H*0.62, w:W-H*0.58, h:10,   text:'Scan to start prestart', fontSize:6, fontFamily:'Barlow', color:'#666666', bold:false, italic:false, align:'left' },
      { id:newId(), type:'line',        x:0,      y:H*0.28, w:W,      h:2,      fill:'#2d8cf0', strokeW:1.5 },
    ]);
    if (preset==='part') setElements([
      { id:newId(), type:'qr',    x:2,    y:2,  w:H-4,  h:H-4,  assetUrl:'https://mechiq.com.au', assetId:null },
      { id:newId(), type:'text',  x:H+2,  y:2,  w:W-H-4, h:12, text:'Part Name', fontSize:9, fontFamily:'Barlow', color:'#000000', bold:true, italic:false, align:'left' },
      { id:newId(), type:'text',  x:H+2,  y:16, w:W-H-4, h:10, text:'SKU: 000000', fontSize:7, fontFamily:'Barlow', color:'#555', bold:false, italic:false, align:'left' },
    ]);
    if (preset==='machine') setElements([
      { id:newId(), type:'rect',  x:0, y:0, w:W, h:H, fill:'#000000', stroke:'transparent', strokeW:0, radius:0 },
      { id:newId(), type:'text',  x:2, y:3, w:W-4, h:12, text:'MACHINE ID', fontSize:8, fontFamily:'Barlow', color:'#1e88e5', bold:true, italic:false, align:'center' },
      { id:newId(), type:'rect',  x:W*0.1, y:H*0.18, w:W*0.8, h:1, fill:'#1e88e5', stroke:'transparent', strokeW:0, radius:0 },
      { id:newId(), type:'qr',    x:W*0.3, y:H*0.22, w:W*0.4, h:W*0.4, assetUrl:'https://mechiq.com.au', assetId:null },
      { id:newId(), type:'text',  x:2, y:H*0.72, w:W-4, h:12, text:'UNIT-001', fontSize:11, fontFamily:'Barlow', color:'#ffffff', bold:true, italic:false, align:'center' },
    ]);
  };

  /* ── Export ──────────────────────────────────────── */
  const exportPNG = () => {
    /* render at 3× for print quality */
    const oc = document.createElement('canvas');
    oc.width=size.w*3; oc.height=size.h*3;
    const ctx=oc.getContext('2d');
    const sc=3;
    ctx.fillStyle=bgColor; ctx.fillRect(0,0,oc.width,oc.height);
    elements.forEach(el => {
      const x=el.x*sc, y=el.y*sc, w=el.w*sc, h=el.h*sc;
      if (el.type==='rect') {
        ctx.fillStyle=el.fill||'#1e88e5';
        const r=Math.min((el.radius||0)*sc,w/2,h/2);
        if (r>0) {
          ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
          ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
          ctx.closePath(); ctx.fill();
        } else { ctx.fillRect(x,y,w,h); }
        if ((el.strokeW||0)>0) { ctx.strokeStyle=el.stroke||'#000'; ctx.lineWidth=el.strokeW*sc; ctx.strokeRect(x,y,w,h); }
      }
      if (el.type==='text') {
        const fs=Math.max(6,(el.fontSize||10)*sc);
        ctx.font=`${el.bold?'700':'400'} ${fs}px ${el.fontFamily||'Barlow'},Arial`;
        ctx.fillStyle=el.color||'#000';
        ctx.textAlign=el.align||'left';
        ctx.textBaseline='top';
        (el.text||'').split('\n').forEach((line,i)=>{
          const tx=el.align==='center'?x+w/2:el.align==='right'?x+w:x;
          ctx.fillText(line,tx,y+i*fs*1.3);
        });
      }
      if (el.type==='circle') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1e88e5';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
        ctx.fill();
        if ((el.strokeW||0)>0) {
          ctx.strokeStyle = el.stroke||'#000';
          ctx.lineWidth   = el.strokeW*sc;
          ctx.stroke();
        }
        ctx.restore();
      }

      if (el.type==='triangle') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1e88e5';
        ctx.beginPath();
        ctx.moveTo(x+w/2, y);
        ctx.lineTo(x+w, y+h);
        ctx.lineTo(x, y+h);
        ctx.closePath();
        ctx.fill();
        if ((el.strokeW||0)>0) {
          ctx.strokeStyle = el.stroke||'#000';
          ctx.lineWidth   = el.strokeW*sc;
          ctx.stroke();
        }
        ctx.restore();
      }

      if (el.type==='line') {
        ctx.save();
        ctx.strokeStyle = el.fill || '#1a2433';
        ctx.lineWidth   = (el.strokeW||2)*sc;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y+h/2);
        ctx.lineTo(x+w, y+h/2);
        ctx.stroke();
        ctx.restore();
      }

      if (el.type==='star') {
        ctx.save();
        ctx.fillStyle = el.fill || '#f59e0b';
        const cx2=x+w/2, cy2=y+h/2, outerR=Math.min(w,h)/2, innerR=outerR*0.45, pts=5;
        ctx.beginPath();
        for (let i=0;i<pts*2;i++) {
          const ang = (i*Math.PI/pts) - Math.PI/2;
          const r   = i%2===0 ? outerR : innerR;
          if (i===0) ctx.moveTo(cx2+r*Math.cos(ang), cy2+r*Math.sin(ang));
          else ctx.lineTo(cx2+r*Math.cos(ang), cy2+r*Math.sin(ang));
        }
        ctx.closePath();
        ctx.fill();
        if ((el.strokeW||0)>0) { ctx.strokeStyle=el.stroke||'#000'; ctx.lineWidth=el.strokeW*sc; ctx.stroke(); }
        ctx.restore();
      }

      if (el.type==='arrow') {
        ctx.save();
        ctx.fillStyle = el.fill || '#1a2433';
        const aw=w, ah=h, shaftH=ah*0.35, shaftY=y+ah/2-shaftH/2;
        const headW=aw*0.35, shaftW=aw-headW;
        ctx.beginPath();
        ctx.moveTo(x, shaftY);
        ctx.lineTo(x+shaftW, shaftY);
        ctx.lineTo(x+shaftW, y);
        ctx.lineTo(x+aw, y+ah/2);
        ctx.lineTo(x+shaftW, y+ah);
        ctx.lineTo(x+shaftW, shaftY+shaftH);
        ctx.lineTo(x, shaftY+shaftH);
        ctx.closePath();
        ctx.fill();
        if ((el.strokeW||0)>0) { ctx.strokeStyle=el.stroke||'#000'; ctx.lineWidth=el.strokeW*sc; ctx.stroke(); }
        ctx.restore();
      }

      if (el.type==='mechiq_logo') {
        ctx.save();
        const lx=x, ly=y, lw=w, lh=h;
        const fs = Math.max(6, lh*0.65);
        ctx.font = `900 ${fs}px 'Barlow Condensed', Arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        /* MECH in dark */
        ctx.fillStyle = el.colorMain || '#1a2433';
        ctx.fillText('MECH', lx, ly+lh/2);
        const mechW = ctx.measureText('MECH').width;
        /* IQ in blue */
        ctx.fillStyle = el.colorAccent || '#2d8cf0';
        ctx.fillText('IQ', lx+mechW+1, ly+lh/2);
        ctx.restore();
      }

      if (el.type==='qr') {
        const key=(el.assetUrl||'')+'__'+Math.round(w);
        if (imgCache.current[key]) ctx.drawImage(imgCache.current[key],x,y,w,h);
      }
      if (el.type==='image'&&el.src) {
        const key=el.src.slice(0,40);
        if (imgCache.current[key]) ctx.drawImage(imgCache.current[key],x,y,w,h);
      }
    });
    const link=document.createElement('a');
    link.download=`mechiq-label-${sizeId}.png`;
    link.href=oc.toDataURL('image/png');
    link.click();
  };

  /* ── Save / load templates ───────────────────────── */
  const saveTemplate = async () => {
    if (!tmplName.trim()) return;
    await supabase.from('label_templates').insert({
      name: tmplName.trim(),
      size: sizeId,
      elements: JSON.stringify(elements),
      background: bgColor,
      company_id: companyId||null,
      created_by_role: userRole,
    });
    setTmplName('');
    loadTemplates();
  };

  const loadTemplate = (t) => {
    const s=SIZES.find(x=>x.id===t.size)||SIZES[2];
    setSizeId(s.id);
    setElements(JSON.parse(t.elements||'[]'));
    setBgColor(t.background||'#ffffff');
    setSelected(null);
  };

  const delTemplate = async (id,e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this template?')) return;
    await supabase.from('label_templates').delete().eq('id',id);
    loadTemplates();
  };

  const filteredAssets = assets.filter(a =>
    a.asset_name?.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.asset_id?.toLowerCase().includes(assetSearch.toLowerCase())
  );


  return (
    <div className="ld-wrap">
      <input type="file" ref={imgInputRef} accept="image/*" style={{display:'none'}} onChange={handleImageFile} />

      {/* ── Top action bar ── */}
      <div className="ld-topbar">
        <span className="ld-topbar-title">Label Designer</span>
        <div className="ld-topbar-sep" />
        <button className="ld-tb-btn" onClick={() => applyPreset('asset')}>Asset preset</button>
        <button className="ld-tb-btn" onClick={() => applyPreset('machine')}>Machine ID</button>
        <button className="ld-tb-btn" onClick={() => applyPreset('part')}>Parts</button>
        <div className="ld-topbar-sep" />
        <button className="ld-tb-btn" onClick={() => setElements([])} title="Clear canvas">Clear</button>
        <div className="ld-tb-spacer" />
        <input className="ld-tb-input" placeholder="Template name…" value={tmplName} onChange={e=>setTmplName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveTemplate()} />
        <button className="ld-tb-btn" onClick={saveTemplate}>Save</button>
        <div className="ld-topbar-sep" />
        <button className="ld-tb-btn blue" onClick={exportPNG}>Export PNG</button>
      </div>

      <div className="ld-body">
        {/* ── Tool sidebar ── */}
        <div className="ld-tools">
          {[
            { id:'select', label:'SEL',  title:'Select & move' },
            { id:'text',   label:'T',    title:'Add text' },
            { id:'rect',   label:'▭',    title:'Add rectangle' },
            { id:'qr',     label:'QR',   title:'Add QR code' },
            { id:'image',  label:'IMG',  title:'Add image / logo' },
          ].map(t => (
            <React.Fragment key={t.id}>
              <button className={`ld-t${tool===t.id?' on':''}`} onClick={()=>setTool(t.id)} title={t.title}>
                {t.label}
              </button>
              {t.id==='select' && <div className="ld-t-sep" />}
            </React.Fragment>
          ))}
          <div className="ld-t-sep" />
          <button className="ld-t" title="Bring forward" onClick={bringFwd}>↑</button>
          <button className="ld-t" title="Send back"    onClick={sendBack}>↓</button>
          <div className="ld-t-sep" />
          <button className="ld-t" title="Link asset to QR" onClick={()=>setShowAssets(true)}>🔗</button>
        </div>

        {/* ── Canvas ── */}
        <div className="ld-center">
          <div className="ld-size-row">
            {SIZES.map(s => (
              <button key={s.id} className={`ld-sz${sizeId===s.id?' on':''}`} onClick={()=>setSizeId(s.id)}>{s.mm}</button>
            ))}
          </div>
          <div className="ld-canvas-outer" style={{ width:dispW, height:dispH }}>
            <canvas
              ref={canvasRef}
              className="ld-cv"
              width={dispW}
              height={dispH}
              style={{ cursor:canvasCursor, userSelect:'none' }}
              onMouseDown={onDown}
              onMouseMove={(e)=>{ onMove(e); updateCursor(e); }}
              onMouseUp={onUp}
              onMouseLeave={()=>{ onUp(); setCanvasCursor(tool==='select'?'default':'crosshair'); }}
            />
          </div>
          <div style={{ fontSize:10, color:'rgba(221,227,237,0.25)' }}>
            {size.mm} · canvas {size.w}×{size.h}px · displayed at {Math.round(dispScale*100)}%
          </div>
        </div>

        {/* ── Properties panel ── */}
        <div className="ld-props">
          <div className="ld-ph">Properties</div>

          {!sel && (
            <>
              <div className="ld-no-sel">Select an element to edit its properties, or use the tools on the left to add one.</div>
              <div className="ld-bg-row">
                <span className="ld-bg-lbl">Background</span>
                <input type="color" className="ld-pcol" style={{width:44,height:26}} value={bgColor} onChange={e=>setBgColor(e.target.value)} />
              </div>
              <div className="ld-psep" />
              <div className="ld-ph">Saved Templates</div>
              <div className="ld-tmpl-section">
                {templates.length===0 && <div className="ld-no-sel">No saved templates yet.</div>}
                {templates.map(t => (
                  <div key={t.id} className="ld-tmpl-item" onClick={()=>loadTemplate(t)}>
                    <div>
                      <div className="ld-tmpl-name">{t.name}</div>
                      <div className="ld-tmpl-size">{SIZES.find(s=>s.id===t.size)?.mm||t.size}</div>
                    </div>
                    <button className="ld-tmpl-del" onClick={e=>delTemplate(t.id,e)}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {sel && (
            <>
              <div className="ld-pf">
                <span className="ld-pl">Position</span>
                <div className="ld-pr">
                  <input className="ld-pi" type="number" placeholder="X" value={Math.round(sel.x)} onChange={e=>upd('x',+e.target.value)} />
                  <input className="ld-pi" type="number" placeholder="Y" value={Math.round(sel.y)} onChange={e=>upd('y',+e.target.value)} />
                </div>
              </div>
              <div className="ld-pf">
                <span className="ld-pl">Size</span>
                <div className="ld-pr">
                  <input className="ld-pi" type="number" placeholder="W" value={Math.round(sel.w)} onChange={e=>upd('w',+e.target.value)} />
                  <input className="ld-pi" type="number" placeholder="H" value={Math.round(sel.h)} onChange={e=>upd('h',+e.target.value)} />
                </div>
              </div>
              <div className="ld-psep" />

              {sel.type==='text' && (
                <>
                  <div className="ld-pf">
                    <span className="ld-pl">Text</span>
                    <textarea className="ld-pi" rows={3} style={{resize:'vertical'}} value={sel.text||''} onChange={e=>upd('text',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Font</span>
                    <select className="ld-psel" value={sel.fontFamily||'Barlow'} onChange={e=>upd('fontFamily',e.target.value)}>
                      {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Size (px)</span>
                    <input className="ld-pi" type="number" min={5} max={120} value={sel.fontSize||10} onChange={e=>upd('fontSize',+e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Colour</span>
                    <input type="color" className="ld-pcol" value={sel.color||'#000000'} onChange={e=>upd('color',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Align</span>
                    <select className="ld-psel" value={sel.align||'left'} onChange={e=>upd('align',e.target.value)}>
                      <option value="left">Left</option>
                      <option value="center">Centre</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <label className="ld-pchk"><input type="checkbox" checked={!!sel.bold} onChange={e=>upd('bold',e.target.checked)} /> Bold</label>
                  <label className="ld-pchk"><input type="checkbox" checked={!!sel.italic} onChange={e=>upd('italic',e.target.checked)} /> Italic</label>
                </>
              )}

              {sel.type==='rect' && (
                <>
                  <div className="ld-pf">
                    <span className="ld-pl">Fill colour</span>
                    <input type="color" className="ld-pcol" value={sel.fill||'#1e88e5'} onChange={e=>upd('fill',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Border colour</span>
                    <input type="color" className="ld-pcol" value={sel.stroke||'#000000'} onChange={e=>upd('stroke',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Border width</span>
                    <input className="ld-pi" type="number" min={0} max={20} value={sel.strokeW||0} onChange={e=>upd('strokeW',+e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Corner radius</span>
                    <input className="ld-pi" type="number" min={0} max={50} value={sel.radius||0} onChange={e=>upd('radius',+e.target.value)} />
                  </div>
                </>
              )}

              {(sel.type==='circle'||sel.type==='triangle'||sel.type==='star'||sel.type==='arrow') && (
                <>
                  <div className="ld-pf">
                    <span className="ld-pl">Fill colour</span>
                    <input type="color" className="ld-pcol" value={sel.fill||'#1e88e5'} onChange={e=>upd('fill',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Border colour</span>
                    <input type="color" className="ld-pcol" value={sel.stroke||'#000000'} onChange={e=>upd('stroke',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Border width</span>
                    <input className="ld-pi" type="number" min={0} max={20} value={sel.strokeW||0} onChange={e=>upd('strokeW',+e.target.value)} />
                  </div>
                </>
              )}

              {sel.type==='line' && (
                <>
                  <div className="ld-pf">
                    <span className="ld-pl">Line colour</span>
                    <input type="color" className="ld-pcol" value={sel.fill||'#1a2433'} onChange={e=>upd('fill',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Thickness</span>
                    <input className="ld-pi" type="number" min={1} max={20} value={sel.strokeW||2} onChange={e=>upd('strokeW',+e.target.value)} />
                  </div>
                </>
              )}

              {sel.type==='mechiq_logo' && (
                <>
                  <div className="ld-pf">
                    <span className="ld-pl">MECH colour</span>
                    <input type="color" className="ld-pcol" value={sel.colorMain||'#1a2433'} onChange={e=>upd('colorMain',e.target.value)} />
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">IQ colour</span>
                    <input type="color" className="ld-pcol" value={sel.colorAccent||'#2d8cf0'} onChange={e=>upd('colorAccent',e.target.value)} />
                  </div>
                </>
              )}

              {sel.type==='qr' && (
                <>
                  <div className="ld-pf">
                    <span className="ld-pl">Linked asset</span>
                    <div style={{fontSize:11,color:sel.assetLabel?'#64b5f6':'rgba(221,227,237,0.3)',marginBottom:6,wordBreak:'break-all'}}>
                      {sel.assetLabel || 'Not linked — click below'}
                    </div>
                    <button className="ld-pdup" onClick={()=>setShowAssets(true)}>Change asset →</button>
                  </div>
                  <div className="ld-pf">
                    <span className="ld-pl">Custom URL</span>
                    <input className="ld-pi" value={sel.assetUrl||''} onChange={e=>upd('assetUrl',e.target.value)} placeholder="https://…" />
                  </div>
                </>
              )}

              {sel.type==='image' && (
                <div className="ld-pf">
                  <button className="ld-pdup" onClick={triggerImageUpload}>Replace image</button>
                </div>
              )}

              <div className="ld-psep" />
              <button className="ld-pdup" onClick={dupSel}>Duplicate element</button>
              <button className="ld-pdel" onClick={delSel}>Delete element</button>
            </>
          )}
        </div>
      </div>

      {/* ── Asset picker modal ── */}
      {showAssets && (
        <div className="ld-asset-modal" onClick={e=>e.target===e.currentTarget&&setShowAssets(false)}>
          <div className="ld-asset-box">
            <div className="ld-asset-head">
              <span className="ld-asset-title">Link asset to QR code</span>
              <button className="ld-asset-close" onClick={()=>setShowAssets(false)}>✕</button>
            </div>
            <input className="ld-asset-search" placeholder="Search assets…" value={assetSearch} onChange={e=>setAssetSearch(e.target.value)} />
            <div className="ld-asset-list">
              {filteredAssets.length===0 && <div style={{fontSize:12,color:'rgba(221,227,237,0.3)',padding:'12px 4px'}}>No assets found.</div>}
              {filteredAssets.map(a => (
                <div key={a.id} className="ld-asset-item" onClick={()=>linkAsset(a)}>
                  <div className="ld-asset-name">{a.asset_name}</div>
                  <div className="ld-asset-sub">{a.asset_id} · QR → mechiq.com.au/scan/{a.id.slice(0,8)}…</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
