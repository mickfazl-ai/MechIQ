import React, { useState } from 'react';

function Navbar({ currentPage, setCurrentPage, onLogout, session, userRole }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', roles: ['admin', 'supervisor', 'technician'] },
    { id: 'assets', label: 'Assets', roles: ['admin', 'supervisor', 'technician'] },
    { id: 'downtime', label: 'Downtime', roles: ['admin', 'supervisor', 'technician'] },
    { id: 'maintenance', label: 'Maintenance', roles: ['admin', 'supervisor', 'technician'] },
    { id: 'prestart', label: 'Prestarts', roles: ['admin', 'supervisor', 'technician'] },
    { id: 'reports', label: 'Reports', roles: ['admin', 'supervisor'] },
    { id: 'users', label: 'Users', roles: ['admin'] },
  ];

  const handleNav = (id) => {
    setCurrentPage(id);
    setMenuOpen(false);
  };

  const visibleItems = menuItems.filter(item =>
    item.roles.includes(userRole?.role || 'technician')
  );

  return (
    <div className="navbar">
      <div className="navbar-brand">
        <span className="brand-white">MAINTAIN</span><span className="brand-cyan">IQ</span>
      </div>

      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✕' : '☰'}
      </button>

      <nav className={menuOpen ? 'nav-open' : ''}>
        <ul>
          {visibleItems.map(item => (
            <li
              key={item.id}
              className={currentPage === item.id ? 'active' : ''}
              onClick={() => handleNav(item.id)}
            >
              {item.label}
            </li>
          ))}
        </ul>
        <div className="navbar-user">
          <span className="logged-in-as">{userRole?.name || session?.user?.email}</span>
          <span className="role-badge">{userRole?.role || 'technician'}</span>
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </nav>
    </div>
  );
}

export default Navbar;