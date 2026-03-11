import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes banner-in {
    from { opacity: 0; transform: translateY(-100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nav-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    background: #fff;
    border: 1px solid #dde8f2;
    border-radius: 12px;
    min-width: 200px;
    z-index: 2000;
    box-shadow: 0 12px 36px rgba(0,80,160,0.14), 0 2px 8px rgba(0,0,0,0.06);
    overflow: hidden;
    animation: dropdown-in 0.2s cubic-bezier(0.16,1,0.3,1);
  }
  .nav-dropdown-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #1a2b3c;
    cursor: pointer;
    border-bottom: 1px solid #f0f6fc;
    transition: background 0.12s, color 0.12s;
    white-space: nowrap;
    font-family: 'Inter', sans-serif;
  }
  .nav-dropdown-item:last-child { border-bottom: none; }
  .nav-dropdown-item:hover { background: #eef5fd; color: #00ABE4; }
  .nav-dropdown-item.active { background: #e0f4ff; color: #00ABE4; font-weight: 700; }
  .nav-dropdown-item .item-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor; opacity: 0.5; flex-shrink: 0;
  }

  /* Caret arrow under dropdown trigger */
  .nav-dropdown::before {
    content: '';
    position: absolute;
    top: -6px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 7px solid #dde8f2;
  }
  .nav-dropdown::after {
    content: '';
    position: absolute;
    top: -5px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 7px solid #fff;
  }

  .nav-pill {
    padding: 5px 14px;
    border-radius: 7px;
    border: none;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.15s;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
  }
  .nav-pill-primary { background: #00ABE4; color: #fff; box-shadow: 0 2px 8px rgba(0,171,228,0.28); }
  .nav-pill-primary:hover { background: #0096cc; box-shadow: 0 4px 12px rgba(0,171,228,0.38); transform: translateY(-1px); }
  .nav-pill-ghost { background: transparent; color: #7a92a8; border: 1.5px solid #dde8f2; }
  .nav-pill-ghost:hover { border-color: #00ABE4; color: #00ABE4; background: #eef5fd; }

  .company-switcher-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    background: #fff;
    border: 1px solid #dde8f2;
    border-radius: 12px;
    min-width: 220px;
    z-index: 2000;
    box-shadow: 0 12px 36px rgba(0,80,160,0.14);
    overflow: hidden;
    animation: dropdown-in 0.2s cubic-bezier(0.16,1,0.3,1);
  }
  .company-switcher-item {
    padding: 10px 16px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #1a2b3c;
    border-bottom: 1px solid #f0f6fc;
    transition: background 0.12s;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Inter', sans-serif;
  }
  .company-switcher-item:last-child { border-bottom: none; }
  .company-switcher-item:hover { background: #eef5fd; }
  .company-switcher-item.active { background: #e0f4ff; color: #00ABE4; font-weight: 700; }
  .company-switcher-item.exit { color: #dc2626; background: #fef2f2; font-weight: 700; }
  .company-switcher-item.exit:hover { background: #fee2e2; }

  .nav-viewing-banner {
    background: linear-gradient(90deg, #0070b8, #00ABE4);
    color: #fff;
    padding: 7px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
    animation: banner-in 0.25s ease;
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 300;
  }

  /* Underline indicator on active top-level items */
  .navbar nav ul li.active-indicator::after {
    content: '';
    position: absolute;
    bottom: -2px; left: 8px; right: 8px;
    height: 2px;
    background: #00ABE4;
    border-radius: 99px;
  }
  .navbar nav ul li { position: relative; }
`;

// ─── Nav structure ─────────────────────────────────────────────────────────────
const NAV_STRUCTURE = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '◈', roles: ['admin','supervisor','technician','operator'], feature: 'dashboard' },
  {
    id: 'assets', label: 'Assets', icon: '⚙', roles: ['admin','supervisor'], feature: 'assets',
    children: [
      { id: 'assets', subPage: 'units',        label: 'Units',        icon: '📋', roles: ['admin','supervisor'] },
      { id: 'assets', subPage: 'onboarding',   label: 'Onboarding',   icon: '➕', roles: ['admin','supervisor'] },
      { id: 'assets', subPage: 'depreciation', label: 'Depreciation', icon: '📉', roles: ['admin','supervisor'] },
      { id: 'assets', subPage: 'tracker',      label: 'Tracker',      icon: '📡', roles: ['admin','supervisor'] },
    ],
  },
  {
    id: 'maintenance', label: 'Maintenance', icon: '🔧', roles: ['admin','supervisor','technician'], feature: 'maintenance',
    children: [
      { id: 'maintenance', subPage: 'scheduled',   label: 'Scheduled Service', icon: '📅', roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'work_orders', label: 'Work Orders',       icon: '📝', roles: ['admin','supervisor','technician'] },
      { id: 'maintenance', subPage: 'pm_tasks',    label: 'PM Tasks',          icon: '✅', roles: ['admin','supervisor','technician'] },
    ],
  },
  {
    id: 'forms', label: 'Forms', icon: '📄', roles: ['admin','supervisor','technician','operator'], feature: 'prestart',
    children: [
      { id: 'forms', subPage: 'prestarts',      label: 'Prestarts',      icon: '🚦', roles: ['admin','supervisor','technician','operator'] },
      { id: 'forms', subPage: 'service-sheets', label: 'Service Sheets', icon: '🔩', roles: ['admin','supervisor','technician'] },
    ],
  },
  { id: 'scanner',      label: 'Scanner',      icon: '📷', roles: ['technician','operator'], feature: 'scanner' },
  { id: 'oil_sampling', label: 'Oil Sampling', icon: '🧪', roles: ['admin','supervisor'], feature: 'oil_sampling' },
  {
    id: 'reports', label: 'Reports', icon: '📊', roles: ['admin','supervisor'], feature: 'reports',
    children: [
      { id: 'reports', subPage: 'downtime-log',  label: 'Downtime Log',      icon: '📋', roles: ['admin','supervisor'] },
      { id: 'reports', subPage: 'downtime',      label: 'Downtime Analysis', icon: '📉', roles: ['admin','supervisor'] },
      { id: 'reports', subPage: 'availability',  label: 'Availability',      icon: '📈', roles: ['admin','supervisor'] },
    ],
  },
  {
    id: 'admin', label: 'Admin', icon: '🛠', roles: ['admin'], feature: null,
    children: [
      { id: 'forms',  subPage: null, label: 'Form Builder', icon: '🧩', roles: ['admin'] },
      { id: 'users',  subPage: null, label: 'Users',        icon: '👥', roles: ['admin'] },
      { id: 'export', subPage: null, label: 'Data Export',  icon: '💾', roles: ['admin'] },
    ],
  },
  {
    id: 'settings', label: 'Settings', icon: '⚙', roles: ['admin','supervisor'], feature: null,
    children: [
      { id: 'settings', subPage: 'company', label: 'Company Details', icon: '🏢', roles: ['admin','supervisor'] },
      { id: 'settings', subPage: 'format',  label: 'Format & Theme',  icon: '🎨', roles: ['admin','supervisor'] },
      { id: 'settings', subPage: 'notifs',  label: 'Notifications',   icon: '🔔', roles: ['admin','supervisor'] },
      { id: 'settings', subPage: 'users',   label: 'Users & Roles',   icon: '👥', roles: ['admin'] },
      { id: 'settings', subPage: 'billing', label: 'Billing & Plan',  icon: '💳', roles: ['admin'] },
      { id: 'settings', subPage: 'data',    label: 'Data & Export',   icon: '💾', roles: ['admin'] },
    ],
  },
];

// ─── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ item, currentPage, onNav, onClose }) {
  return (
    <div className="nav-dropdown">
      {item.children.map(child => {
        const isActive = currentPage === child.id && true;
        return (
          <div
            key={`${child.id}-${child.subPage}`}
            className={`nav-dropdown-item${isActive ? ' active' : ''}`}
            onClick={() => { onClose(); onNav(child.id, child.subPage); }}
          >
            
            {child.label}
          </div>
        );
      })}
    </div>
  );
}

// ─── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ item, currentPage, onNav, openId, setOpenId }) {
  const ref = useRef(null);
  const hasChildren = item.children?.length > 0;
  const isActive = currentPage === item.id || (hasChildren && item.children.some(c => c.id === currentPage));
  const isOpen = openId === item.id;

  useEffect(() => {
    const handler = e => { if (isOpen && ref.current && !ref.current.contains(e.target)) setOpenId(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (!hasChildren) {
    return (
      <li
        className={`${isActive ? 'active' : ''} ${isActive ? 'active-indicator' : ''}`}
        onClick={() => { setOpenId(null); onNav(item.id, null); }}
        style={item.id === 'master' ? { color: '#00ABE4' } : {}}
      >
        {item.label}
      </li>
    );
  }

  return (
    <li ref={ref} className={isActive ? 'active active-indicator' : ''} style={{ position: 'relative', userSelect: 'none' }}>
      <span
        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
        onClick={() => setOpenId(isOpen ? null : item.id)}
      >
        {item.label}
        <span style={{
          fontSize: '8px', opacity: 0.65, display: 'inline-block',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          marginTop: '1px',
        }}>▾</span>
      </span>
      {isOpen && (
        <Dropdown item={item} currentPage={currentPage} onNav={onNav} onClose={() => setOpenId(null)} />
      )}
    </li>
  );
}

// ─── Mobile nav item ───────────────────────────────────────────────────────────
function MobileNavItem({ item, currentPage, onNav }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children?.length > 0;
  const isActive = currentPage === item.id || (hasChildren && item.children.some(c => c.id === currentPage));

  if (!hasChildren) {
    return (
      <li className={isActive ? 'active' : ''} onClick={() => onNav(item.id, null)}>
        {item.label}
      </li>
    );
  }

  return (
    <>
      <li
        className={isActive ? 'active' : ''}
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{item.label}</span>
        <span style={{ fontSize: '10px', opacity: 0.5, transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
      </li>
      {expanded && item.children.map(child => (
        <li
          key={`${child.id}-${child.subPage}`}
          onClick={() => onNav(child.id, child.subPage)}
          style={{
            paddingLeft: '32px', fontSize: '13px',
            color: currentPage === child.id ? '#00ABE4' : '#3d5166',
            background: '#f5f9fd', borderLeft: '3px solid #e2ecf5',
          }}
        >
          {child.label}
        </li>
      ))}
    </>
  );
}

// ─── Role badge ────────────────────────────────────────────────────────────────
const ROLE_STYLE = {
  master:     { bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  admin:      { bg: '#e0f4ff', color: '#00ABE4', border: '#7dd3fc' },
  supervisor: { bg: '#fef3c7', color: '#d97706', border: '#fcd34d' },
  technician: { bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
  operator:   { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
};
function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.operator;
  return (
    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {role}
    </span>
  );
}

// ─── Main Navbar ───────────────────────────────────────────────────────────────
function Navbar({ currentPage, setCurrentPage, onLogout, session, userRole, viewingCompany, onSelectCompany, onExitCompany }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openNavId, setOpenNavId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);
  const isMaster = userRole?.role === 'master';
  const role = viewingCompany ? 'admin' : (userRole?.role || 'operator');
  const features = viewingCompany?.features || userRole?.company_features || {};

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById('navbar-css')) {
      const s = document.createElement('style'); s.id = 'navbar-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => { if (isMaster) fetchCompanies(); }, [isMaster]);

  useEffect(() => {
    const handler = e => { if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name, status').eq('status', 'active').order('name');
    setCompanies(data || []);
  };

  const handleNav = (id, subPage) => {
    setCurrentPage(id, subPage);
    setMenuOpen(false);
    setOpenNavId(null);
  };

  const visibleItems = (() => {
    if (isMaster && !viewingCompany) {
      return [
        ...NAV_STRUCTURE.filter(i => i.id !== 'admin' && i.id !== 'settings'),
        { id: 'master', label: 'Master Admin', icon: '🛡️', roles: ['master'] },
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
      {/* Viewing-as banner */}
      {hasBanner && (
        <div className="nav-viewing-banner" style={{ top: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ opacity: 0.7 }}>Viewing as:</span>
            <strong>{viewingCompany.name}</strong>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 8px', borderRadius: '10px', fontSize: '11px' }}>Admin</span>
          </span>
          <button
            onClick={onExitCompany}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '4px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px', transition: 'background 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            ✕ Exit View
          </button>
        </div>
      )}

      <div className="navbar" style={hasBanner ? { top: '34px' } : {}}>

        {/* Brand */}
        <div
          onClick={() => handleNav(isMaster && !viewingCompany ? 'master' : 'dashboard', null)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1px', userSelect: 'none', flexShrink: 0 }}
        >
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '28px', fontWeight: 900, color: '#1a2b3c', letterSpacing: '2px', textTransform: 'uppercase', lineHeight: 1 }}>MECH</span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '28px', fontWeight: 900, color: '#00ABE4', letterSpacing: '2px', textTransform: 'uppercase', lineHeight: 1 }}>IQ</span>
        </div>

        {/* Hamburger */}
        <button
          className="hamburger"
          onClick={() => { setMenuOpen(m => !m); setOpenNavId(null); }}
          aria-label="Toggle menu"
        >
          {menuOpen
            ? <span style={{ fontSize: '18px', fontWeight: 300, lineHeight: 1 }}>✕</span>
            : <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[0,1,2].map(i => <span key={i} style={{ width: '20px', height: '2px', background: '#3d5166', borderRadius: '99px', display: 'block' }} />)}
              </span>
          }
        </button>

        {/* Nav */}
        <nav className={menuOpen ? 'nav-open' : ''}>
          <ul>
            {visibleItems.map(item =>
              menuOpen
                ? <MobileNavItem key={item.id} item={item} currentPage={currentPage} onNav={handleNav} />
                : <NavItem key={item.id} item={item} currentPage={currentPage} onNav={handleNav} openId={openNavId} setOpenId={setOpenNavId} />
            )}
          </ul>

          {/* Right-side user area */}
          <div className="navbar-user">

            {/* Master company switcher */}
            {isMaster && (
              <div ref={switcherRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setSwitcherOpen(o => !o)}
                  className="nav-pill nav-pill-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
                >
                  <span>{viewingCompany ? '🏢' : '🔭'}</span>
                  {viewingCompany ? viewingCompany.name : 'View Company'}
                  <span style={{ opacity: 0.7, fontSize: '9px', transition: 'transform 0.2s', display: 'inline-block', transform: switcherOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                </button>

                {switcherOpen && (
                  <div className="company-switcher-dropdown">
                    <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid #f0f6fc' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#7a92a8', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Active Companies</div>
                    </div>
                    {viewingCompany && (
                      <div className="company-switcher-item exit" onClick={() => { onExitCompany(); setSwitcherOpen(false); }}>
                        ← Exit Company View
                      </div>
                    )}
                    {companies.length === 0
                      ? <div style={{ padding: '14px 16px', color: '#7a92a8', fontSize: '12px' }}>No active companies</div>
                      : companies.map(c => (
                        <div
                          key={c.id}
                          className={`company-switcher-item${viewingCompany?.id === c.id ? ' active' : ''}`}
                          onClick={() => { onSelectCompany(c); setSwitcherOpen(false); setMenuOpen(false); }}
                        >
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                          {c.name}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            {/* User info */}
            <span style={{ fontSize: '12px', color: '#7a92a8', fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <RoleBadge role={isMaster ? 'master' : (userRole?.role || 'operator')} />
            <button className="nav-pill nav-pill-ghost" onClick={onLogout} style={{ fontSize: '10px', padding: '5px 12px' }}>
              Logout
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

export default Navbar;
