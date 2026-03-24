import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@500;600;700;800;900&display=swap');

  @keyframes lp-up    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lp-right { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes lp-fade  { from{opacity:0} to{opacity:1} }

  .lp * { box-sizing:border-box; margin:0; padding:0; }
  .lp {
    min-height:100vh;
    background:#f0f2f5;
    color:#1a1f2e;
    font-family:'Barlow', sans-serif;
    overflow-x:hidden;
  }

  /* ── Nav ── */
  .lp-nav {
    position:fixed; top:0; left:0; right:0; z-index:300;
    height:66px; display:flex; align-items:center; justify-content:space-between;
    padding:0 5vw;
    background:#ffffff;
    border-bottom:3px solid #0077cc;
    box-shadow:0 2px 16px rgba(0,0,0,0.08);
  }
  .lp-nav-brand { display:flex; align-items:center; gap:16px; }
  .lp-nav-logo {
    font-family:'Barlow Condensed', sans-serif;
    font-size:30px; font-weight:900; letter-spacing:4px; line-height:1;
  }
  .lp-nav-logo .m { color:#1a1f2e; }
  .lp-nav-logo .q { color:#0077cc; }
  .lp-nav-sep { width:1px; height:30px; background:#e2e5ea; }
  .lp-nav-tag {
    font-size:10px; font-weight:700; color:#8a909e;
    letter-spacing:1.8px; text-transform:uppercase; line-height:1.4;
  }
  .lp-nav-right { display:flex; gap:8px; align-items:center; }
  .lp-nav-link {
    padding:8px 16px; border-radius:5px;
    border:1px solid #dde1e8; background:transparent;
    color:#4a5568; font-size:13px; font-weight:600;
    cursor:pointer; transition:all 0.15s; font-family:'Barlow',sans-serif;
    text-decoration:none; display:inline-flex; align-items:center;
  }
  .lp-nav-link:hover { border-color:#0077cc; color:#0077cc; }
  .lp-nav-btn {
    padding:9px 22px; border-radius:5px;
    background:#0077cc; border:none; color:#fff;
    font-size:13px; font-weight:700; cursor:pointer;
    font-family:'Barlow',sans-serif; transition:all 0.15s; letter-spacing:0.3px;
  }
  .lp-nav-btn:hover { background:#005fa3; transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,119,204,0.3); }

  /* ── Hero: full-bleed split ── */
  .lp-hero {
    display:grid; grid-template-columns:1fr 1fr;
    min-height:100vh; padding-top:66px;
  }
  .lp-hero-left {
    background:#ffffff;
    display:flex; flex-direction:column; justify-content:center;
    padding:72px 56px 72px 5vw;
  }
  .lp-hero-right {
    position:relative; overflow:hidden;
    background:#1a1f2e;
  }
  .lp-hero-photo {
    width:100%; height:100%; object-fit:cover;
    object-position:center center;
    filter:brightness(0.75) contrast(1.08);
    display:block;
  }
  .lp-hero-photo-overlay {
    position:absolute; inset:0;
    background:linear-gradient(
      to right, rgba(255,255,255,0.08) 0%, transparent 35%
    ),linear-gradient(
      to top, rgba(10,15,30,0.65) 0%, transparent 55%
    );
  }
  .lp-hero-caption {
    position:absolute; bottom:24px; left:24px; right:180px;
    font-size:10px; font-weight:700; color:rgba(255,255,255,0.55);
    letter-spacing:2px; text-transform:uppercase;
  }

  /* Login card floats over the photo */
  .lp-card-wrap {
    position:absolute; top:50%; right:40px;
    transform:translateY(-50%); z-index:10; width:330px;
    animation:lp-right 0.65s 0.2s cubic-bezier(0.16,1,0.3,1) both;
  }
  .lp-card {
    background:#fff; border-radius:8px;
    padding:30px 26px;
    box-shadow:0 24px 72px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.04);
  }
  .lp-card-logo { text-align:center; padding-bottom:18px; margin-bottom:18px; border-bottom:1px solid #eaecef; }
  .lp-card-logo .wm { font-family:'Barlow Condensed',sans-serif; font-size:26px; font-weight:900; letter-spacing:4px; }
  .lp-card-logo .wm .m { color:#1a1f2e; }
  .lp-card-logo .wm .q { color:#0077cc; }
  .lp-card-logo .tg { font-size:9px; color:#9aa0ab; letter-spacing:2px; text-transform:uppercase; margin-top:4px; }

  .lp-tabs { display:flex; border-bottom:1px solid #eaecef; margin-bottom:18px; }
  .lp-tab {
    flex:1; padding:8px 4px; background:none; border:none;
    border-bottom:2px solid transparent; color:#9aa0ab;
    font-size:12px; font-weight:700; cursor:pointer;
    font-family:'Barlow',sans-serif; transition:all 0.15s; letter-spacing:0.3px;
  }
  .lp-tab.on { color:#0077cc; border-bottom-color:#0077cc; }
  .lp-field { margin-bottom:11px; }
  .lp-lbl { display:block; font-size:10px; font-weight:800; color:#9aa0ab; margin-bottom:4px; letter-spacing:1px; text-transform:uppercase; }
  .lp-inp {
    width:100%; padding:10px 12px; box-sizing:border-box;
    background:#f7f8fa !important; color:#1a1f2e !important;
    border:1px solid #dde1e8 !important; border-radius:5px !important;
    font-size:14px !important; font-family:'Barlow',sans-serif !important;
    outline:none !important; transition:border-color 0.15s, box-shadow 0.15s !important;
  }
  .lp-inp:focus { border-color:#0077cc !important; box-shadow:0 0 0 3px rgba(0,119,204,0.1) !important; background:#fff !important; }
  .lp-inp::placeholder { color:#c0c6d0 !important; }
  .lp-go {
    width:100%; padding:11px; border-radius:5px; background:#0077cc;
    border:none; color:#fff; font-size:13px; font-weight:700;
    font-family:'Barlow',sans-serif; cursor:pointer; margin-top:4px;
    transition:all 0.15s; letter-spacing:0.4px;
  }
  .lp-go:hover { background:#005fa3; }
  .lp-go:disabled { opacity:0.5; cursor:not-allowed; }
  .lp-err { padding:8px 12px; border-radius:4px; background:#fff5f5; border:1px solid #fed7d7; color:#c53030; font-size:12px; margin-bottom:10px; line-height:1.5; }
  .lp-ok  { padding:8px 12px; border-radius:4px; background:#f0fff4; border:1px solid #9ae6b4; color:#276749; font-size:12px; margin-bottom:10px; line-height:1.5; }
  .lp-card-foot { text-align:center; margin-top:12px; }
  .lp-card-foot-txt { font-size:10px; color:#b0b7c3; }
  .lp-card-foot-link { color:#0077cc; background:none; border:none; cursor:pointer; font-size:10px; font-family:'Barlow',sans-serif; text-decoration:underline; padding:0; }

  /* ── Hero left copy ── */
  .lp-badge {
    display:inline-flex; align-items:center; gap:8px;
    padding:5px 12px; margin-bottom:22px;
    background:#e8f4ff; border-left:3px solid #0077cc;
    color:#0077cc; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase;
    animation:lp-up 0.5s ease both;
  }
  .lp-h1 {
    font-family:'Barlow Condensed', sans-serif;
    font-size:clamp(40px,4.8vw,70px); font-weight:900; line-height:1.0;
    letter-spacing:-0.5px; text-transform:uppercase; color:#1a1f2e;
    margin-bottom:18px; animation:lp-up 0.5s 0.08s ease both;
  }
  .lp-h1 .acc { color:#0077cc; }
  .lp-sub {
    font-size:16px; color:#566070; line-height:1.8;
    max-width:430px; margin-bottom:32px; font-weight:400;
    animation:lp-up 0.5s 0.16s ease both;
  }
  .lp-actions { display:flex; gap:10px; flex-wrap:wrap; animation:lp-up 0.5s 0.24s ease both; }
  .lp-btn-blue {
    padding:12px 28px; border-radius:5px; background:#0077cc;
    border:none; color:#fff; font-size:13px; font-weight:700;
    cursor:pointer; font-family:'Barlow',sans-serif; transition:all 0.2s; letter-spacing:0.3px;
    text-decoration:none; display:inline-flex; align-items:center;
  }
  .lp-btn-blue:hover { background:#005fa3; transform:translateY(-1px); box-shadow:0 8px 24px rgba(0,119,204,0.28); }
  .lp-btn-out {
    padding:12px 24px; border-radius:5px;
    background:transparent; border:1.5px solid #c8cdd6;
    color:#566070; font-size:13px; font-weight:600;
    cursor:pointer; font-family:'Barlow',sans-serif; transition:all 0.2s;
    text-decoration:none; display:inline-flex; align-items:center;
  }
  .lp-btn-out:hover { border-color:#0077cc; color:#0077cc; }

  /* ── Stats bar ── */
  .lp-stats { display:flex; background:#1a1f2e; }
  .lp-stat { flex:1; text-align:center; padding:26px 10px; border-right:1px solid rgba(255,255,255,0.07); }
  .lp-stat:last-child { border-right:none; }
  .lp-stat-n { font-family:'Barlow Condensed',sans-serif; font-size:30px; font-weight:900; color:#0077cc; letter-spacing:1px; }
  .lp-stat-l { font-size:10px; color:rgba(255,255,255,0.45); font-weight:600; margin-top:5px; letter-spacing:1.5px; text-transform:uppercase; }

  /* ── Intro: photo + copy ── */
  .lp-intro-wrap { background:#fff; }
  .lp-intro {
    display:grid; grid-template-columns:1fr 1fr; gap:0;
    max-width:1280px; margin:0 auto;
  }
  .lp-intro-photo { position:relative; overflow:hidden; min-height:480px; }
  .lp-intro-photo img { width:100%; height:100%; object-fit:cover; object-position:center top; display:block; }
  .lp-intro-copy {
    padding:64px 56px; display:flex; flex-direction:column; justify-content:center;
  }
  .lp-eyebrow { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
  .lp-eyebrow::before { content:''; width:28px; height:2px; background:#0077cc; flex-shrink:0; }
  .lp-eyebrow span { font-size:10px; font-weight:800; color:#0077cc; letter-spacing:2.5px; text-transform:uppercase; }
  .lp-sec-h { font-family:'Barlow Condensed',sans-serif; font-size:clamp(26px,2.8vw,42px); font-weight:900; text-transform:uppercase; color:#1a1f2e; line-height:1.1; margin-bottom:18px; letter-spacing:0.3px; }
  .lp-sec-p { font-size:15px; color:#566070; line-height:1.8; margin-bottom:14px; }

  /* ── Photo mosaic strip ── */
  .lp-mosaic {
    display:grid;
    grid-template-columns:2fr 1fr 1fr;
    grid-template-rows:220px 220px;
    gap:3px; background:#0a0f1e;
  }
  .lp-mosaic-cell { overflow:hidden; position:relative; }
  .lp-mosaic-cell.tall { grid-row:span 2; }
  .lp-mosaic-cell img {
    width:100%; height:100%; object-fit:cover;
    display:block; transition:transform 0.6s ease, filter 0.4s;
    filter:brightness(0.82) contrast(1.06) saturate(0.9);
  }
  .lp-mosaic-cell:hover img { transform:scale(1.04); filter:brightness(0.95) contrast(1.06) saturate(1); }
  .lp-mosaic-label {
    position:absolute; bottom:0; left:0; right:0;
    padding:10px 14px;
    background:linear-gradient(to top, rgba(10,15,30,0.7) 0%, transparent 100%);
    font-size:9px; font-weight:700; color:rgba(255,255,255,0.6);
    letter-spacing:1.8px; text-transform:uppercase;
  }

  /* ── Features ── */
  .lp-feats-wrap { background:#f0f2f5; padding:80px 5vw; }
  .lp-feats-inner { max-width:960px; margin:0 auto; }
  .lp-feats-head { margin-bottom:44px; }
  .lp-feats-legend { display:flex; gap:16px; flex-wrap:wrap; margin-top:20px; }
  .lp-legend-item { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; color:#566070; letter-spacing:0.3px; }
  .lp-legend-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }

  /* Accordion */
  .lp-acc { border:1px solid #dde1e8; border-radius:6px; overflow:hidden; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
  .lp-acc-row { border-bottom:1px solid #eaecef; }
  .lp-acc-row:last-child { border-bottom:none; }
  .lp-acc-head {
    display:flex; align-items:center; gap:0;
    cursor:pointer; user-select:none; transition:background 0.12s;
  }
  .lp-acc-head:hover { background:#f7f8fb; }
  .lp-acc-num {
    width:52px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-family:'Barlow Condensed',sans-serif; font-size:22px; font-weight:900;
    color:#dde1e8; padding:20px 0; transition:color 0.15s;
    border-right:1px solid #eaecef;
    align-self:stretch;
  }
  .lp-acc-row.open .lp-acc-num { color:#0077cc; }
  .lp-acc-meta { flex:1; padding:18px 20px; }
  .lp-acc-title { font-size:14px; font-weight:800; color:#1a1f2e; margin-bottom:3px; letter-spacing:0.2px; }
  .lp-acc-hint { font-size:12px; color:#8a909e; font-weight:500; }
  .lp-acc-tags { display:flex; gap:5px; padding:18px 16px 18px 0; flex-shrink:0; }
  .lp-tag {
    font-size:9px; font-weight:800; letter-spacing:0.8px; text-transform:uppercase;
    padding:3px 8px; border-radius:3px; border:1px solid; white-space:nowrap;
  }
  .lp-tag-ai     { color:#1a56a0; border-color:#bfdbfe; background:#eff6ff; }
  .lp-tag-export { color:#166534; border-color:#bbf7d0; background:#f0fdf4; }
  .lp-tag-live   { color:#92400e; border-color:#fde68a; background:#fffbeb; }
  .lp-tag-mobile { color:#4c1d95; border-color:#ddd6fe; background:#f5f3ff; }
  .lp-acc-toggle {
    width:48px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:12px; color:#b0b7c3; transition:transform 0.2s;
    align-self:stretch;
  }
  .lp-acc-row.open .lp-acc-toggle { transform:rotate(180deg); color:#0077cc; }

  .lp-acc-body {
    overflow:hidden; transition:max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.22s;
    max-height:0; opacity:0;
  }
  .lp-acc-body.open { max-height:800px; opacity:1; }
  .lp-acc-inner {
    padding:20px 20px 24px 72px;
    border-top:1px solid #eaecef;
    background:#fafbfc;
  }
  .lp-acc-desc { font-size:14px; color:#3d4a5c; line-height:1.8; margin-bottom:16px; font-weight:400; }
  .lp-acc-pts { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; margin-bottom:18px; }
  .lp-acc-pt { display:flex; gap:9px; align-items:flex-start; font-size:12px; color:#3d4a5c; line-height:1.55; }
  .lp-acc-pt::before { content:''; width:5px; height:5px; border-radius:50%; background:#0077cc; margin-top:5px; flex-shrink:0; }
  .lp-acc-boxes { display:flex; flex-direction:column; gap:8px; }
  .lp-box {
    display:flex; gap:14px; padding:12px 16px;
    border-radius:4px; border-left:3px solid;
  }
  .lp-box-ai     { background:#f0f7ff; border-color:#0077cc; }
  .lp-box-export { background:#f6fdf9; border-color:#38a169; }
  .lp-box-label { font-size:9px; font-weight:900; letter-spacing:1.8px; text-transform:uppercase; margin-bottom:4px; }
  .lp-box-ai .lp-box-label     { color:#0077cc; }
  .lp-box-export .lp-box-label { color:#276749; }
  .lp-box-text { font-size:12px; color:#3d4a5c; line-height:1.65; }

  /* ── CTA ── */
  .lp-cta {
    position:relative; overflow:hidden;
    background:#1a1f2e; padding:90px 5vw; text-align:center;
  }
  .lp-cta-bg {
    position:absolute; inset:0; opacity:0.035;
    background-image:linear-gradient(#0077cc 1px, transparent 1px),
                     linear-gradient(90deg, #0077cc 1px, transparent 1px);
    background-size:48px 48px;
  }
  .lp-cta-photo {
    position:absolute; inset:0; object-fit:cover; width:100%; height:100%;
    filter:brightness(0.18) saturate(0.4);
  }
  .lp-cta-content { position:relative; z-index:1; }
  .lp-cta-h {
    font-family:'Barlow Condensed',sans-serif;
    font-size:clamp(32px,4vw,58px); font-weight:900;
    color:#fff; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px;
  }
  .lp-cta-h .acc { color:#0077cc; }
  .lp-cta-p { font-size:16px; color:rgba(255,255,255,0.55); max-width:440px; margin:0 auto 36px; line-height:1.75; }
  .lp-cta-acts { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .lp-cta-note { margin-top:18px; font-size:12px; color:rgba(255,255,255,0.3); }
  .lp-cta-note a { color:#0077cc; text-decoration:none; }

  /* ── Footer ── */
  .lp-footer {
    background:#12151f; padding:26px 5vw;
    display:flex; justify-content:space-between; align-items:center;
    flex-wrap:wrap; gap:14px; border-top:1px solid rgba(255,255,255,0.05);
  }
  .lp-footer-logo { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; letter-spacing:3px; }
  .lp-footer-logo .m { color:#fff; }
  .lp-footer-logo .q { color:#0077cc; }
  .lp-footer-links { display:flex; gap:20px; align-items:center; }
  .lp-footer-link { font-size:12px; color:rgba(255,255,255,0.35); text-decoration:none; transition:color 0.15s; background:none; border:none; cursor:pointer; font-family:'Barlow',sans-serif; }
  .lp-footer-link:hover { color:#0077cc; }
  .lp-footer-copy { font-size:11px; color:rgba(255,255,255,0.25); }

  /* ── Privacy Modal ── */
  .lp-modal-bg {
    position:fixed; inset:0; z-index:1000;
    background:rgba(0,0,0,0.65); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center; padding:16px;
  }
  .lp-modal {
    background:#fff; border-radius:8px;
    width:100%; max-width:700px; max-height:88vh;
    display:flex; flex-direction:column;
    box-shadow:0 32px 96px rgba(0,0,0,0.35);
    overflow:hidden; animation:lp-up 0.3s ease;
  }
  .lp-modal-head {
    padding:20px 26px; background:#f7f8fa;
    border-bottom:1px solid #eaecef;
    display:flex; justify-content:space-between; align-items:center; flex-shrink:0;
  }
  .lp-modal-title { font-family:'Barlow Condensed',sans-serif; font-size:20px; font-weight:900; letter-spacing:1px; color:#1a1f2e; text-transform:uppercase; }
  .lp-modal-sub { font-size:10px; color:#8a909e; letter-spacing:1px; margin-top:3px; }
  .lp-modal-close { background:none; border:1px solid #dde1e8; border-radius:5px; width:34px; height:34px; cursor:pointer; font-size:17px; color:#8a909e; display:flex; align-items:center; justify-content:center; }
  .lp-modal-body { padding:26px; overflow-y:auto; flex:1; font-size:14px; color:#3d4a5c; line-height:1.75; }
  .lp-modal-sec { margin-bottom:22px; }
  .lp-modal-sec-title { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:800; text-transform:uppercase; color:#1a1f2e; margin-bottom:8px; padding-bottom:6px; border-bottom:2px solid #0077cc; display:inline-block; letter-spacing:0.5px; }
  .lp-modal-note { margin-top:16px; padding:12px 16px; background:#eff6ff; border-left:3px solid #0077cc; border-radius:3px; font-size:12px; color:#566070; }
  .lp-modal-foot { padding:14px 26px; border-top:1px solid #eaecef; background:#f7f8fa; display:flex; justify-content:flex-end; flex-shrink:0; }

  /* ── Responsive ── */
  @media(max-width:960px) {
    .lp-hero { grid-template-columns:1fr; }
    .lp-hero-right { height:380px; }
    .lp-hero-left { padding:52px 5vw 36px; }
    .lp-card-wrap { position:static; transform:none; width:100%; padding:0 5vw 48px; animation:lp-up 0.6s ease both; }
    .lp-card-wrap .lp-card { max-width:420px; margin:0 auto; }
    .lp-intro { grid-template-columns:1fr; }
    .lp-intro-photo { min-height:280px; }
    .lp-intro-copy { padding:40px 5vw; }
    .lp-mosaic { grid-template-columns:1fr 1fr; grid-template-rows:180px 180px 180px; }
    .lp-mosaic-cell.tall { grid-row:span 1; }
    .lp-acc-inner { padding:16px; }
    .lp-acc-pts { grid-template-columns:1fr; }
    .lp-acc-tags { display:none; }
    .lp-cta { padding:60px 5vw; }
  }
  @media(max-width:520px) {
    .lp-nav-sep, .lp-nav-tag { display:none; }
    .lp-nav { padding:0 4vw; }
  }
`;

const TAG_LABELS = { ai:'AI Powered', export:'Exportable', live:'Live Data', mobile:'Mobile Ready' };

const FEATURES = [
  {
    n: '01', name: 'Operational Dashboard', hint: 'Real-time fleet intelligence at command level',
    tags: ['live','export'],
    desc: 'A configurable command centre giving maintenance managers, supervisors and operators a single source of truth across the entire fleet. Every critical metric is visible the moment you open the platform — no drilling through menus, no manual reporting.',
    pts: [
      'Drag-and-drop widget layout — configure exactly what each role sees',
      'Live breakdown status with machine ID, location and downtime accumulation',
      'Service schedule compliance overview with overdue escalation',
      'Priority work order queue with assignee and due date visibility',
      'Oil condition alerts, low-stock parts warnings and calendar event preview',
    ],
    ai: 'Machine learning surfaces cross-fleet failure patterns — if multiple assets begin showing correlated degradation signatures, the dashboard flags a systemic risk before individual breakdowns occur.',
    export: 'Generate board-ready fleet status reports as PDF with one click. Scheduled exports configurable for end-of-shift, daily or weekly distribution.',
  },
  {
    n: '02', name: 'Asset Register & Lifecycle Management', hint: 'Complete digital twin for every asset in your fleet',
    tags: ['live','ai','export'],
    desc: 'A structured, searchable asset register that stores the complete operational, mechanical and financial history of every asset — from initial commissioning through to disposal. Designed for complex fleets with mixed equipment types across multiple sites.',
    pts: [
      'Fleet register with OEM data, serial numbers, hour/kilometre tracking and site allocation',
      'Asset profile tabs: Work Orders, Service Schedule, Oil Sampling, Downtime, Documents, Depreciation',
      'Document management — manuals, schematics, certifications and compliance records per asset',
      'QR code integration — field technicians pull up the full asset profile via mobile scan',
      'One-tap defect logging and work order creation directly from the asset card',
    ],
    ai: 'AI-assisted onboarding — enter the asset make and model and the system proposes a complete service schedule, prestart checklist and maintenance interval structure based on OEM recommendations.',
    export: 'Export complete asset profiles as formatted PDF for insurance, audits, client handovers and regulatory compliance.',
  },
  {
    n: '03', name: 'AI Prestart & Service Sheet Platform', hint: 'Intelligent digital forms built for the field',
    tags: ['ai','mobile'],
    desc: 'Replace paper-based prestarts and manual service records with a structured digital forms platform. The AI form builder eliminates setup time — describe the asset type and the system generates a compliant, field-ready checklist in seconds.',
    pts: [
      'AI-generated prestart checklists structured to the specific asset class and OEM requirements',
      'Native mobile experience — designed for gloved hands, outdoor conditions and variable connectivity',
      'Mandatory photo capture with GPS-tagged evidence for high-priority inspection items',
      'Digital signature collection with date, time and user authentication',
      'Hours and odometer entry auto-propagates to asset service schedules on submission',
    ],
    ai: 'The AI form generator analyses the asset type against a knowledge base of OEM service requirements to produce inspection forms that meet AS/NZS standards and site-specific compliance requirements.',
    export: null,
  },
  {
    n: '04', name: 'Maintenance Scheduling & Work Order Management', hint: 'Closed-loop maintenance from schedule to completion',
    tags: ['live','export'],
    desc: 'A fully integrated planned maintenance system that closes the loop between service schedules, work orders, technician assignment and completion records. No service falls through the cracks. No completed job goes unrecorded.',
    pts: [
      'Multi-trigger service schedules — hours, kilometres, calendar days or months',
      'Visual maintenance calendar with urgency-coded event display and one-tap service sheet creation',
      'Work order lifecycle management: Draft → Assigned → In Progress → Complete',
      'Priority classification (Low / Medium / High / Critical) with escalation alerts',
      'Full maintenance history timeline per asset — searchable, filterable audit trail',
    ],
    ai: null,
    export: 'Export work order history and service records to Excel or PDF — structured for insurance claims, compliance audits and contractual reporting obligations.',
  },
  {
    n: '05', name: 'Parts & Inventory Control', hint: 'Real-time stock visibility across every storeroom',
    tags: ['ai','export','mobile'],
    desc: 'A purpose-built parts management system that integrates directly with the maintenance workflow. When a technician logs a part on a service sheet, the stock count adjusts automatically. Reorder alerts fire before critical items run out.',
    pts: [
      'Centralised parts register with quantities, minimum thresholds, locations and supplier references',
      'QR label generation — print A4 sticker sheets for systematic storeroom organisation',
      'Automatic deduction on service sheet submission — no separate stock adjustment required',
      'Usage analytics by asset — identify high-consumption equipment and forecast replenishment',
      'Stocktake module with variance reporting for end-of-period audits',
    ],
    ai: 'AI photo identification — point a mobile camera at an unmarked part and the system identifies it, matches it to the inventory register and logs the movement without manual data entry.',
    export: 'Export current stock levels or full transaction history to Excel for procurement planning, budget forecasting and ERP reconciliation.',
  },
  {
    n: '06', name: 'Oil Sampling & Condition Monitoring', hint: 'Predictive failure detection through fluid analysis',
    tags: ['ai','export'],
    desc: 'Structured oil sample logging and AI condition analysis that transforms raw laboratory data into actionable maintenance intelligence. Detect bearing wear, contamination events and fluid degradation before they manifest as failures.',
    pts: [
      'Structured sample logging per asset and component — engine, transmission, hydraulic circuits, final drives',
      'Elemental analysis tracking — wear metals, viscosity, water ingress, particle count',
      'Trend charting across sequential samples for each component circuit',
      'Critical and Warning condition flags surfaced immediately on the fleet dashboard',
    ],
    ai: 'AI condition analysis cross-references each sample result against OEM limits, fleet baseline data and historical trends — returning a plain-English assessment with recommended action and urgency classification.',
    export: 'Export condition reports per asset or fleet-wide as PDF or CSV — formatted for laboratory records, maintenance planning and regulatory compliance documentation.',
  },
  {
    n: '07', name: 'Downtime Tracking & Fleet Availability', hint: 'Quantify the cost of unplanned failures',
    tags: ['live','export'],
    desc: 'Systematic downtime recording that converts field events into management metrics. Track every planned and unplanned outage, calculate machine availability and build the data foundation needed to justify maintenance investment.',
    pts: [
      'Structured downtime logging — failure category, causal system, hours lost and resolution details',
      'Automatic machine availability calculation per asset across any date range',
      'Downtime analysis by failure category, asset, site and time period',
      'Trend identification — recurring failure modes, seasonal patterns and high-risk assets',
    ],
    ai: null,
    export: 'Export availability reports and downtime breakdowns by asset or fleet for insurance claims, client reporting, board presentations and maintenance budget submissions.',
  },
  {
    n: '08', name: 'Depreciation & Asset Valuation', hint: 'Financial intelligence for repair-versus-replace decisions',
    tags: ['ai','export'],
    desc: 'An integrated asset valuation engine that calculates current book value, estimated market value and operating cost metrics across multiple depreciation methodologies. Provides the financial context to support evidence-based asset management decisions.',
    pts: [
      'Three depreciation methods: straight-line, declining balance and hours-based',
      'Book value versus estimated market value comparison per asset',
      'Operating cost calculation — cost per hour and cost per kilometre',
      'Calculation history preserved per asset for trend and lifecycle analysis',
    ],
    ai: 'AI synthesises the asset\'s depreciation curve, total maintenance expenditure, oil condition history and operational hours to generate a structured repair-versus-replace recommendation with supporting rationale.',
    export: 'PDF depreciation reports formatted for accountants, auditors, asset disposal committees and board-level capital expenditure reviews.',
  },
  {
    n: '09', name: 'Reporting, Export & Data Sovereignty', hint: 'Your data, your formats, zero lock-in',
    tags: ['export'],
    desc: 'MechIQ is built on a data sovereignty principle — every record you create is yours, exportable in standard formats at any time. Complete operational visibility from a single platform, with the flexibility to integrate into broader reporting ecosystems.',
    pts: [
      'Full ZIP export — PDF records for every work order and prestart, Excel for all data tables',
      'Individual module exports: assets, maintenance, work orders, downtime, parts, oil samples',
      'OneDrive sync — one-click automated backup to Microsoft OneDrive with dated subfolder structure',
      'Company performance dashboards with fleet availability, utilisation and cost metrics',
    ],
    ai: null,
    export: 'Export to Excel, CSV or PDF from any module. Direct OneDrive sync available from Settings. No proprietary formats — all exports are in universally readable standards.',
  },
];

const POLICY_SECTIONS = [
  { t:'1. About MechIQ', b:'MechIQ is an Australian cloud-based fleet maintenance management platform providing tools for asset tracking, prestart checklists, maintenance scheduling, work order management, parts inventory, oil sampling analysis, downtime recording, reporting and data export. This Privacy Policy governs how we collect, use, store and protect your information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).' },
  { t:'2. What We Collect', b:'We collect company and contact details on account creation; user names, email addresses, roles and authentication credentials; all fleet and operational data you enter including assets, work orders, service records, prestart submissions, oil samples, parts and uploaded documents; and technical metadata including IP addresses and usage logs for security and performance purposes only.' },
  { t:'3. How We Use Your Information', b:'We use your information solely to provide and operate the MechIQ Platform, manage your account, respond to support requests, improve Platform functionality and comply with Australian legal obligations. We do not use your data for advertising. We do not sell, rent or trade your personal information or business data to any third party.' },
  { t:'4. Data Storage & Security', b:'Core fleet data is stored within AWS Sydney (ap-southeast-2) via Supabase. Application hosting is provided by Vercel with Cloudflare for DNS and network security. All data is encrypted in transit (TLS 1.3). Passwords are salted and hashed — never stored in plain text. Row-level database security ensures strict company data isolation. In the event of a notifiable data breach we will notify affected parties within 30 days as required under the NDB scheme.' },
  { t:'5. Third-Party Providers', b:'We share data only with Supabase (database), Vercel (hosting) and Cloudflare (DNS/security) to operate the Platform. When OneDrive Sync is enabled, data is exported directly to your own Microsoft account — MechIQ does not store or access OneDrive content. No data is shared with any other third parties.' },
  { t:'6. Data Retention', b:'Data is retained while your account is active. On termination we provide a full export on request. Account data is retained for 30 days post-termination for recovery, then permanently deleted. Encrypted backups are purged within 90 days.' },
  { t:'7. Your Rights', b:'Under the Privacy Act 1988 (Cth) you may request access to, correction of, or deletion of your personal information. Company Admins can manage users directly in the Platform. For other requests or complaints contact info@mechiq.com.au. Unresolved complaints may be escalated to the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.' },
  { t:'8. Data Ownership', b:'All fleet data, records and content created in MechIQ remains your property at all times. MechIQ acts as a data processor on your behalf. We will never use your operational data for any purpose beyond delivering the Platform, and will never disclose it to competitors or third parties for commercial gain.' },
  { t:'9. Contact', b:'Privacy enquiries: info@mechiq.com.au · mechiq.com.au. We respond within 5 business days and resolve complaints within 30 days.' },
];

function FeatureRow({ f, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-acc-row${open ? ' open' : ''}`}>
      <div className="lp-acc-head" onClick={() => setOpen(o => !o)}>
        <div className="lp-acc-num">{f.n}</div>
        <div className="lp-acc-meta">
          <div className="lp-acc-title">{f.name}</div>
          <div className="lp-acc-hint">{f.hint}</div>
        </div>
        <div className="lp-acc-tags">
          {f.tags.map(t => <span key={t} className={`lp-tag lp-tag-${t}`}>{TAG_LABELS[t]}</span>)}
        </div>
        <div className="lp-acc-toggle">▼</div>
      </div>
      <div className={`lp-acc-body${open ? ' open' : ''}`}>
        <div className="lp-acc-inner">
          <p className="lp-acc-desc">{f.desc}</p>
          <div className="lp-acc-pts">
            {f.pts.map((p, i) => <div key={i} className="lp-acc-pt">{p}</div>)}
          </div>
          {(f.ai || f.export) && (
            <div className="lp-acc-boxes">
              {f.ai && (
                <div className="lp-box lp-box-ai">
                  <div>
                    <div className="lp-box-label">AI Capability</div>
                    <div className="lp-box-text">{f.ai}</div>
                  </div>
                </div>
              )}
              {f.export && (
                <div className="lp-box lp-box-export">
                  <div>
                    <div className="lp-box-label">Export & Reporting</div>
                    <div className="lp-box-text">{f.export}</div>
                  </div>
                </div>
              )}
            </div>
          )}
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
        setMsg('Password reset email sent — check your inbox.');
      }
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const scroll = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Image paths — these files go in /public/images/ in your repo
  const IMG = {
    hero:    '/images/tbm-cutterhead-interior.webp',
    intro:   '/images/tbm-cutterhead-person.jpg',
    m1:      '/images/tbm-interior-machinery.jpg',
    m2:      '/images/night-crane-operations.jpg',
    m3:      '/images/komatsu-dump-truck.jpg',
    m4:      '/images/naval-vessel.jpg',
    m5:      '/images/pistenbully-groomer.jpg',
    cta:     '/images/night-crane-operations.jpg',
  };

  return (
    <div className="lp">

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-nav-logo"><span className="m">MECH</span><span className="q">IQ</span></div>
          <div className="lp-nav-sep" />
          <div className="lp-nav-tag"><span>Fleet Maintenance</span><span>Management</span></div>
        </div>
        <div className="lp-nav-right">
          <button className="lp-nav-link" onClick={() => scroll(featRef)}>Features</button>
          <a href="mailto:info@mechiq.com.au" className="lp-nav-link">Contact</a>
          <button className="lp-nav-btn" onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>Client Login</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-left">
          <div className="lp-badge">Built for Australian Heavy Industry</div>
          <h1 className="lp-h1">
            Intelligent<br />Fleet<br /><span className="acc">Management</span>
          </h1>
          <p className="lp-sub">
            A modern CMMS purpose-built for mining, civil infrastructure, tunnelling and heavy industry operations. Real-time asset visibility, AI-assisted maintenance planning and structured data from the field — all in one platform.
          </p>
          <div className="lp-actions">
            <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Request" className="lp-btn-blue">
              Request a Demo →
            </a>
            <button className="lp-btn-out" onClick={() => scroll(featRef)}>
              Platform Overview
            </button>
          </div>
        </div>

        <div className="lp-hero-right">
          <img src={IMG.hero} alt="TBM cutterhead — Melbourne Suburban Connect" className="lp-hero-photo" />
          <div className="lp-hero-photo-overlay" />
          <div className="lp-hero-caption">Herrenknecht TBM S-1429 · Melbourne Suburban Connect East</div>

          <div className="lp-card-wrap" ref={loginRef}>
            <div className="lp-card">
              <div className="lp-card-logo">
                <div className="wm"><span className="m">MECH</span><span className="q">IQ</span></div>
                <div className="tg">Fleet Maintenance Management</div>
              </div>
              <div className="lp-tabs">
                {[['login','Sign In'],['reset','Forgot Password']].map(([id, label]) => (
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
                {busy ? 'Authenticating…' : tab==='login' ? 'Sign In →' : 'Send Reset Email'}
              </button>
              <div className="lp-card-foot" style={{ marginTop:12 }}>
                <div className="lp-card-foot-txt">
                  Need access?{' '}
                  <a href="mailto:info@mechiq.com.au" style={{ color:'#0077cc', textDecoration:'none', fontSize:10 }}>Contact us</a>
                  {' '}to get your company set up.
                </div>
                <div className="lp-card-foot-txt" style={{ marginTop:6 }}>
                  By signing in you agree to our{' '}
                  <button className="lp-card-foot-link" onClick={() => setPolicy(true)}>Privacy Policy</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="lp-stats">
        {[['9','Integrated Modules'],['Real-time','Fleet Visibility'],['AI','Condition Analysis'],['100%','Australian Built']].map(([v,l]) => (
          <div key={l} className="lp-stat">
            <div className="lp-stat-n">{v}</div>
            <div className="lp-stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* ── Intro ── */}
      <div className="lp-intro-wrap">
        <div className="lp-intro">
          <div className="lp-intro-photo">
            <img src={IMG.intro} alt="TBM cutterhead with engineer" />
          </div>
          <div className="lp-intro-copy">
            <div className="lp-eyebrow"><span>Why MechIQ</span></div>
            <h2 className="lp-sec-h">Built by engineers,<br />for engineers</h2>
            <p className="lp-sec-p">
              MechIQ was developed alongside active tunnelling, mining and civil construction operations — not in a boardroom. Every feature addresses a real failure mode in traditional maintenance management: paper prestarts that never get processed, service schedules that drift, parts that run out mid-job and no visibility of true machine availability.
            </p>
            <p className="lp-sec-p">
              The result is a platform that works the way field operations actually function — fast to deploy, practical on site, and structured enough to satisfy engineering management and compliance requirements.
            </p>
          </div>
        </div>
      </div>

      {/* ── Photo mosaic ── */}
      <div className="lp-mosaic">
        <div className="lp-mosaic-cell tall">
          <img src={IMG.m1} alt="TBM hydraulic systems" />
          <div className="lp-mosaic-label">TBM Internal Systems · Melbourne Suburban Connect</div>
        </div>
        <div className="lp-mosaic-cell">
          <img src={IMG.m3} alt="Komatsu 930E haul truck" />
          <div className="lp-mosaic-label">Komatsu 930E · Mining Operations</div>
        </div>
        <div className="lp-mosaic-cell">
          <img src={IMG.m4} alt="Naval patrol vessel" />
          <div className="lp-mosaic-label">Marine Fleet · Defence Operations</div>
        </div>
        <div className="lp-mosaic-cell">
          <img src={IMG.m5} alt="PistenBully snow groomer" />
          <div className="lp-mosaic-label">PistenBully 800 · Alpine Operations</div>
        </div>
        <div className="lp-mosaic-cell">
          <img src={IMG.m2} alt="Night crane operations" />
          <div className="lp-mosaic-label">Shotcrete Operations · Civil Infrastructure</div>
        </div>
      </div>

      {/* ── Features ── */}
      <div className="lp-feats-wrap" ref={featRef}>
        <div className="lp-feats-inner">
          <div className="lp-feats-head">
            <div className="lp-eyebrow"><span>Platform Capabilities</span></div>
            <h2 className="lp-sec-h">A complete CMMS for<br />complex fleet operations</h2>
            <p className="lp-sec-p" style={{ marginTop:10 }}>
              Select any module to review its full capability set, AI functionality and export options.
            </p>
            <div className="lp-feats-legend">
              {Object.entries(TAG_LABELS).map(([k,v]) => (
                <div key={k} className="lp-legend-item">
                  <div className={`lp-legend-dot lp-tag-${k}`} style={{
                    background: k==='ai'?'#bfdbfe':k==='export'?'#bbf7d0':k==='live'?'#fde68a':'#ddd6fe',
                    border: `1px solid ${k==='ai'?'#93c5fd':k==='export'?'#86efac':k==='live'?'#fcd34d':'#c4b5fd'}`
                  }} />
                  {v}
                </div>
              ))}
            </div>
          </div>
          <div className="lp-acc">
            {FEATURES.map((f, i) => <FeatureRow key={f.n} f={f} idx={i} />)}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="lp-cta">
        <img src={IMG.cta} alt="Night operations" className="lp-cta-photo" />
        <div className="lp-cta-bg" />
        <div className="lp-cta-content">
          <h2 className="lp-cta-h">
            Commission your fleet<br />on <span className="acc">MechIQ</span>
          </h2>
          <p className="lp-cta-p">
            Contact us to establish your company account. We will onboard your fleet and configure the platform to your operational requirements within 24 hours.
          </p>
          <div className="lp-cta-acts">
            <a href="mailto:info@mechiq.com.au?subject=MechIQ Account Setup" className="lp-btn-blue" style={{ textDecoration:'none' }}>
              Get Started →
            </a>
            <button className="lp-btn-out" style={{ borderColor:'rgba(255,255,255,0.18)', color:'rgba(255,255,255,0.65)' }}
              onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>
              Client Login
            </button>
          </div>
          <p className="lp-cta-note">
            Enquiries: <a href="mailto:info@mechiq.com.au">info@mechiq.com.au</a>
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo"><span className="m">MECH</span><span className="q">IQ</span></div>
        <div className="lp-footer-links">
          <button className="lp-footer-link" onClick={() => setPolicy(true)}>Privacy Policy</button>
          <a href="mailto:info@mechiq.com.au" className="lp-footer-link">info@mechiq.com.au</a>
        </div>
        <p className="lp-footer-copy">© 2026 MechIQ · Fleet Maintenance Management · Australia</p>
      </footer>

      {/* ── Privacy Policy Modal ── */}
      {policy && (
        <div className="lp-modal-bg" onClick={e => { if(e.target===e.currentTarget) setPolicy(false); }}>
          <div className="lp-modal">
            <div className="lp-modal-head">
              <div>
                <div className="lp-modal-title">MECH<span style={{ color:'#0077cc' }}>IQ</span> — Privacy Policy</div>
                <div className="lp-modal-sub">Effective 23 March 2026 · Version 1.0 · mechiq.com.au</div>
              </div>
              <button className="lp-modal-close" onClick={() => setPolicy(false)}>✕</button>
            </div>
            <div className="lp-modal-body">
              {POLICY_SECTIONS.map(s => (
                <div key={s.t} className="lp-modal-sec">
                  <div className="lp-modal-sec-title">{s.t}</div>
                  <p>{s.b}</p>
                </div>
              ))}
              <div className="lp-modal-note">
                This is a summary of our Privacy Policy. The full legal document is available on request at{' '}
                <a href="mailto:info@mechiq.com.au" style={{ color:'#0077cc' }}>info@mechiq.com.au</a>.
                Last updated 23 March 2026.
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
