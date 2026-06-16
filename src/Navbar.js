import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// ─── Role styles ───────────────────────────────────────────────────────────────
const ROLE_STYLE = {
  master:     { bg: '#1e1b4b', color: '#a5b4fc', border: '#4338ca' },
  admin:      { bg: '#EBF3FC', color: '#1976D2', border: '#BFDBFE' },
  supervisor: { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
  technician: { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' },
  operator:   { bg: '#F9FAFB', color: '#4B5563', border: '#D1D5DB' },
};

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const IC = {
  dashboard:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  assets:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>,
  maintenance:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  forms:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  scanner:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 7 23 1 17 1"/><line x1="16" y1="8" x2="23" y2="1"/><polyline points="1 17 1 23 7 23"/><line x1="8" y1="16" x2="1" y2="23"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  chat:         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  parts:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  oil_sampling: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  reports:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  admin:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  master:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  chevron:      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  collapse:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>,
  expand:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>,
  hamburger:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  logout:       <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  download:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  truck:        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  cutter:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><line x1="12" y1="5" x2="12" y2="2.5"/><line x1="12" y1="19" x2="12" y2="21.5"/><path d="M3.2 9.5h2.2M18.6 9.5h2.2M3.2 14.5h2.2M18.6 14.5h2.2"/></svg>,
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
    ]
  },
  { id: 'maintenance',  label: 'Maintenance',  ik: 'maintenance',  roles: ['admin','supervisor','technician'], feature: 'maintenance',
    children: [
      { id: 'maintenance', subPage: 'scheduled',   label: 'Planned Maintenance', roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'work_orders', label: 'Work Orders',         roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'schedules',   label: 'Service Schedules',   roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'calendar',    label: 'Calendar',            roles: ['admin','supervisor','technician'] },
    ]
  },
  { id: 'forms',        label: 'Forms',        ik: 'forms',        roles: ['admin','supervisor','technician','operator'], feature: 'prestart',
    children: [
      { id: 'forms', subPage: 'prestarts',      label: 'Prestarts',      roles: ['admin','supervisor','technician','operator'] },
      { id: 'forms', subPage: 'service-sheets', label: 'Service Sheets', roles: ['admin','supervisor','technician'] },
    ]
  },
  { id: 'scanner',      label: 'Scanner',      ik: 'scanner',      roles: ['technician','operator'], feature: 'scanner' },
  { id: 'chat',         label: 'Messages',     ik: 'chat',         roles: ['admin','supervisor','technician','operator'], feature: null },
  { id: 'parts',        label: 'Parts',        ik: 'parts',        roles: ['admin','supervisor','technician'], feature: null },
  { id: 'oil_sampling', label: 'Oil Sampling', ik: 'oil_sampling', roles: ['admin','supervisor'], feature: 'oil_sampling' },
  { id: 'cutter_tracker', label: 'Cutter Tracker', ik: 'cutter', roles: ['admin','supervisor'], feature: null },
  { id: 'deliveries', label: 'Deliveries', ik: 'truck', roles: ['admin','supervisor','technician'], feature: null },
  { id: 'reports',      label: 'Reports',      ik: 'reports',      roles: ['admin','supervisor'], feature: 'reports',
    children: [
      { id: 'reports', subPage: 'downtime-log',  label: 'Downtime Log',      roles: ['admin','supervisor'] },
      { id: 'reports', subPage: 'downtime',      label: 'Downtime Analysis', roles: ['admin','supervisor'] },
      { id: 'reports', subPage: 'availability',  label: 'Availability',      roles: ['admin','supervisor'] },
    ]
  },
  { id: 'admin',        label: 'Admin',        ik: 'admin',        roles: ['admin'], feature: null,
    children: [
      { id: 'admin', subPage: 'company',         label: 'Company Details', roles: ['admin'] },
      { id: 'admin', subPage: 'users',           label: 'Users & Roles',   roles: ['admin'] },
      { id: 'admin', subPage: 'notifs',          label: 'Notifications',   roles: ['admin'] },
      { id: 'admin', subPage: 'billing',         label: 'Billing & Plan',  roles: ['admin'] },
      { id: 'admin', subPage: 'data',            label: 'Data & Export',   roles: ['admin'] },
      { id: 'admin', subPage: 'assets_settings', label: 'Assets',          roles: ['admin'] },
      { id: 'forms', subPage: null,              label: 'Form Builder',    roles: ['admin'] },
    ]
  },
  { id: 'settings',     label: 'Settings',     ik: 'settings',     roles: ['admin','supervisor'], feature: null,
    children: [
      { id: 'settings', subPage: 'general',   label: 'Format & Theme',  roles: ['admin','supervisor'] },
      { id: 'settings', subPage: 'datetime',  label: 'Date & Time',     roles: ['admin'] },
      { id: 'settings', subPage: 'onedrive',  label: 'OneDrive Sync',   roles: ['admin'] },
      { id: 'settings', subPage: 'integrations', label: 'Integrations', roles: ['admin'] },
    ]
  },
];

