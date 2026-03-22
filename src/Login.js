import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const CSS = `
  @keyframes lp-up    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lp-blob  { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }
  @keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes lp-spin  { to{transform:rotate(360deg)} }

  .lp { min-height:100vh; background:var(--bg); color:var(--text-primary); font-family:var(--font-body); overflow-x:hidden; }

  /* ── Nav ── */
  .lp-nav {
    position:fixed; top:0; left:0; right:0; z-index:200;
    height:66px; display:flex; align-items:center; justify-content:space-between;
    padding:0 5vw;
    background:var(--surface);
    border-bottom:2px solid var(--accent);
    box-shadow:0 2px 24px rgba(0,0,0,0.18);
  }
  .lp-logo { display:flex; align-items:center; gap:0; }
  .lp-logo-text { font-family:var(--font-display); font-size:26px; font-weight:900; letter-spacing:3px; line-height:1; }
  .lp-logo-mech { color:var(--text-primary); }
  .lp-logo-iq   { color:var(--accent); }
  .lp-logo-tag  { font-size:9px; color:var(--text-muted); letter-spacing:2px; text-transform:uppercase; margin-left:10px; padding-left:10px; border-left:1px solid var(--border); line-height:1.3; display:flex; flex-direction:column; }

  .lp-nav-right { display:flex; gap:10px; align-items:center; }
  .lp-nav-contact {
    padding:7px 16px; border-radius:7px;
    border:1px solid var(--border); background:transparent;
    color:var(--text-secondary); font-size:12px; font-weight:600;
    cursor:pointer; transition:all 0.15s; font-family:var(--font-body);
    text-decoration:none; display:inline-flex; align-items:center;
  }
  .lp-nav-contact:hover { border-color:var(--accent); color:var(--accent); }
  .lp-nav-login {
    padding:8px 20px; border-radius:7px;
    background:var(--accent); border:none; color:#fff;
    font-size:13px; font-weight:700; cursor:pointer;
    transition:all 0.15s; font-family:var(--font-body);
  }
  .lp-nav-login:hover { background:var(--accent-dark); transform:translateY(-1px); }

  /* ── Hero ── */
  .lp-hero {
    min-height:100vh; display:flex; align-items:center;
    padding:100px 5vw 70px; position:relative; overflow:hidden;
  }
  .lp-blob {
    position:absolute; border-radius:50%;
    filter:blur(100px); pointer-events:none; opacity:0.07;
    animation:lp-blob 14s ease-in-out infinite;
  }
  .lp-hero-grid {
    display:grid; grid-template-columns:1fr 400px; gap:64px;
    align-items:center; max-width:1200px; margin:0 auto; width:100%;
    position:relative; z-index:1;
  }

  .lp-eyebrow {
    display:inline-flex; align-items:center; gap:7px;
    padding:5px 14px; border-radius:20px; margin-bottom:20px;
    background:rgba(14,165,233,0.1); border:1px solid rgba(14,165,233,0.25);
    color:var(--accent); font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
    animation:lp-up 0.6s ease both;
  }
  .lp-hero-title {
    font-family:var(--font-display); font-size:clamp(36px,4.5vw,64px);
    font-weight:900; line-height:1.08; letter-spacing:-0.5px; margin-bottom:18px;
    animation:lp-up 0.6s 0.1s ease both;
  }
  .lp-hero-title .hl { color:var(--accent); }
  .lp-hero-sub {
    font-size:clamp(14px,1.8vw,17px); color:var(--text-muted);
    line-height:1.8; max-width:480px; margin-bottom:32px;
    animation:lp-up 0.6s 0.2s ease both;
  }
  .lp-hero-actions { display:flex; gap:10px; flex-wrap:wrap; animation:lp-up 0.6s 0.3s ease both; }
  .lp-btn-primary {
    padding:12px 28px; border-radius:9px; background:var(--accent); border:none;
    color:#fff; font-size:14px; font-weight:700; cursor:pointer;
    font-family:var(--font-body); transition:all 0.2s;
  }
  .lp-btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(14,165,233,0.3); }
  .lp-btn-outline {
    padding:12px 24px; border-radius:9px;
    background:transparent; border:1px solid var(--border);
    color:var(--text-secondary); font-size:14px; font-weight:600;
    cursor:pointer; font-family:var(--font-body); transition:all 0.2s;
    text-decoration:none; display:inline-flex; align-items:center;
  }
  .lp-btn-outline:hover { border-color:var(--accent); color:var(--accent); }

  /* ── Login card ── */
  .lp-card {
    background:var(--surface); border:1px solid var(--border);
    border-radius:18px; padding:36px 30px;
    box-shadow:0 20px 60px rgba(0,0,0,0.25);
    animation:lp-up 0.7s 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }
  .lp-card-logo { text-align:center; margin-bottom:22px; }
  .lp-card-logo .wm { font-family:var(--font-display); font-size:28px; font-weight:900; letter-spacing:2.5px; }
  .lp-card-logo .tg { font-size:9px; color:var(--text-muted); letter-spacing:2px; text-transform:uppercase; margin-top:4px; }

  .lp-tabs { display:flex; border-bottom:1px solid var(--border); margin-bottom:20px; }
  .lp-tab {
    flex:1; padding:9px 6px; background:none; border:none;
    border-bottom:2px solid transparent; color:var(--text-muted);
    font-size:12px; font-weight:600; cursor:pointer;
    font-family:var(--font-body); transition:all 0.15s;
  }
  .lp-tab.on { color:var(--accent); border-bottom-color:var(--accent); }

  .lp-field { margin-bottom:13px; }
  .lp-lbl { display:block; font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:5px; letter-spacing:0.3px; }
  .lp-inp {
    width:100%; padding:11px 13px; box-sizing:border-box;
    background:var(--surface-2) !important; color:var(--text-primary) !important;
    border:1px solid var(--border) !important; border-radius:8px !important;
    font-size:14px !important; font-family:var(--font-body) !important;
    outline:none !important; transition:border-color 0.15s, box-shadow 0.15s !important;
  }
  .lp-inp:focus { border-color:var(--accent) !important; box-shadow:0 0 0 3px var(--accent-glow) !important; }
  .lp-inp::placeholder { color:var(--text-faint) !important; }
  .lp-go {
    width:100%; padding:12px; border-radius:8px; background:var(--accent);
    border:none; color:#fff; font-size:14px; font-weight:700;
    font-family:var(--font-body); cursor:pointer; margin-top:6px;
    transition:all 0.15s; box-shadow:0 2px 10px var(--accent-glow);
  }
  .lp-go:hover { background:var(--accent-dark); transform:translateY(-1px); }
  .lp-go:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .lp-go.loading { pointer-events:none; }
  .lp-err { padding:9px 12px; border-radius:7px; background:var(--red-bg); border:1px solid var(--red-border); color:var(--red); font-size:12px; margin-bottom:11px; line-height:1.5; }
  .lp-ok  { padding:9px 12px; border-radius:7px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); color:var(--green); font-size:12px; margin-bottom:11px; line-height:1.5; }

  /* ── Stats ── */
  .lp-stats {
    display:flex; border-top:1px solid var(--border); border-bottom:1px solid var(--border);
    background:rgba(14,165,233,0.03);
  }
  .lp-stat { flex:1; text-align:center; padding:28px 12px; border-right:1px solid var(--border); }
  .lp-stat:last-child { border-right:none; }
  .lp-stat-n { font-family:var(--font-display); font-size:28px; font-weight:900; color:var(--accent); }
  .lp-stat-l { font-size:11px; color:var(--text-muted); font-weight:500; margin-top:4px; letter-spacing:0.5px; }

  /* ── Features accordion ── */
  .lp-features { max-width:960px; margin:0 auto; padding:90px 5vw; }
  .lp-feat-header { text-align:center; margin-bottom:52px; }
  .lp-sec-label { font-size:10px; font-weight:700; color:var(--accent); letter-spacing:2.5px; text-transform:uppercase; margin-bottom:10px; }
  .lp-sec-title { font-family:var(--font-display); font-size:clamp(26px,3.5vw,42px); font-weight:800; line-height:1.15; margin-bottom:12px; }
  .lp-sec-sub { font-size:15px; color:var(--text-muted); max-width:520px; margin:0 auto; line-height:1.7; }

  .lp-accordion { border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  .lp-acc-item { border-bottom:1px solid var(--border); }
  .lp-acc-item:last-child { border-bottom:none; }
  .lp-acc-head {
    display:flex; align-items:center; gap:14px;
    padding:18px 22px; cursor:pointer; user-select:none;
    background:var(--surface); transition:background 0.15s;
  }
  .lp-acc-head:hover { background:var(--surface-2); }
  .lp-acc-icon { font-size:22px; flex-shrink:0; width:36px; text-align:center; animation:lp-float 5s ease-in-out infinite; }
  .lp-acc-title { font-size:15px; font-weight:700; color:var(--text-primary); flex:1; }
  .lp-acc-tags { display:flex; gap:6px; flex-shrink:0; }
  .lp-tag {
    font-size:9px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase;
    padding:2px 8px; border-radius:20px;
  }
  .lp-tag-ai     { background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.25); }
  .lp-tag-export { background:rgba(34,197,94,0.12); color:var(--green); border:1px solid rgba(34,197,94,0.25); }
  .lp-tag-live   { background:rgba(14,165,233,0.12); color:var(--accent); border:1px solid rgba(14,165,233,0.25); }
  .lp-tag-mobile { background:rgba(245,158,11,0.12); color:var(--amber); border:1px solid rgba(245,158,11,0.25); }
  .lp-acc-chevron { font-size:11px; color:var(--text-muted); transition:transform 0.2s; flex-shrink:0; }
  .lp-acc-chevron.open { transform:rotate(180deg); }

  .lp-acc-body {
    overflow:hidden; transition:max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s;
    max-height:0; opacity:0;
  }
  .lp-acc-body.open { max-height:600px; opacity:1; }
  .lp-acc-inner { padding:0 22px 22px 72px; }
  .lp-acc-desc { font-size:14px; color:var(--text-muted); line-height:1.75; margin-bottom:16px; }
  .lp-acc-bullets { display:flex; flex-direction:column; gap:7px; margin-bottom:16px; }
  .lp-acc-bullet { display:flex; gap:10px; align-items:flex-start; font-size:13px; color:var(--text-secondary); line-height:1.5; }
  .lp-acc-bullet-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); margin-top:6px; flex-shrink:0; }
  .lp-acc-ai-box {
    background:rgba(168,85,247,0.07); border:1px solid rgba(168,85,247,0.2);
    border-radius:10px; padding:12px 14px; margin-top:10px;
    display:flex; gap:10px; align-items:flex-start;
  }
  .lp-acc-export-box {
    background:rgba(34,197,94,0.07); border:1px solid rgba(34,197,94,0.2);
    border-radius:10px; padding:12px 14px; margin-top:8px;
    display:flex; gap:10px; align-items:flex-start;
  }
  .lp-acc-box-icon { font-size:16px; flex-shrink:0; margin-top:1px; }
  .lp-acc-box-text { font-size:12px; color:var(--text-secondary); line-height:1.6; }
  .lp-acc-box-label { font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:3px; }
  .lp-acc-ai-label    { color:#c084fc; }
  .lp-acc-export-label{ color:var(--green); }

  /* ── CTA ── */
  .lp-cta {
    text-align:center; padding:80px 5vw;
    border-top:1px solid var(--border);
    background:linear-gradient(160deg, rgba(14,165,233,0.05) 0%, transparent 60%);
  }

  /* ── Footer ── */
  .lp-footer {
    padding:28px 5vw; border-top:1px solid var(--border);
    display:flex; justify-content:space-between; align-items:center;
    flex-wrap:wrap; gap:12px;
  }
  .lp-footer-logo { font-family:var(--font-display); font-size:18px; font-weight:900; letter-spacing:2px; }

  @media(max-width:900px) {
    .lp-hero-grid { grid-template-columns:1fr; }
    .lp-card { max-width:460px; margin:0 auto; }
    .lp-stats { flex-wrap:wrap; }
    .lp-stat { min-width:140px; }
    .lp-acc-inner { padding:0 16px 18px 16px; }
  }
  @media(max-width:520px) {
    .lp-nav { padding:0 4vw; }
    .lp-logo-tag { display:none; }
    .lp-acc-tags { display:none; }
    .lp-hero { padding:90px 4vw 40px; }
  }
`;

