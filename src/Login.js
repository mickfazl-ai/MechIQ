import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Barlow+Condensed:wght@600;700;800;900&display=swap');

  @keyframes lp-up   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lp-fade { from{opacity:0} to{opacity:1} }
  @keyframes acc-open { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  /* ─── Base ─── */
  .lp * { box-sizing:border-box; margin:0; padding:0; }
  .lp {
    min-height:100vh;
    background:#f4f6f9;
    color:#e8ecf2;
    font-family:'Barlow', sans-serif;
    font-size:15px;
    line-height:1.6;
    overflow-x:hidden;
  }

  /* ─── Nav ─── */
  .lp-nav {
    position:fixed; top:0; left:0; right:0; z-index:200;
    height:64px;
    display:flex; align-items:center; justify-content:space-between;
    padding:0 5vw;
    background:#f4f6f9;
    border-bottom:1px solid rgba(26,36,51,0.1);
  }
  .lp-nav-brand { display:flex; align-items:center; gap:14px; }
  .lp-nav-logo {
    font-family:'Barlow Condensed',sans-serif;
    font-size:24px; font-weight:900; letter-spacing:4px; color:#fff;
  }
  .lp-nav-logo span { color:#2d8cf0; }
  .lp-nav-sep { width:1px; height:26px; background:rgba(26,36,51,0.15); }
  .lp-nav-tag { font-size:10px; font-weight:600; color:rgba(26,36,51,0.42); letter-spacing:2px; text-transform:uppercase; }
  .lp-nav-right { display:flex; gap:8px; align-items:center; }
  .lp-nav-link {
    padding:7px 16px; background:transparent;
    border:1px solid rgba(26,36,51,0.18); border-radius:4px;
    color:rgba(26,36,51,0.62); font-size:12px; font-weight:600;
    cursor:pointer; font-family:'Barlow',sans-serif; transition:all 0.15s;
    text-decoration:none; display:inline-flex; align-items:center; letter-spacing:0.3px;
  }
  .lp-nav-link:hover { border-color:#2d8cf0; color:#2d8cf0; }
  .lp-nav-btn {
    padding:8px 20px; background:#2d8cf0; border:none; border-radius:4px;
    color:#fff; font-size:12px; font-weight:700; cursor:pointer;
    font-family:'Barlow',sans-serif; transition:all 0.15s; letter-spacing:0.5px;
    text-transform:uppercase;
  }
  .lp-nav-btn:hover { background:#1a7de8; transform:translateY(-1px); }

  /* ─── Hero ─── */
  .lp-hero-section {
    background:#0d1826;
    position:relative;
    overflow:hidden;
  }
  .lp-hero-section::before {
    content:'';
    position:absolute; inset:0;
    background:
      radial-gradient(ellipse 60% 50% at 70% 40%, rgba(45,140,240,0.12) 0%, transparent 70%),
      radial-gradient(ellipse 40% 40% at 20% 80%, rgba(45,140,240,0.08) 0%, transparent 60%);
    pointer-events:none;
  }
  .lp-hero {
    min-height:100vh;
    display:grid; grid-template-columns:1fr 380px;
    align-items:center; gap:0;
    padding:100px 5vw 80px;
    max-width:1280px; margin:0 auto;
    position:relative; z-index:1;
  }

  .lp-hero-left { padding-right:48px; }
  .lp-hero-eyebrow {
    display:flex; align-items:center; gap:12px; margin-bottom:20px;
    animation:lp-up 0.5s ease both;
  }
  .lp-hero-eyebrow::before { content:''; width:24px; height:2px; background:#2d8cf0; }
  .lp-hero-eyebrow span { font-size:11px; font-weight:700; color:#60adf5; letter-spacing:2.5px; text-transform:uppercase; }

  .lp-hero-h1 {
    font-family:'Barlow Condensed',sans-serif;
    font-size:clamp(44px,5vw,76px); font-weight:900;
    line-height:1.0; letter-spacing:-0.5px; text-transform:uppercase;
    color:#ffffff; margin-bottom:20px;
    animation:lp-up 0.5s 0.08s ease both;
  }
  .lp-hero-h1 em { color:#2d8cf0; font-style:normal; }

  .lp-hero-sub {
    font-size:16px; color:rgba(255,255,255,0.65); line-height:1.8;
    max-width:480px; margin-bottom:36px; font-weight:400;
    animation:lp-up 0.5s 0.16s ease both;
  }

  .lp-hero-actions { display:flex; gap:12px; flex-wrap:wrap; animation:lp-up 0.5s 0.22s ease both; }
  .lp-btn-primary {
    padding:13px 28px; background:#2d8cf0; border:none; border-radius:4px;
    color:#fff; font-size:13px; font-weight:700; cursor:pointer;
    font-family:'Barlow',sans-serif; letter-spacing:0.5px; text-transform:uppercase;
    transition:all 0.15s; text-decoration:none; display:inline-flex; align-items:center;
  }
  .lp-btn-primary:hover { background:#1a7de8; transform:translateY(-1px); box-shadow:0 8px 24px rgba(45,140,240,0.3); }
  .lp-btn-secondary {
    padding:13px 24px; background:transparent;
    border:1px solid rgba(255,255,255,0.18); border-radius:4px;
    color:rgba(26,36,51,0.65); font-size:13px; font-weight:600; cursor:pointer;
    font-family:'Barlow',sans-serif; letter-spacing:0.3px; transition:all 0.15s;
    display:inline-flex; align-items:center;
  }
  .lp-btn-secondary:hover { border-color:#2d8cf0; color:#2d8cf0; }

  /* ─── Login card ─── */
  .lp-card {
    background:#ffffff;
    border:1px solid rgba(26,36,51,0.12);
    border-top:3px solid #2d8cf0;
    border-radius:4px;
    padding:32px 28px;
    box-shadow:0 24px 64px rgba(0,0,0,0.5);
    animation:lp-up 0.6s 0.12s cubic-bezier(0.16,1,0.3,1) both;
  }
  .lp-card-logo { text-align:center; padding-bottom:20px; margin-bottom:20px; border-bottom:1px solid rgba(26,36,51,0.1); }
  .lp-card-logo .wm { font-family:'Barlow Condensed',sans-serif; font-size:24px; font-weight:900; letter-spacing:4px; color:#1a2433; }
  .lp-card-logo .wm span { color:#2d8cf0; }
  .lp-card-logo .tg { font-size:9px; color:rgba(26,36,51,0.38); letter-spacing:2.5px; text-transform:uppercase; margin-top:4px; }

  .lp-tabs { display:flex; border-bottom:1px solid rgba(26,36,51,0.1); margin-bottom:20px; }
  .lp-tab {
    flex:1; padding:8px 4px; background:none; border:none;
    border-bottom:2px solid transparent; color:rgba(26,36,51,0.42);
    font-size:11px; font-weight:700; cursor:pointer; font-family:'Barlow',sans-serif;
    transition:all 0.15s; letter-spacing:0.8px; text-transform:uppercase;
  }
  .lp-tab.on { color:#2d8cf0; border-bottom-color:#2d8cf0; }

  .lp-field { margin-bottom:12px; }
  .lp-lbl { display:block; font-size:10px; font-weight:700; color:rgba(26,36,51,0.42); margin-bottom:5px; letter-spacing:1.2px; text-transform:uppercase; }
  .lp-inp {
    width:100%; padding:10px 12px; box-sizing:border-box;
    background:#f7f9fc !important;
    color:#1a2433 !important;
    border:1px solid rgba(26,36,51,0.18) !important;
    border-radius:3px !important;
    font-size:14px !important; font-family:'Barlow',sans-serif !important;
    outline:none !important;
    transition:border-color 0.15s !important;
  }
  .lp-inp:focus { border-color:#2d8cf0 !important; background:rgba(45,140,240,0.05) !important; }
  .lp-inp::placeholder { color:rgba(26,36,51,0.25) !important; }
  .lp-go {
    width:100%; padding:11px; background:#2d8cf0; border:none; border-radius:3px;
    color:#fff; font-size:12px; font-weight:700; font-family:'Barlow',sans-serif;
    cursor:pointer; margin-top:6px; transition:all 0.15s;
    letter-spacing:0.8px; text-transform:uppercase;
  }
  .lp-go:hover { background:#1a7de8; }
  .lp-go:disabled { opacity:0.4; cursor:not-allowed; }
  .lp-err { padding:8px 12px; background:rgba(220,38,38,0.1); border:1px solid rgba(220,38,38,0.3); border-radius:3px; color:#f87171; font-size:12px; margin-bottom:10px; }
  .lp-ok  { padding:8px 12px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:3px; color:#86efac; font-size:12px; margin-bottom:10px; }
  .lp-card-foot { margin-top:14px; padding-top:14px; border-top:1px solid rgba(26,36,51,0.1); }
  .lp-card-foot-line { font-size:10px; color:rgba(26,36,51,0.32); text-align:center; line-height:1.7; }
  .lp-card-foot-link { color:#2d8cf0; background:none; border:none; cursor:pointer; font-size:10px; font-family:'Barlow',sans-serif; padding:0; text-decoration:underline; }

  /* ─── Stats strip ─── */
  .lp-stats {
    display:grid; grid-template-columns:repeat(4,1fr);
    border-top:1px solid rgba(26,36,51,0.1);
    border-bottom:1px solid rgba(26,36,51,0.1);
    background:#eef1f5;
  }
  .lp-stat { padding:28px 16px; text-align:center; border-right:1px solid rgba(255,255,255,0.06); }
  .lp-stat:last-child { border-right:none; }
  .lp-stat-n { font-family:'Barlow Condensed',sans-serif; font-size:32px; font-weight:900; color:#2d8cf0; letter-spacing:1px; }
  .lp-stat-l { font-size:10px; color:rgba(26,36,51,0.42); font-weight:600; margin-top:5px; letter-spacing:1.5px; text-transform:uppercase; }

  /* ─── About strip ─── */
  .lp-about {
    max-width:1280px; margin:0 auto;
    padding:80px 5vw;
    display:grid; grid-template-columns:1fr 2fr; gap:80px; align-items:start;
  }
  .lp-about-label { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; color:#2d8cf0; letter-spacing:3px; text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:10px; }
  .lp-about-label::before { content:''; width:20px; height:2px; background:#2d8cf0; }
  .lp-about-h { font-family:'Barlow Condensed',sans-serif; font-size:clamp(26px,2.8vw,40px); font-weight:900; text-transform:uppercase; color:#fff; line-height:1.1; letter-spacing:0.5px; }
  .lp-about-body { font-size:15px; color:rgba(26,36,51,0.55); line-height:1.85; }
  .lp-about-body p + p { margin-top:16px; }

  /* ─── Features ─── */
  .lp-feats { background:#f4f6f9; border-top:1px solid rgba(26,36,51,0.08); border-bottom:1px solid rgba(255,255,255,0.05); }
  .lp-feats-inner { max-width:1280px; margin:0 auto; padding:80px 5vw; }
  .lp-feats-head { margin-bottom:48px; display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:end; }
  .lp-feats-intro { font-size:14px; color:rgba(26,36,51,0.48); line-height:1.8; }

  /* Accordion */
  .lp-acc { border:1px solid rgba(26,36,51,0.1); border-radius:3px; overflow:hidden; }
  .lp-acc-row { border-bottom:1px solid rgba(26,36,51,0.1); }
  .lp-acc-row:last-child { border-bottom:none; }

  .lp-acc-head {
    display:grid;
    grid-template-columns:64px 1fr 28px;
    align-items:center;
    padding:0; cursor:pointer; transition:background 0.12s;
  }
  .lp-acc-head:hover { background:#f7f9fc; }
  .lp-acc-row.open .lp-acc-head { background:rgba(45,140,240,0.05); }

  .lp-acc-num {
    padding:22px 0 22px 24px;
    font-family:'Barlow Condensed',sans-serif; font-size:28px; font-weight:900;
    color:rgba(255,255,255,0.1); line-height:1; transition:color 0.2s;
    align-self:stretch; display:flex; align-items:center;
  }
  .lp-acc-row.open .lp-acc-num { color:#2d8cf0; }

  .lp-acc-meta { padding:22px 16px; }
  .lp-acc-title { font-size:14px; font-weight:700; color:#e8ecf2; letter-spacing:0.2px; margin-bottom:3px; }
  .lp-acc-hint { font-size:12px; color:rgba(26,36,51,0.42); }

  .lp-acc-chev {
    padding-right:20px; font-size:10px;
    color:rgba(26,36,51,0.32); transition:transform 0.22s, color 0.15s;
    display:flex; align-items:center; justify-content:center;
  }
  .lp-acc-row.open .lp-acc-chev { transform:rotate(180deg); color:#2d8cf0; }

  .lp-acc-body {
    overflow:hidden; max-height:0; opacity:0;
    transition:max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.25s;
  }
  .lp-acc-body.open { max-height:800px; opacity:1; }

  .lp-acc-inner {
    padding:0 24px 28px 88px;
    border-top:1px solid rgba(26,36,51,0.08);
    background:rgba(26,36,51,0.04);
    animation:acc-open 0.3s ease;
  }
  .lp-acc-desc { font-size:14px; color:rgba(26,36,51,0.62); line-height:1.85; margin-top:20px; margin-bottom:18px; max-width:720px; }

  .lp-acc-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 28px; margin-bottom:22px; }
  .lp-acc-pt {
    display:flex; gap:10px; align-items:baseline;
    font-size:13px; color:rgba(26,36,51,0.5); line-height:1.55;
    padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.04);
  }
  .lp-acc-pt::before { content:'—'; color:#2d8cf0; flex-shrink:0; font-size:11px; }

  .lp-acc-links { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
  .lp-acc-link-tag {
    font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
    padding:4px 12px; border-radius:2px;
    border:1px solid rgba(45,140,240,0.3);
    color:rgba(45,140,240,0.7); background:rgba(45,140,240,0.06);
  }

  .lp-acc-connects {
    border-left:2px solid rgba(45,140,240,0.25);
    padding:12px 16px; margin-top:4px;
    background:rgba(45,140,240,0.05);
    border-radius:0 3px 3px 0;
  }
  .lp-acc-connects-label { font-size:9px; font-weight:700; color:#2d8cf0; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .lp-acc-connects-text { font-size:12px; color:rgba(26,36,51,0.48); line-height:1.7; }

  /* ─── CTA ─── */
  .lp-cta {
    max-width:1280px; margin:0 auto;
    padding:100px 5vw; text-align:center;
  }
  .lp-cta-h { font-family:'Barlow Condensed',sans-serif; font-size:clamp(32px,4vw,56px); font-weight:900; text-transform:uppercase; color:#fff; letter-spacing:0.5px; margin-bottom:16px; }
  .lp-cta-h span { color:#2d8cf0; }
  .lp-cta-sub { font-size:15px; color:rgba(26,36,51,0.48); max-width:440px; margin:0 auto 36px; line-height:1.8; }
  .lp-cta-acts { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .lp-cta-note { margin-top:20px; font-size:11px; color:rgba(26,36,51,0.25); }
  .lp-cta-note a { color:#2d8cf0; text-decoration:none; }

  /* ─── Footer ─── */
  .lp-footer {
    border-top:1px solid rgba(26,36,51,0.1);
    padding:24px 5vw;
    display:flex; justify-content:space-between; align-items:center;
    flex-wrap:wrap; gap:12px;
    background:#f4f6f9;
  }
  .lp-footer-logo { font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:900; letter-spacing:3px; color:#fff; }
  .lp-footer-logo span { color:#2d8cf0; }
  .lp-footer-links { display:flex; gap:20px; align-items:center; }
  .lp-footer-link { font-size:11px; color:rgba(26,36,51,0.32); text-decoration:none; background:none; border:none; cursor:pointer; font-family:'Barlow',sans-serif; transition:color 0.15s; letter-spacing:0.3px; }
  .lp-footer-link:hover { color:#2d8cf0; }
  .lp-footer-copy { font-size:11px; color:rgba(26,36,51,0.25); }

  /* ─── Privacy Modal ─── */
  .lp-modal-bg {
    position:fixed; inset:0; z-index:1000;
    background:rgba(0,0,0,0.8); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .lp-modal {
    background:#ffffff; border:1px solid rgba(26,36,51,0.15);
    border-top:3px solid #2d8cf0;
    border-radius:4px; width:100%; max-width:680px; max-height:88vh;
    display:flex; flex-direction:column;
    box-shadow:0 32px 80px rgba(0,0,0,0.6);
    overflow:hidden; animation:lp-up 0.3s ease;
  }
  .lp-modal-head {
    padding:20px 24px; border-bottom:1px solid rgba(26,36,51,0.1);
    display:flex; justify-content:space-between; align-items:center; flex-shrink:0;
  }
  .lp-modal-title { font-family:'Barlow Condensed',sans-serif; font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:1px; color:#fff; }
  .lp-modal-sub { font-size:10px; color:rgba(26,36,51,0.38); letter-spacing:1.5px; margin-top:3px; text-transform:uppercase; }
  .lp-modal-close { background:none; border:1px solid rgba(26,36,51,0.18); border-radius:3px; width:32px; height:32px; cursor:pointer; color:rgba(26,36,51,0.48); font-size:16px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
  .lp-modal-close:hover { border-color:#2d8cf0; color:#2d8cf0; }
  .lp-modal-body { padding:24px; overflow-y:auto; flex:1; font-size:13px; color:rgba(26,36,51,0.55); line-height:1.8; }
  .lp-modal-sec { margin-bottom:22px; }
  .lp-modal-sec-h { font-size:11px; font-weight:700; color:#2d8cf0; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
  .lp-modal-sec-h::before { content:''; width:16px; height:1px; background:#2d8cf0; }
  .lp-modal-note { margin-top:16px; padding:12px 16px; border-left:2px solid rgba(45,140,240,0.4); background:rgba(45,140,240,0.05); font-size:12px; color:rgba(26,36,51,0.42); border-radius:0 3px 3px 0; }
  .lp-modal-foot { padding:14px 24px; border-top:1px solid rgba(255,255,255,0.07); display:flex; justify-content:flex-end; flex-shrink:0; }

  /* ─── Responsive ─── */
  @media(max-width:960px) {
    .lp-hero { grid-template-columns:1fr; padding:90px 5vw 48px; gap:40px; }
    .lp-hero-left { padding-right:0; }
    .lp-card { max-width:460px; }
    .lp-stats { grid-template-columns:1fr 1fr; }
    .lp-about { grid-template-columns:1fr; gap:24px; padding:60px 5vw; }
    .lp-feats-head { grid-template-columns:1fr; gap:16px; }
    .lp-acc-inner { padding:0 16px 22px; }
    .lp-acc-grid { grid-template-columns:1fr; }
    .lp-acc-head { grid-template-columns:52px 1fr 28px; }
    .lp-cta { padding:72px 5vw; }
  }
  @media(max-width:520px) {
    .lp-nav-sep, .lp-nav-tag { display:none; }
    .lp-nav { padding:0 4vw; }
    .lp-stats { grid-template-columns:1fr 1fr; }
  }
`;

const FEATURES = [
  {
    n: '01',
    name: 'Operational Dashboard',
    hint: 'Real-time fleet intelligence across all assets',
    desc: 'The operational hub of MechIQ — a fully configurable command view that surfaces the live state of your entire fleet the moment you open the platform. Designed for maintenance managers and supervisors who need immediate situational awareness without navigating between modules.',
    pts: [
      'Drag-and-reorder widget layout per user role',
      'Live breakdown status — machine ID, site, downtime accumulation',
      'Service compliance overview with overdue escalation',
      'Priority work order queue with assignee visibility',
      'Oil condition alerts and low-stock parts warnings',
      'Calendar event preview for the next 7 days',
    ],
    connects: 'The Dashboard draws live data from every other module — Asset Register, Maintenance Scheduling, Work Orders, Oil Sampling, Parts Inventory and Downtime. Any event logged anywhere in the platform surfaces here immediately, giving supervisors a single source of truth rather than a fragmented view across disconnected systems.',
    ai: 'Surfaces cross-fleet failure patterns — correlated degradation signatures across multiple assets are flagged as systemic risks before individual breakdowns occur.',
  },
  {
    n: '02',
    name: 'Asset Register & Lifecycle Management',
    hint: 'Complete operational and financial record for every machine',
    desc: 'A structured, searchable asset register that stores the full history of every machine from commissioning through disposal. Built for complex mixed fleets operating across multiple sites, where incomplete asset records create compliance risk and operational inefficiency.',
    pts: [
      'Fleet register with OEM data, serial numbers, hours and site allocation',
      'Per-asset profile: Work Orders, Service History, Oil Sampling, Downtime, Documents, Depreciation',
      'Document storage — manuals, schematics, compliance certs and inspection reports',
      'QR code integration — technicians access the full profile via mobile scan on site',
      'One-tap defect logging and work order creation from the asset card',
    ],
    connects: 'The asset register is the structural backbone of the platform. Every prestart submission, work order, service record, oil sample, downtime event and depreciation calculation is anchored to an asset record. This creates a verifiable, continuous operational history that supports insurance claims, compliance audits and capital expenditure decisions.',
    ai: 'AI-assisted onboarding — enter the make and model and the system proposes a complete service schedule, prestart checklist and maintenance interval structure based on OEM data.',
  },
  {
    n: '03',
    name: 'AI Prestart & Service Sheet Platform',
    hint: 'Intelligent structured forms built for field conditions',
    desc: 'Replaces paper-based prestarts and manually constructed service records with a structured digital forms platform. The AI builder eliminates setup time — describe the asset class and the system generates a compliant, field-ready inspection form in seconds, correctly structured for the equipment type.',
    pts: [
      'AI form generation tailored to specific asset class and OEM service requirements',
      'Mobile-first interface designed for gloved hands, outdoor conditions and variable connectivity',
      'Mandatory photo capture with evidence tagging for high-priority inspection items',
      'Digital signature with date, time and user authentication',
      'Hours and odometer entry auto-propagates to service schedules on submission',
    ],
    connects: 'Prestart submissions feed directly into the Asset Register (updating current hours), the Maintenance Scheduling module (triggering service interval calculations) and the Downtime module (logging operator-reported defects). Service sheets link to specific work orders and appear in the asset\'s complete maintenance history, creating a closed-loop record from inspection through resolution.',
    ai: 'The AI form generator analyses the asset type against OEM service requirements to produce inspection forms structured to AS/NZS standards and configurable to site-specific compliance requirements.',
  },
  {
    n: '04',
    name: 'Maintenance Scheduling & Work Order Management',
    hint: 'Closed-loop maintenance from schedule through completion',
    desc: 'A fully integrated planned maintenance system that closes the loop between service schedules, work order assignment and completion records. Every service event — whether scheduled or emergency — is tracked, assigned and followed through to resolution with a complete audit trail.',
    pts: [
      'Multi-trigger service schedules — hours, kilometres, calendar days or months',
      'Visual maintenance calendar with urgency-coded events and one-tap service sheet creation',
      'Work order lifecycle: Draft → Assigned → In Progress → Complete',
      'Priority classification (Low / Medium / High / Critical) with escalation alerts',
      'Complete maintenance history timeline per asset — searchable audit trail',
    ],
    connects: 'Service schedules are automatically calculated from hours data submitted through Prestart forms. Overdue services surface immediately on the Dashboard and trigger alerts in the relevant user\'s work queue. Completed work orders link to service sheets, parts consumption records and oil sample results, creating a unified maintenance record across all modules.',
    ai: null,
  },
  {
    n: '05',
    name: 'Parts & Inventory Control',
    hint: 'Real-time stock visibility across every storeroom',
    desc: 'A purpose-built parts management system that integrates directly with the maintenance workflow. Stock movements are driven by actual job completions — when a technician logs a part on a service sheet, the inventory adjusts automatically, eliminating the manual reconciliation cycle.',
    pts: [
      'Parts register with quantities, minimum thresholds, locations and supplier references',
      'QR label generation — print A4 sticker sheets for systematic storeroom organisation',
      'Automatic deduction on service sheet submission — no separate stock entry required',
      'Usage analytics by asset — identify high-consumption equipment and forecast replenishment',
      'Stocktake module with variance reporting for end-of-period audits',
    ],
    connects: 'Every part used in a Work Order or Service Sheet is deducted from inventory automatically, creating a real-time stock ledger driven by actual maintenance activity rather than manual entry. Usage history links back to specific assets and jobs, enabling consumption-based forecasting. Low stock alerts appear on the Dashboard before critical items run out.',
    ai: 'AI photo identification — point a mobile camera at an unmarked part and the system identifies the item, matches it to the inventory register and logs the stock movement without manual data entry.',
  },
  {
    n: '06',
    name: 'Oil Sampling & Condition Monitoring',
    hint: 'Predictive failure detection through systematic fluid analysis',
    desc: 'Structured oil sample logging and AI condition analysis that transforms laboratory data into actionable maintenance intelligence. Systematic fluid analysis is one of the highest-value predictive maintenance tools available — MechIQ makes it operationally practical across a mixed fleet.',
    pts: [
      'Structured sample logging per asset and component — engine, transmission, hydraulics, final drives',
      'Elemental analysis tracking — wear metals, viscosity, water ingress, particle count',
      'Trend charting across sequential samples per component circuit',
      'CRITICAL and WARNING condition flags surfaced immediately on the Dashboard',
    ],
    connects: 'Oil sample results link directly to the Asset Register, contributing to the asset\'s complete condition history. CRITICAL results automatically generate a recommended work order in the Maintenance Scheduling module. Condition trends inform the AI analysis in the Depreciation module, providing additional evidence for repair-versus-replace recommendations.',
    ai: 'AI condition analysis cross-references each sample result against OEM limits, fleet baseline data and historical trends — returning a plain-English assessment with recommended action and urgency classification.',
  },
  {
    n: '07',
    name: 'Downtime Tracking & Fleet Availability',
    hint: 'Quantify the operational and financial cost of unplanned failures',
    desc: 'Systematic downtime recording that converts field events into management metrics. Every planned and unplanned outage is captured, classified and quantified — building the data foundation needed to justify maintenance investment and demonstrate the ROI of a structured maintenance program.',
    pts: [
      'Structured logging — failure category, causal system, hours lost and resolution details',
      'Machine availability percentage calculated automatically per asset and fleet',
      'Downtime analysis by failure category, asset, site and time period',
      'Trend identification — recurring failure modes, seasonal patterns and high-risk assets',
    ],
    connects: 'Downtime events are linked to the Asset Register and visible in the asset\'s operational timeline. When a defect is logged as a breakdown, it can be converted directly into a Work Order in the Maintenance module. Downtime hours feed the fleet availability calculations displayed on the Dashboard and available for export in the Reports module.',
    ai: null,
  },
  {
    n: '08',
    name: 'Depreciation & Asset Valuation',
    hint: 'Financial intelligence to support repair-versus-replace decisions',
    desc: 'An integrated asset valuation engine that calculates current book value, estimated market value and operating cost metrics across multiple depreciation methodologies. Provides the financial context needed to support evidence-based asset management decisions rather than intuition-based judgements.',
    pts: [
      'Three depreciation methods: straight-line, declining balance and hours-based',
      'Book value versus estimated market value comparison per asset',
      'Operating cost per hour and cost per kilometre calculations',
      'Calculation history preserved per asset for lifecycle trend analysis',
    ],
    connects: 'The depreciation engine draws from the Asset Register (purchase date, hours, usage data), the Maintenance module (total maintenance expenditure history) and Oil Sampling (condition data). This cross-module synthesis enables the AI to produce repair-versus-replace recommendations grounded in actual operational data rather than generic depreciation curves alone.',
    ai: 'AI synthesises the depreciation curve, total maintenance expenditure, oil condition history and operational hours to generate a structured repair-versus-replace recommendation with plain-English supporting rationale.',
  },
  {
    n: '09',
    name: 'Reporting, Export & Data Sovereignty',
    hint: 'Every record, every format — with no proprietary lock-in',
    desc: 'MechIQ is built on a data sovereignty principle — every record you create belongs to your organisation, is exportable in standard formats at any time, and can be integrated into broader reporting and ERP ecosystems. No proprietary formats, no data hostage situations.',
    pts: [
      'Full ZIP export — PDFs of every work order and prestart, Excel of all data tables',
      'Individual CSV and Excel exports per module at any time',
      'OneDrive sync — automatic dated backup to your Microsoft OneDrive folder structure',
      'Company performance report cards — fleet availability, utilisation and cost metrics',
    ],
    connects: 'The Reports module is a cross-platform aggregator — it pulls from Assets, Maintenance, Work Orders, Downtime, Parts, Oil Samples and Prestarts to generate composite reports. The OneDrive sync creates a complete, dated backup of all nine data tables in a single operation, ensuring your operational data is always accessible regardless of platform continuity.',
    ai: null,
  },
];

const POLICY = [
  { t:'1. About MechIQ', b:'MechIQ is an Australian cloud-based fleet maintenance management platform. This Privacy Policy governs how we collect, use, store and protect your information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).' },
  { t:'2. What We Collect', b:'Company and contact details on account creation; user names, email addresses, roles and authentication credentials; all operational data you enter including assets, work orders, service records, prestarts, oil samples, parts and uploaded documents; and technical metadata including IP addresses and usage logs for security and performance purposes only.' },
  { t:'3. How We Use Your Information', b:'We use your information solely to provide and operate the MechIQ Platform, manage your account, respond to support requests, improve functionality and comply with Australian legal obligations. We do not use your data for advertising and we do not sell, rent or trade your information to any third party.' },
  { t:'4. Data Storage & Security', b:'Core data is stored within AWS Sydney (ap-southeast-2) via Supabase. Application hosting via Vercel with Cloudflare for DNS and network security. All data is encrypted in transit (TLS 1.3). Passwords are salted and hashed — never stored in plain text. Row-level database security ensures strict company data isolation. In the event of a notifiable data breach we will notify affected parties within 30 days as required under the NDB scheme.' },
  { t:'5. Third-Party Providers', b:'Data is shared only with Supabase (database), Vercel (hosting) and Cloudflare (DNS/security) to operate the Platform. When OneDrive Sync is enabled, data is exported directly to your Microsoft account — MechIQ does not store or access OneDrive content. No data is shared with any other third parties.' },
  { t:'6. Data Retention & Ownership', b:'All fleet data, records and content created in MechIQ remains your property. We act as a data processor on your behalf. Data is retained while your account is active. On termination a full export is provided on request. Account data is retained for 30 days post-termination for recovery, then permanently deleted. Encrypted backups are purged within 90 days.' },
  { t:'7. Your Rights', b:'Under the Privacy Act 1988 (Cth) you may request access to, correction of, or deletion of your personal information. For requests or complaints contact info@mechiq.com.au. Unresolved complaints may be escalated to the OAIC at oaic.gov.au.' },
  { t:'8. Contact', b:'Privacy enquiries: info@mechiq.com.au · mechiq.com.au. We respond within 5 business days.' },
];

function FeatureRow({ f }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-acc-row${open ? ' open' : ''}`}>
      <div className="lp-acc-head" onClick={() => setOpen(o => !o)}>
        <div className="lp-acc-num">{f.n}</div>
        <div className="lp-acc-meta">
          <div className="lp-acc-title">{f.name}</div>
          <div className="lp-acc-hint">{f.hint}</div>
        </div>
        <div className="lp-acc-chev">▼</div>
      </div>
      <div className={`lp-acc-body${open ? ' open' : ''}`}>
        <div className="lp-acc-inner">
          <p className="lp-acc-desc">{f.desc}</p>
          <div className="lp-acc-grid">
            {f.pts.map((p, i) => (
              <div key={i} className="lp-acc-pt">{p}</div>
            ))}
          </div>
          {f.ai && (
            <div className="lp-acc-links" style={{ marginBottom:16 }}>
              <span className="lp-acc-link-tag">AI Capability</span>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)', paddingLeft:4 }}>{f.ai}</span>
            </div>
          )}
          <div className="lp-acc-connects">
            <div className="lp-acc-connects-label">Platform Integration</div>
            <div className="lp-acc-connects-text">{f.connects}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({ onAuth }) {
  const [tab,    setTab]    = useState('login');
  const [email,  setEmail]  = useState('');
  const [pw,     setPw]     = useState('');
  const [err,    setErr]    = useState('');
  const [msg,    setMsg]    = useState('');
  const [busy,   setBusy]   = useState(false);
  const [policy, setPolicy] = useState(false);
  const loginRef = useRef(null);
  const featRef  = useRef(null);

  useEffect(() => {
    if (!document.getElementById('lp-css')) {
      const s = document.createElement('style');
      s.id = 'lp-css'; s.textContent = CSS;
      document.head.appendChild(s);
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

  const scroll = (ref) => ref.current?.scrollIntoView({ behavior:'smooth', block:'start' });

  return (
    <div className="lp">

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-nav-logo">MECH<span>IQ</span></div>
          <div className="lp-nav-sep" />
          <div className="lp-nav-tag">Fleet Maintenance Management</div>
        </div>
        <div className="lp-nav-right">
          <button className="lp-nav-link" onClick={() => scroll(featRef)}>Platform</button>
          <a href="mailto:info@mechiq.com.au" className="lp-nav-link">Contact</a>
          <button className="lp-nav-btn" onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>
            Client Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="lp-hero-section">
      <section className="lp-hero">
        <div className="lp-hero-left">
          <div className="lp-hero-eyebrow"><span>Built for Australian Heavy Industry</span></div>
          <h1 className="lp-hero-h1">
            Intelligent<br />Fleet<br /><em>Management</em>
          </h1>
          <p className="lp-hero-sub">
            A modern CMMS purpose-built for mining, civil infrastructure, tunnelling and heavy industry operations. Real-time asset visibility, AI-assisted maintenance planning and structured data from the field — in one connected platform.
          </p>
          <div className="lp-hero-actions">
            <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Request" className="lp-btn-primary">
              Request a Demo
            </a>
            <button className="lp-btn-secondary" onClick={() => scroll(featRef)}>
              Platform Overview
            </button>
          </div>
        </div>

        {/* Login card */}
        <div ref={loginRef} className="lp-card">
          <div className="lp-card-logo">
            <div className="wm">MECH<span>IQ</span></div>
            <div className="tg">Fleet Maintenance Management</div>
          </div>
          <div className="lp-tabs">
            {[['login','Sign In'],['reset','Reset Password']].map(([id, label]) => (
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
            {busy ? 'Authenticating…' : tab==='login' ? 'Sign In' : 'Send Reset Email'}
          </button>
          <div className="lp-card-foot">
            <div className="lp-card-foot-line">
              Need access? <a href="mailto:info@mechiq.com.au" style={{ color:'#2d8cf0', textDecoration:'none' }}>Contact us</a> to establish your account.
            </div>
            <div className="lp-card-foot-line" style={{ marginTop:6 }}>
              By signing in you agree to our{' '}
              <button className="lp-card-foot-link" onClick={() => setPolicy(true)}>Privacy Policy</button>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* Stats */}
      <div className="lp-stats">
        {[['9','Integrated Modules'],['Real-time','Fleet Visibility'],['AI','Condition Analysis'],['100%','Australian Built']].map(([v,l]) => (
          <div key={l} className="lp-stat">
            <div className="lp-stat-n">{v}</div>
            <div className="lp-stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* About */}
      <div className="lp-about">
        <div>
          <div className="lp-about-label">Why MechIQ</div>
          <h2 className="lp-about-h">Built by engineers,<br />for engineers</h2>
        </div>
        <div className="lp-about-body">
          <p>MechIQ was developed alongside active tunnelling, mining and civil construction operations — not in a boardroom. Every module addresses a specific failure mode in traditional maintenance management: paper prestarts that never get processed, service intervals that drift, parts stock that runs out mid-job, and management with no reliable visibility of true fleet availability.</p>
          <p>The platform is designed so that data entered at the field level — by operators and technicians — flows automatically into the records that supervisors, managers and engineers depend on. That connection between field activity and management reporting is what most CMMS platforms fail to achieve. MechIQ is built around it.</p>
        </div>
      </div>

      {/* Features */}
      <div className="lp-feats" ref={featRef}>
        <div className="lp-feats-inner">
          <div className="lp-feats-head">
            <div>
              <div className="lp-about-label">Platform Capabilities</div>
              <h2 className="lp-about-h">A connected CMMS for<br />complex fleet operations</h2>
            </div>
            <div className="lp-feats-intro">
              Select any module to review its full capability set, AI functionality and how it integrates with the rest of the platform. MechIQ is designed as a connected system — data entered in one module automatically flows to where it is needed across the platform.
            </div>
          </div>
          <div className="lp-acc">
            {FEATURES.map(f => <FeatureRow key={f.n} f={f} />)}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="lp-cta">
        <h2 className="lp-cta-h">Commission your fleet<br />on <span>MechIQ</span></h2>
        <p className="lp-cta-sub">Contact us to establish your company account. We will onboard your fleet and configure the platform to your operational requirements within 24 hours.</p>
        <div className="lp-cta-acts">
          <a href="mailto:info@mechiq.com.au?subject=MechIQ Account Setup" className="lp-btn-primary" style={{ textDecoration:'none' }}>Get Started</a>
          <button className="lp-btn-secondary" onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>Client Login</button>
        </div>
        <p className="lp-cta-note">Enquiries: <a href="mailto:info@mechiq.com.au">info@mechiq.com.au</a></p>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">MECH<span>IQ</span></div>
        <div className="lp-footer-links">
          <button className="lp-footer-link" onClick={() => setPolicy(true)}>Privacy Policy</button>
          <a href="mailto:info@mechiq.com.au" className="lp-footer-link">info@mechiq.com.au</a>
        </div>
        <p className="lp-footer-copy">© 2026 MechIQ · Fleet Maintenance Management · Australia</p>
      </footer>

      {/* Privacy Policy Modal */}
      {policy && (
        <div className="lp-modal-bg" onClick={e => { if(e.target===e.currentTarget) setPolicy(false); }}>
          <div className="lp-modal">
            <div className="lp-modal-head">
              <div>
                <div className="lp-modal-title">MECH<span style={{ color:'#2d8cf0' }}>IQ</span> — Privacy Policy</div>
                <div className="lp-modal-sub">Effective 24 March 2026 · Version 1.0</div>
              </div>
              <button className="lp-modal-close" onClick={() => setPolicy(false)}>✕</button>
            </div>
            <div className="lp-modal-body">
              {POLICY.map(s => (
                <div key={s.t} className="lp-modal-sec">
                  <div className="lp-modal-sec-h">{s.t}</div>
                  <p>{s.b}</p>
                </div>
              ))}
              <div className="lp-modal-note">
                This is a summary of our Privacy Policy. The full legal document is available on request at <a href="mailto:info@mechiq.com.au" style={{ color:'#2d8cf0' }}>info@mechiq.com.au</a>.
              </div>
            </div>
            <div className="lp-modal-foot">
              <button className="lp-nav-btn" onClick={() => setPolicy(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Login;