const PAGE_TITLES = {
  dashboard: 'Dashboard', assets: 'Assets', maintenance: 'Maintenance',
  forms: 'Forms', scanner: 'Scanner', oil_sampling: 'Oil Sampling',
  reports: 'Reports', admin: 'Admin', settings: 'Settings', master: 'Master Admin',
  users: 'Users', export: 'Data Export', chat: 'Messages', parts: 'Parts',
};

// ─── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.operator;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
      className="text-xs font-bold px-2 py-0.5 uppercase tracking-wide">
      {role}
    </span>
  );
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
    <div ref={ref} className="relative">
      {/* Main item */}
      <div
        onClick={handleClick}
        className={[
          'flex items-center gap-2.5 px-3 py-2.5 mx-2 cursor-pointer transition-colors duration-150 text-sm font-medium select-none',
          isActive
            ? 'text-blue-400 bg-blue-500/10'
            : 'text-slate-300 hover:text-white hover:bg-white/6 font-light',
        ].join(' ')}
      >
        {/* Active indicator */}
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400" />}

        {/* Icon */}
        <span className="flex-shrink-0 flex items-center justify-center w-5">
          {IC[item.ik] || IC.settings}
        </span>

        {/* Label */}
        {expanded && (
          <span className="flex-1 truncate">{item.label}</span>
        )}

        {/* Caret */}
        {hasChildren && expanded && (
          <span className={`flex-shrink-0 transition-transform duration-200 ${inlineOpen ? 'rotate-180' : ''}`}>
            {IC.chevron}
          </span>
        )}

        {/* Tooltip (collapsed only) */}
        {!expanded && (
          <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-gray-100 text-xs font-semibold px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 shadow-lg sidebar-tooltip">
            {item.label}
          </span>
        )}
      </div>

      {/* Inline sub-items (expanded) */}
      {hasChildren && expanded && (
        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: inlineOpen ? `${item.children.length * 34}px` : '0' }}
        >
          {item.children.map(c => (
            <div
              key={`${c.id}-${c.subPage}`}
              onClick={() => onNav(c.id, c.subPage)}
              className={[
                'flex items-center gap-2 pl-10 pr-3 py-2 mx-2 cursor-pointer text-xs font-medium transition-colors duration-150',
                currentPage === c.id && currentSubPage === c.subPage
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              <span className="w-1 h-1 rounded-full bg-current opacity-60 flex-shrink-0" />
              {c.label}
            </div>
          ))}
        </div>
      )}

      {/* Flyout (collapsed) */}
      {hasChildren && !expanded && isFlyout && (
        <div className="absolute left-full top-0 ml-1.5 bg-white border border-gray-200 min-w-48 z-50 shadow-xl">
          <div className="px-3.5 py-2.5 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest">
            {item.label}
          </div>
          {item.children.map(c => (
            <div
              key={`${c.id}-${c.subPage}`}
              onClick={() => { onNav(c.id, c.subPage); setFlyoutOpen(null); }}
              className={[
                'flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium cursor-pointer border-b border-gray-50 last:border-0 transition-colors',
                currentPage === c.id && currentSubPage === c.subPage
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 flex-shrink-0" />
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Navbar ───────────────────────────────────────────────────────────────
function Navbar({ currentPage, currentSubPage, setCurrentPage, onLogout, session, userRole, viewingCompany, onSelectCompany, onExitCompany }) {
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('mechiq_sidebar_expanded') !== 'false'; } catch { return true; }
  });
  const [flyoutOpen, setFlyoutOpen] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const switcherRef = useRef(null);
  const isMaster = userRole?.role === 'master';
  const role = viewingCompany ? 'admin' : (userRole?.role || 'operator');
  const features = viewingCompany?.features || userRole?.company_features || {};

  const updateLayout = (exp, banner) => {
    const mc = document.querySelector('.main-content');
    if (mc) {
      const isMobile = window.innerWidth <= 1024;
      mc.style.marginLeft = isMobile ? '56px' : (exp ? '220px' : '56px');
      mc.style.marginTop = banner ? '90px' : '56px';
    }
  };

  useEffect(() => {
    try { localStorage.setItem('mechiq_sidebar_expanded', String(expanded)); } catch {}
    updateLayout(expanded, hasBanner);
  }, [expanded]);

  useEffect(() => { updateLayout(expanded, hasBanner); }, []);
  useEffect(() => { if (isMaster) fetchCompanies(); }, [isMaster]);

  useEffect(() => {
    const cid = viewingCompany?.id || userRole?.company_id;
    if (!cid || isMaster) { setCompanyLogo(null); setCompanyName(''); return; }
    supabase.from('companies').select('name, logo_url').eq('id', cid).single().then(({ data }) => {
      if (data) { setCompanyName(data.name || ''); setCompanyLogo(data.logo_url || null); }
    });
  }, [userRole?.company_id, viewingCompany?.id, isMaster]);

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
        { id: 'master', label: 'Master Admin', ik: 'master', roles: ['master'],
          children: [
            { id: 'master', subPage: 'companies', label: 'Companies',    roles: ['master'] },
            { id: 'master', subPage: 'register',  label: 'New Company',  roles: ['master'] },
            { id: 'master', subPage: 'requests',  label: 'App Requests', roles: ['master'] },
          ]
        },
      ];
    }
    return NAV_STRUCTURE
      .filter(item => item.roles.includes(role) && !(item.feature && features[item.feature] === false))
      .map(item => ({ ...item, children: item.children?.filter(c => c.roles.includes(role)) }));
  })();

  const displayName = userRole?.name || session?.user?.email?.split('@')[0] || 'User';
  const hasBanner = isMaster && viewingCompany;

  useEffect(() => {
    const onResize = () => updateLayout(expanded, hasBanner);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expanded, hasBanner]);

  useEffect(() => {
    const onNav = (e) => { if (e.detail?.page) handleNav(e.detail.page, e.detail.subPage || null); };
    window.addEventListener('mechiq-navigate', onNav);
    return () => window.removeEventListener('mechiq-navigate', onNav);
  }, []);

  return (
    <>
      {/* Admin viewing banner */}
      {hasBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary-DEFAULT flex items-center justify-between px-5 py-2 text-white text-xs font-semibold">
          <span className="flex items-center gap-2">
            <span className="opacity-70">Viewing as:</span>
            <strong>{viewingCompany.name}</strong>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">Admin</span>
          </span>
          <button
            onClick={onExitCompany}
            className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-3.5 py-1 text-xs font-bold transition-colors"
          >
            ✕ Exit View
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={[
        'fixed left-0 top-0 bottom-0 flex flex-col z-30 bg-sidebar border-r border-gray-700/50 transition-all duration-200 ease-out',
        expanded ? 'w-56' : 'w-14',
        hasBanner ? 'top-9' : 'top-0',
        mobileOpen ? 'translate-x-0' : '',
        'max-lg:w-56 max-lg:-translate-x-full max-lg:transition-transform',
      ].join(' ')}>

        {/* Brand */}
        <div
          onClick={() => handleNav(isMaster && !viewingCompany ? 'master' : 'dashboard', null)}
          className="flex items-center gap-3 px-4 h-14 border-b border-gray-700/50 cursor-pointer flex-shrink-0 overflow-hidden"
        >
          <div className="w-7 h-7 bg-primary-DEFAULT flex items-center justify-center text-white text-xs font-black flex-shrink-0">
            M
          </div>
          {expanded && (
            <span className="text-white font-black text-base tracking-tight whitespace-nowrap">
              MECH<span className="text-blue-400">IQ</span>
            </span>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-visible py-2 scrollbar-hide group">
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
        <div className="border-t border-gray-700/50 flex-shrink-0">
          {expanded ? (
            <div className="p-3 flex flex-col gap-2">
              {/* User info */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-black flex-shrink-0">
                  {displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-200 truncate">{displayName}</div>
                  <RoleBadge role={isMaster ? 'master' : (userRole?.role || 'operator')} />
                </div>
              </div>
              {/* Download app */}
              <a
                href="https://mechiq.coastlinemm.com.au/MechIQ.apk"
                download
                className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wide hover:bg-blue-500/20 transition-colors no-underline"
              >
                {IC.download} Download App
              </a>
              {/* Logout */}
              <button
                onClick={onLogout}
                className="w-full py-1.5 bg-white/5 border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-400/30 text-xs font-bold uppercase tracking-wide transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <div title={displayName} className="w-7 h-7 bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-black">
                {displayName[0]?.toUpperCase()}
              </div>
              <a
                href="https://mechiq.coastlinemm.com.au/MechIQ.apk"
                download
                title="Download App"
                className="flex items-center justify-center w-9 h-8 text-gray-500 hover:text-blue-400 transition-colors no-underline"
              >
                {IC.download}
              </a>
              <button
                onClick={onLogout}
                title="Logout"
                className="flex items-center justify-center w-9 h-8 text-gray-500 hover:text-red-400 transition-colors"
              >
                {IC.logout}
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => { setExpanded(e => !e); setFlyoutOpen(null); }}
          title={expanded ? 'Collapse' : 'Expand'}
          className="flex items-center justify-center h-8 w-full border-t border-gray-700/50 text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
        >
          {expanded ? IC.collapse : IC.expand}
        </button>
      </div>

      {/* Top bar */}
      <div className={[
        'fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-3 z-20 transition-all duration-200',
        expanded ? 'left-56' : 'left-14',
        hasBanner ? 'top-9' : 'top-0',
        'max-lg:left-0',
      ].join(' ')}>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex items-center justify-center text-gray-500 hover:text-gray-700 p-1"
          onClick={() => setMobileOpen(o => !o)}
        >
          {IC.hamburger}
        </button>

        {/* Page title */}
        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          {(() => {
            if (currentSubPage) {
              const allSubs = NAV_STRUCTURE.flatMap(i => i.children || []);
              const match = allSubs.find(c => c.id === currentPage && c.subPage === currentSubPage);
              if (match) return match.label;
            }
            return PAGE_TITLES[currentPage] || currentPage;
          })()}
        </div>

        {/* Company logo / name */}
        {companyLogo ? (
          <div className="flex-1 flex justify-center items-center px-4">
            <img src={companyLogo} alt={companyName} className="max-h-9 max-w-44 object-contain block" />
          </div>
        ) : companyName ? (
          <div className="flex-1 flex justify-center">
            <span className="text-sm font-bold text-gray-500 tracking-wide">{companyName}</span>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right side */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Master company switcher */}
          {isMaster && (
            <div ref={switcherRef} className="relative">
              <button
                onClick={() => setSwitcherOpen(o => !o)}
                className="flex items-center gap-1.5 bg-primary-DEFAULT text-white text-xs font-semibold px-3 py-1.5 hover:bg-primary-dark transition-colors"
              >
                {viewingCompany ? '🏢' : '🔭'}
                {viewingCompany ? viewingCompany.name : 'View Company'}
                <span className={`opacity-70 text-xs transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {switcherOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 min-w-52 z-50 shadow-xl">
                  <div className="px-4 py-2.5 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Active Companies
                  </div>
                  {viewingCompany && (
                    <div
                      onClick={() => { onExitCompany(); setSwitcherOpen(false); }}
                      className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer border-b border-gray-50"
                    >
                      ← Exit Company View
                    </div>
                  )}
                  {companies.length === 0
                    ? <div className="px-4 py-3.5 text-sm text-gray-400">No active companies</div>
                    : companies.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { onSelectCompany(c); setSwitcherOpen(false); }}
                        className={[
                          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer border-b border-gray-50 last:border-0 transition-colors',
                          viewingCompany?.id === c.id
                            ? 'bg-blue-50 text-blue-600 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        {c.name}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}

          {/* User chip */}
          <div className="flex items-center gap-2 pl-1.5 pr-3 py-1 border border-gray-200 bg-gray-50">
            <div className="w-7 h-7 bg-primary-DEFAULT flex items-center justify-center text-white text-xs font-black flex-shrink-0">
              {(displayName || '?')[0].toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-gray-900 leading-none">{displayName}</span>
              {!isMaster && <RoleBadge role={userRole?.role || 'operator'} />}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip CSS — needed for collapsed sidebar tooltips */}
      <style>{`
        .group:hover .sidebar-tooltip { opacity: 1 !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .no-underline { text-decoration: none; }
        @media (max-width: 1024px) {
          .sidebar { transform: translateX(-100%); }
          .sidebar.mobile-open { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export default Navbar;