const FEATURES = [
  {
    icon: '📊', name: 'Live Dashboard',
    tags: ['live', 'export'],
    desc: 'Your entire fleet status at a glance — the moment you open the app you can see what\'s broken, what\'s overdue and what needs attention today.',
    bullets: [
      'Customisable widget layout — choose and arrange exactly what you want to see',
      'Current breakdowns, overdue services, priority work orders and oil alerts all in one view',
      'Service interval progress bars showing hours to next service per asset',
      'Click any widget to expand the full detail list',
    ],
    ai: 'AI surfaces critical patterns — if multiple assets show similar failure modes it flags them together so you can act before more go down.',
    export: 'Export the full dashboard summary as a PDF report for management or client reporting.',
  },
  {
    icon: '🚛', name: 'Asset Management',
    tags: ['live', 'ai', 'export'],
    desc: 'A complete digital record for every machine in your fleet. From the moment an asset is onboarded, everything about it lives in one place.',
    bullets: [
      'Asset register with make, model, year, hours, location and status',
      'Per-asset tabs: Work Orders, Service Schedule, Oil Sampling, Downtime, Documents, Depreciation',
      'Upload manuals and schematics — accessible to all technicians in the field',
      'Quick breakdown logging from the asset card — one tap to create a work order',
      'QR code scanning to pull up any asset instantly',
    ],
    ai: 'AI generates onboarding checklists and service schedules automatically from the asset type and manufacturer recommendations.',
    export: 'Export full asset profiles as PDF — useful for insurance, audits or client handovers.',
  },
  {
    icon: '📋', name: 'AI Form Builder & Prestarts',
    tags: ['ai', 'mobile'],
    desc: 'Stop building checklists manually. Describe a machine and our AI generates a complete prestart checklist in seconds — ready to deploy to your team.',
    bullets: [
      'AI-generated checklists tailored to the specific machine type',
      'Technicians complete forms on their phone — works offline',
      'Photo capture and signature collection built in',
      'Hours entry on prestart automatically updates service schedules',
      'Service sheets linked directly to work orders and asset profiles',
    ],
    ai: 'AI builds the entire form for you — just enter the machine type and it generates all relevant inspection points, safety checks and sign-off fields.',
    export: null,
  },
  {
    icon: '🔧', name: 'Maintenance & Work Orders',
    tags: ['live', 'export'],
    desc: 'Full planned and reactive maintenance tracking — from scheduled services to emergency breakdowns, every job is logged, assigned and followed through.',
    bullets: [
      'Service schedules by hours, kilometres, days or months',
      'Colour-coded calendar showing all upcoming and overdue services',
      'Work orders with priority, assignment, due date and status tracking',
      'One-tap service sheets from any work order or service schedule row',
      'Maintenance history per asset — complete job timeline',
    ],
    ai: null,
    export: 'Export work orders and maintenance history to Excel or PDF — full audit trail for compliance and client reporting.',
  },
  {
    icon: '🔩', name: 'Parts Inventory',
    tags: ['ai', 'export', 'mobile'],
    desc: 'Know exactly what you have, where it is and when you\'re running low — without spreadsheets.',
    bullets: [
      'Parts register with stock levels, minimum quantities and reorder alerts',
      'QR sticker printing — print A4 sheets of part labels for your storeroom',
      'Automatic stock deduction when parts are used on service sheets',
      'Usage history by asset — see which machines consume the most parts',
      'Stocktake mode for periodic inventory counts',
    ],
    ai: 'AI photo scanning — point your camera at any part and it identifies it, matches it to your inventory and adjusts the stock count.',
    export: 'Export current stock levels or full usage history to Excel for procurement and budgeting.',
  },
  {
    icon: '🧪', name: 'Oil Sampling',
    tags: ['ai', 'export'],
    desc: 'Track oil sample results across your fleet and catch wear, contamination and component failures before they cause a breakdown.',
    bullets: [
      'Log samples per asset and component (engine, hydraulics, gearbox, etc.)',
      'Track wear metals, viscosity and contamination readings over time',
      'Visual trend charts per asset component',
      'CRITICAL and WARNING alerts surfaced on the dashboard instantly',
    ],
    ai: 'AI analyses each sample result against fleet averages and manufacturer limits — giving you a plain-English condition summary and recommended action.',
    export: 'Export full oil sample history per asset or across the fleet as CSV or PDF for lab records and compliance.',
  },
  {
    icon: '📉', name: 'Downtime & Availability',
    tags: ['live', 'export'],
    desc: 'Track every breakdown and planned outage. Understand exactly how much your fleet is costing you in lost productivity.',
    bullets: [
      'Log unplanned downtime with cause category, hours lost and resolution',
      'Machine availability percentage calculated automatically',
      'Downtime by asset, category and time period',
      'Monthly summary on the dashboard — hours lost at a glance',
    ],
    ai: null,
    export: 'Export downtime reports by asset, date range or category — useful for insurance claims, client reporting and budget justification.',
  },
  {
    icon: '💰', name: 'Depreciation Calculator',
    tags: ['ai', 'export'],
    desc: 'Understand the true current value of every asset and make informed decisions about repair vs replace.',
    bullets: [
      'Multiple depreciation methods — straight line, declining balance, hours-based',
      'Book value vs estimated market value comparison',
      'Cost per hour / cost per kilometre calculations',
      'Calculation history saved per asset',
    ],
    ai: 'AI analyses the asset\'s condition, usage patterns and maintenance history to recommend whether to repair, repurpose or replace — with reasoning.',
    export: 'Save and download depreciation reports as PDF — ready for accountants, auditors or asset disposal decisions.',
  },
  {
    icon: '📈', name: 'Reports & Data Export',
    tags: ['export'],
    desc: 'Every record in MechIQ is exportable. Whether you need a management report, a compliance audit or a full data backup — it\'s one click.',
    bullets: [
      'Full ZIP export — PDFs of every work order and prestart, plus Excel of all tables',
      'Individual CSV exports of assets, maintenance, downtime, parts and more',
      'OneDrive sync — automatic dated backup to your Microsoft OneDrive',
      'Company-wide report cards with availability, utilisation and cost metrics',
    ],
    ai: null,
    export: 'Export to Excel, CSV, PDF or sync directly to OneDrive — all formats available in one click from the Reports page.',
  },
  {
    icon: '☁️', name: 'OneDrive Sync',
    tags: ['export'],
    desc: 'Connect your Microsoft OneDrive account and back up your entire fleet database automatically — with a dated subfolder created on every sync.',
    bullets: [
      'One-click sync of all 9 data tables to OneDrive',
      'Dated subfolders preserve every previous backup',
      'Choose any OneDrive folder path as the destination',
      'Live sync log shows upload progress file by file',
    ],
    ai: null,
    export: 'Syncs Assets, Maintenance, Work Orders, Downtime, Parts, Prestarts, Service Sheets, Oil Samples and Service Schedules as CSV files.',
  },
];

