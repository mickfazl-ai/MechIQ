import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

/* ─── GLOBAL CSS ────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Icon Rail ── */
.miq-rail {
  position: fixed; left: 0; top: 0; bottom: 0; width: 60px;
  background: #fff;
  border-right: 1px solid #E5E7EB;
  display: flex; flex-direction: column; align-items: center;
  z-index: 300;
  user-select: none;
}
.miq-rail.has-banner { top: 40px; }

/* Logo mark */
.miq-logo {
  width: 60px; height: 60px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid #E5E7EB;
  cursor: pointer;
}
.miq-logo-mark {
  width: 32px; height: 32px;
  background: #1976D2; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -0.5px;
}

/* Nav scroll area */
.miq-nav { flex: 1; width: 100%; overflow-y: auto; overflow-x: visible; padding: 8px 0; scrollbar-width: none; }
.miq-nav::-webkit-scrollbar { display: none; }

/* Section divider */
.miq-divider { width: 28px; height: 1px; background: #E5E7EB; margin: 6px auto; }

/* Nav item */
.miq-item {
  position: relative;
  width: 44px; height: 40px;
  margin: 1px 8px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: #9CA3AF;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.miq-item:hover { background: #F3F4F6; color: #374151; }
.miq-item.active { background: #EBF3FC; color: #1976D2; }
.miq-item.active::before {
  content: '';
  position: absolute; left: -8px; top: 8px; bottom: 8px;
  width: 3px; background: #1976D2; border-radius: 0 3px 3px 0;
}

/* Tooltip */
.miq-tip {
  position: absolute;
  left: calc(100% + 12px); top: 50%;
  transform: translateY(-50%);
  background: #111827; color: #F9FAFB;
  padding: 5px 10px; border-radius: 6px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px; font-weight: 600;
  white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 0.1s;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.miq-tip::before {
  content: '';
  position: absolute; right: 100%; top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #111827;
}
.miq-item:hover .miq-tip { opacity: 1; }

/* Flyout panel (sub-items) */
.miq-flyout {
  position: absolute;
  left: calc(100% + 14px); top: 0;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  min-width: 200px;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05);
  overflow: hidden;
  animation: miq-flyout-in 0.15s cubic-bezier(0.16,1,0.3,1);
}
@keyframes miq-flyout-in {
  from { opacity: 0; transform: translateX(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
.miq-flyout-hdr {
  padding: 10px 14px 8px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: #9CA3AF;
  border-bottom: 1px solid #F3F4F6;
}
.miq-flyout-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px; font-weight: 500; color: #374151;
  cursor: pointer; border-bottom: 1px solid #F9FAFB;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}
.miq-flyout-item:last-child { border-bottom: none; }
.miq-flyout-item:hover { background: #F3F4F6; color: #111827; }
.miq-flyout-item.on { background: #EBF3FC; color: #1976D2; font-weight: 600; }
.miq-flyout-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.4; flex-shrink: 0; }

/* Rail footer */
.miq-footer { width: 100%; flex-shrink: 0; border-top: 1px solid #E5E7EB; padding: 8px 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.miq-footer-btn {
  width: 44px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #9CA3AF;
  transition: background 0.12s, color 0.12s;
  border: none; background: none; position: relative;
}
.miq-footer-btn:hover { background: #F3F4F6; color: #374151; }
.miq-footer-btn:hover .miq-tip { opacity: 1; }
.miq-avatar-btn {
  width: 32px; height: 32px; border-radius: 8px;
  background: #EBF3FC; color: #1976D2;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; border: none; position: relative;
  flex-shrink: 0; transition: background 0.12s;
}
.miq-avatar-btn:hover { background: #BFDBFE; }
.miq-avatar-btn:hover .miq-tip { opacity: 1; }

/* ── Topbar ── */
.miq-topbar {
  position: fixed; left: 60px; top: 0; right: 0; height: 56px;
  background: #fff;
  border-bottom: 1px solid #E5E7EB;
  display: flex; align-items: center; padding: 0 20px; gap: 16px;
  z-index: 200;
}
.miq-topbar.has-banner { top: 40px; }

.miq-breadcrumb { display: flex; align-items: center; gap: 6px; flex: 1; }
.miq-breadcrumb-root {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px; font-weight: 600; color: #9CA3AF;
  cursor: pointer; transition: color 0.12s; text-decoration: none;
}
.miq-breadcrumb-root:hover { color: #374151; }
.miq-breadcrumb-sep { color: #D1D5DB; font-size: 13px; }
.miq-breadcrumb-cur {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px; font-weight: 700; color: #111827; letter-spacing: -0.2px;
}

.miq-topbar-right { display: flex; align-items: center; gap: 10px; }

/* Search bar */
.miq-search {
  display: flex; align-items: center; gap: 8px;
  background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px;
  padding: 6px 12px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  min-width: 180px;
}
.miq-search:hover { border-color: #D1D5DB; background: #fff; }
.miq-search-text { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: #9CA3AF; }
.miq-search-key { background: #E5E7EB; color: #6B7280; font-family: 'Inter', system-ui, sans-serif; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; margin-left: auto; }

/* Icon button in topbar */
.miq-topbar-icon {
  width: 34px; height: 34px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  color: #6B7280; cursor: pointer; position: relative;
  border: 1px solid transparent; background: transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  flex-shrink: 0;
}
.miq-topbar-icon:hover { background: #F3F4F6; border-color: #E5E7EB; color: #374151; }
.miq-notif-dot {
  position: absolute; top: 6px; right: 6px;
  width: 7px; height: 7px; border-radius: 50%;
  background: #B91C1C; border: 1.5px solid #fff;
}

/* User chip */
.miq-user-chip {
  display: flex; align-items: center; gap: 9px;
  padding: 4px 10px 4px 5px;
  background: #F9FAFB; border: 1px solid #E5E7EB;
  border-radius: 10px; cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
  position: relative;
}
.miq-user-chip:hover { border-color: #D1D5DB; background: #fff; }
.miq-user-avatar {
  width: 26px; height: 26px; border-radius: 6px;
  background: #1976D2; color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.miq-user-name { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: #111827; }
.miq-user-role { font-family: 'Inter', system-ui, sans-serif; font-size: 10px; font-weight: 600; color: #9CA3AF; margin-top: 0; }

/* Role badges */
.miq-role { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 4px; font-family: 'Inter', system-ui, sans-serif; font-size: 10px; font-weight: 700; border: 1px solid transparent; white-space: nowrap; }

/* User dropdown */
.miq-user-dd {
  position: absolute; right: 0; top: calc(100% + 8px);
  background: #fff; border: 1px solid #E5E7EB;
  border-radius: 10px; min-width: 220px; z-index: 9999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10);
  overflow: hidden;
  animation: miq-flyout-in 0.15s cubic-bezier(0.16,1,0.3,1);
}
.miq-user-dd-hdr { padding: 12px 14px; border-bottom: 1px solid #F3F4F6; }
.miq-user-dd-name { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; font-weight: 700; color: #111827; }
.miq-user-dd-email { font-family: 'Inter', system-ui, sans-serif; font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.miq-user-dd-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 14px; cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px; font-weight: 500; color: #374151;
  border-bottom: 1px solid #F9FAFB; transition: background 0.1s;
}
.miq-user-dd-item:last-child { border-bottom: none; }
.miq-user-dd-item:hover { background: #F3F4F6; }
.miq-user-dd-item.danger { color: #B91C1C; }
.miq-user-dd-item.danger:hover { background: #FEF2F2; }

/* Company switcher */
.miq-co-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 6px 12px; border-radius: 7px;
  background: #EBF3FC; border: 1px solid #BFDBFE;
  color: #1976D2; cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px; font-weight: 600;
  transition: background 0.12s; white-space: nowrap;
  position: relative;
}
.miq-co-btn:hover { background: #DBEAFE; }
.miq-co-dd {
  position: absolute; right: 0; top: calc(100% + 8px);
  background: #fff; border: 1px solid #E5E7EB;
  border-radius: 10px; min-width: 220px; z-index: 9999;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10);
  overflow: hidden;
  animation: miq-flyout-in 0.15s cubic-bezier(0.16,1,0.3,1);
}
.miq-co-dd-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 14px; cursor: pointer;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px; font-weight: 500; color: #374151;
  border-bottom: 1px solid #F9FAFB; transition: background 0.1s;
}
.miq-co-dd-item:last-child { border-bottom: none; }
.miq-co-dd-item:hover { background: #F3F4F6; }
.miq-co-dd-item.active { background: #EBF3FC; color: #1976D2; font-weight: 600; }
.miq-co-dd-item.exit { color: #B91C1C; font-weight: 600; }
.miq-co-dd-item.exit:hover { background: #FEF2F2; }

/* Banner */
.miq-banner {
  position: fixed; top: 0; left: 0; right: 0; height: 40px; z-index: 400;
  background: #1976D2; color: #fff;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px; font-weight: 500;
}
.miq-banner-exit {
  background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
  color: #fff; padding: 4px 12px; border-radius: 5px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.12s;
}
.miq-banner-exit:hover { background: rgba(255,255,255,0.25); }

/* Mobile overlay */
.miq-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 299; }
@media (max-width: 768px) {
  .miq-rail { transform: translateX(-100%); transition: transform 0.22s; }
  .miq-rail.mob-open { transform: translateX(0); }
  .miq-overlay.visible { display: block; }
  .miq-topbar { left: 0 !important; }
  .miq-ham { display: flex !important; }
}
.miq-ham { display: none; background: none; border: none; color: #6B7280; cursor: pointer; padding: 8px; border-radius: 6px; align-items: center; justify-content: center; width: 36px; height: 36px; }
.miq-ham:hover { background: #F3F4F6; }

/* Content offset */
.main-content { margin-left: 60px !important; margin-top: 56px !important; }
.main-content.has-banner { margin-top: 96px !important; }
`;

/* ─── SVG ICONS ─────────────────────────────────────────────────────────────── */
const IC = {
  dashboard:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  assets:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  maintenance:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  forms:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  scanner:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 7 23 1 17 1"/><line x1="16" y1="8" x2="23" y2="1"/><polyline points="1 17 1 23 7 23"/><line x1="8" y1="16" x2="1" y2="23"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  chat:         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  parts:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  oil_sampling: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  reports:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  admin:        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  master:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  download:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  notif:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  search:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ham:          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  chevDown:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  building:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
};

/* ─── NAV STRUCTURE ──────────────────────────────────────────────────────────── */
const NAV = [
  { id:'dashboard',   label:'Dashboard',    ik:'dashboard',   roles:['admin','supervisor','technician','operator'] },
  { id:'assets',      label:'Assets',       ik:'assets',      roles:['admin','supervisor'],
    children:[
      { id:'assets', subPage:'units',        label:'Units' },
      { id:'assets', subPage:'onboarding',   label:'Onboarding' },
      { id:'assets', subPage:'depreciation', label:'Depreciation' },
      { id:'assets', subPage:'tracker',      label:'Tracker' },
    ]},
  { id:'maintenance', label:'Maintenance',  ik:'maintenance', roles:['admin','supervisor','technician'],
    children:[
      { id:'maintenance', subPage:'scheduled',   label:'Planned Maintenance' },
      { id:'maintenance', subPage:'work_orders', label:'Work Orders' },
      { id:'maintenance', subPage:'schedules',   label:'Service Schedules' },
      { id:'maintenance', subPage:'calendar',    label:'Calendar' },
    ]},
  { id:'forms',       label:'Forms',        ik:'forms',       roles:['admin','supervisor','technician','operator'],
    children:[
      { id:'forms', subPage:'prestarts',      label:'Prestarts' },
      { id:'forms', subPage:'service-sheets', label:'Service Sheets' },
    ]},
  { id:'scanner',     label:'Scanner',      ik:'scanner',     roles:['technician','operator'] },
  { id:'chat',        label:'Messages',     ik:'chat',        roles:['admin','supervisor','technician','operator'] },
  { id:'parts',       label:'Parts',        ik:'parts',       roles:['admin','supervisor','technician'] },
  { id:'oil_sampling',label:'Oil Sampling', ik:'oil_sampling',roles:['admin','supervisor'] },
  { id:'reports',     label:'Reports',      ik:'reports',     roles:['admin','supervisor'],
    children:[
      { id:'reports', subPage:'downtime-log',  label:'Downtime Log' },
      { id:'reports', subPage:'downtime',      label:'Downtime Analysis' },
      { id:'reports', subPage:'availability',  label:'Availability' },
    ]},
  { id:'admin',       label:'Admin',        ik:'admin',       roles:['admin'],
    children:[
      { id:'admin', subPage:'company',          label:'Company Details' },
      { id:'admin', subPage:'users',            label:'Users & Roles' },
      { id:'admin', subPage:'notifs',           label:'Notifications' },
      { id:'admin', subPage:'billing',          label:'Billing & Plan' },
      { id:'admin', subPage:'data',             label:'Data & Export' },
      { id:'admin', subPage:'daily_reports',    label:'Daily Reports' },
      { id:'admin', subPage:'error_log',        label:'Error Log' },
      { id:'admin', subPage:'assets_settings',  label:'Assets' },
      { id:'admin', subPage:'labels',           label:'Labels' },
    ]},
  { id:'settings',    label:'Settings',     ik:'settings',    roles:['admin','supervisor'],
    children:[
      { id:'settings', subPage:'format',       label:'Format & Theme' },
      { id:'settings', subPage:'datetime',     label:'Date & Time' },
      { id:'settings', subPage:'sync',         label:'OneDrive Sync' },
      { id:'settings', subPage:'app_modifier', label:'App Requests' },
      { id:'settings', subPage:'password',     label:'Password Reset' },
    ]},
];

const PAGE_TITLES = {
  dashboard:'Dashboard', assets:'Assets', onboarding:'Onboarding', maintenance:'Maintenance',
  forms:'Forms', scanner:'Scanner', oil_sampling:'Oil Sampling',
  reports:'Reports', admin:'Admin', settings:'Settings', master:'Master Admin',
  users:'Users', export:'Data Export', chat:'Messages', parts:'Parts',
};

const ROLE_COLOURS = {
  master:     { bg:'#EDE9FE', color:'#6D28D9', border:'#C4B5FD' },
  admin:      { bg:'#EBF3FC', color:'#1976D2', border:'#BFDBFE' },
  supervisor: { bg:'#FFFBEB', color:'#B45309', border:'#FCD34D' },
  technician: { bg:'#F0FDF4', color:'#15803D', border:'#86EFAC' },
  operator:   { bg:'#F3F4F6', color:'#6B7280', border:'#D1D5DB' },
};
function RoleBadge({ role }) {
  const s = ROLE_COLOURS[role] || ROLE_COLOURS.operator;
  return <span className="miq-role" style={{ background:s.bg, color:s.color, borderColor:s.border }}>{role}</span>;
}

/* ─── RAIL ITEM ──────────────────────────────────────────────────────────────── */
function RailItem({ item, currentPage, currentSubPage, onNav, flyout, setFlyout }) {
  const ref = useRef(null);
  const isActive = currentPage === item.id || item.children?.some(c => c.id === currentPage && c.subPage === currentSubPage);
  const hasSubs = item.children?.length > 0;
  const open = flyout === item.id;

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setFlyout(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const click = () => {
    if (hasSubs) { setFlyout(open ? null : item.id); }
    else { onNav(item.id, null); setFlyout(null); }
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div className={`miq-item${isActive ? ' active' : ''}`} onClick={click}>
        {IC[item.ik] || IC.settings}
        {!hasSubs && <div className="miq-tip">{item.label}</div>}
        {hasSubs && !open && <div className="miq-tip">{item.label}</div>}
      </div>
      {hasSubs && open && (
        <div className="miq-flyout">
          <div className="miq-flyout-hdr">{item.label}</div>
          {item.children.map(c => (
            <div
              key={c.id + c.subPage}
              className={`miq-flyout-item${currentPage === c.id && currentSubPage === c.subPage ? ' on' : ''}`}
              onClick={() => { onNav(c.id, c.subPage); setFlyout(null); }}
            >
              <span className="miq-flyout-dot" />{c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
export default function Navbar({ currentPage, currentSubPage, setCurrentPage, onLogout, session, userRole, viewingCompany, onSelectCompany, onExitCompany }) {
  const [flyout,      setFlyout]      = useState(null);
  const [userDD,      setUserDD]      = useState(false);
  const [coDD,        setCoDD]        = useState(false);
  const [mobOpen,     setMobOpen]     = useState(false);
  const [companies,   setCompanies]   = useState([]);
  const [coName,      setCoName]      = useState('');
  const [coLogo,      setCoLogo]      = useState(null);
  const userDDRef = useRef(null);
  const coDDRef   = useRef(null);

  const isMaster = userRole?.role === 'master';
  const role     = viewingCompany ? 'admin' : (userRole?.role || 'operator');
  const features = viewingCompany?.features || userRole?.company_features || {};
  const hasBanner = !!(isMaster && viewingCompany);
  const displayName = userRole?.name || session?.user?.email?.split('@')[0] || 'User';
  const email = session?.user?.email || '';

  useEffect(() => {
    if (!document.getElementById('miq-nav-css')) {
      const s = document.createElement('style'); s.id = 'miq-nav-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
    updateLayout();
  }, [hasBanner]);

  useEffect(() => { if (isMaster) fetchCompanies(); }, [isMaster]);

  useEffect(() => {
    const cid = viewingCompany?.id || userRole?.company_id;
    if (!cid || isMaster) { setCoLogo(null); setCoName(''); return; }
    supabase.from('companies').select('name,logo_url').eq('id', cid).single()
      .then(({ data }) => { if (data) { setCoName(data.name||''); setCoLogo(data.logo_url||null); } });
  }, [userRole?.company_id, viewingCompany?.id, isMaster]);

  useEffect(() => {
    const h = e => {
      if (userDDRef.current && !userDDRef.current.contains(e.target)) setUserDD(false);
      if (coDDRef.current   && !coDDRef.current.contains(e.target))   setCoDD(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = e => { if (e.detail?.page) handleNav(e.detail.page, e.detail.subPage||null); };
    window.addEventListener('mechiq-navigate', h);
    return () => window.removeEventListener('mechiq-navigate', h);
  }, []);

  useEffect(() => {
    const onResize = () => updateLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [hasBanner]);

  const updateLayout = () => {
    const mc = document.querySelector('.main-content');
    if (mc) {
      mc.style.marginLeft = '60px';
      mc.style.marginTop  = hasBanner ? '96px' : '56px';
    }
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id,name,status').eq('status','active').order('name');
    setCompanies(data || []);
  };

  const handleNav = (id, subPage) => { setCurrentPage(id, subPage); setFlyout(null); setMobOpen(false); };

  const visibleItems = (() => {
    if (isMaster && !viewingCompany) {
      return [
        ...NAV.filter(i => i.id !== 'admin' && i.id !== 'settings'),
        { id:'master', label:'Master Admin', ik:'master', roles:['master'],
          children:[
            { id:'master', subPage:'companies', label:'Companies' },
            { id:'master', subPage:'register',  label:'New Company' },
            { id:'master', subPage:'requests',  label:'App Requests' },
          ]},
      ];
    }
    return NAV
      .filter(item => item.roles.includes(role) && !(item.feature && features[item.feature] === false))
      .map(item => ({ ...item, children: item.children?.filter(c => !c.roles || c.roles.includes(role)) }));
  })();

  // Page title for topbar
  const pageTitle = (() => {
    if (currentSubPage) {
      const allSubs = NAV.flatMap(i => i.children || []);
      const match = allSubs.find(c => c.id === currentPage && c.subPage === currentSubPage);
      if (match) return match.label;
    }
    return PAGE_TITLES[currentPage] || currentPage;
  })();

  const parentTitle = currentSubPage ? (PAGE_TITLES[currentPage] || currentPage) : null;

  return (
    <>
      {/* Admin viewing banner */}
      {hasBanner && (
        <div className="miq-banner">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {IC.building}
            <span style={{ opacity:0.8 }}>Viewing as admin:</span>
            <strong>{viewingCompany.name}</strong>
          </div>
          <button className="miq-banner-exit" onClick={onExitCompany}>✕ Exit view</button>
        </div>
      )}

      {/* Mobile overlay */}
      <div className={`miq-overlay${mobOpen ? ' visible' : ''}`} onClick={() => setMobOpen(false)} />

      {/* Icon rail */}
      <nav className={`miq-rail${hasBanner ? ' has-banner' : ''}${mobOpen ? ' mob-open' : ''}`}>

        {/* Logo */}
        <div className="miq-logo" onClick={() => handleNav(isMaster && !viewingCompany ? 'master' : 'dashboard', null)}>
          <div className="miq-logo-mark">M</div>
        </div>

        {/* Nav items */}
        <div className="miq-nav">
          {visibleItems.map((item, i) => {
            const prevItem = visibleItems[i - 1];
            const showDivider = i > 0 && (
              (item.id === 'reports'  && prevItem?.id !== 'reports') ||
              (item.id === 'admin'    && prevItem?.id !== 'admin') ||
              (item.id === 'settings' && prevItem?.id !== 'settings') ||
              (item.id === 'master'   && prevItem?.id !== 'master')
            );
            return (
              <React.Fragment key={item.id + item.ik}>
                {showDivider && <div className="miq-divider" />}
                <RailItem
                  item={item}
                  currentPage={currentPage}
                  currentSubPage={currentSubPage}
                  onNav={handleNav}
                  flyout={flyout}
                  setFlyout={setFlyout}
                />
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div className="miq-footer">
          {/* Download app */}
          <a href="https://mechiq.coastlinemm.com.au/MechIQ.apk" download className="miq-footer-btn" title="Download App">
            {IC.download}
            <div className="miq-tip">Download App</div>
          </a>
          {/* Avatar */}
          <div className="miq-avatar-btn" title={displayName} onClick={() => setUserDD(o => !o)} style={{ marginBottom:4 }}>
            {(displayName||'?')[0].toUpperCase()}
            <div className="miq-tip">{displayName}</div>
          </div>
        </div>
      </nav>

      {/* Topbar */}
      <header className={`miq-topbar${hasBanner ? ' has-banner' : ''}`}>
        {/* Mobile hamburger */}
        <button className="miq-ham" onClick={() => setMobOpen(o => !o)}>{IC.ham}</button>

        {/* Breadcrumb */}
        <div className="miq-breadcrumb">
          {parentTitle && <>
            <span className="miq-breadcrumb-root" onClick={() => handleNav(currentPage, null)}>{parentTitle}</span>
            <span className="miq-breadcrumb-sep">/</span>
          </>}
          <span className="miq-breadcrumb-cur">{pageTitle}</span>
        </div>

        <div className="miq-topbar-right">
          {/* Search hint */}
          <div className="miq-search">
            <span style={{ color:'#9CA3AF' }}>{IC.search}</span>
            <span className="miq-search-text">Search MechIQ…</span>
            <span className="miq-search-key">⌘K</span>
          </div>

          {/* Notifications */}
          <div className="miq-topbar-icon" title="Notifications">
            {IC.notif}
            <span className="miq-notif-dot" />
          </div>

          {/* Company logo / name */}
          {coLogo && <img src={coLogo} alt={coName} style={{ maxHeight:30, maxWidth:120, objectFit:'contain' }} />}
          {!coLogo && coName && <span style={{ fontSize:13, fontWeight:600, color:'#6B7280' }}>{coName}</span>}

          {/* Master: company switcher */}
          {isMaster && (
            <div ref={coDDRef} style={{ position:'relative' }}>
              <button className="miq-co-btn" onClick={() => setCoDD(o => !o)}>
                {IC.building}
                {viewingCompany ? viewingCompany.name : 'View Company'}
                <span style={{ opacity:0.7, marginLeft:2 }}>{IC.chevDown}</span>
              </button>
              {coDD && (
                <div className="miq-co-dd">
                  <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid #F3F4F6', fontSize:10, fontWeight:700, color:'#9CA3AF', letterSpacing:'0.8px', textTransform:'uppercase' }}>Active Companies</div>
                  {viewingCompany && <div className="miq-co-dd-item exit" onClick={() => { onExitCompany(); setCoDD(false); }}>← Exit company view</div>}
                  {companies.length === 0
                    ? <div style={{ padding:'14px 16px', color:'#9CA3AF', fontSize:12 }}>No active companies</div>
                    : companies.map(c => (
                        <div key={c.id} className={`miq-co-dd-item${viewingCompany?.id === c.id ? ' active' : ''}`} onClick={() => { onSelectCompany(c); setCoDD(false); }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:'#15803D', flexShrink:0 }} />{c.name}
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          )}

          {/* User chip */}
          <div ref={userDDRef} className="miq-user-chip" onClick={() => setUserDD(o => !o)}>
            <div className="miq-user-avatar">{(displayName||'?')[0].toUpperCase()}</div>
            <div>
              <div className="miq-user-name">{displayName}</div>
              <RoleBadge role={isMaster ? 'master' : (userRole?.role || 'operator')} />
            </div>
            <span style={{ color:'#9CA3AF', marginLeft:2 }}>{IC.chevDown}</span>

            {userDD && (
              <div className="miq-user-dd" onClick={e => e.stopPropagation()}>
                <div className="miq-user-dd-hdr">
                  <div className="miq-user-dd-name">{displayName}</div>
                  <div className="miq-user-dd-email">{email}</div>
                </div>
                <div className="miq-user-dd-item" onClick={() => { handleNav('settings', 'password'); setUserDD(false); }}>
                  <span style={{ opacity:0.5 }}>{IC.settings}</span> Account settings
                </div>
                <a href="https://mechiq.coastlinemm.com.au/MechIQ.apk" download className="miq-user-dd-item" style={{ textDecoration:'none', color:'#374151' }} onClick={() => setUserDD(false)}>
                  <span style={{ opacity:0.5 }}>{IC.download}</span> Download Android app
                </a>
                <div className="miq-user-dd-item danger" onClick={() => { onLogout(); setUserDD(false); }}>
                  <span style={{ opacity:0.7 }}>{IC.logout}</span> Sign out
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
