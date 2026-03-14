import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes flyout-in {
    from { opacity: 0; transform: translateX(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes banner-in {
    from { opacity: 0; transform: translateY(-100%); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: 56px;
    background: var(--sidebar-bg, #111827);
    display: flex; flex-direction: column; align-items: center;
    padding: 0 0 0;
    z-index: 300;
    border-right: 1px solid var(--sidebar-border, rgba(255,255,255,0.07));
    transition: width 0.22s cubic-bezier(0.16,1,0.3,1);
    overflow: visible;
  }
  .sidebar.expanded { width: 220px; }
  .sidebar.has-banner { top: 34px; }

  .sidebar-brand {
    width: 100%; height: 56px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    border-bottom: 1px solid var(--sidebar-border, rgba(255,255,255,0.07));
    overflow: hidden; padding: 0 16px; user-select: none; gap: 1px;
  }
  .sidebar-brand .brand-word {
    font-family: var(--font-display);
    font-size: 20px; font-weight: 900; letter-spacing: 0.5px;
    text-transform: uppercase; line-height: 1; white-space: nowrap;
  }
  .brand-mech { color: #ffffff; }
  .brand-iq   { color: var(--accent); }

  .sidebar-nav {
    flex: 1; width: 100%;
    overflow-y: auto; overflow-x: visible;
    padding: 8px 0; scrollbar-width: none;
  }
  .sidebar-nav::-webkit-scrollbar { display: none; }

  .sidebar-item {
    position: relative; width: 100%; height: 42px;
    display: flex; align-items: center; gap: 11px;
    padding: 0 16px; cursor: pointer;
    color: #c8d8e8;
    font-size: 12.5px; font-weight: 600; font-family: var(--font-body);
    letter-spacing: 0.2px;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap; overflow: hidden; user-select: none;
  }
  .sidebar-item:hover {
    color: #ffffff;
    background: var(--sidebar-hover, rgba(255,255,255,0.08));
  }
  .sidebar-item.active {
    color: #ffffff;
    background: var(--sidebar-active, rgba(14,165,233,0.18));
  }
  .sidebar-item.active .sbi-icon { color: var(--accent); }
  .sidebar-item.active::before {
    content: ''; position: absolute;
    left: 0; top: 6px; bottom: 6px;
    width: 3px; background: #00ABE4; border-radius: 0 3px 3px 0;
  }
  .sbi-icon {
    font-size: 16px; flex-shrink: 0;
    width: 24px; text-align: center;
    display: flex; align-items: center; justify-content: center;
    transition: color 0.15s;
  }
  .sbi-label {
    flex: 1; opacity: 0;
    transform: translateX(-6px);
    transition: opacity 0.18s, transform 0.18s;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sidebar.expanded .sbi-label { opacity: 1; transform: translateX(0); }
  .sbi-caret {
    font-size: 9px; opacity: 0.5; flex-shrink: 0;
    transition: transform 0.2s; margin-left: auto;
    display: flex; align-items: center;
  }

  .sidebar-tooltip {
    position: absolute; left: calc(100% + 10px); top: 50%;
    transform: translateY(-50%);
    background: #1f2937; color: #f9fafb;
    padding: 5px 10px; border-radius: 7px;
    font-size: 12px; font-weight: 600; font-family: var(--font-body);
    white-space: nowrap; pointer-events: none; opacity: 0;
    transition: opacity 0.15s; z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  .sidebar:not(.expanded) .sidebar-item:hover .sidebar-tooltip { opacity: 1; }

  .sidebar-flyout {
    position: absolute; left: calc(100% + 4px); top: 0;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 10px; min-width: 190px;
    z-index: 9999;
    box-shadow: 0 8px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.06);
    overflow: hidden; animation: flyout-in 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .sidebar-flyout-header {
    padding: 9px 14px 7px; font-size: 10px; font-weight: 800;
    color: var(--text-muted, #7a92a8); letter-spacing: 1.2px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border-light, #f0f6fc);
  }
  .sidebar-flyout-item {
    padding: 9px 14px; font-size: 13px; font-weight: 500;
    color: var(--text-dark, #1a2b3c); cursor: pointer;
    border-bottom: 1px solid var(--border-light, #f0f6fc);
    transition: background 0.12s, color 0.12s; white-space: nowrap;
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-body);
  }
  .sidebar-flyout-item:last-child { border-bottom: none; }
  .sidebar-flyout-item:hover { background: var(--blue-light, #e9f1fa); color: var(--accent); }
  .sidebar-flyout-item.active { background: #e0f4ff; color: var(--accent); font-weight: 700; }
  .sidebar-flyout-item .item-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: currentColor; opacity: 0.5; flex-shrink: 0;
  }

  .sidebar-sub { overflow: hidden; transition: max-height 0.22s cubic-bezier(0.16,1,0.3,1); }
  .sidebar-sub-item {
    height: 36px; display: flex; align-items: center;
    gap: 10px; padding: 0 16px 0 40px; cursor: pointer;
    color: #c8d8e8;
    font-size: 12px; font-weight: 500; font-family: var(--font-body);
    white-space: nowrap; overflow: hidden;
    transition: color 0.12s, background 0.12s; user-select: none;
  }
  .sidebar-sub-item:hover {
    color: var(--sidebar-text, #e5e7eb);
    background: var(--sidebar-hover, rgba(255,255,255,0.04));
  }
  .sidebar-sub-item.active { color: var(--accent); font-weight: 700; background: rgba(14,165,233,0.10); border-right: 2px solid var(--accent); }
  .sub-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; flex-shrink: 0; opacity: 0.7; }

  .sidebar-footer {
    width: 100%; padding: 8px 0 0;
    border-top: 1px solid var(--sidebar-border, rgba(255,255,255,0.07)); flex-shrink: 0;
  }
  .sidebar-toggle {
    width: 100%; height: 38px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #c8d8e8;
    transition: color 0.15s, background 0.15s;
    background: none; border: none; font-size: 16px; flex-shrink: 0;
  }
  .sidebar-toggle:hover {
    color: var(--sidebar-text, #e5e7eb);
    background: var(--sidebar-hover, rgba(255,255,255,0.06));
  }

  .topbar {
    position: fixed; left: 56px; top: 0; right: 0; height: 56px;
    background: var(--topbar-bg);
    border-bottom: 1px solid var(--topbar-border);
    display: flex; align-items: center; padding: 0 24px; gap: 12px;
    z-index: 200; transition: left 0.22s cubic-bezier(0.16,1,0.3,1), background 0.25s ease, border-color 0.25s ease;
    backdrop-filter: blur(16px);
  }
  .topbar.sb-expanded { left: 220px; }
  .topbar.has-banner  { top: 34px; }
  .topbar-title {
    font-family: var(--font-display); font-size: 18px;
    font-weight: 800; letter-spacing: 0.2px;
    color: var(--text-primary); flex: 1;
    transition: color 0.25s ease;
  }
  .topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .nav-viewing-banner {
    background: linear-gradient(90deg, #0070b8, #00ABE4);
    color: #fff; padding: 7px 20px;
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
    animation: banner-in 0.25s ease;
    position: fixed; top: 0; left: 0; right: 0; z-index: 400;
  }
  .role-badge {
    padding: 3px 10px; border-radius: 20px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.8px;
    text-transform: uppercase; white-space: nowrap;
  }
  .company-switcher-dropdown {
    position: absolute; right: 0; top: calc(100% + 10px);
    background: var(--surface, #fff);
    border: 1px solid var(--border, #dde8f2);
    border-radius: 12px; min-width: 220px; z-index: 2000;
    box-shadow: 0 12px 36px rgba(0,80,160,0.14);
    overflow: hidden; animation: flyout-in 0.2s cubic-bezier(0.16,1,0.3,1);
  }
  .company-switcher-item {
    padding: 10px 16px; cursor: pointer; font-size: 13px; font-weight: 500;
    color: var(--text-dark, #1a2b3c);
    border-bottom: 1px solid var(--border-light, #f0f6fc);
    transition: background 0.12s; display: flex; align-items: center; gap: 8px;
    font-family: var(--font-body);
  }
  .company-switcher-item:last-child { border-bottom: none; }
  .company-switcher-item:hover { background: var(--surface-2); }
  .company-switcher-item.active { background: var(--accent-light); color: var(--accent); font-weight: 700; }
  .company-switcher-item.exit { color: #dc2626; background: #fef2f2; font-weight: 700; }
  .company-switcher-item.exit:hover { background: #fee2e2; }
  .nav-pill {
    padding: 5px 14px; border-radius: 7px; border: none;
    font-size: 11px; font-weight: 700; cursor: pointer;
    text-transform: uppercase; letter-spacing: 1px;
    transition: all 0.15s; font-family: var(--font-body); white-space: nowrap;
  }
  .nav-pill-primary { background: #00ABE4; color: #fff; box-shadow: 0 2px 8px rgba(0,171,228,0.28); }
  .nav-pill-primary:hover { background: #0096cc; transform: translateY(-1px); }
  .nav-pill-ghost { background: transparent; color: var(--text-muted); border: 1.5px solid #dde8f2; }
  .nav-pill-ghost:hover { border-color: var(--accent); color: var(--accent); background: var(--surface-2); }

  .sidebar-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.4); z-index: 299; backdrop-filter: blur(2px);
  }
  @media (max-width: 768px) {
    .sidebar { width: 0 !important; overflow: hidden; transition: width 0.22s; }
    .sidebar.mobile-open { width: 220px !important; overflow: visible; }
    .sidebar-overlay.visible { display: block; }
    .topbar { left: 0 !important; }
    .topbar-hamburger { display: flex !important; }
  }
  .topbar-hamburger {
    display: none; background: none; border: none;
    color: var(--text-muted, #7a92a8); cursor: pointer; padding: 4px;
    align-items: center;
  }
`;

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const IC = {
  dashboard:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  assets:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  maintenance:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  forms:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  scanner:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 7 23 1 17 1"/><line x1="16" y1="8" x2="23" y2="1"/><polyline points="1 17 1 23 7 23"/><line x1="8" y1="16" x2="1" y2="23"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  oil_sampling: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  reports:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  admin:        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  master:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  chevron:      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  collapse:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>,
  expand:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>,
  hamburger:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  logout:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

// ─── Nav structure ─────────────────────────────────────────────────────────────
const NAV_STRUCTURE = [
  { id: 'dashboard',    label: 'Dashboard',    ik: 'dashboard',    roles: ['admin','supervisor','technician','operator'], feature: 'dashboard' },
  { id: 'assets',       label: 'Assets',       ik: 'assets',       roles: ['admin','supervisor'], feature: 'assets',
    children: [
      { id: 'assets', subPage: 'units',        label: 'Units',        roles: ['admin','supervisor'] },
      { id: 'assets', subPage: 'onboarding',   label: 'Onboarding',   roles: ['admin','supervisor'] },
      { id: 'assets', subPage: 'depreciation', label: 'Depreciation', roles: ['admin','supervisor'] },
      { id: 'assets', subPage: 'tracker',      label: 'Tracker',      roles: ['admin','supervisor'] },
    ],
  },
  { id: 'maintenance',  label: 'Maintenance',  ik: 'maintenance',  roles: ['admin','supervisor','technician'], feature: 'maintenance',
    children: [
      { id: 'maintenance', subPage: 'scheduled',   label: 'Scheduled Service', roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'work_orders', label: 'Work Orders',       roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'pm_tasks',    label: 'PM Tasks',          roles: ['admin','supervisor','technician'] },
    ],
  },
  { id: 'forms',        label: 'Forms',        ik: 'forms',        roles: ['admin','supervisor','technician','operator'], feature: 'prestart',
    children: [
      { id: 'forms', subPage: 'prestarts',      label: 'Prestarts',      roles: ['admin','supervisor','technician','operator'] },
      { id: 'forms', subPage: 'service-sheets', label: 'Service Sheets', roles: ['admin','supervisor','technician'] },
    ],
  },
  { id: 'scanner',      label: 'Scanner',      ik: 'scanner',      roles: ['technician','operator'], feature: 'scanner' },
  { id: 'oil_sampling', label: 'Oil Sampling', ik: 'oil_sampling', roles: ['admin','supervisor'], feature: 'oil_sampling' },
  { id: 'reports',      label: 'Reports',      ik: 'reports',      roles: ['admin','supervisor'], feature: 'reports',
    children: [
      { id: 'reports', subPage: 'downtime-log',  label: 'Downtime Log',      roles: ['admin','supervisor'] },
      { id: 'reports', subPage: 'downtime',      label: 'Downtime Analysis', roles: ['admin','supervisor'] },
      { id: 'reports', subPage: 'availability',  label: 'Availability',      roles: ['admin','supervisor'] },
    ],
  },
  { id: 'admin',        label: 'Admin',        ik: 'admin',        roles: ['admin'], feature: null,
    children: [
      { id: 'admin', subPage: 'company',  label: 'Company Details', roles: ['admin'] },
      { id: 'admin', subPage: 'users',    label: 'Users & Roles',   roles: ['admin'] },
      { id: 'admin', subPage: 'notifs',   label: 'Notifications',   roles: ['admin'] },
      { id: 'admin', subPage: 'billing',  label: 'Billing & Plan',  roles: ['admin'] },
      { id: 'admin', subPage: 'data',     label: 'Data & Export',   roles: ['admin'] },
      { id: 'forms', subPage: null,       label: 'Form Builder',    roles: ['admin'] },
    ],
  },
  { id: 'settings',     label: 'Settings',     ik: 'settings',     roles: ['admin','supervisor'], feature: null,
    children: [
      { id: 'settings', subPage: 'format',   label: 'Format & Theme', roles: ['admin','supervisor'] },
      { id: 'settings', subPage: 'password', label: 'Password Reset', roles: ['admin','supervisor'] },
    ],
  },
];

const ROLE_STYLE = {
  master:     { bg: '#ede9fe', color: 'var(--purple)', border: '#c4b5fd' },
  admin:      { bg: '#e0f4ff', color: 'var(--accent)', border: '#7dd3fc' },
  supervisor: { bg: 'var(--amber-bg)', color: 'var(--amber)', border: '#fcd34d' },
  technician: { bg: 'var(--green-bg)', color: 'var(--green)', border: '#86efac' },
  operator:   { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
};
function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.operator;
  return <span className="role-badge" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{role}</span>;
}

// ─── Sidebar nav item ──────────────────────────────────────────────────────────
function SidebarItem({ item, currentPage, currentSubPage, onNav, expanded, flyoutOpen, setFlyoutOpen }) {
  const hasChildren = item.children?.length > 0;
  const isActive = currentPage === item.id || (hasChildren && item.children.some(c => c.id === currentPage));
  const isFlyout = flyoutOpen === item.id;
  const [inlineOpen, setInlineOpen] = useState(isActive);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (isFlyout && ref.current && !ref.current.contains(e.target)) setFlyoutOpen(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isFlyout]);

  useEffect(() => { if (isActive && expanded) setInlineOpen(true); }, [isActive, expanded]);

  const handleClick = () => {
    if (!hasChildren) { onNav(item.id, null); setFlyoutOpen(null); return; }
    if (expanded) setInlineOpen(o => !o);
    else setFlyoutOpen(isFlyout ? null : item.id);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className={`sidebar-item${isActive ? ' active' : ''}`} onClick={handleClick}>
        <span className="sbi-icon">{IC[item.ik] || IC.settings}</span>
        <span className="sbi-label">{item.label}</span>
        {hasChildren && expanded && (
          <span className="sbi-caret" style={{ transform: inlineOpen ? 'rotate(180deg)' : 'none' }}>{IC.chevron}</span>
        )}
        {!expanded && <span className="sidebar-tooltip">{item.label}</span>}
      </div>

      {/* Inline sub-items */}
      {hasChildren && expanded && (
        <div className="sidebar-sub" style={{ maxHeight: inlineOpen ? `${item.children.length * 36}px` : '0' }}>
          {item.children.map(c => (
            <div
              key={`${c.id}-${c.subPage}`}
              className={`sidebar-sub-item${currentPage === c.id && currentSubPage === c.subPage ? ' active' : ''}`}
              onClick={() => onNav(c.id, c.subPage)}
            >
              <span className="sub-dot" />{c.label}
            </div>
          ))}
        </div>
      )}

      {/* Flyout (collapsed) */}
      {hasChildren && !expanded && isFlyout && (
        <div className="sidebar-flyout">
          <div className="sidebar-flyout-header">{item.label}</div>
          {item.children.map(c => (
            <div
              key={`${c.id}-${c.subPage}`}
              className={`sidebar-flyout-item${currentPage === c.id && currentSubPage === c.subPage ? ' active' : ''}`}
              onClick={() => { onNav(c.id, c.subPage); setFlyoutOpen(null); }}
            >
              <span className="item-dot" />{c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_TITLES = {
  dashboard: 'Dashboard', assets: 'Assets', maintenance: 'Maintenance',
  forms: 'Forms', scanner: 'Scanner', oil_sampling: 'Oil Sampling',
  reports: 'Reports', admin: 'Admin', settings: 'Settings', master: 'Master Admin',
  users: 'Users', export: 'Data Export',
};

// ─── Main Navbar ───────────────────────────────────────────────────────────────
function Navbar({ currentPage, currentSubPage, setCurrentPage, onLogout, session, userRole, viewingCompany, onSelectCompany, onExitCompany }) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('mechiq_sidebar_expanded') !== 'false'; } catch { return true; }
  });
  const [flyoutOpen, setFlyoutOpen] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const switcherRef = useRef(null);
  const isMaster = userRole?.role === 'master';
  const role = viewingCompany ? 'admin' : (userRole?.role || 'operator');
  const features = viewingCompany?.features || userRole?.company_features || {};

  useEffect(() => {
    if (!document.getElementById('navbar-css')) {
      const s = document.createElement('style'); s.id = 'navbar-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  const updateLayout = (exp, banner) => {
    const mc = document.querySelector('.main-content');
    if (mc) {
      const isMobile = window.innerWidth <= 1024;
      mc.style.marginLeft = isMobile ? '56px' : (exp ? '220px' : '56px');
      mc.style.marginTop = banner ? '90px' : '56px';
      mc.style.width = isMobile ? `calc(100vw - 56px)` : '';
      mc.style.maxWidth = isMobile ? `calc(100vw - 56px)` : '';
    }
  };

  // Re-run layout on window resize
  React.useEffect(() => {
    const onResize = () => updateLayout(expanded, hasBanner);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expanded, hasBanner]);

  useEffect(() => {
    try { localStorage.setItem('mechiq_sidebar_expanded', String(expanded)); } catch {}
    updateLayout(expanded, hasBanner);
  }, [expanded]);

  useEffect(() => { updateLayout(expanded, hasBanner); }, []);

  useEffect(() => { if (isMaster) fetchCompanies(); }, [isMaster]);

  useEffect(() => {
    const h = e => { if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name, status').eq('status', 'active').order('name');
    setCompanies(data || []);
  };

  const handleNav = (id, subPage) => { setCurrentPage(id, subPage); setFlyoutOpen(null); setMobileOpen(false); };

  const visibleItems = (() => {
    if (isMaster && !viewingCompany) {
      return [
        ...NAV_STRUCTURE.filter(i => i.id !== 'admin' && i.id !== 'settings'),
        { id: 'master', label: 'Master Admin', ik: 'master', roles: ['master'] },
      ];
    }
    return NAV_STRUCTURE
      .filter(item => item.roles.includes(role) && !(item.feature && features[item.feature] === false))
      .map(item => ({ ...item, children: item.children?.filter(c => c.roles.includes(role)) }));
  })();

  const displayName = userRole?.name || session?.user?.email?.split('@')[0] || 'User';
  const hasBanner = isMaster && viewingCompany;

  return (
    <>
      {hasBanner && (
        <div className="nav-viewing-banner">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.7 }}>Viewing as:</span>
            <strong>{viewingCompany.name}</strong>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>Admin</span>
          </span>
          <button
            onClick={onExitCompany}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '4px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11, fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            ✕ Exit View
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      <div className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* Sidebar */}
      <div className={`sidebar${expanded ? ' expanded' : ''}${hasBanner ? ' has-banner' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand" onClick={() => handleNav(isMaster && !viewingCompany ? 'master' : 'dashboard', null)}>
          {expanded ? (
            <><span className="brand-word brand-mech">MECH</span><span className="brand-word brand-iq">IQ</span></>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00ABE4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          )}
        </div>

        {/* Nav */}
        <div className="sidebar-nav">
          {visibleItems.map(item => (
            <SidebarItem
              key={item.id + item.ik}
              item={item}
              currentPage={currentPage}
              currentSubPage={currentSubPage}
              onNav={handleNav}
              expanded={expanded}
              flyoutOpen={flyoutOpen}
              setFlyoutOpen={setFlyoutOpen}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {expanded ? (
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,171,228,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {displayName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{displayName}</div>
                  <RoleBadge role={isMaster ? 'master' : (userRole?.role || 'operator')} />
                </div>
              </div>
              <a
                href="https://mechiq.coastlinemm.com.au/MechIQ.apk"
                download
                style={{ width: '100%', padding: '6px', background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: 'var(--accent)', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, textDecoration: 'none' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download App
              </a>
              <button
                onClick={onLogout}
                style={{ width: '100%', padding: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-faint)', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '6px 0' }}>
              <div title={displayName} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,171,228,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}>
                {displayName[0]?.toUpperCase()}
              </div>
              <a href="https://mechiq.coastlinemm.com.au/MechIQ.apk" download title="Download App" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s', textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
              <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
              >{IC.logout}</button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button className="sidebar-toggle" onClick={() => { setExpanded(e => !e); setFlyoutOpen(null); }} title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? IC.collapse : IC.expand}
        </button>
      </div>

      {/* Top bar */}
      <div className={`topbar${expanded ? ' sb-expanded' : ''}${hasBanner ? ' has-banner' : ''}`}>
        <button className="topbar-hamburger" onClick={() => setMobileOpen(o => !o)}>{IC.hamburger}</button>
        <div className="topbar-title">
          {(() => {
            if (currentSubPage) {
              const allSubs = NAV_STRUCTURE.flatMap(i => i.children || []);
              const match = allSubs.find(c => c.id === currentPage && c.subPage === currentSubPage);
              if (match) return match.label;
            }
            return PAGE_TITLES[currentPage] || currentPage;
          })()}
        </div>
        <div className="topbar-right">
          {isMaster && (
            <div ref={switcherRef} style={{ position: 'relative' }}>
              <button onClick={() => setSwitcherOpen(o => !o)} className="nav-pill nav-pill-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {viewingCompany ? '🏢' : '🔭'}
                {viewingCompany ? viewingCompany.name : 'View Company'}
                <span style={{ opacity: 0.7, fontSize: 9, display: 'inline-block', transition: 'transform 0.2s', transform: switcherOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {switcherOpen && (
                <div className="company-switcher-dropdown">
                  <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f6fc' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Active Companies</div>
                  </div>
                  {viewingCompany && (
                    <div className="company-switcher-item exit" onClick={() => { onExitCompany(); setSwitcherOpen(false); }}>← Exit Company View</div>
                  )}
                  {companies.length === 0
                    ? <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>No active companies</div>
                    : companies.map(c => (
                      <div key={c.id} className={`company-switcher-item${viewingCompany?.id === c.id ? ' active' : ''}`} onClick={() => { onSelectCompany(c); setSwitcherOpen(false); }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />{c.name}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
          {/* User info in topbar */}
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'4px 10px 4px 6px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface-2)', cursor:'default' }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,var(--accent),var(--accent-dark))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
              {(displayName||'?')[0].toUpperCase()}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', lineHeight:1.2 }}>{displayName}</span>
              {!isMaster && <RoleBadge role={userRole?.role || 'operator'} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
