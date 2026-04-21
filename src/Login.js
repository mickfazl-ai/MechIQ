import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');

  @keyframes lp-up     { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lp-fade   { from{opacity:0} to{opacity:1} }
  @keyframes lp-glow   { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
  @keyframes lp-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  @keyframes lp-scan   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
  @keyframes lp-dot    { 0%,100%{opacity:0.2} 50%{opacity:0.6} }
  @keyframes lp-float  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
  @keyframes lp-slide  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
  @keyframes acc-open  { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
  @keyframes counterUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .lp * { box-sizing:border-box; margin:0; padding:0; }
  .lp {
    min-height:100vh;
    background:#060d17;
    color:#c8d8e8;
    font-family:'Inter', sans-serif;
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
    background:rgba(6,13,23,0.92);
    border-bottom:1px solid rgba(0,194,224,0.12);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
  }
  .lp-nav-brand { display:flex; align-items:center; gap:14px; }
  .lp-nav-logo {
    font-family:'Space Grotesk',sans-serif;
    font-size:22px; font-weight:700; letter-spacing:3px; color:#fff;
  }
  .lp-nav-logo span { color:#00c2e0; }
  .lp-nav-sep { width:1px; height:22px; background:rgba(0,194,224,0.2); }
  .lp-nav-tag { font-size:10px; font-weight:500; color:rgba(200,216,232,0.45); letter-spacing:2.5px; text-transform:uppercase; }
  .lp-nav-right { display:flex; gap:8px; align-items:center; }
  .lp-nav-link {
    padding:7px 16px; background:transparent;
    border:1px solid rgba(200,216,232,0.15); border-radius:6px;
    color:rgba(200,216,232,0.65); font-size:12px; font-weight:500;
    cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.18s;
    text-decoration:none; display:inline-flex; align-items:center; letter-spacing:0.3px;
  }
  .lp-nav-link:hover { border-color:#00c2e0; color:#00c2e0; }
  .lp-nav-btn {
    padding:8px 22px; background:linear-gradient(135deg,#00c2e0,#0090a8); border:none; border-radius:6px;
    color:#fff; font-size:12px; font-weight:700; cursor:pointer;
    font-family:'Inter',sans-serif; transition:all 0.18s; letter-spacing:0.6px;
    text-transform:uppercase; box-shadow:0 0 16px rgba(0,194,224,0.25);
  }
  .lp-nav-btn:hover { transform:translateY(-1px); box-shadow:0 0 28px rgba(0,194,224,0.45); }

  /* ─── Hero ─── */
  .lp-hero-section {
    position:relative; overflow:hidden;
    background:linear-gradient(160deg,#060d17 0%,#0a1628 50%,#060d17 100%);
    min-height:100vh;
  }
  /* Grid dot pattern */
  .lp-hero-section::before {
    content:'';
    position:absolute; inset:0;
    background-image: radial-gradient(rgba(0,194,224,0.15) 1px, transparent 1px);
    background-size: 36px 36px;
    opacity:0.5;
    pointer-events:none;
  }
  /* Glow orbs */
  .lp-hero-section::after {
    content:'';
    position:absolute; inset:0;
    background:
      radial-gradient(ellipse 70% 60% at 75% 40%, rgba(0,194,224,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 20% 70%, rgba(45,140,240,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 30% 30% at 50% 10%, rgba(0,194,224,0.05) 0%, transparent 50%);
    pointer-events:none;
  }
  .lp-hero {
    min-height:100vh;
    display:grid; grid-template-columns:1fr 400px;
    align-items:center; gap:48px;
    padding:100px 5vw 80px;
    max-width:1320px; margin:0 auto;
    position:relative; z-index:1;
  }
  @media(max-width:960px) {
    .lp-hero { grid-template-columns:1fr; padding:100px 5vw 60px; }
  }

  /* Eyebrow badge */
  .lp-hero-eyebrow {
    display:inline-flex; align-items:center; gap:8px;
    padding:5px 14px; border-radius:20px;
    background:rgba(0,194,224,0.08); border:1px solid rgba(0,194,224,0.2);
    color:#00c2e0; font-size:10px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase;
    margin-bottom:24px; animation:lp-up 0.5s ease both;
  }
  .lp-hero-eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:#00c2e0; animation:lp-dot 2s infinite; }

  .lp-hero-h1 {
    font-family:'Space Grotesk',sans-serif;
    font-size:clamp(42px,5.5vw,78px); font-weight:700;
    line-height:1.0; letter-spacing:-1px; text-transform:uppercase;
    color:#ffffff; margin-bottom:24px;
    animation:lp-up 0.5s 0.08s ease both;
  }
  .lp-hero-h1 em {
    font-style:normal;
    background:linear-gradient(135deg,#00c2e0,#2d8cf0);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  .lp-hero-sub {
    font-size:16px; color:rgba(200,216,232,0.62); line-height:1.85;
    max-width:520px; margin-bottom:40px; font-weight:400;
    animation:lp-up 0.5s 0.16s ease both;
  }

  .lp-hero-actions { display:flex; gap:14px; flex-wrap:wrap; animation:lp-up 0.5s 0.22s ease both; }

  /* Pill stat badges under hero heading */
  .lp-hero-badges { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:32px; animation:lp-up 0.5s 0.28s ease both; }
  .lp-hero-badge {
    display:flex; align-items:center; gap:6px;
    padding:5px 12px; border-radius:20px;
    background:rgba(255,255,255,0.04); border:1px solid rgba(200,216,232,0.1);
    font-size:11px; font-weight:600; color:rgba(200,216,232,0.7);
    letter-spacing:0.3px;
  }
  .lp-hero-badge-dot { width:5px; height:5px; border-radius:50%; background:#00c2e0; }

  .lp-btn-primary {
    padding:13px 28px; background:linear-gradient(135deg,#00c2e0,#0096b8); border:none; border-radius:7px;
    color:#fff; font-size:13px; font-weight:700; cursor:pointer;
    font-family:'Inter',sans-serif; letter-spacing:0.5px; text-transform:uppercase;
    transition:all 0.18s; text-decoration:none; display:inline-flex; align-items:center; gap:8px;
    box-shadow:0 0 24px rgba(0,194,224,0.3);
  }
  .lp-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 40px rgba(0,194,224,0.5); }

  .lp-btn-secondary {
    padding:13px 24px; background:rgba(255,255,255,0.04);
    border:1.5px solid rgba(200,216,232,0.25); border-radius:7px;
    color:rgba(200,216,232,0.85); font-size:13px; font-weight:600; cursor:pointer;
    font-family:'Inter',sans-serif; letter-spacing:0.3px; transition:all 0.18s;
    display:inline-flex; align-items:center; gap:8px;
  }
  .lp-btn-secondary:hover { border-color:#00c2e0; color:#00c2e0; background:rgba(0,194,224,0.05); }

  /* ─── Login card ─── */
  .lp-card {
    background:rgba(10,22,40,0.9);
    border:1px solid rgba(0,194,224,0.2);
    border-top:2px solid #00c2e0;
    border-radius:12px;
    padding:32px 28px;
    backdrop-filter:blur(20px);
    box-shadow:0 0 60px rgba(0,194,224,0.08), 0 24px 60px rgba(0,0,0,0.4);
    animation:lp-up 0.6s 0.12s cubic-bezier(0.16,1,0.3,1) both;
  }
  .lp-card-logo { text-align:center; padding-bottom:20px; margin-bottom:20px; border-bottom:1px solid rgba(0,194,224,0.12); }
  .lp-card-logo .wm { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:3px; color:#fff; }
  .lp-card-logo .wm span { color:#00c2e0; }
  .lp-card-logo .tg { font-size:9px; color:rgba(200,216,232,0.35); letter-spacing:2.5px; text-transform:uppercase; margin-top:4px; }

  .lp-tabs { display:flex; border-bottom:1px solid rgba(0,194,224,0.1); margin-bottom:22px; }
  .lp-tab {
    flex:1; padding:8px 4px; background:none; border:none;
    border-bottom:2px solid transparent; color:rgba(200,216,232,0.4);
    font-size:12px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif;
    transition:all 0.15s; text-transform:uppercase; letter-spacing:1px;
  }
  .lp-tab.on { border-bottom-color:#00c2e0; color:#00c2e0; }

  .lp-field { margin-bottom:14px; }
  .lp-lbl { display:block; font-size:10px; font-weight:600; color:rgba(200,216,232,0.45); margin-bottom:5px; letter-spacing:1.5px; text-transform:uppercase; }
  .lp-inp {
    width:100%; padding:10px 12px; box-sizing:border-box;
    background:rgba(255,255,255,0.04) !important;
    color:#fff !important;
    border:1px solid rgba(0,194,224,0.2) !important;
    border-radius:6px !important; font-size:13px; font-family:'Inter',sans-serif;
    outline:none; transition:border-color 0.15s;
  }
  .lp-inp:focus { border-color:#00c2e0 !important; background:rgba(0,194,224,0.06) !important; box-shadow:0 0 0 3px rgba(0,194,224,0.1) !important; }
  .lp-inp::placeholder { color:rgba(200,216,232,0.25) !important; }
  .lp-go {
    width:100%; padding:12px; background:linear-gradient(135deg,#00c2e0,#0090a8); border:none; border-radius:6px;
    color:#fff; font-size:13px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif;
    letter-spacing:0.6px; text-transform:uppercase; transition:all 0.18s;
    box-shadow:0 0 20px rgba(0,194,224,0.25);
  }
  .lp-go:hover { box-shadow:0 0 32px rgba(0,194,224,0.45); transform:translateY(-1px); }
  .lp-go:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
  .lp-err { padding:8px 12px; background:rgba(220,38,38,0.1); border:1px solid rgba(220,38,38,0.3); border-radius:5px; color:#f87171; font-size:12px; margin-bottom:10px; }
  .lp-ok  { padding:8px 12px; background:rgba(0,194,100,0.1); border:1px solid rgba(0,194,100,0.3); border-radius:5px; color:#4ade80; font-size:12px; margin-bottom:10px; }
  .lp-card-foot { margin-top:16px; padding-top:14px; border-top:1px solid rgba(0,194,224,0.1); }
  .lp-card-foot-line { font-size:10px; color:rgba(200,216,232,0.35); text-align:center; line-height:1.7; }
  .lp-card-foot-link { color:#00c2e0; background:none; border:none; cursor:pointer; font-size:10px; font-family:'Inter',sans-serif; padding:0; text-decoration:underline; }

  /* ─── Stats bar ─── */
  .lp-stats {
    display:flex; justify-content:center; gap:0;
    border-top:1px solid rgba(0,194,224,0.08);
    border-bottom:1px solid rgba(0,194,224,0.08);
    background:rgba(0,194,224,0.03);
    padding:0;
  }
  .lp-stat {
    flex:1; padding:28px 20px; text-align:center;
    border-right:1px solid rgba(0,194,224,0.08);
    transition:background 0.2s;
  }
  .lp-stat:last-child { border-right:none; }
  .lp-stat:hover { background:rgba(0,194,224,0.05); }
  .lp-stat-n {
    font-family:'Space Grotesk',sans-serif; font-size:34px; font-weight:700;
    background:linear-gradient(135deg,#00c2e0,#2d8cf0);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    letter-spacing:-1px; line-height:1;
  }
  .lp-stat-l { font-size:10px; color:rgba(200,216,232,0.5); font-weight:600; margin-top:6px; letter-spacing:1.5px; text-transform:uppercase; }

  /* ─── Modules grid ─── */
  .lp-modules {
    padding:100px 5vw;
    background:linear-gradient(180deg,#060d17 0%,#080f1c 100%);
    position:relative;
  }
  .lp-modules::before {
    content:'';
    position:absolute; inset:0;
    background:radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,194,224,0.04) 0%, transparent 60%);
    pointer-events:none;
  }
  .lp-modules-inner { max-width:1280px; margin:0 auto; position:relative; z-index:1; }
  .lp-section-label {
    font-size:10px; font-weight:700; color:#00c2e0; letter-spacing:3px; text-transform:uppercase;
    margin-bottom:16px; display:flex; align-items:center; gap:10px;
  }
  .lp-section-label::before { content:''; width:20px; height:1.5px; background:linear-gradient(90deg,#00c2e0,transparent); }
  .lp-section-h {
    font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,3vw,44px); font-weight:700;
    color:#fff; line-height:1.1; letter-spacing:-0.5px; margin-bottom:14px;
  }
  .lp-section-h em {
    font-style:normal;
    background:linear-gradient(135deg,#00c2e0,#2d8cf0);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .lp-section-sub { font-size:15px; color:rgba(200,216,232,0.55); line-height:1.8; max-width:560px; margin-bottom:60px; }

  .lp-modules-grid {
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:16px;
  }
  @media(max-width:1024px) { .lp-modules-grid { grid-template-columns:repeat(2,1fr); } }
  @media(max-width:640px)  { .lp-modules-grid { grid-template-columns:1fr; } }

  .lp-module-card {
    background:rgba(255,255,255,0.025);
    border:1px solid rgba(200,216,232,0.07);
    border-radius:12px; padding:28px 26px;
    transition:all 0.25s; cursor:default;
    position:relative; overflow:hidden;
  }
  .lp-module-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(0,194,224,0.4),transparent);
    opacity:0; transition:opacity 0.25s;
  }
  .lp-module-card:hover { border-color:rgba(0,194,224,0.2); background:rgba(0,194,224,0.04); transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.3), 0 0 30px rgba(0,194,224,0.06); }
  .lp-module-card:hover::before { opacity:1; }

  .lp-module-icon {
    width:44px; height:44px; border-radius:10px;
    background:rgba(0,194,224,0.1); border:1px solid rgba(0,194,224,0.2);
    display:flex; align-items:center; justify-content:center;
    margin-bottom:18px; font-size:20px;
  }
  .lp-module-n {
    font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600;
    color:#fff; margin-bottom:8px; letter-spacing:-0.2px;
  }
  .lp-module-desc { font-size:13px; color:rgba(200,216,232,0.52); line-height:1.7; margin-bottom:16px; }
  .lp-module-tags { display:flex; flex-wrap:wrap; gap:6px; }
  .lp-module-tag {
    font-size:10px; font-weight:600; padding:3px 9px; border-radius:4px;
    background:rgba(0,194,224,0.07); border:1px solid rgba(0,194,224,0.15);
    color:rgba(0,194,224,0.8); letter-spacing:0.3px;
  }
  .lp-module-tag.green { background:rgba(0,194,100,0.07); border-color:rgba(0,194,100,0.2); color:rgba(0,194,130,0.9); }
  .lp-module-tag.purple { background:rgba(139,92,246,0.07); border-color:rgba(139,92,246,0.2); color:rgba(167,139,250,0.9); }
  .lp-module-tag.amber { background:rgba(245,158,11,0.07); border-color:rgba(245,158,11,0.2); color:rgba(251,191,36,0.9); }

  /* ─── About ─── */
  .lp-about {
    color:#c8d8e8;
    padding:100px 5vw;
    background:linear-gradient(135deg,#0a1628 0%,#080f1c 100%);
    display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center;
    max-width:none; position:relative; overflow:hidden;
  }
  .lp-about::before {
    content:''; position:absolute; right:-200px; top:-100px;
    width:600px; height:600px; border-radius:50%;
    background:radial-gradient(circle,rgba(0,194,224,0.06) 0%,transparent 70%);
    pointer-events:none;
  }
  .lp-about-inner { max-width:1280px; margin:0 auto; display:contents; }
  @media(max-width:900px) { .lp-about { grid-template-columns:1fr; gap:40px; } }

  .lp-about-h {
    font-family:'Space Grotesk',sans-serif; font-size:clamp(26px,2.8vw,42px);
    font-weight:700; text-transform:uppercase; color:#fff; line-height:1.1; letter-spacing:-0.3px;
  }
  .lp-about-h em { font-style:normal; background:linear-gradient(135deg,#00c2e0,#2d8cf0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .lp-about-body { font-size:15px; color:rgba(200,216,232,0.65); line-height:1.9; }
  .lp-about-body p + p { margin-top:18px; }

  .lp-about-points { margin-top:32px; display:flex; flex-direction:column; gap:14px; }
  .lp-about-point {
    display:flex; gap:12px; align-items:flex-start;
    padding:14px 16px; border-radius:9px;
    background:rgba(0,194,224,0.04); border:1px solid rgba(0,194,224,0.1);
  }
  .lp-about-point-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
  .lp-about-point-text { font-size:13px; color:rgba(200,216,232,0.7); line-height:1.6; }
  .lp-about-point-text strong { color:#fff; display:block; margin-bottom:2px; font-size:13px; }

  /* ─── Features accordion ─── */
  .lp-feats {
    background:linear-gradient(180deg,#080f1c 0%,#060d17 100%);
    border-top:1px solid rgba(0,194,224,0.06);
    border-bottom:1px solid rgba(0,194,224,0.06);
    padding:100px 0;
  }
  .lp-feats-inner { max-width:1280px; margin:0 auto; padding:0 5vw; }
  .lp-feats-head { margin-bottom:56px; display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:end; }
  @media(max-width:768px) { .lp-feats-head { grid-template-columns:1fr; gap:20px; } }
  .lp-feats-intro { font-size:14px; color:rgba(200,216,232,0.55); line-height:1.85; }

  .lp-acc { border:1px solid rgba(0,194,224,0.1); border-radius:10px; overflow:hidden; }
  .lp-acc-row { border-bottom:1px solid rgba(0,194,224,0.08); }
  .lp-acc-row:last-child { border-bottom:none; }
  .lp-acc-head {
    display:grid; grid-template-columns:60px 1fr 28px;
    align-items:center; padding:0; cursor:pointer; transition:background 0.15s;
  }
  .lp-acc-head:hover { background:rgba(0,194,224,0.04); }
  .lp-acc-row.open .lp-acc-head { background:rgba(0,194,224,0.06); }
  .lp-acc-num {
    padding:22px 0 22px 24px;
    font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700;
    color:rgba(0,194,224,0.15); line-height:1; transition:color 0.2s;
    align-self:stretch; display:flex; align-items:center;
  }
  .lp-acc-row.open .lp-acc-num { color:#00c2e0; }
  .lp-acc-meta { padding:22px 16px; }
  .lp-acc-title { font-size:14px; font-weight:600; color:#e0eaf6; letter-spacing:0.1px; margin-bottom:3px; }
  .lp-acc-hint { font-size:12px; color:rgba(200,216,232,0.45); }
  .lp-acc-chev {
    padding-right:20px; font-size:10px;
    color:rgba(200,216,232,0.35); transition:transform 0.22s, color 0.15s;
    display:flex; align-items:center; justify-content:center;
  }
  .lp-acc-row.open .lp-acc-chev { transform:rotate(180deg); color:#00c2e0; }
  .lp-acc-body { overflow:hidden; max-height:0; opacity:0; transition:max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.25s; }
  .lp-acc-body.open { max-height:900px; opacity:1; }
  .lp-acc-inner {
    padding:0 24px 28px 88px;
    border-top:1px solid rgba(0,194,224,0.08);
    background:rgba(0,194,224,0.02);
    animation:acc-open 0.3s ease;
  }
  @media(max-width:640px) { .lp-acc-inner { padding:0 16px 24px 16px; } }
  .lp-acc-desc { font-size:14px; color:rgba(200,216,232,0.62); line-height:1.85; margin-top:20px; margin-bottom:18px; max-width:720px; }
  .lp-acc-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 28px; margin-bottom:22px; }
  @media(max-width:640px) { .lp-acc-grid { grid-template-columns:1fr; } }
  .lp-acc-pt {
    display:flex; gap:10px; align-items:baseline;
    font-size:13px; color:rgba(200,216,232,0.55); line-height:1.55;
    padding:5px 0; border-bottom:1px solid rgba(0,194,224,0.05);
  }
  .lp-acc-pt::before { content:'—'; color:#00c2e0; flex-shrink:0; font-size:11px; }
  .lp-acc-links { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
  .lp-acc-link-tag {
    font-size:10px; font-weight:600; letter-spacing:1px; text-transform:uppercase;
    padding:4px 12px; border-radius:4px;
    border:1px solid rgba(0,194,224,0.25); color:rgba(0,194,224,0.75); background:rgba(0,194,224,0.06);
  }
  .lp-acc-connects {
    border-left:2px solid rgba(0,194,224,0.3); padding:12px 16px; margin-top:4px;
    background:rgba(0,194,224,0.04); border-radius:0 6px 6px 0;
  }
  .lp-acc-connects-label { font-size:9px; font-weight:700; color:#00c2e0; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .lp-acc-connects-text { font-size:12px; color:rgba(200,216,232,0.55); line-height:1.75; }

  /* ─── CTA ─── */
  .lp-cta-wrap {
    background:linear-gradient(135deg,#060d17 0%,#0a1628 50%,#060d17 100%);
    padding:120px 5vw; text-align:center; position:relative; overflow:hidden;
  }
  .lp-cta-wrap::before {
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,194,224,0.06) 0%, transparent 65%);
    pointer-events:none;
  }
  .lp-cta { max-width:680px; margin:0 auto; position:relative; z-index:1; }
  .lp-cta-h {
    font-family:'Space Grotesk',sans-serif; font-size:clamp(32px,4vw,52px); font-weight:700;
    text-transform:uppercase; color:#fff; letter-spacing:-0.5px; margin-bottom:18px; line-height:1.1;
  }
  .lp-cta-h em { font-style:normal; background:linear-gradient(135deg,#00c2e0,#2d8cf0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .lp-cta-sub { font-size:16px; color:rgba(200,216,232,0.55); max-width:480px; margin:0 auto 40px; line-height:1.8; }
  .lp-cta-acts { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .lp-cta-note { margin-top:24px; font-size:12px; color:rgba(200,216,232,0.3); }
  .lp-cta-note a { color:#00c2e0; text-decoration:none; }

  /* ─── Footer ─── */
  .lp-footer {
    color:#c8d8e8;
    border-top:1px solid rgba(0,194,224,0.08);
    padding:28px 5vw;
    display:flex; justify-content:space-between; align-items:center;
    flex-wrap:wrap; gap:12px; background:#040a12;
  }
  .lp-footer-logo { font-family:'Space Grotesk',sans-serif; font-size:16px; font-weight:700; letter-spacing:2px; color:rgba(200,216,232,0.6); }
  .lp-footer-logo span { color:#00c2e0; }
  .lp-footer-links { display:flex; gap:20px; align-items:center; }
  .lp-footer-link { font-size:12px; color:rgba(200,216,232,0.4); text-decoration:none; background:none; border:none; cursor:pointer; font-family:'Inter',sans-serif; transition:color 0.15s; }
  .lp-footer-link:hover { color:#00c2e0; }
  .lp-footer-copy { font-size:11px; color:rgba(200,216,232,0.25); }

  /* ─── Privacy Modal ─── */
  .lp-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .lp-modal { background:#0a1628; border:1px solid rgba(0,194,224,0.2); border-radius:12px; max-width:560px; width:100%; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 0 60px rgba(0,0,0,0.6); }
  .lp-modal-head { padding:20px 24px 16px; border-bottom:1px solid rgba(0,194,224,0.1); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
  .lp-modal-title { font-size:16px; font-weight:700; color:#fff; }
  .lp-modal-sub { font-size:11px; color:rgba(200,216,232,0.4); margin-top:3px; }
  .lp-modal-close { background:none; border:none; color:rgba(200,216,232,0.5); cursor:pointer; font-size:18px; line-height:1; transition:color 0.15s; }
  .lp-modal-close:hover { color:#00c2e0; }
  .lp-modal-body { overflow-y:auto; flex:1; padding:20px 24px; }
  .lp-modal-sec { margin-bottom:20px; }
  .lp-modal-sec-h { font-size:12px; font-weight:700; color:#00c2e0; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .lp-modal-sec p { font-size:13px; color:rgba(200,216,232,0.6); line-height:1.7; }
  .lp-modal-note { font-size:12px; color:rgba(200,216,232,0.4); border-top:1px solid rgba(0,194,224,0.1); padding-top:16px; margin-top:8px; }
  .lp-modal-foot { padding:16px 24px; border-top:1px solid rgba(0,194,224,0.1); flex-shrink:0; }

  /* ─── Responsive ─── */
  @media(max-width:640px) {
    .lp-stats { flex-wrap:wrap; }
    .lp-stat { min-width:50%; }
    .lp-about { padding:60px 5vw; }
    .lp-feats { padding:60px 0; }
    .lp-modules { padding:60px 5vw; }
    .lp-cta-wrap { padding:80px 5vw; }
    .lp-acc-head { grid-template-columns:48px 1fr 28px; }
  }
`;

// ─── Module data ──────────────────────────────────────────────────────────────
const MODULES = [
  {
    icon: '📊',
    n: 'Operational Dashboard',
    desc: 'Real-time fleet intelligence across all assets. Customisable drag-and-drop widget layout with fleet health bar, overdue services, live work orders, oil sampling alerts and priority job tracking.',
    tags: [['Real-time',''],['Customisable',''],['AI Alerts','purple']],
  },
  {
    icon: '🚛',
    n: 'Asset Register',
    desc: 'Complete operational and financial record for every machine. QR code generation, full lifecycle tracking, service history, prestart history, depreciation, hours tracking and document storage.',
    tags: [['QR Codes',''],['Lifecycle',''],['Full History','green']],
  },
  {
    icon: '✅',
    n: 'AI Prestart Platform',
    desc: 'Digital prestart checklists auto-generated from asset make, model and type using Claude AI. Assign templates per asset, capture operator signatures, log defects and sync hours automatically.',
    tags: [['AI Generated','purple'],['Signatures',''],['Auto-Assign','green']],
  },
  {
    icon: '🔧',
    n: 'Maintenance & Work Orders',
    desc: 'Multi-trigger service scheduling by hours, kilometres, months or years. Hard-set or auto-calculated next due values. Work order management with priority levels, assignment and defect conversion.',
    tags: [['Hours/KM/Date',''],['Work Orders',''],['Overdue Alerts','amber']],
  },
  {
    icon: '📦',
    n: 'Parts & Inventory',
    desc: 'Real-time stock visibility across every storeroom. QR-coded parts, low stock alerts, purchase order tracking, supplier management, parts consumption linked to service sheets and work orders.',
    tags: [['QR Scanning',''],['Low Stock Alerts','amber'],['Supplier Mgmt','']],
  },
  {
    icon: '🔬',
    n: 'Oil Sampling & Condition',
    desc: 'AI-powered oil analysis from lab report emails. Automatic data extraction via Claude AI — wear metals, viscosity, water content, TBN/TAN. Condition trending with Normal, Monitor and Critical classification.',
    tags: [['Email Ingestion',''],['AI Analysis','purple'],['Trend Charts','']],
  },
  {
    icon: '⏱',
    n: 'Downtime Tracking',
    desc: 'Structured downtime logging with failure category, causal system, hours lost and resolution details. Fleet availability calculations, breakdown-to-work-order conversion and real-time status board.',
    tags: [['Fleet Availability',''],['Categories',''],['Live Status','green']],
  },
  {
    icon: '📄',
    n: 'Service Sheet Platform',
    desc: 'AI-generated service sheet templates with parts lists and labour sections. Digital completion with signatures, photo evidence, parts consumption recording and automatic service history entry.',
    tags: [['AI Templates','purple'],['Parts Tracking',''],['Labour Hours','']],
  },
  {
    icon: '📈',
    n: 'Reports & Analytics',
    desc: 'Comprehensive reporting across downtime, fleet availability, prestart compliance, parts consumption and service history. PDF and Excel export for all report types. Customisable date ranges.',
    tags: [['PDF Export',''],['Excel Export',''],['Compliance','green']],
  },
  {
    icon: '📅',
    n: 'Maintenance Calendar',
    desc: 'Full-year maintenance calendar with live external sync. Subscribe via Google, Outlook or Apple Calendar using a secure webcal link. Events auto-update when new schedules or work orders are added.',
    tags: [['Google/Outlook/Apple',''],['Live Sync','green'],['Full Year','']],
  },
  {
    icon: '💬',
    n: 'Team Messaging',
    desc: 'Internal team communications built into the platform. Direct messaging, group channels and automated system alerts for overdue services, critical oil samples and logged breakdowns.',
    tags: [['Direct Messages',''],['Group Channels',''],['System Alerts','amber']],
  },
  {
    icon: '🏷',
    n: 'Label Designer & QR',
    desc: 'Custom asset ID tag and label design with company branding. QR-embedded labels print-ready for field attachment. Scan-to-action: configurable to open prestart, job card or asset profile.',
    tags: [['Custom Branding',''],['Print Ready',''],['Scan to Action','green']],
  },
];

// ─── Full feature accordion data ─────────────────────────────────────────────
const FEATURES = [
  {
    n: '01', title: 'Operational Dashboard',
    hint: 'Real-time fleet intelligence across all assets',
    desc: 'The dashboard provides a live overview of your entire fleet operation. Drag-and-drop widgets allow each user to configure their view. Data from every module surfaces automatically — no manual entry required at the management level.',
    points: [
      'Fleet health bar — Running, Maintenance, Down counts at a glance',
      'Overdue services with asset name, service type and hours overdue',
      'Open work orders ranked by priority (Critical → Low)',
      'Today\'s scheduled maintenance and upcoming service due dates',
      'Oil sampling alerts for Monitor and Critical condition results',
      'Low stock parts warnings with current quantity and reorder point',
      'Prestart compliance rate and last submission per asset',
      'Clickable asset rows navigate directly to the asset profile',
    ],
    tags: ['Real-time Data', 'Customisable Widgets', 'Role-based Views'],
    connects: 'All modules feed data to the dashboard automatically. Fleet health updates from Downtime module status changes. Service overdue counts calculate from the Maintenance Scheduling module. Oil condition alerts arrive from the Oil Sampling module within 6 hours of lab report submission.',
    ai: null,
  },
  {
    n: '02', title: 'Asset Register & Lifecycle Management',
    hint: 'Complete operational and financial record for every machine',
    desc: 'Every asset in your fleet has a dedicated profile capturing the full lifecycle from purchase through to disposal. QR tags link physical equipment to its digital record, enabling instant access from the field.',
    points: [
      'Full asset profile: make, model, year, serial, engine number, registration',
      'Hours tracking updated automatically from prestart submissions',
      'Service schedule management — add/edit/delete intervals per asset',
      'Complete prestart history with operator, date, hours and defect status',
      'Full service history from service sheet submissions',
      'Document storage: manuals, schematics, compliance certificates',
      'Depreciation calculator: straight-line, declining balance, hours-based',
      'QR code generation and custom ID tag label printing',
      'Asset settings tab for full information editing and controlled deletion',
    ],
    tags: ['QR Code Generation', 'Depreciation Engine', 'Document Storage', 'Full History'],
    connects: 'Asset hours update automatically from Prestart form submissions. Service history populates from completed Service Sheets. Downtime events appear in the asset\'s operational timeline. Oil sampling results link to the asset for condition trending.',
    ai: 'AI auto-generates prestart checklists and service sheet templates from the asset\'s make, model, type and specifications — removing the need to manually build forms for every machine type.',
  },
  {
    n: '03', title: 'AI Prestart & Service Sheet Platform',
    hint: 'Intelligent structured forms built for field conditions',
    desc: 'Digital prestart checklists replace paper forms that never get processed. Templates are auto-generated from asset information using Claude AI, assigned to specific machines, and submitted directly from mobile or tablet.',
    points: [
      'AI template generation from asset make, model and type',
      'Per-asset template assignment — only relevant forms appear for each machine',
      'Operator signature capture with stylus or finger',
      'Photo evidence attachment for defect items',
      'Defect flagging creates work orders automatically',
      'Hours reading captured at submission updates asset record',
      'Prestart history tab per asset — full compliance record',
      'Service sheets with parts consumption, labour hours and technician signature',
      'Records view with filters, bulk PDF and Excel export',
    ],
    tags: ['AI Generation', 'Digital Signatures', 'Auto Work Orders', 'Photo Evidence'],
    connects: 'Prestart submissions update asset current hours in the Asset Register. Defects logged generate Work Orders in the Maintenance module. Service sheet completions write to the asset\'s Service History. Operator compliance data surfaces on the Dashboard.',
    ai: 'Claude AI generates complete, equipment-specific checklists from asset data — a telehandler gets torque checks and load capacity verification; a compressor gets pressure, blow-down and safety valve inspection. No generic forms.',
  },
  {
    n: '04', title: 'Maintenance Scheduling & Work Order Management',
    hint: 'Closed-loop maintenance from schedule through completion',
    desc: 'Service intervals trigger on hours, kilometres, calendar months or years. Next due values are calculated automatically from last service data or set manually as hard targets. Work orders manage the full resolution workflow.',
    points: [
      'Multi-trigger scheduling: hours, km, months or years per interval',
      'Hard-set next due value or auto-calculate from last service date/hours',
      'Overdue, Due Soon and Upcoming status classification',
      'Work orders with priority (Critical, High, Medium, Low)',
      'Work order assignment to specific technicians',
      'Defect-to-work-order conversion from prestart submissions',
      'Service schedule calendar with Google, Outlook and Apple sync',
      'Planned maintenance task tracking with frequency and assignment',
      'Service interval management in both asset profile and admin settings',
    ],
    tags: ['Multi-Trigger Scheduling', 'Work Orders', 'Calendar Sync', 'Defect Conversion'],
    connects: 'Service schedules calculate next due from hours submitted through Prestarts. Overdue services surface on the Dashboard. Completed work orders link to Service Sheets and parts consumption records. Calendar events update live when schedules change.',
    ai: null,
  },
  {
    n: '05', title: 'Parts & Inventory Control',
    hint: 'Real-time stock visibility across every storeroom',
    desc: 'Parts inventory linked directly to maintenance activity. Stock levels update when parts are consumed in service sheets or work orders, and low stock alerts trigger automatically when quantities fall below reorder points.',
    points: [
      'Part records: part number, description, supplier, category, unit cost',
      'Current quantity and minimum stock level tracking',
      'Low stock dashboard alerts with current vs minimum quantity',
      'QR code generation per part for rapid storeroom scanning',
      'Parts consumption recorded against service sheets and work orders',
      'Purchase order tracking and supplier management',
      'Parts search with category and supplier filters',
      'Bulk import via Excel for initial storeroom setup',
      'Parts usage history per asset and per work order',
    ],
    tags: ['QR Part Labels', 'Low Stock Alerts', 'Consumption Tracking', 'Supplier Management'],
    connects: 'Parts consumed in Service Sheets update inventory quantities automatically. Low stock alerts surface on the Dashboard. Parts usage links to asset maintenance cost tracking and to the Depreciation & Valuation module.',
    ai: null,
  },
  {
    n: '06', title: 'Oil Sampling & Condition Monitoring',
    hint: 'Predictive failure detection through systematic fluid analysis',
    desc: 'Oil analysis results extracted automatically from lab report emails using Claude AI. Each company has a unique ingestion address. Results appear in the platform within minutes of lab email receipt — no manual data entry.',
    points: [
      'Unique email ingestion address per company for lab report forwarding',
      'AI extraction of wear metals (Fe, Cu, Al, Si, Cr, Ni, Pb, Sn and more)',
      'Viscosity at 40°C and 100°C, water content, soot, TBN, TAN',
      'Automatic condition classification: Normal, Monitor, Critical',
      'AI-generated analysis summary and maintenance recommendations',
      'Wear metal trend charts per asset and component',
      'Filter by asset, condition status and component type',
      'Critical condition alerts surface on the Dashboard immediately',
      'Lab result history maintained per asset for trend analysis',
    ],
    tags: ['Email Ingestion', 'AI Analysis', 'Wear Metal Trending', 'Condition Classification'],
    connects: 'Critical oil condition results trigger alerts on the Dashboard. Oil sampling data feeds into the Depreciation & Valuation module for repair-vs-replace analysis. Results link to the asset profile for full condition history.',
    ai: 'Claude AI reads PDF and text lab reports, extracts all numeric data fields, classifies overall condition (Normal/Monitor/Critical), writes a plain-English findings summary and generates specific maintenance recommendations based on the results.',
  },
  {
    n: '07', title: 'Downtime Tracking & Fleet Availability',
    hint: 'Structured breakdown logging and real-time fleet availability',
    desc: 'Every breakdown, planned maintenance period and unplanned stoppage is captured with structured data. Fleet availability calculations run from this data, giving management accurate utilisation metrics rather than estimates.',
    points: [
      'Downtime logging: failure category, causal system, start/end time',
      'Hours lost calculation with manual adjustment capability',
      'Breakdown description and resolution details capture',
      'Real-time fleet status board: Running, Maintenance, Down',
      'Fleet availability percentage by asset and fleet-wide',
      'Downtime event conversion to Work Order with one click',
      'Downtime reports with date range filtering',
      'PDF and Excel export for downtime and availability reports',
      'Dashboard widget showing breakdown count and availability rate',
    ],
    tags: ['Fleet Availability %', 'Category Logging', 'WO Conversion', 'PDF/Excel Export'],
    connects: 'Downtime events link to the Asset Register and appear in the asset\'s operational timeline. Breakdown logging can convert directly to Work Orders in the Maintenance module. Availability data feeds the Dashboard fleet health calculations.',
    ai: null,
  },
  {
    n: '08', title: 'Depreciation & Asset Valuation',
    hint: 'Financial lifecycle analysis with AI repair-vs-replace recommendations',
    desc: 'Three depreciation methods with full operational data integration. The AI synthesises purchase cost, maintenance expenditure, oil condition history and hours data to generate structured repair-versus-replace recommendations.',
    points: [
      'Three methods: straight-line, declining balance, hours-based',
      'Purchase price, date and expected useful life inputs',
      'Salvage value calculation and book value tracking',
      'Total maintenance expenditure integration from service history',
      'Remaining useful life projection based on actual usage data',
      'Depreciation schedule table with year-by-year values',
      'AI repair-vs-replace recommendation with plain-English rationale',
      'Available per asset in the asset profile Depreciation tab',
    ],
    tags: ['3 Methods', 'AI Recommendation', 'Maintenance Integration', 'Book Value Tracking'],
    connects: 'Draws from the Asset Register (purchase data, hours), Maintenance module (total service expenditure), and Oil Sampling (condition history) to build a complete financial picture for each asset.',
    ai: 'AI synthesises the depreciation curve, total maintenance expenditure history, oil condition results and operational hours to produce a structured repair-versus-replace recommendation — grounded in the asset\'s actual operational data, not generic benchmarks.',
  },
];

const POLICY = [
  { t:'Data Collection', b:'MechIQ collects operational data you enter into the platform including asset records, maintenance history, prestart submissions, parts inventory and user account details. We collect only what is necessary to provide the service.' },
  { t:'Data Storage', b:'All data is stored securely in Supabase infrastructure hosted in Australia. Data is encrypted at rest and in transit. We do not store payment information on our systems.' },
  { t:'Data Use', b:'Your data is used solely to provide the MechIQ platform services to your organisation. We do not sell, share or use your operational data for any purpose outside of service delivery.' },
  { t:'Access Controls', b:'Access to your company data is restricted to users you authorise through the platform\'s role management system. MechIQ staff have restricted, audited access for support purposes only.' },
  { t:'Data Retention', b:'Your data is retained for the duration of your service agreement. Upon termination, data export is available for 30 days, after which data is securely deleted from our systems.' },
  { t:'AI Processing', b:'Certain features use Anthropic\'s Claude AI API for analysis tasks (oil report extraction, template generation). Data sent for AI processing is subject to Anthropic\'s data handling policies and is not used for model training.' },
  { t:'Contact', b:'Privacy enquiries and data requests: info@mechiq.com.au. We will respond within 5 business days.' },
];

function FeatureRow({ f }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lp-acc-row${open?' open':''}`}>
      <div className="lp-acc-head" onClick={() => setOpen(o => !o)}>
        <div className="lp-acc-num">{f.n}</div>
        <div className="lp-acc-meta">
          <div className="lp-acc-title">{f.title}</div>
          <div className="lp-acc-hint">{f.hint}</div>
        </div>
        <div className="lp-acc-chev">▼</div>
      </div>
      <div className={`lp-acc-body${open?' open':''}`}>
        <div className="lp-acc-inner">
          <p className="lp-acc-desc">{f.desc}</p>
          {f.ai && (
            <div className="lp-acc-links">
              <span className="lp-acc-link-tag">✦ AI-Powered</span>
            </div>
          )}
          <div className="lp-acc-grid">
            {f.points.map((p, i) => <div key={i} className="lp-acc-pt">{p}</div>)}
          </div>
          <div className="lp-acc-links">
            {f.tags.map(t => <span key={t} className="lp-acc-link-tag">{t}</span>)}
          </div>
          <div className="lp-acc-connects">
            <div className="lp-acc-connects-label">Platform Integration</div>
            <div className="lp-acc-connects-text">{f.connects}</div>
          </div>
          {f.ai && (
            <div className="lp-acc-connects" style={{ marginTop:8, borderLeftColor:'rgba(139,92,246,0.4)', background:'rgba(139,92,246,0.04)' }}>
              <div className="lp-acc-connects-label" style={{ color:'#a78bfa' }}>AI Capability</div>
              <div className="lp-acc-connects-text">{f.ai}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Login({ onAuth }) {
  const [tab,        setTab]        = useState('login');
  const [email,      setEmail]      = useState('');
  const [pw,         setPw]         = useState('');
  const [err,        setErr]        = useState('');
  const [msg,        setMsg]        = useState('');
  const [busy,       setBusy]       = useState(false);
  const [policy,     setPolicy]     = useState(false);
  const [stayPrompt, setStayPrompt] = useState(null);
  const [savedUser,  setSavedUser]  = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mechiq_saved_user') || 'null');
      if (!saved) return null;
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      if (Date.now() - (saved.savedAt || 0) > TWELVE_HOURS) {
        localStorage.removeItem('mechiq_saved_user');
        return null;
      }
      return saved;
    } catch { return null; }
  });
  const loginRef = useRef(null);
  const modulesRef = useRef(null);

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
        if (data.session) {
          setStayPrompt({ session: data.session, email: data.session.user.email, name: data.session.user.user_metadata?.name || email.split('@')[0] });
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMsg('Reset email sent — check your inbox.');
      }
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const handleStayYes = () => {
    localStorage.setItem('mechiq_saved_user', JSON.stringify({ email: stayPrompt.email, name: stayPrompt.name, savedAt: Date.now() }));
    onAuth(stayPrompt.session); setStayPrompt(null);
  };
  const handleStayNo = () => {
    localStorage.removeItem('mechiq_saved_user');
    onAuth(stayPrompt.session); setStayPrompt(null);
  };
  const handleContinueAsSaved = async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session) { onAuth(data.session); }
    else { setEmail(savedUser.email); setSavedUser(null); localStorage.removeItem('mechiq_saved_user'); }
  };
  const handleSignInAsOther = () => {
    localStorage.removeItem('mechiq_saved_user'); setSavedUser(null); supabase.auth.signOut();
  };
  const scroll = (ref) => ref.current?.scrollIntoView({ behavior:'smooth', block:'start' });

  return (
    <div className="lp">

      {/* ── Stay Signed In ── */}
      {stayPrompt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }}>
          <div style={{ background:'#0a1628', border:'1px solid rgba(0,194,224,0.25)', borderRadius:16, padding:'36px 32px', width:'100%', maxWidth:400, textAlign:'center', boxShadow:'0 0 60px rgba(0,194,224,0.1), 0 32px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🔐</div>
            <div style={{ fontSize:20, fontWeight:700, color:'#fff', marginBottom:8, fontFamily:'Space Grotesk,sans-serif' }}>Stay signed in?</div>
            <div style={{ fontSize:13, color:'rgba(200,216,232,0.5)', marginBottom:6 }}>Signed in as</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#00c2e0', marginBottom:6 }}>{stayPrompt.name}</div>
            <div style={{ fontSize:12, color:'rgba(200,216,232,0.35)', marginBottom:24 }}>{stayPrompt.email}</div>
            {(() => {
              const ua = navigator.userAgent;
              const isMobile = /iPhone|iPad|Android/i.test(ua);
              const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
              const deviceLabel = isTablet ? 'tablet' : isMobile ? 'phone' : 'computer';
              const deviceIcon = isTablet ? '📱' : isMobile ? '📱' : '💻';
              return (
                <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:24, fontSize:12, color:'rgba(251,191,36,0.9)', textAlign:'left' }}>
                  {deviceIcon} Detected: <strong>{isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop / Laptop'}</strong>
                  <div style={{ marginTop:5, color:'rgba(200,216,232,0.6)' }}>⚠ <strong style={{color:'rgba(251,191,36,0.9)'}}>Personal {deviceLabel} only.</strong> Session expires in 12 hours. On shared devices, select No.</div>
                </div>
              );
            })()}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleStayNo} style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(200,216,232,0.15)', borderRadius:8, fontSize:13, fontWeight:600, color:'rgba(200,216,232,0.7)', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                No, sign out<br/>when I close
              </button>
              <button onClick={handleStayYes} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#00c2e0,#0090a8)', border:'none', borderRadius:8, fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif', boxShadow:'0 0 20px rgba(0,194,224,0.3)' }}>
                Yes, keep me<br/>signed in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome Back ── */}
      {savedUser && !stayPrompt && (
        <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#060d17 0%,#0a1628 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(0,194,224,0.1) 1px,transparent 1px)', backgroundSize:'36px 36px', opacity:0.4, pointerEvents:'none' }} />
          <div style={{ background:'rgba(10,22,40,0.9)', border:'1px solid rgba(0,194,224,0.2)', borderTop:'2px solid #00c2e0', borderRadius:16, padding:'48px 40px', width:'100%', maxWidth:380, textAlign:'center', backdropFilter:'blur(20px)', boxShadow:'0 0 60px rgba(0,194,224,0.08), 0 24px 60px rgba(0,0,0,0.5)', position:'relative', zIndex:1 }}>
            <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:20, fontWeight:700, color:'#fff', letterSpacing:'2px', marginBottom:32 }}>MECH<span style={{ color:'#00c2e0' }}>IQ</span></div>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#00c2e0,#0090a8)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28, fontWeight:700, color:'#fff', boxShadow:'0 0 28px rgba(0,194,224,0.4)', fontFamily:'Space Grotesk,sans-serif' }}>
              {(savedUser.name||'?')[0].toUpperCase()}
            </div>
            <div style={{ fontSize:12, color:'rgba(200,216,232,0.45)', marginBottom:4, letterSpacing:'0.5px' }}>WELCOME BACK</div>
            <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'Space Grotesk,sans-serif' }}>{savedUser.name}</div>
            <div style={{ fontSize:13, color:'rgba(200,216,232,0.4)', marginBottom:36 }}>{savedUser.email}</div>
            <button onClick={handleContinueAsSaved} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#00c2e0,#0090a8)', border:'none', borderRadius:8, fontSize:14, fontWeight:700, color:'#fff', cursor:'pointer', marginBottom:10, fontFamily:'Inter,sans-serif', boxShadow:'0 0 24px rgba(0,194,224,0.3)' }}>Continue →</button>
            <button onClick={handleSignInAsOther} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(200,216,232,0.12)', borderRadius:8, fontSize:12, fontWeight:500, color:'rgba(200,216,232,0.5)', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
              Sign in as someone else
            </button>
            <div style={{ fontSize:10, color:'rgba(200,216,232,0.2)', marginTop:20, lineHeight:1.6 }}>Not your device? Sign in as someone else to protect your account privacy.</div>
          </div>
        </div>
      )}

      {!savedUser && !stayPrompt && <>

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <div className="lp-nav-logo">MECH<span>IQ</span></div>
          <div className="lp-nav-sep" />
          <div className="lp-nav-tag">Fleet Maintenance Management</div>
        </div>
        <div className="lp-nav-right">
          <button className="lp-nav-link" onClick={() => scroll(modulesRef)}>Platform</button>
          <a href="mailto:info@mechiq.com.au" className="lp-nav-link">Contact</a>
          <button className="lp-nav-btn" onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>
            Client Login
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="lp-hero-section">
        <section className="lp-hero">
          <div className="lp-hero-left">
            <div className="lp-hero-eyebrow">Built for Australian Heavy Industry</div>
            <h1 className="lp-hero-h1">
              Intelligent<br />Fleet<br /><em>Management</em>
            </h1>
            <div className="lp-hero-badges">
              {['AI-Powered Forms','Real-time Dashboard','Oil Condition Analysis','Calendar Sync','12 Modules'].map(b => (
                <div key={b} className="lp-hero-badge"><div className="lp-hero-badge-dot" />{b}</div>
              ))}
            </div>
            <p className="lp-hero-sub">
              A modern CMMS purpose-built for tunnelling, mining, civil infrastructure and heavy equipment operations. Real-time asset visibility, AI-generated maintenance forms and structured field data — in one connected platform built entirely in Australia.
            </p>
            <div className="lp-hero-actions">
              <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Request" className="lp-btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                Request a Demo
              </a>
              <button className="lp-btn-secondary" onClick={() => scroll(modulesRef)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
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
              {[['login','Sign In'],['reset','Reset Password']].map(([id,label]) => (
                <button key={id} className={`lp-tab${tab===id?' on':''}`} onClick={() => { setTab(id); setErr(''); setMsg(''); }}>{label}</button>
              ))}
            </div>
            <div className="lp-field">
              <label className="lp-lbl">Email Address</label>
              <input className="lp-inp" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} autoFocus />
            </div>
            {tab === 'login' && (
              <div className="lp-field">
                <label className="lp-lbl">Password</label>
                <input className="lp-inp" type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==='Enter' && handle()} />
              </div>
            )}
            {err && <div className="lp-err">{err}</div>}
            {msg && <div className="lp-ok">{msg}</div>}
            <button className="lp-go" onClick={handle} disabled={busy}>
              {busy ? 'Authenticating…' : tab==='login' ? 'Sign In' : 'Send Reset Email'}
            </button>
            <div className="lp-card-foot">
              <div className="lp-card-foot-line">Need access? <a href="mailto:info@mechiq.com.au" style={{ color:'#00c2e0', textDecoration:'none' }}>Contact us</a> to establish your company account.</div>
              <div className="lp-card-foot-line" style={{ marginTop:6 }}>
                By signing in you agree to our <button className="lp-card-foot-link" onClick={() => setPolicy(true)}>Privacy Policy</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Stats ── */}
      <div className="lp-stats">
        {[['12','Integrated Modules'],['Real-time','Fleet Visibility'],['AI','Forms & Analysis'],['100%','Australian Built']].map(([v,l]) => (
          <div key={l} className="lp-stat">
            <div className="lp-stat-n">{v}</div>
            <div className="lp-stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* ── Modules Grid ── */}
      <div className="lp-modules" ref={modulesRef}>
        <div className="lp-modules-inner">
          <div className="lp-section-label">Platform Modules</div>
          <h2 className="lp-section-h">Every module your operation needs.<br/><em>All connected.</em></h2>
          <p className="lp-section-sub">Data entered at field level flows automatically into the records that supervisors, managers and engineers depend on. No duplicate entry. No paper trail. No gaps.</p>
          <div className="lp-modules-grid">
            {MODULES.map(m => (
              <div key={m.n} className="lp-module-card">
                <div className="lp-module-icon">{m.icon}</div>
                <div className="lp-module-n">{m.n}</div>
                <div className="lp-module-desc">{m.desc}</div>
                <div className="lp-module-tags">
                  {m.tags.map(([t,c]) => <span key={t} className={`lp-module-tag${c?' '+c:''}`}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── About ── */}
      <div className="lp-about">
        <div style={{ position:'relative', zIndex:1 }}>
          <div className="lp-section-label">Why MechIQ</div>
          <h2 className="lp-about-h">Built by engineers,<br /><em>for engineers</em></h2>
          <div style={{ marginTop:20 }} className="lp-about-body">
            <p>MechIQ was developed alongside active tunnelling, mining and civil construction operations — not in a boardroom. Every module addresses a specific failure mode that conventional CMMS platforms fail to solve in real field conditions.</p>
            <p>The platform is designed so that data entered at field level — by operators on tablets, technicians on mobile — flows automatically into the records that supervisors, managers and engineers depend on.</p>
          </div>
          <div className="lp-about-points">
            {[
              ['📋','Paper prestarts that never get processed','Digital prestart checklists with AI-generated content specific to each machine type. Submitted from any device, defects converted to work orders automatically.'],
              ['⚙️','Service intervals that drift','Multi-trigger scheduling on hours, kilometres, months or years. Hard-set or calculated next due values. Overdue alerts surface on the dashboard before the interval is missed.'],
              ['🔬','No visibility of fluid condition','Automatic oil analysis from lab report emails. Claude AI extracts all data fields and classifies condition — results appear within minutes of lab email receipt.'],
              ['📊','Management with no real fleet visibility','Real-time dashboard pulling live data from every module. Fleet health, overdue services, breakdown counts and parts alerts — in one configurable view.'],
            ].map(([icon, title, desc]) => (
              <div key={title} className="lp-about-point">
                <div className="lp-about-point-icon">{icon}</div>
                <div className="lp-about-point-text"><strong>{title}</strong>{desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ background:'rgba(0,194,224,0.04)', border:'1px solid rgba(0,194,224,0.15)', borderRadius:14, padding:'32px 28px' }}>
            <div className="lp-section-label" style={{ marginBottom:20 }}>Designed for these industries</div>
            {[
              ['🏗️','Tunnelling & Underground','TBMs, MSVs, roadheaders, conveyor systems and associated plant equipment.'],
              ['⛏️','Mining & Resources','Surface and underground mining equipment, processing plant and mobile fleet.'],
              ['🏛️','Civil Infrastructure','Earthmoving, cranes, piling equipment and civil construction plant.'],
              ['🔩','Heavy Industrial','Manufacturing plant, generators, compressors and specialist equipment.'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display:'flex', gap:14, padding:'16px 0', borderBottom:'1px solid rgba(0,194,224,0.08)' }}>
                <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontFamily:'Space Grotesk,sans-serif', fontWeight:600, color:'#fff', fontSize:14, marginBottom:3 }}>{title}</div>
                  <div style={{ fontSize:12, color:'rgba(200,216,232,0.5)', lineHeight:1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Full Feature Detail ── */}
      <div className="lp-feats">
        <div className="lp-feats-inner">
          <div className="lp-feats-head">
            <div>
              <div className="lp-section-label">Module Detail</div>
              <h2 className="lp-section-h">Full capability set.<br/><em>Every module.</em></h2>
            </div>
            <div className="lp-feats-intro">
              Select any module to review its complete feature set, AI functionality and how it integrates across the platform. MechIQ is designed as a connected system — data entered in one module automatically flows to where it is needed across all others.
            </div>
          </div>
          <div className="lp-acc">
            {FEATURES.map(f => <FeatureRow key={f.n} f={f} />)}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="lp-cta-wrap">
        <div className="lp-cta">
          <div className="lp-section-label" style={{ justifyContent:'center', marginBottom:20 }}>Get Started</div>
          <h2 className="lp-cta-h">Commission your fleet<br />on <em>MechIQ</em></h2>
          <p className="lp-cta-sub">Contact us to establish your company account. We will onboard your fleet and configure the platform to your operational requirements within 24 hours.</p>
          <div className="lp-cta-acts">
            <a href="mailto:info@mechiq.com.au?subject=MechIQ Account Setup" className="lp-btn-primary" style={{ textDecoration:'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
              Get Started
            </a>
            <button className="lp-btn-secondary" onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth', block:'center' })}>
              Client Login
            </button>
          </div>
          <p className="lp-cta-note">Enquiries: <a href="mailto:info@mechiq.com.au">info@mechiq.com.au</a></p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">MECH<span>IQ</span></div>
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
                <div className="lp-modal-title">MECH<span style={{ color:'#00c2e0' }}>IQ</span> — Privacy Policy</div>
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
              <div className="lp-modal-note">Full legal document available on request at <a href="mailto:info@mechiq.com.au" style={{ color:'#00c2e0' }}>info@mechiq.com.au</a>.</div>
            </div>
            <div className="lp-modal-foot">
              <button className="lp-nav-btn" onClick={() => setPolicy(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      </>}
    </div>
  );
}

export default Login;