const TAG_LABELS = { ai:'AI Powered', export:'Exportable', live:'Live Data', mobile:'Mobile Ready' };

function AccordionItem({ f, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-acc-item">
      <div className="lp-acc-head" onClick={() => setOpen(o => !o)}>
        <span className="lp-acc-icon">{f.icon}</span>
        <span className="lp-acc-title">{f.name}</span>
        <div className="lp-acc-tags">
          {f.tags.map(t => <span key={t} className={`lp-tag lp-tag-${t}`}>{TAG_LABELS[t]}</span>)}
        </div>
        <span className={`lp-acc-chevron${open?' open':''}`}>▼</span>
      </div>
      <div className={`lp-acc-body${open?' open':''}`}>
        <div className="lp-acc-inner">
          <p className="lp-acc-desc">{f.desc}</p>
          <div className="lp-acc-bullets">
            {f.bullets.map((b, i) => (
              <div key={i} className="lp-acc-bullet">
                <div className="lp-acc-bullet-dot" />
                <span>{b}</span>
              </div>
            ))}
          </div>
          {f.ai && (
            <div className="lp-acc-ai-box">
              <span className="lp-acc-box-icon">🤖</span>
              <div className="lp-acc-box-text">
                <div className="lp-acc-box-label lp-acc-ai-label">AI Feature</div>
                {f.ai}
              </div>
            </div>
          )}
          {f.export && (
            <div className="lp-acc-export-box">
              <span className="lp-acc-box-icon">📤</span>
              <div className="lp-acc-box-text">
                <div className="lp-acc-box-label lp-acc-export-label">Export & Reporting</div>
                {f.export}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Login({ onAuth }) {
  const [tab,  setTab]  = useState('login');
  const [email,setEmail]= useState('');
  const [pw,   setPw]   = useState('');
  const [err,  setErr]  = useState('');
  const [msg,  setMsg]  = useState('');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('lp-css')) {
      const s = document.createElement('style'); s.id='lp-css'; s.textContent=CSS; document.head.appendChild(s);
    }
  }, []);

  const handle = async () => {
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        if (data.session) onAuth(data.session);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg('Reset email sent — check your inbox.');
      }
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const scrollToCard = () => cardRef.current?.scrollIntoView({ behavior:'smooth', block:'center' });

  return (
    <div className="lp">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-logo">
          <span className="lp-logo-text">
            <span className="lp-logo-mech">MECH</span><span className="lp-logo-iq">IQ</span>
          </span>
          <span className="lp-logo-tag">
            <span>Fleet Maintenance</span>
            <span>Management</span>
          </span>
        </div>
        <div className="lp-nav-right">
          <a href="mailto:info@mechiq.com.au" className="lp-nav-contact">Contact Us</a>
          <button className="lp-nav-login" onClick={scrollToCard}>Login</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-blob" style={{ width:700,height:700,background:'var(--accent)',top:'-20%',right:'-15%' }} />
        <div className="lp-blob" style={{ width:500,height:500,background:'var(--green)',bottom:'-10%',left:'-12%',animationDelay:'-7s' }} />

        <div className="lp-hero-grid">
          <div>
            <div className="lp-eyebrow">⚙ Built for Australian Industry</div>
            <h1 className="lp-hero-title">
              Fleet Maintenance<br /><span className="hl">Made Intelligent</span>
            </h1>
            <p className="lp-hero-sub">
              Track every asset, manage services, log breakdowns and keep your fleet running — all in one platform built for the way Australian operations actually work.
            </p>
            <div className="lp-hero-actions">
              <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Request" className="lp-btn-primary" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
                Request a Demo →
              </a>
              <a href="mailto:info@mechiq.com.au?subject=MechIQ Enquiry" className="lp-btn-outline">
                Contact Us
              </a>
            </div>
          </div>

          {/* Login card */}
          <div ref={cardRef} className="lp-card">
            <div className="lp-card-logo">
              <div className="wm">
                <span style={{ color:'var(--text-primary)' }}>MECH</span>
                <span style={{ color:'var(--accent)' }}>IQ</span>
              </div>
              <div className="tg">Fleet Maintenance Management</div>
            </div>
            <div className="lp-tabs">
              {[['login','Sign In'],['reset','Forgot Password']].map(([id,label]) => (
                <button key={id} className={`lp-tab${tab===id?' on':''}`}
                  onClick={() => { setTab(id); setErr(''); setMsg(''); }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="lp-field">
              <label className="lp-lbl">Email Address</label>
              <input className="lp-inp" type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handle()} autoFocus />
            </div>
            {tab === 'login' && (
              <div className="lp-field">
                <label className="lp-lbl">Password</label>
                <input className="lp-inp" type="password" placeholder="••••••••"
                  value={pw} onChange={e => setPw(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handle()} />
              </div>
            )}
            {err && <div className="lp-err">{err}</div>}
            {msg && <div className="lp-ok">{msg}</div>}
            <button className="lp-go" onClick={handle} disabled={busy}>
              {busy ? 'Please wait…' : tab==='login' ? 'Sign In →' : 'Send Reset Email'}
            </button>
            <div style={{ textAlign:'center', marginTop:14, fontSize:11, color:'var(--text-faint)' }}>
              Need access? <a href="mailto:info@mechiq.com.au" style={{ color:'var(--accent)', textDecoration:'none' }}>Contact us</a> to get set up.
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="lp-stats">
        {[['10+','Feature Modules'],['Real-time','Fleet Visibility'],['AI','Powered Insights'],['100%','Cloud Based']].map(([v,l]) => (
          <div key={l} className="lp-stat">
            <div className="lp-stat-n">{v}</div>
            <div className="lp-stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* ── Features accordion ── */}
      <div className="lp-features">
        <div className="lp-feat-header">
          <div className="lp-sec-label">Platform Features</div>
          <h2 className="lp-sec-title">Everything you need to run<br />a smarter fleet</h2>
          <p className="lp-sec-sub">Click any feature to see exactly what it does, what the AI handles and what you can export.</p>
        </div>
        <div className="lp-accordion">
          {FEATURES.map((f, i) => <AccordionItem key={f.name} f={f} idx={i} />)}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="lp-cta">
        <div className="lp-sec-label" style={{ display:'flex', justifyContent:'center' }}>Get Started</div>
        <h2 className="lp-sec-title" style={{ marginBottom:12 }}>Ready to take control of your fleet?</h2>
        <p style={{ fontSize:16, color:'var(--text-muted)', margin:'0 auto 36px', maxWidth:460, lineHeight:1.75 }}>
          Contact us to set up your company account. We'll onboard you and have your fleet in MechIQ within 24 hours.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="lp-btn-primary" onClick={scrollToCard}>Login to MechIQ →</button>
          <a href="mailto:info@mechiq.com.au?subject=MechIQ Enquiry" className="lp-btn-outline">Contact Us</a>
        </div>
        <p style={{ marginTop:16, fontSize:12, color:'var(--text-faint)' }}>
          <a href="mailto:info@mechiq.com.au" style={{ color:'var(--accent)', textDecoration:'none' }}>info@mechiq.com.au</a>
        </p>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <span style={{ color:'var(--text-primary)' }}>MECH</span>
          <span style={{ color:'var(--accent)' }}>IQ</span>
        </div>
        <p style={{ fontSize:12, color:'var(--text-muted)' }}>© 2026 MechIQ · Fleet Maintenance Management · Made in Australia</p>
        <a href="mailto:info@mechiq.com.au" style={{ fontSize:12, color:'var(--accent)', textDecoration:'none' }}>info@mechiq.com.au</a>
      </footer>
    </div>
  );
}

export default Login;
