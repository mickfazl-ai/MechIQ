import React, { useState, useEffect, useRef } from 'react';
import { supabase, persistSessionForDevice, clearPersistedSession, getDeviceFingerprint } from './supabase';

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
    background:#F8FAFC;
    color:#374151;
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
    background:rgba(248,250,252,0.92);
    border-bottom:1px solid rgba(25,118,210,0.12);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
  }
  .lp-nav-brand { display:flex; align-items:center; gap:14px; }
  .lp-nav-logo {
    font-family:'Space Grotesk',sans-serif;
    font-size:22px; font-weight:700; letter-spacing:3px; color:#fff;
  }
  .lp-nav-logo span { color:#1976D2; }
  .lp-nav-sep { width:1px; height:22px; background:rgba(25,118,210,0.2); }
  .lp-nav-tag { font-size:10px; font-weight:500; color:rgba(200,216,232,0.45); letter-spacing:2.5px; text-transform:uppercase; }
  .lp-nav-right { display:flex; gap:8px; align-items:center; }
  .lp-nav-link {
    padding:7px 16px; background:transparent;
    border:1px solid rgba(107,114,128,0.2); border-radius:6px;
    color:rgba(200,216,232,0.65); font-size:12px; font-weight:500;
    cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.18s;
    text-decoration:none; display:inline-flex; align-items:center; letter-spacing:0.3px;
  }
  .lp-nav-link:hover { border-color:#1976D2; color:#1976D2; }
  .lp-nav-btn {
    padding:8px 22px; background:linear-gradient(135deg,#1976D2,#1565C0); border:none; border-radius:6px;
    color:#fff; font-size:12px; font-weight:700; cursor:pointer;
    font-family:'Inter',sans-serif; transition:all 0.18s; letter-spacing:0.6px;
    text-transform:uppercase; box-shadow:0 0 16px rgba(25,118,210,0.25);
  }
  .lp-nav-btn:hover { transform:translateY(-1px); box-shadow:0 0 28px rgba(25,118,210,0.45); }

  /* ─── Hero ─── */
  .lp-hero-section {
    position:relative; overflow:hidden;
    background:linear-gradient(160deg,#F8FAFC 0%,#FFFFFF 50%,#F8FAFC 100%);
    min-height:100vh;
  }
  /* Grid dot pattern */
  .lp-hero-section::before {
    content:'';
    position:absolute; inset:0;
    background-image: radial-gradient(rgba(25,118,210,0.15) 1px, transparent 1px);
    background-size: 36px 36px;
    opacity:0.5;
    pointer-events:none;
  }
  /* Glow orbs */
  .lp-hero-section::after {
    content:'';
    position:absolute; inset:0;
    background:
      radial-gradient(ellipse 70% 60% at 75% 40%, rgba(25,118,210,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 20% 70%, rgba(45,140,240,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 30% 30% at 50% 10%, rgba(25,118,210,0.05) 0%, transparent 50%);
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
    background:rgba(25,118,210,0.08); border:1px solid rgba(25,118,210,0.2);
    color:#1976D2; font-size:10px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase;
    margin-bottom:24px; animation:lp-up 0.5s ease both;
  }
  .lp-hero-eyebrow::before { content:''; width:6px; height:6px; border-radius:50%; background:#1976D2; animation:lp-dot 2s infinite; }

  .lp-hero-h1 {
    font-family:'Space Grotesk',sans-serif;
    font-size:clamp(42px,5.5vw,78px); font-weight:700;
    line-height:1.0; letter-spacing:-1px; text-transform:uppercase;
    color:#ffffff; margin-bottom:24px;
    animation:lp-up 0.5s 0.08s ease both;
  }
  .lp-hero-h1 em {
    font-style:normal;
    background:linear-gradient(135deg,#1976D2,#2d8cf0);
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
    background:#f8fafc; border:1px solid rgba(229,231,235,0.8);
    font-size:11px; font-weight:600; color:rgba(55,65,81,0.7);
    letter-spacing:0.3px;
  }
  .lp-hero-badge-dot { width:5px; height:5px; border-radius:50%; background:#1976D2; }

  .lp-btn-primary {
    padding:13px 28px; background:linear-gradient(135deg,#1976D2,#0096b8); border:none; border-radius:7px;
    color:#fff; font-size:13px; font-weight:700; cursor:pointer;
    font-family:'Inter',sans-serif; letter-spacing:0.5px; text-transform:uppercase;
    transition:all 0.18s; text-decoration:none; display:inline-flex; align-items:center; gap:8px;
    box-shadow:0 0 24px rgba(25,118,210,0.3);
  }
  .lp-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 40px rgba(25,118,210,0.5); }

  .lp-btn-secondary {
    padding:13px 24px; background:#f8fafc;
    border:1.5px solid rgba(200,216,232,0.25); border-radius:7px;
    color:rgba(200,216,232,0.85); font-size:13px; font-weight:600; cursor:pointer;
    font-family:'Inter',sans-serif; letter-spacing:0.3px; transition:all 0.18s;
    display:inline-flex; align-items:center; gap:8px;
  }
  .lp-btn-secondary:hover { border-color:#1976D2; color:#1976D2; background:rgba(25,118,210,0.05); }

  /* ─── Login card ─── */
  .lp-card {
    background:rgba(255,255,255,0.9);
    border:1px solid rgba(25,118,210,0.2);
    border-top:2px solid #1976D2;
    border-radius:3px;
    padding:32px 28px;
    backdrop-filter:none;
    box-shadow:0 0 60px rgba(25,118,210,0.08), 0 24px 60px rgba(0,0,0,0.4);
    animation:lp-up 0.6s 0.12s cubic-bezier(0.16,1,0.3,1) both;
  }
  .lp-card-logo { text-align:center; padding-bottom:20px; margin-bottom:20px; border-bottom:1px solid rgba(25,118,210,0.12); }
  .lp-card-logo .wm { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; letter-spacing:3px; color:#fff; }
  .lp-card-logo .wm span { color:#1976D2; }
  .lp-card-logo .tg { font-size:9px; color:rgba(107,114,128,0.5); letter-spacing:2.5px; text-transform:uppercase; margin-top:4px; }

  .lp-tabs { display:flex; border-bottom:1px solid rgba(25,118,210,0.1); margin-bottom:22px; }
  .lp-tab {
    flex:1; padding:8px 4px; background:none; border:none;
    border-bottom:2px solid transparent; color:rgba(107,114,128,0.6);
    font-size:12px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif;
    transition:all 0.15s; text-transform:uppercase; letter-spacing:1px;
  }
  .lp-tab.on { border-bottom-color:#1976D2; color:#1976D2; }

  .lp-field { margin-bottom:14px; }
  .lp-lbl { display:block; font-size:10px; font-weight:600; color:rgba(200,216,232,0.45); margin-bottom:5px; letter-spacing:1.5px; text-transform:uppercase; }
  .lp-inp {
    width:100%; padding:10px 12px; box-sizing:border-box;
    background:#f8fafc !important;
    color:#fff !important;
    border:1px solid rgba(25,118,210,0.2) !important;
    border-radius:6px !important; font-size:13px; font-family:'Inter',sans-serif;
    outline:none; transition:border-color 0.15s;
  }
  .lp-inp:focus { border-color:#1976D2 !important; background:rgba(25,118,210,0.06) !important; box-shadow:0 0 0 3px rgba(25,118,210,0.1) !important; }
  .lp-inp::placeholder { color:rgba(200,216,232,0.25) !important; }
  .lp-go {
    width:100%; padding:12px; background:linear-gradient(135deg,#1976D2,#1565C0); border:none; border-radius:6px;
    color:#fff; font-size:13px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif;
    letter-spacing:0.6px; text-transform:uppercase; transition:all 0.18s;
    box-shadow:0 0 20px rgba(25,118,210,0.25);
  }
  .lp-go:hover { box-shadow:0 0 32px rgba(25,118,210,0.45); transform:translateY(-1px); }
  .lp-go:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
  .lp-err { padding:8px 12px; background:rgba(220,38,38,0.1); border:1px solid rgba(220,38,38,0.3); border-radius:5px; color:#f87171; font-size:12px; margin-bottom:10px; }
  .lp-ok  { padding:8px 12px; background:rgba(0,194,100,0.1); border:1px solid rgba(0,194,100,0.3); border-radius:5px; color:#4ade80; font-size:12px; margin-bottom:10px; }
  .lp-card-foot { margin-top:16px; padding-top:14px; border-top:1px solid rgba(25,118,210,0.1); }
  .lp-card-foot-line { font-size:10px; color:rgba(107,114,128,0.5); text-align:center; line-height:1.7; }
  .lp-card-foot-link { color:#1976D2; background:none; border:none; cursor:pointer; font-size:10px; font-family:'Inter',sans-serif; padding:0; text-decoration:underline; }

  /* ─── Stats bar ─── */
  .lp-stats {
    display:flex; justify-content:center; gap:0;
    border-top:1px solid rgba(25,118,210,0.08);
    border-bottom:1px solid rgba(25,118,210,0.08);
    background:rgba(25,118,210,0.03);
    padding:0;
  }
  .lp-stat {
    flex:1; padding:28px 20px; text-align:center;
    border-right:1px solid rgba(25,118,210,0.08);
    transition:background 0.2s;
  }
  .lp-stat:last-child { border-right:none; }
  .lp-stat:hover { background:rgba(25,118,210,0.05); }
  .lp-stat-n {
    font-family:'Space Grotesk',sans-serif; font-size:34px; font-weight:700;
    background:linear-gradient(135deg,#1976D2,#2d8cf0);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
    letter-spacing:-1px; line-height:1;
  }
  .lp-stat-l { font-size:10px; color:rgba(107,114,128,0.8); font-weight:600; margin-top:6px; letter-spacing:1.5px; text-transform:uppercase; }

  /* ─── Modules grid ─── */
  .lp-modules {
    padding:100px 5vw;
    background:linear-gradient(180deg,#F8FAFC 0%,#080f1c 100%);
    position:relative;
  }
  .lp-modules::before {
    content:'';
    position:absolute; inset:0;
    background:radial-gradient(ellipse 80% 50% at 50% 0%, rgba(25,118,210,0.04) 0%, transparent 60%);
    pointer-events:none;
  }
  .lp-modules-inner { max-width:1280px; margin:0 auto; position:relative; z-index:1; }
  .lp-section-label {
    font-size:10px; font-weight:700; color:#1976D2; letter-spacing:3px; text-transform:uppercase;
    margin-bottom:16px; display:flex; align-items:center; gap:10px;
  }
  .lp-section-label::before { content:''; width:20px; height:1.5px; background:linear-gradient(90deg,#1976D2,transparent); }
  .lp-section-h {
    font-family:'Space Grotesk',sans-serif; font-size:clamp(28px,3vw,44px); font-weight:700;
    color:#fff; line-height:1.1; letter-spacing:-0.5px; margin-bottom:14px;
  }
  .lp-section-h em {
    font-style:normal;
    background:linear-gradient(135deg,#1976D2,#2d8cf0);
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
    border-radius:3px; padding:28px 26px;
    transition:all 0.25s; cursor:default;
    position:relative; overflow:hidden;
  }
  .lp-module-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,rgba(25,118,210,0.4),transparent);
    opacity:0; transition:opacity 0.25s;
  }
  .lp-module-card:hover { border-color:rgba(25,118,210,0.2); background:rgba(25,118,210,0.04); transform:translateY(-3px); box-shadow:0 12px 40px rgba(0,0,0,0.3), 0 0 30px rgba(25,118,210,0.06); }
  .lp-module-card:hover::before { opacity:1; }

  .lp-module-icon {
    width:44px; height:44px; border-radius:3px;
    background:rgba(25,118,210,0.1); border:1px solid rgba(25,118,210,0.2);
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
    background:rgba(25,118,210,0.07); border:1px solid rgba(25,118,210,0.15);
    color:rgba(25,118,210,0.8); letter-spacing:0.3px;
  }
  .lp-module-tag.green { background:rgba(0,194,100,0.07); border-color:rgba(0,194,100,0.2); color:rgba(0,194,130,0.9); }
  .lp-module-tag.purple { background:rgba(139,92,246,0.07); border-color:rgba(139,92,246,0.2); color:rgba(167,139,250,0.9); }
  .lp-module-tag.amber { background:rgba(245,158,11,0.07); border-color:rgba(245,158,11,0.2); color:rgba(251,191,36,0.9); }

  /* ─── About ─── */
  .lp-about {
    color:#374151;
    padding:100px 5vw;
    background:linear-gradient(135deg,#FFFFFF 0%,#080f1c 100%);
    display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center;
    max-width:none; position:relative; overflow:hidden;
  }
  .lp-about::before {
    content:''; position:absolute; right:-200px; top:-100px;
    width:600px; height:600px; border-radius:50%;
    background:radial-gradient(circle,rgba(25,118,210,0.06) 0%,transparent 70%);
    pointer-events:none;
  }
  .lp-about-inner { max-width:1280px; margin:0 auto; display:contents; }
  @media(max-width:900px) { .lp-about { grid-template-columns:1fr; gap:40px; } }

  .lp-about-h {
    font-family:'Space Grotesk',sans-serif; font-size:clamp(26px,2.8vw,42px);
    font-weight:700; text-transform:uppercase; color:#fff; line-height:1.1; letter-spacing:-0.3px;
  }
  .lp-about-h em { font-style:normal; background:linear-gradient(135deg,#1976D2,#2d8cf0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .lp-about-body { font-size:15px; color:rgba(200,216,232,0.65); line-height:1.9; }
  .lp-about-body p + p { margin-top:18px; }

  .lp-about-points { margin-top:32px; display:flex; flex-direction:column; gap:14px; }
  .lp-about-point {
    display:flex; gap:12px; align-items:flex-start;
    padding:14px 16px; border-radius:9px;
    background:rgba(25,118,210,0.04); border:1px solid rgba(25,118,210,0.1);
  }
  .lp-about-point-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
  .lp-about-point-text { font-size:13px; color:rgba(55,65,81,0.7); line-height:1.6; }
  .lp-about-point-text strong { color:#fff; display:block; margin-bottom:2px; font-size:13px; }

  /* ─── Features accordion ─── */
  .lp-feats {
    background:linear-gradient(180deg,#080f1c 0%,#F8FAFC 100%);
    border-top:1px solid rgba(25,118,210,0.06);
    border-bottom:1px solid rgba(25,118,210,0.06);
    padding:100px 0;
  }
  .lp-feats-inner { max-width:1280px; margin:0 auto; padding:0 5vw; }
  .lp-feats-head { margin-bottom:56px; display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:end; }
  @media(max-width:768px) { .lp-feats-head { grid-template-columns:1fr; gap:20px; } }
  .lp-feats-intro { font-size:14px; color:rgba(200,216,232,0.55); line-height:1.85; }

  .lp-acc { border:1px solid rgba(25,118,210,0.1); border-radius:3px; overflow:hidden; }
  .lp-acc-row { border-bottom:1px solid rgba(25,118,210,0.08); }
  .lp-acc-row:last-child { border-bottom:none; }
  .lp-acc-head {
    display:grid; grid-template-columns:60px 1fr 28px;
    align-items:center; padding:0; cursor:pointer; transition:background 0.15s;
  }
  .lp-acc-head:hover { background:rgba(25,118,210,0.04); }
  .lp-acc-row.open .lp-acc-head { background:rgba(25,118,210,0.06); }
  .lp-acc-num {
    padding:22px 0 22px 24px;
    font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700;
    color:rgba(25,118,210,0.15); line-height:1; transition:color 0.2s;
    align-self:stretch; display:flex; align-items:center;
  }
  .lp-acc-row.open .lp-acc-num { color:#1976D2; }
  .lp-acc-meta { padding:22px 16px; }
  .lp-acc-title { font-size:14px; font-weight:600; color:#e0eaf6; letter-spacing:0.1px; margin-bottom:3px; }
  .lp-acc-hint { font-size:12px; color:rgba(200,216,232,0.45); }
  .lp-acc-chev {
    padding-right:20px; font-size:10px;
    color:rgba(107,114,128,0.5); transition:transform 0.22s, color 0.15s;
    display:flex; align-items:center; justify-content:center;
  }
  .lp-acc-row.open .lp-acc-chev { transform:rotate(180deg); color:#1976D2; }
  .lp-acc-body { overflow:hidden; max-height:0; opacity:0; transition:max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.25s; }
  .lp-acc-body.open { max-height:900px; opacity:1; }
  .lp-acc-inner {
    padding:0 24px 28px 88px;
    border-top:1px solid rgba(25,118,210,0.08);
    background:rgba(25,118,210,0.02);
    animation:acc-open 0.3s ease;
  }
  @media(max-width:640px) { .lp-acc-inner { padding:0 16px 24px 16px; } }
  .lp-acc-desc { font-size:14px; color:rgba(200,216,232,0.62); line-height:1.85; margin-top:20px; margin-bottom:18px; max-width:720px; }
  .lp-acc-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 28px; margin-bottom:22px; }
  @media(max-width:640px) { .lp-acc-grid { grid-template-columns:1fr; } }
  .lp-acc-pt {
    display:flex; gap:10px; align-items:baseline;
    font-size:13px; color:rgba(200,216,232,0.55); line-height:1.55;
    padding:5px 0; border-bottom:1px solid rgba(25,118,210,0.05);
  }
  .lp-acc-pt::before { content:'—'; color:#1976D2; flex-shrink:0; font-size:11px; }
  .lp-acc-links { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
  .lp-acc-link-tag {
    font-size:10px; font-weight:600; letter-spacing:1px; text-transform:uppercase;
    padding:4px 12px; border-radius:4px;
    border:1px solid rgba(25,118,210,0.25); color:rgba(25,118,210,0.75); background:rgba(25,118,210,0.06);
  }
  .lp-acc-connects {
    border-left:2px solid rgba(25,118,210,0.3); padding:12px 16px; margin-top:4px;
    background:rgba(25,118,210,0.04); border-radius:0 6px 6px 0;
  }
  .lp-acc-connects-label { font-size:9px; font-weight:700; color:#1976D2; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
  .lp-acc-connects-text { font-size:12px; color:rgba(200,216,232,0.55); line-height:1.75; }

  /* ─── CTA ─── */
  .lp-cta-wrap {
    background:linear-gradient(135deg,#F8FAFC 0%,#FFFFFF 50%,#F8FAFC 100%);
    padding:120px 5vw; text-align:center; position:relative; overflow:hidden;
  }
  .lp-cta-wrap::before {
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse 60% 60% at 50% 50%, rgba(25,118,210,0.06) 0%, transparent 65%);
    pointer-events:none;
  }
  .lp-cta { max-width:680px; margin:0 auto; position:relative; z-index:1; }
  .lp-cta-h {
    font-family:'Space Grotesk',sans-serif; font-size:clamp(32px,4vw,52px); font-weight:700;
    text-transform:uppercase; color:#fff; letter-spacing:-0.5px; margin-bottom:18px; line-height:1.1;
  }
  .lp-cta-h em { font-style:normal; background:linear-gradient(135deg,#1976D2,#2d8cf0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .lp-cta-sub { font-size:16px; color:rgba(200,216,232,0.55); max-width:480px; margin:0 auto 40px; line-height:1.8; }
  .lp-cta-acts { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
  .lp-cta-note { margin-top:24px; font-size:12px; color:rgba(200,216,232,0.3); }
  .lp-cta-note a { color:#1976D2; text-decoration:none; }

  /* ─── Footer ─── */
  .lp-footer {
    color:#374151;
    border-top:1px solid rgba(25,118,210,0.08);
    padding:28px 5vw;
    display:flex; justify-content:space-between; align-items:center;
    flex-wrap:wrap; gap:12px; background:#040a12;
  }
  .lp-footer-logo { font-family:'Space Grotesk',sans-serif; font-size:16px; font-weight:700; letter-spacing:2px; color:rgba(55,65,81,0.6); }
  .lp-footer-logo span { color:#1976D2; }
  .lp-footer-links { display:flex; gap:20px; align-items:center; }
  .lp-footer-link { font-size:12px; color:rgba(107,114,128,0.6); text-decoration:none; background:none; border:none; cursor:pointer; font-family:'Inter',sans-serif; transition:color 0.15s; }
  .lp-footer-link:hover { color:#1976D2; }
  .lp-footer-copy { font-size:11px; color:rgba(200,216,232,0.25); }

  /* ─── Privacy Modal ─── */
  .lp-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
  .lp-modal { background:#FFFFFF; border:1px solid rgba(25,118,210,0.2); border-radius:3px; max-width:560px; width:100%; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 0 60px rgba(0,0,0,0.6); }
  .lp-modal-head { padding:20px 24px 16px; border-bottom:1px solid rgba(25,118,210,0.1); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
  .lp-modal-title { font-size:16px; font-weight:700; color:#fff; }
  .lp-modal-sub { font-size:11px; color:rgba(107,114,128,0.6); margin-top:3px; }
  .lp-modal-close { background:none; border:none; color:rgba(107,114,128,0.8); cursor:pointer; font-size:18px; line-height:1; transition:color 0.15s; }
  .lp-modal-close:hover { color:#1976D2; }
  .lp-modal-body { overflow-y:auto; flex:1; padding:20px 24px; }
  .lp-modal-sec { margin-bottom:20px; }
  .lp-modal-sec-h { font-size:12px; font-weight:700; color:#1976D2; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .lp-modal-sec p { font-size:13px; color:rgba(55,65,81,0.6); line-height:1.7; }
  .lp-modal-note { font-size:12px; color:rgba(107,114,128,0.6); border-top:1px solid rgba(25,118,210,0.1); padding-top:16px; margin-top:8px; }
  .lp-modal-foot { padding:16px 24px; border-top:1px solid rgba(25,118,210,0.1); flex-shrink:0; }

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
      // 24hr expiry
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - (saved.savedAt || 0) > TWENTY_FOUR_HOURS) {
        localStorage.removeItem('mechiq_saved_user');
        return null;
      }
      // Device fingerprint check — only show Welcome Back on the same device
      if (saved.deviceFp) {
        try {
          const currentFp = getDeviceFingerprint();
          if (saved.deviceFp !== currentFp) {
            localStorage.removeItem('mechiq_saved_user');
            return null;
          }
        } catch {}
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
    // Persist session with device fingerprint + 24hr expiry
    persistSessionForDevice(stayPrompt.name, stayPrompt.email);
    onAuth(stayPrompt.session); setStayPrompt(null);
  };
  const handleStayNo = () => {
    clearPersistedSession();
    onAuth(stayPrompt.session); setStayPrompt(null);
  };
  const handleContinueAsSaved = async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session) { onAuth(data.session); }
    else { setEmail(savedUser.email); setSavedUser(null); localStorage.removeItem('mechiq_saved_user'); }
  };
  const handleSignInAsOther = () => {
    clearPersistedSession(); setSavedUser(null); supabase.auth.signOut();
  };
  const scroll = (ref) => ref.current?.scrollIntoView({ behavior:'smooth', block:'start' });

  const [activeDemo, setActiveDemo] = useState(null);
  const [demoStep, setDemoStep] = useState(0);
  const demoTimerRef = useRef(null);

  const demos = {
    dashboard: {
      label: 'Dashboard & fleet overview',
      sub: 'Live KPIs, AI risk scores and activity feed',
      color: '#1976D2',
      steps: [
        { action: 'move', cx: 22, cy: 28, label: 'Viewing fleet KPIs' },
        { action: 'click', cx: 72, cy: 28, label: 'Clicking Down card' },
        { action: 'show', id: 'drill', label: 'Drilldown opens' },
        { action: 'move', cx: 50, cy: 70, label: 'Reviewing faulted assets' },
        { action: 'move', cx: 80, cy: 85, label: 'Checking AI risk score' },
      ]
    },
    prestart: {
      label: 'Prestart inspection',
      sub: 'Complete form, scan asset, submit defects',
      color: '#15803D',
      steps: [
        { action: 'move', cx: 12, cy: 38, label: 'Starting daily checks' },
        { action: 'check', cx: 12, cy: 38, id: 'chk0', label: 'Engine oil ✓' },
        { action: 'check', cx: 12, cy: 48, id: 'chk1', label: 'Coolant ✓' },
        { action: 'check', cx: 12, cy: 58, id: 'chk2', label: 'Hydraulics ✓' },
        { action: 'check', cx: 12, cy: 68, id: 'chk3', label: 'Tyres ✓' },
        { action: 'submit', cx: 88, cy: 88, label: 'Submitting form' },
      ]
    },
    scan: {
      label: 'Part scanning & lookup',
      sub: 'Camera scan identifies part from inventory',
      color: '#6366F1',
      steps: [
        { action: 'move', cx: 50, cy: 35, label: 'Opening scanner' },
        { action: 'scan', cx: 50, cy: 35, label: 'Scanning barcode' },
        { action: 'show', id: 'scan-result', label: 'Part identified!' },
        { action: 'move', cx: 30, cy: 72, label: 'Reviewing stock levels' },
        { action: 'click', cx: 35, cy: 88, label: 'Issuing part to WO' },
      ]
    },
    workorder: {
      label: 'Work order creation',
      sub: 'Raise, assign and track maintenance jobs',
      color: '#B45309',
      steps: [
        { action: 'fill', cx: 50, cy: 28, id: 'wo-asset', val: 'TBM-01 — HK-6200', label: 'Selecting asset' },
        { action: 'fill', cx: 75, cy: 28, id: 'wo-priority', val: 'Critical', label: 'Setting priority' },
        { action: 'fill', cx: 50, cy: 43, id: 'wo-title', val: 'Hydraulic pressure fault — inspect pump', label: 'Adding title' },
        { action: 'fill', cx: 50, cy: 60, id: 'wo-desc', val: 'Pressure 8% below nominal on main circuit. Possible seal failure on HPU.', label: 'Adding description' },
        { action: 'fill', cx: 25, cy: 76, id: 'wo-tech', val: 'J. Dawson', label: 'Assigning technician' },
        { action: 'submit', cx: 50, cy: 90, label: 'Creating work order' },
      ]
    },
    assets: {
      label: 'Asset management',
      sub: 'Fleet register, status and AI risk scores',
      color: '#0891b2',
      steps: [
        { action: 'move', cx: 25, cy: 35, label: 'Viewing fleet register' },
        { action: 'click', cx: 25, cy: 35, label: 'Clicking TBM-01' },
        { action: 'show', id: 'asset-detail', label: 'Asset profile opens' },
        { action: 'move', cx: 80, cy: 60, label: 'Reviewing AI risk score' },
        { action: 'move', cx: 80, cy: 80, label: 'Checking service status' },
      ]
    },
    oilsampling: {
      label: 'Oil sampling & analysis',
      sub: 'AI-powered condition monitoring',
      color: '#b45309',
      steps: [
        { action: 'move', cx: 50, cy: 25, label: 'Uploading oil report' },
        { action: 'show', id: 'oil-upload', label: 'Report uploaded' },
        { action: 'move', cx: 50, cy: 55, label: 'AI analysing results' },
        { action: 'show', id: 'oil-result', label: 'AI analysis complete' },
        { action: 'move', cx: 70, cy: 80, label: 'Reviewing recommendations' },
      ]
    },
    reports: {
      label: 'Reports & analytics',
      sub: 'Downtime, availability and KPI exports',
      color: '#7c3aed',
      steps: [
        { action: 'move', cx: 25, cy: 30, label: 'Opening downtime report' },
        { action: 'show', id: 'report-chart', label: 'Chart loads' },
        { action: 'move', cx: 65, cy: 50, label: 'Reviewing availability' },
        { action: 'move', cx: 80, cy: 80, label: 'Exporting to PDF' },
        { action: 'show', id: 'report-export', label: 'PDF exported' },
      ]
    }
  };

  const runDemo = (id) => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setActiveDemo(id);
    setDemoStep(0);
    let step = 0;
    const steps = demos[id].steps;
    const tick = () => {
      step++;
      if (step < steps.length) {
        setDemoStep(step);
        demoTimerRef.current = setTimeout(tick, step === 0 ? 800 : 1100);
      } else {
        demoTimerRef.current = setTimeout(() => { setDemoStep(0); tick.restart = true; step = 0; tick(); }, 2500);
      }
    };
    demoTimerRef.current = setTimeout(tick, 800);
  };

  useEffect(() => { return () => { if (demoTimerRef.current) clearTimeout(demoTimerRef.current); }; }, []);

  const DemoScreen = ({ id }) => {
    const step = demoStep;
    const demo = demos[id];
    const curStep = demo.steps[step] || demo.steps[0];
    const cx = curStep.cx + '%';
    const cy = curStep.cy + '%';

    const checked = (chkId) => {
      const idx = demo.steps.findIndex(s => s.id === chkId);
      return idx >= 0 && step > idx;
    };
    const filled = (fId) => {
      const idx = demo.steps.findIndex(s => s.id === fId);
      return idx >= 0 && step > idx ? demo.steps[idx].val : '';
    };
    const shown = (sId) => {
      const idx = demo.steps.findIndex(s => s.id === sId);
      return idx >= 0 && step > idx;
    };
    const submitted = demo.steps[step]?.action === 'submit' || (step > 0 && demo.steps.slice(0, step+1).some(s => s.action === 'submit'));

    const C = ({ title, sub, children }) => (
      <div style={{ position:'absolute', inset:0, background:'#F8FAFC', overflow:'hidden', fontFamily:'Inter,sans-serif' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:20, height:20, background:'#1976D2', color:'#fff', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>M</div>
          <span style={{ fontSize:11, fontWeight:700, color:'#0F172A' }}>MechIQ</span>
          <span style={{ fontSize:9, color:'#94a3b8', marginLeft:4 }}>·</span>
          <span style={{ fontSize:10, color:'#64748b' }}>{title}</span>
        </div>
        <div style={{ padding:'10px 12px', overflow:'hidden', height:'calc(100% - 38px)' }}>{children}</div>
        {/* Cursor */}
        <div style={{ position:'absolute', left:cx, top:cy, width:14, height:14, background:demo.color, borderRadius:'50%', transform:'translate(-50%,-50%)', transition:'left 0.5s cubic-bezier(.25,.46,.45,.94),top 0.5s cubic-bezier(.25,.46,.45,.94)', zIndex:100, boxShadow:`0 0 0 3px ${demo.color}30`, pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:cx, top:'calc(100% - 22px)', transform:'translateX(-50%)', background:'rgba(15,23,42,0.8)', color:'#fff', fontSize:9, padding:'2px 8px', whiteSpace:'nowrap', borderRadius:2, transition:'left 0.5s', pointerEvents:'none', zIndex:101 }}>{curStep.label}</div>
      </div>
    );

    const fieldStyle = (fId) => ({
      width:'100%', padding:'5px 8px', border:`1px solid ${filled(fId)?'#1976D2':'#e5e7eb'}`,
      background: filled(fId) ? '#EBF3FC' : '#fff', fontSize:10, color:'#0F172A',
      transition:'all 0.3s', boxSizing:'border-box'
    });

    if (id === 'dashboard') return (
      <C title="Dashboard">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:8 }}>
          {[['Total Fleet','24','#1976D2'],['Running','19','#15803D'],['Down','2','#B91C1C'],['AI Fails','2','#6366F1']].map(([l,v,c],i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'8px 10px', position:'relative' }}>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:c }} />
              <div style={{ fontSize:8, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:700, color:c }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:6 }}>
          <div style={{ background:'#fff', border:'1px solid #e5e7eb' }}>
            <div style={{ padding:'6px 10px', borderBottom:'1px solid #f1f5f9', fontSize:9, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>Fleet Register</div>
            {[['TBM-01','HK-6200','Running','#15803D'],['Loader L-03','KOM-WA500','Down','#B91C1C'],['EX-07','CAT-390F','Running','#15803D'],['Drill Rig A','ATL-PRO4','Maint.','#B45309']].map(([n,id,s,c]) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderBottom:'1px solid #f8fafc', fontSize:10 }}>
                <div style={{ fontWeight:700, flex:1, color:'#0F172A' }}>{n}</div>
                <div style={{ fontSize:9, color:'#94a3b8', fontFamily:'monospace' }}>{id}</div>
                <span style={{ fontSize:8, padding:'1px 5px', background:c+'15', color:c, border:`1px solid ${c}40` }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ background:'#fff', border:'1px solid #C7D2FE', padding:'8px 10px' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'#6366F1', textTransform:'uppercase', marginBottom:6 }}>AI Risk Scores</div>
              {[['TBM-01',91,'#B91C1C'],['L-03',84,'#B91C1C'],['Drill A',62,'#B45309'],['EX-07',41,'#B45309']].map(([n,s,c]) => (
                <div key={n} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <span style={{ fontSize:9, flex:1 }}>{n}</span>
                  <div style={{ width:40, height:3, background:'#f1f5f9' }}><div style={{ height:'100%', width:s+'%', background:c }} /></div>
                  <span style={{ fontSize:9, fontWeight:700, color:c, width:18 }}>{s}</span>
                </div>
              ))}
            </div>
            {shown('drill') && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderLeft:'2px solid #B91C1C', padding:'8px 10px', animation:'fadeIn .3s ease' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#B91C1C', marginBottom:4 }}>Assets down (2)</div>
                <div style={{ fontSize:9, color:'#7F1D1D' }}>TBM-01 — Hydraulic fault<br/>Loader L-03 — 500hr overdue</div>
              </div>
            )}
          </div>
        </div>
      </C>
    );

    if (id === 'prestart') return (
      <C title="Prestart Inspection — TBM-01">
        <div style={{ background:'#fff', border:'1px solid #e5e7eb' }}>
          <div style={{ padding:'7px 12px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#0F172A' }}>TBM-01 Daily Prestart</span>
            <span style={{ fontSize:8, padding:'2px 6px', background:'#FFFBEB', color:'#B45309', border:'1px solid #FCD34D' }}>In progress</span>
          </div>
          <div style={{ padding:'8px 12px' }}>
            {[['Engine oil level','chk0'],['Coolant level','chk1'],['Hydraulic oil','chk2'],['Tyre condition','chk3'],['Lights & indicators','chk4'],['Fire extinguisher','chk5']].map(([label, chkId]) => (
              <div key={chkId} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #f8fafc', transition:'all .3s' }}>
                <div style={{ width:14, height:14, border:`1px solid ${checked(chkId)?'#86EFAC':'#e5e7eb'}`, background:checked(chkId)?'#F0FDF4':'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#15803D', flexShrink:0, transition:'all .3s' }}>{checked(chkId)?'✓':''}</div>
                <span style={{ fontSize:11, color:'#374151', flex:1 }}>{label}</span>
                <span style={{ fontSize:9, color:checked(chkId)?'#15803D':'#94a3b8', fontWeight:checked(chkId)?700:400 }}>{checked(chkId)?'Pass':'—'}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:'8px 12px', borderTop:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, color:'#64748b' }}>{['chk0','chk1','chk2','chk3'].filter(id => checked(id)).length} of 6 checks</span>
            {submitted
              ? <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', padding:'4px 10px', fontSize:10, fontWeight:700, color:'#15803D' }}>Submitted ✓</div>
              : <div style={{ padding:'5px 12px', background:'#1976D2', color:'#fff', fontSize:10, fontWeight:600 }}>Submit form</div>
            }
          </div>
        </div>
        {submitted && (
          <div style={{ marginTop:8, background:'#F0FDF4', border:'1px solid #86EFAC', borderLeft:'2px solid #15803D', padding:'8px 12px', fontSize:10, color:'#166534' }}>
            Prestart submitted — TBM-01 · J. Dawson · All checks passed
          </div>
        )}
      </C>
    );

    if (id === 'scan') return (
      <C title="Part Scanner">
        <div style={{ background:'#000', height:120, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8, overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:16, border:'1.5px solid rgba(255,255,255,0.2)' }}>
            {[['top-0 left-0','border-top','border-left'],['top-0 right-0','border-top','border-right'],['bottom-0 left-0','border-bottom','border-left'],['bottom-0 right-0','border-bottom','border-right']].map((_, i) => (
              <div key={i} style={{ position:'absolute', ...[{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}][i], width:12, height:12, borderWidth:'2.5px', borderStyle:'solid', borderColor:'transparent', ...([{borderTopColor:'#1976D2',borderLeftColor:'#1976D2'},{borderTopColor:'#1976D2',borderRightColor:'#1976D2'},{borderBottomColor:'#1976D2',borderLeftColor:'#1976D2'},{borderBottomColor:'#1976D2',borderRightColor:'#1976D2'}][i]) }} />
            ))}
          </div>
          <div style={{ position:'absolute', left:16, right:16, height:1.5, background:shown('scan-result')?'#15803D':'#1976D2', top:'50%', boxShadow:`0 0 6px ${shown('scan-result')?'#15803D':'#1976D2'}`, animation: shown('scan-result') ? 'none' : 'scanLine 1.2s ease-in-out infinite' }} />
          <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginTop:60 }}>{shown('scan-result') ? '✓ Identified' : 'Scanning…'}</div>
        </div>
        {shown('scan-result') && (
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'10px 12px', animation:'slideUp .3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>Hydraulic Filter HPF-450</span>
              <span style={{ fontSize:9, padding:'2px 6px', background:'#FFFBEB', color:'#B45309', border:'1px solid #FCD34D' }}>Low Stock</span>
            </div>
            {[['Part #','PRT-001'],['Supplier','Parker Hannifin'],['Stock','2 units'],['Min','5 units'],['Machine','TBM-01 · HK-6200'],['Location','Shelf B-3']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f8fafc', fontSize:10 }}>
                <span style={{ color:'#64748b' }}>{l}</span>
                <span style={{ fontWeight:600, color:'#0F172A' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <div style={{ flex:1, padding:'5px', background:'#1976D2', color:'#fff', fontSize:10, fontWeight:600, textAlign:'center', cursor:'pointer' }}>Issue Part</div>
              <div style={{ flex:1, padding:'5px', background:'#F8FAFC', color:'#374151', border:'1px solid #e5e7eb', fontSize:10, textAlign:'center', cursor:'pointer' }}>History</div>
            </div>
          </div>
        )}
      </C>
    );

    if (id === 'workorder') return (
      <C title="New Work Order">
        <div style={{ background:'#fff', border:'1px solid #e5e7eb' }}>
          <div style={{ padding:'7px 12px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, fontWeight:700 }}>New Work Order</span>
            <span style={{ fontSize:8, padding:'2px 6px', background: submitted?'#F0FDF4':'#FFFBEB', color: submitted?'#15803D':'#B45309', border: submitted?'1px solid #86EFAC':'1px solid #FCD34D' }}>{submitted?'Created':'Draft'}</span>
          </div>
          <div style={{ padding:'8px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <div><div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>Asset</div><div style={fieldStyle('wo-asset')}>{filled('wo-asset')||<span style={{color:'#94a3b8'}}>Select…</span>}</div></div>
            <div><div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>Priority</div><div style={fieldStyle('wo-priority')}>{filled('wo-priority')||<span style={{color:'#94a3b8'}}>Select…</span>}</div></div>
          </div>
          <div style={{ padding:'0 12px 6px' }}>
            <div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>Title</div>
            <div style={fieldStyle('wo-title')}>{filled('wo-title')||<span style={{color:'#94a3b8'}}>Work order title…</span>}</div>
          </div>
          <div style={{ padding:'0 12px 6px' }}>
            <div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>Description</div>
            <div style={{ ...fieldStyle('wo-desc'), minHeight:36 }}>{filled('wo-desc')||<span style={{color:'#94a3b8'}}>Describe the issue…</span>}</div>
          </div>
          <div style={{ padding:'0 12px 8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <div><div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>Assign to</div><div style={fieldStyle('wo-tech')}>{filled('wo-tech')||<span style={{color:'#94a3b8'}}>Technician…</span>}</div></div>
            <div><div style={{ fontSize:9, color:'#64748b', marginBottom:3 }}>Due date</div><div style={fieldStyle('wo-due')}>{filled('wo-due')||<span style={{color:'#94a3b8'}}>Select date…</span>}</div></div>
          </div>
          <div style={{ padding:'0 12px 10px' }}>
            {submitted
              ? <div style={{ padding:'7px', background:'#F0FDF4', border:'1px solid #86EFAC', color:'#15803D', fontSize:10, fontWeight:700, textAlign:'center' }}>WO #4419 created and assigned to J. Dawson ✓</div>
              : <div style={{ padding:'7px', background:'#1976D2', color:'#fff', fontSize:10, fontWeight:600, textAlign:'center', cursor:'pointer' }}>Create Work Order</div>
            }
          </div>
        </div>
      </C>
    );

    if (id === 'assets') return (
      <C title="Asset Management">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          {[['Running','19','#15803D'],['Down','2','#B91C1C'],['Maintenance','3','#B45309'],['Total','24','#1976D2']].map(([l,v,col]) => (
            <div key={l} style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'8px 10px', position:'relative' }}>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:col }} />
              <div style={{ fontSize:8, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:700, color:col }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns: shown('asset-detail') ? '1fr 1fr' : '1fr', gap:8 }}>
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', overflow:'hidden' }}>
            {[['TBM-01','HK-6200-0047','Running','#15803D',91],['Excavator EX-07','CAT-390F-0031','Running','#15803D',41],['Loader L-03','KOM-WA500-007','Down','#B91C1C',84],['Drill Rig A','ATL-PRO4-0019','Maint.','#B45309',62],['Conveyor B','FLX-800-0004','Running','#15803D',18]].map(([name,num,status,col,risk]) => (
              <div key={name} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderBottom:'1px solid #f8fafc', borderLeft:`3px solid ${col}` }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0F172A', letterSpacing:'-0.3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
                  <div style={{ fontSize:9, color:'#1976D2', fontFamily:'monospace' }}>{num}</div>
                </div>
                <span style={{ fontSize:8, padding:'2px 5px', background:col+'15', color:col, border:`1px solid ${col}40`, whiteSpace:'nowrap' }}>{status}</span>
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <div style={{ width:30, height:3, background:'#f1f5f9' }}><div style={{ height:'100%', width:risk+'%', background:risk>70?'#B91C1C':risk>40?'#B45309':'#15803D' }} /></div>
                  <span style={{ fontSize:9, fontWeight:700, color:risk>70?'#B91C1C':risk>40?'#B45309':'#15803D', width:16 }}>{risk}</span>
                </div>
              </div>
            ))}
          </div>
          {shown('asset-detail') && (
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'12px', animation:'slideUp .3s ease' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0F172A', letterSpacing:'-0.3px', marginBottom:2 }}>TBM-01</div>
              <div style={{ fontSize:10, color:'#1976D2', fontFamily:'monospace', marginBottom:10 }}>HK-6200-0047</div>
              <span style={{ fontSize:9, padding:'2px 7px', background:'#F0FDF4', color:'#15803D', border:'1px solid #86EFAC' }}>Running</span>
              <div style={{ marginTop:10 }}>
                {[['Type','TBM'],['Hours','14,822'],['Location','Newcastle'],['Next Svc','OVERDUE']].map(([l,v]) => (
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f8fafc', fontSize:10 }}>
                    <span style={{ color:'#64748b' }}>{l}</span>
                    <span style={{ fontWeight:600, color: l==='Next Svc'?'#B91C1C':'#0F172A' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:9, color:'#6366F1', fontWeight:700, marginBottom:4 }}>AI Risk Score</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ flex:1, height:4, background:'#f1f5f9' }}><div style={{ height:'100%', width:'91%', background:'#B91C1C' }} /></div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#B91C1C' }}>91</span>
                </div>
                <div style={{ marginTop:6, background:'#FEF2F2', border:'1px solid #FCA5A5', borderLeft:'2px solid #B91C1C', padding:'5px 7px', fontSize:9, color:'#7F1D1D', lineHeight:1.4 }}>Pre-failure risk — hydraulic pressure 8% below nominal. Immediate inspection recommended.</div>
              </div>
              <button style={{ width:'100%', marginTop:10, padding:'6px', background:'#1976D2', color:'#fff', border:'none', fontSize:10, fontWeight:600, cursor:'pointer' }}>Raise Work Order</button>
            </div>
          )}
        </div>
      </C>
    );

    if (id === 'oilsampling') return (
      <C title="Oil Sampling & Analysis">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
          {[['Samples','12','#1976D2'],['AI Alerts','3','#B91C1C'],['Normal','9','#15803D']].map(([l,v,col]) => (
            <div key={l} style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'8px 10px', position:'relative' }}>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:col }} />
              <div style={{ fontSize:8, color:'#94a3b8', textTransform:'uppercase', marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:col }}>{v}</div>
            </div>
          ))}
        </div>
        {!shown('oil-upload') ? (
          <div style={{ border:'2px dashed #e5e7eb', padding:'24px', textAlign:'center', background:'#F8FAFC' }}>
            <div style={{ fontSize:24, marginBottom:8, opacity:.3 }}>↑</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 }}>Upload oil sample report</div>
            <div style={{ fontSize:10, color:'#94a3b8' }}>PDF, image or CSV · AI analyses automatically</div>
          </div>
        ) : (
          <div>
            <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderLeft:'2px solid #15803D', padding:'7px 10px', fontSize:10, color:'#166534', marginBottom:8 }}>Report uploaded — TBM-01 hydraulic oil · 15 May 2026</div>
            {shown('oil-result') && (
              <div style={{ background:'#fff', border:'1px solid #C7D2FE', animation:'slideUp .3s ease' }}>
                <div style={{ padding:'8px 12px', borderBottom:'1px solid #C7D2FE', display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#6366F1', textTransform:'uppercase', letterSpacing:'.4px' }}>AI Analysis — TBM-01 Hydraulic Oil</span>
                  <span style={{ fontSize:8, padding:'1px 5px', background:'#EEF2FF', color:'#6366F1', border:'1px solid #C7D2FE' }}>AI</span>
                </div>
                <div style={{ padding:'10px 12px' }}>
                  {[['Viscosity','48.2 cSt','Normal','#15803D'],['Metal particles','Fe: 42ppm','Elevated','#B45309'],['Water content','0.08%','Normal','#15803D'],['TAN','1.8 mg KOH/g','High','#B91C1C']].map(([l,v,s,col]) => (
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 0', borderBottom:'1px solid #f8fafc', fontSize:10 }}>
                      <span style={{ flex:1, color:'#374151' }}>{l}</span>
                      <span style={{ fontFamily:'monospace', fontWeight:600, color:'#0F172A' }}>{v}</span>
                      <span style={{ fontSize:8, padding:'1px 6px', background:col+'15', color:col, border:`1px solid ${col}40` }}>{s}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:8, background:'#FFFBEB', border:'1px solid #FCD34D', borderLeft:'2px solid #B45309', padding:'6px 8px', fontSize:10, color:'#78350F', lineHeight:1.4 }}>Recommendation: High iron particle count and TAN suggest increased wear. Schedule oil change within 100 operating hours.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </C>
    );

    if (id === 'reports') return (
      <C title="Reports & Analytics">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5, marginBottom:10 }}>
          {[['Availability','87%','#1976D2'],['Downtime','48hr','#B91C1C'],['MTBF','312hr','#15803D'],['Compliance','94%','#15803D']].map(([l,v,col]) => (
            <div key={l} style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'7px 8px', position:'relative' }}>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:col }} />
              <div style={{ fontSize:7, color:'#94a3b8', textTransform:'uppercase', marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:16, fontWeight:700, color:col }}>{v}</div>
            </div>
          ))}
        </div>
        {shown('report-chart') && (
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', padding:'10px 12px', marginBottom:8, animation:'fadeIn .4s ease' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:8 }}>Downtime by Asset — Last 30 days</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {[['TBM-01',72,'#B91C1C'],['Loader L-03',48,'#B91C1C'],['Drill Rig A',24,'#B45309'],['EX-07',12,'#B45309'],['Conveyor B',4,'#15803D']].map(([name,hrs,col]) => (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:9, color:'#374151', width:80, flexShrink:0 }}>{name}</div>
                  <div style={{ flex:1, height:14, background:'#f8fafc', position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:(hrs/80*100)+'%', background:col+'30', borderRight:`2px solid ${col}`, transition:'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color:col, width:28, textAlign:'right' }}>{hrs}hr</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {shown('report-export') ? (
          <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderLeft:'2px solid #15803D', padding:'8px 12px', fontSize:10, color:'#166534', display:'flex', alignItems:'center', gap:6 }}>
            ✓ Report exported — MechIQ_Downtime_Report_May2026.pdf
          </div>
        ) : (
          <div style={{ display:'flex', gap:6 }}>
            <div style={{ flex:1, padding:'7px', background:'#1976D2', color:'#fff', fontSize:10, fontWeight:600, textAlign:'center', cursor:'pointer' }}>Export PDF</div>
            <div style={{ flex:1, padding:'7px', background:'#F8FAFC', color:'#374151', border:'1px solid #e5e7eb', fontSize:10, textAlign:'center', cursor:'pointer' }}>Export Excel</div>
          </div>
        )}
      </C>
    );

    return null;
  };

  return (
    <div className="lp">
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes scanLine { 0%{top:20px} 50%{top:calc(100% - 20px)} 100%{top:20px} }
      `}</style>

      {/* ── Stay Signed In ── */}
      {stayPrompt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderTop:'3px solid #1976D2', padding:'32px 28px', width:'100%', maxWidth:380, textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#0F172A', marginBottom:6, letterSpacing:'-0.5px' }}>Stay signed in?</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>Signed in as</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#1976D2', marginBottom:4 }}>{stayPrompt.name}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginBottom:20 }}>{stayPrompt.email}</div>
            {(() => {
              const ua = navigator.userAgent;
              const isMobile = /iPhone|iPad|Android/i.test(ua);
              const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
              const deviceLabel = isTablet ? 'tablet' : isMobile ? 'phone' : 'computer';
              return (
                <div style={{ background:'#FFFBEB', border:'1px solid #FCD34D', borderLeft:'3px solid #B45309', padding:'8px 12px', marginBottom:20, fontSize:11, color:'#B45309', textAlign:'left' }}>
                  Personal {deviceLabel} only — session stays active 24 hours. On shared devices select No.
                </div>
              );
            })()}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleStayNo} style={{ flex:1, padding:'11px', background:'#F8FAFC', border:'1px solid #e5e7eb', fontSize:12, fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>No, sign out</button>
              <button onClick={handleStayYes} style={{ flex:1, padding:'11px', background:'#1976D2', border:'none', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Yes, 24 hours</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome Back ── */}
      {savedUser && !stayPrompt && (
        <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderTop:'3px solid #1976D2', padding:'40px 36px', width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize:16, fontWeight:900, color:'#0F172A', letterSpacing:'-0.5px', marginBottom:28 }}>MECH<span style={{ color:'#1976D2' }}>IQ</span></div>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#1976D2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:22, fontWeight:700, color:'#fff' }}>
              {(savedUser.name||'?')[0].toUpperCase()}
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>Welcome back</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:3 }}>{savedUser.name}</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:28 }}>{savedUser.email}</div>
            <button onClick={handleContinueAsSaved} style={{ width:'100%', padding:'12px', background:'#1976D2', border:'none', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer', marginBottom:8, fontFamily:'Inter,sans-serif' }}>Continue to dashboard →</button>
            <button onClick={handleSignInAsOther} style={{ width:'100%', padding:'11px', background:'transparent', border:'1px solid #e5e7eb', fontSize:12, fontWeight:500, color:'#64748b', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Sign in as someone else</button>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:16, lineHeight:1.5 }}>Not your device? Sign in as someone else.</div>
          </div>
        </div>
      )}

      {!savedUser && !stayPrompt && (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', fontFamily:'Inter,sans-serif' }}>

          {/* ── Nav ── */}
          <nav style={{ height:54, background:'#fff', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', padding:'0 28px', gap:12, zIndex:10, position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
              <div style={{ width:28, height:28, background:'#1976D2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff' }}>M</div>
              <span style={{ fontSize:15, fontWeight:900, color:'#0F172A', letterSpacing:'-0.5px' }}>MECH<span style={{ color:'#1976D2' }}>IQ</span></span>
              <span style={{ width:1, height:16, background:'#e5e7eb' }} />
              <span style={{ fontSize:11, color:'#94a3b8' }}>Fleet Maintenance Management</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <button onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth' })} style={{ padding:'6px 14px', background:'none', border:'1px solid #e5e7eb', fontSize:12, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>Platform</button>
              <button onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth' })} style={{ padding:'6px 14px', background:'none', border:'1px solid #e5e7eb', fontSize:12, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>Industries</button>
              <a href="mailto:info@mechiq.com.au" style={{ padding:'6px 14px', background:'none', border:'1px solid #e5e7eb', fontSize:12, color:'#374151', cursor:'pointer', fontFamily:'inherit', textDecoration:'none' }}>Contact</a>
              <button onClick={() => loginRef.current?.scrollIntoView({ behavior:'smooth' })} style={{ padding:'6px 16px', background:'#1976D2', border:'none', fontSize:12, fontWeight:600, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>Client login</button>
            </div>
          </nav>

          {/* ── Hero ── */}
          <div style={{ display:'flex', flex:1 }}>

            {/* LEFT — dark panel */}
            <div style={{ width:'45%', background:'#0F172A', display:'flex', flexDirection:'column', padding:'40px 36px', position:'relative', overflow:'hidden', minHeight:'calc(100vh - 54px)' }}>
              <div style={{ position:'absolute', top:-80, right:-80, width:240, height:240, borderRadius:'50%', background:'rgba(25,118,210,0.06)', pointerEvents:'none' }} />

              <div style={{ fontSize:9, fontWeight:600, color:'#1976D2', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:18, height:1, background:'#1976D2', display:'inline-block' }} />
                Built for Australian heavy industry
              </div>

              <h1 style={{ fontSize:32, fontWeight:700, color:'#fff', lineHeight:1.2, letterSpacing:'-1px', marginBottom:10 }}>
                Intelligent fleet<br/>management.<br/><span style={{ color:'#60a5fa' }}>Live. AI-powered.</span>
              </h1>

              <p style={{ fontSize:12, color:'#64748b', lineHeight:1.7, marginBottom:28, maxWidth:320 }}>
                A modern CMMS for tunnelling, mining and civil infrastructure. Real-time asset visibility, AI maintenance forms and structured field data — built entirely in Australia.
              </p>

              {/* Demo buttons */}
              <div style={{ fontSize:9, fontWeight:600, color:'#334155', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>
                Live product demos — click to explore
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:'auto' }}>
                {Object.entries(demos).map(([id, demo]) => (
                  <button key={id} onClick={() => runDemo(id)} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
                    background: activeDemo === id ? 'rgba(25,118,210,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activeDemo === id ? 'rgba(25,118,210,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s',
                  }}>
                    <div style={{ width:32, height:32, background:`${demo.color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <div style={{ width:10, height:10, background:demo.color, borderRadius:'50%', opacity: activeDemo === id ? 1 : 0.6 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color: activeDemo === id ? '#e2e8f0' : '#94a3b8', marginBottom:1 }}>{demo.label}</div>
                      <div style={{ fontSize:10, color:'#475569' }}>{demo.sub}</div>
                    </div>
                    <span style={{ color: activeDemo === id ? '#60a5fa' : '#334155', fontSize:11, transition:'color .15s' }}>▶</span>
                  </button>
                ))}
              </div>

              {/* Footer stats */}
              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:20, marginTop:28, display:'flex', gap:20 }}>
                {[['12','Modules'],['100%','Cloud-based'],['Live','Real-time data'],['AI','Powered']].map(([v,l]) => (
                  <div key={l}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:9, color:'#334155', marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — login or demo */}
            <div style={{ flex:1, background:'#fff', display:'flex', alignItems: activeDemo ? 'stretch' : 'center', justifyContent:'center', padding: activeDemo ? '24px' : '40px 36px', position:'relative' }}>

              {activeDemo ? (
                /* Demo panel */
                <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexShrink:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{demos[activeDemo].label}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#15803D', display:'inline-block' }} />
                      <span style={{ fontSize:10, color:'#15803D', fontWeight:600 }}>Live simulation</span>
                      <button onClick={() => { setActiveDemo(null); if (demoTimerRef.current) clearTimeout(demoTimerRef.current); }} style={{ background:'none', border:'1px solid #e5e7eb', padding:'4px 12px', fontSize:11, color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>← Login</button>
                    </div>
                  </div>
                  <div style={{ flex:1, position:'relative', border:'1px solid #e5e7eb', overflow:'hidden', background:'#F8FAFC', minHeight:0 }}>
                    <DemoScreen id={activeDemo} />
                  </div>
                  <div style={{ marginTop:8, padding:'7px 12px', background:'#F8FAFC', border:'1px solid #e5e7eb', fontSize:10, color:'#64748b', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background: demos[activeDemo].color, flexShrink:0 }} />
                    {demos[activeDemo].steps[demoStep]?.label || 'Running demo…'}
                  </div>
                </div>
              ) : (
                /* Login form */
                <div ref={loginRef} style={{ width:'100%', maxWidth:320 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:4, letterSpacing:'-0.3px' }}>Welcome back</div>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:22 }}>Sign in to your MechIQ account</div>

                  <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', marginBottom:20 }}>
                    {[['login','Sign in'],['reset','Reset password']].map(([id,label]) => (
                      <button key={id} onClick={() => { setTab(id); setErr(''); setMsg(''); }}
                        style={{ padding:'8px 14px', fontSize:11, fontWeight:tab===id?600:500, color:tab===id?'#1976D2':'#64748b', background:'none', border:'none', borderBottom:`2px solid ${tab===id?'#1976D2':'transparent'}`, cursor:'pointer', fontFamily:'inherit', transition:'all .1s' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {err && <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderLeft:'3px solid #B91C1C', padding:'8px 11px', fontSize:11, color:'#B91C1C', marginBottom:12 }}>{err}</div>}
                  {msg && <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderLeft:'3px solid #15803D', padding:'8px 11px', fontSize:11, color:'#15803D', marginBottom:12 }}>{msg}</div>}

                  <div style={{ marginBottom:13 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:500, color:'#374151', marginBottom:5 }}>Email address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com.au"
                      style={{ width:'100%', padding:'9px 11px', border:'1px solid #e5e7eb', background:'#fff', fontSize:12, fontFamily:'inherit', color:'#0F172A', outline:'none', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor='#1976D2'} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
                      onKeyDown={e => e.key==='Enter' && handle()} />
                  </div>

                  {tab === 'login' && (
                    <div style={{ marginBottom:8 }}>
                      <label style={{ display:'block', fontSize:11, fontWeight:500, color:'#374151', marginBottom:5 }}>Password</label>
                      <input type="password" value={pw} onChange={e => setPw(e.target.value)}
                        placeholder="••••••••"
                        style={{ width:'100%', padding:'9px 11px', border:'1px solid #e5e7eb', background:'#fff', fontSize:12, fontFamily:'inherit', color:'#0F172A', outline:'none', boxSizing:'border-box' }}
                        onFocus={e=>e.target.style.borderColor='#1976D2'} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
                        onKeyDown={e => e.key==='Enter' && handle()} />
                      <div style={{ textAlign:'right', marginTop:5 }}>
                        <button onClick={() => setTab('reset')} style={{ background:'none', border:'none', fontSize:10, color:'#1976D2', cursor:'pointer', fontFamily:'inherit' }}>Forgot password?</button>
                      </div>
                    </div>
                  )}

                  <button onClick={handle} disabled={busy}
                    style={{ width:'100%', padding:'10px', background: busy ? '#94a3b8' : '#1976D2', border:'none', fontSize:13, fontWeight:600, color:'#fff', cursor: busy ? 'not-allowed' : 'pointer', fontFamily:'inherit', marginTop:4, marginBottom:14, transition:'background .15s' }}>
                    {busy ? 'Signing in…' : tab === 'login' ? 'Sign in to MechIQ' : 'Send reset email'}
                  </button>

                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                    <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
                    <span style={{ fontSize:10, color:'#94a3b8' }}>or</span>
                    <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
                  </div>

                  <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Request"
                    style={{ display:'block', width:'100%', padding:'9px', background:'#F8FAFC', border:'1px solid #e5e7eb', fontSize:11, fontWeight:500, color:'#374151', textAlign:'center', textDecoration:'none', boxSizing:'border-box', transition:'border-color .15s' }}>
                    Request a demo account ↗
                  </a>

                  <div style={{ marginTop:18, fontSize:10, color:'#94a3b8', textAlign:'center', lineHeight:1.6 }}>
                    By signing in you agree to our <a href="#" style={{ color:'#1976D2' }}>Terms</a> and <a href="#" style={{ color:'#1976D2' }}>Privacy Policy</a>.<br/>
                    Need help? <a href="mailto:info@mechiq.com.au" style={{ color:'#1976D2' }}>info@mechiq.com.au</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Login;
