import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

function Navbar({ currentPage, setCurrentPage, onLogout, session, userRole, viewingCompany, onSelectCompany, onExitCompany }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const features = viewingCompany?.features || userRole?.company_features || {};
  const isMaster = userRole?.role === 'master';

  useEffect(() => {
    if (isMaster) fetchCompanies();
  }, [isMaster]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name, status').eq('status', 'active').order('name');
    setCompanies(data || []);
  };

  const menuItems = [
    { id: 'dashboard',   label: 'Dashboard',   roles: ['admin','supervisor','technician','operator'], feature: 'dashboard' },
    { id: 'assets',      label: 'Assets',       roles: ['admin','supervisor'],                         feature: 'assets' },
    { id: 'downtime',    label: 'Downtime',     roles: ['admin','supervisor','technician'],             feature: 'downtime' },
    { id: 'maintenance', label: 'Maintenance',  roles: ['admin','supervisor','technician'],             feature: 'maintenance' },
    { id: 'prestart',    label: 'Prestarts',    roles: ['admin','supervisor','technician','operator'],  feature: 'prestart' },
    { id: 'scanner',     label: '📷 Scanner',   roles: ['technician','operator'],                       feature: 'scanner' },
    { id: 'reports',     label: 'Reports',      roles: ['admin','supervisor'],                          feature: 'reports' },
    { id: 'users',       label: 'Users',        roles: ['admin'],                                       feature: 'users' },
  ];

  const handleNav = (id) => { setCurrentPage(id); setMenuOpen(false); };

  const visibleItems = isMaster && !viewingCompany
    ? [...menuItems, { id: 'master', label: '⚙️ Master Admin', roles: ['master'] }]
    : menuItems.filter(item =>
        item.roles.includes(viewingCompany ? 'admin' : (userRole?.role || 'operator')) &&
        (features[item.feature] !== false)
      );

  return (
    <>
      {isMaster && viewingCompany && (
        <div style={{
          backgroundColor: '#ff6b00', color: '#000', padding: '6px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '13px', fontWeight: 700
        }}>
          <span>👁️ Viewing as: <strong>{viewingCompany.name}</strong> (Admin)</span>
          <button onClick={onExitCompany} style={{
            backgroundColor: '#000', color: '#ff6b00', border: 'none',
            padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '12px'
          }}>✕ Exit Company View</button>
        </div>
      )}

      <div className="navbar">
        <div className="navbar-brand" onClick={() => handleNav(isMaster && !viewingCompany ? 'master' : 'dashboard')} style={{ cursor: 'pointer' }}>
          <span className="brand-white">MECH</span><span className="brand-cyan"> IQ</span>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
        <nav className={menuOpen ? 'nav-open' : ''}>
          <ul>
            {visibleItems.map(item => (
              <li key={item.id} className={currentPage === item.id ? 'active' : ''} onClick={() => handleNav(item.id)}
                style={item.id === 'master' ? { color: '#ff6b00' } : {}}>
                {item.label}
              </li>
            ))}
          </ul>
          <div className="navbar-user">
            {isMaster && (
              <div ref={dropdownRef} style={{ position: 'relative', marginRight: '12px' }}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                  backgroundColor: '#1a2f2f', color: '#00c2e0', border: '1px solid #00c2e0',
                  padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  🏢 {viewingCompany ? viewingCompany.name : 'View Company'} ▾
                </button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: '110%', backgroundColor: '#0d1515',
                    border: '1px solid #1a3a3a', borderRadius: '8px', minWidth: '200px',
                    zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden'
                  }}>
                    {viewingCompany && (
                      <div onClick={() => { onExitCompany(); setDropdownOpen(false); }}
                        style={{ padding: '10px 14px', color: '#ff6b00', fontSize: '12px', fontWeight: 700, cursor: 'pointer', borderBottom: '1px solid #1a2f2f', backgroundColor: '#1a0a00' }}>
                        ✕ Exit Company View
                      </div>
                    )}
                    {companies.length === 0
                      ? <div style={{ padding: '12px 14px', color: '#a0b0b0', fontSize: '12px' }}>No active companies</div>
                      : companies.map(c => (
                        <div key={c.id}
                          onClick={() => { onSelectCompany(c); setDropdownOpen(false); setMenuOpen(false); }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                            color: viewingCompany?.id === c.id ? '#00c2e0' : '#fff',
                            backgroundColor: viewingCompany?.id === c.id ? '#0a2a2a' : 'transparent',
                            borderBottom: '1px solid #1a2f2f'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0a2a2a'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = viewingCompany?.id === c.id ? '#0a2a2a' : 'transparent'}
                        >
                          {c.name}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
            <span className="logged-in-as">{userRole?.name || session?.user?.email}</span>
            <span className="role-badge" style={{ backgroundColor: isMaster ? '#ff6b00' : undefined }}>
              {isMaster ? 'master' : (userRole?.role || 'operator')}
            </span>
            <button className="btn-logout" onClick={onLogout}>Logout</button>
          </div>
        </nav>
      </div>
    </>
  );
}

export default Navbar;
