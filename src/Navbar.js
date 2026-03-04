import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

function Navbar({ currentPage, setCurrentPage, onLogout, session, userRole, viewingCompany, onSelectCompany, onExitCompany }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const features = viewingCompany?.features || userRole?.company_features || {};
  const isMaster = userRole?.role === 'master';

  useEffect(() => { if (isMaster) fetchCompanies(); }, [isMaster]);

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
    { id: 'maintenance', label: 'Maintenance',  roles: ['admin','supervisor','technician'],             feature: 'maintenance' },
    { id: 'forms',       label: 'Forms',        roles: ['admin','supervisor','technician','operator'],  feature: 'prestart' },
    { id: 'scanner',     label: 'Scanner',      roles: ['technician','operator'],                       feature: 'scanner' },
    { id: 'reports',     label: 'Reports',      roles: ['admin','supervisor'],                          feature: 'reports' },
    { id: 'users',       label: 'Users',        roles: ['admin'],                                       feature: 'users' },
  ];

  const handleNav = (id) => { setCurrentPage(id); setMenuOpen(false); };

  const visibleItems = isMaster && !viewingCompany
    ? [...menuItems, { id: 'master', label: 'Master Admin', roles: ['master'] }]
    : menuItems.filter(item =>
        item.roles.includes(viewingCompany ? 'admin' : (userRole?.role || 'operator')) &&
        (features[item.feature] !== false)
      );

  return (
    <>
      {isMaster && viewingCompany && (
        <div style={{
          backgroundColor: '#0077cc', color: '#fff', padding: '6px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '13px', fontWeight: 700
        }}>
          <span>Viewing as: <strong>{viewingCompany.name}</strong> (Admin)</span>
          <button onClick={onExitCompany} style={{
            backgroundColor: '#fff', color: '#0077cc', border: 'none',
            padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '12px'
          }}>Exit Company View</button>
        </div>
      )}

      <div className="navbar">
        <div
          className="navbar-brand"
          onClick={() => handleNav(isMaster && !viewingCompany ? 'master' : 'dashboard')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '34px',
            fontWeight: 800,
            letterSpacing: '2px',
            color: '#ffffff',
            WebkitTextStroke: '1.5px #000000',
            textTransform: 'uppercase',
          }}>MECH</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '34px',
            fontWeight: 800,
            letterSpacing: '2px',
            color: '#00ABE4',
            WebkitTextStroke: '1.5px #000000',
            textTransform: 'uppercase',
            marginLeft: '8px',
          }}>IQ</span>
        </div>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? 'X' : '='}
        </button>

        <nav className={menuOpen ? 'nav-open' : ''}>
          <ul>
            {visibleItems.map(item => (
              <li key={item.id} className={currentPage === item.id ? 'active' : ''} onClick={() => handleNav(item.id)}
                style={item.id === 'master' ? { color: '#00ABE4', fontWeight: 700 } : {}}>
                {item.label}
              </li>
            ))}
          </ul>
          <div className="navbar-user">
            {isMaster && (
              <div ref={dropdownRef} style={{ position: 'relative', marginRight: '12px' }}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{
                  backgroundColor: '#00ABE4', color: '#fff', border: '1px solid #0088b8',
                  padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                  fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {viewingCompany ? viewingCompany.name : 'View Company'} ▾
                </button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: '110%', backgroundColor: '#ffffff',
                    border: '1px solid #d6e6f2', borderRadius: '8px', minWidth: '200px',
                    zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden'
                  }}>
                    {viewingCompany && (
                      <div onClick={() => { onExitCompany(); setDropdownOpen(false); }}
                        style={{ padding: '10px 14px', color: '#0077cc', fontSize: '12px', fontWeight: 700, cursor: 'pointer', borderBottom: '1px solid #E9F1FA', backgroundColor: '#E9F1FA' }}>
                        Exit Company View
                      </div>
                    )}
                    {companies.length === 0
                      ? <div style={{ padding: '12px 14px', color: '#7a92a8', fontSize: '12px' }}>No active companies</div>
                      : companies.map(c => (
                        <div key={c.id}
                          onClick={() => { onSelectCompany(c); setDropdownOpen(false); setMenuOpen(false); }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                            color: viewingCompany?.id === c.id ? '#00ABE4' : '#1a2b3c',
                            backgroundColor: viewingCompany?.id === c.id ? '#E9F1FA' : 'transparent',
                            borderBottom: '1px solid #E9F1FA'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E9F1FA'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = viewingCompany?.id === c.id ? '#E9F1FA' : 'transparent'}
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
            <span style={{
              backgroundColor: isMaster ? '#00ABE4' : '#E9F1FA',
              color: isMaster ? '#fff' : '#1a2b3c',
              border: '1px solid #00ABE4',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600,
            }}>
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
