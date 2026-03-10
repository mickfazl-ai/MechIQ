import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import Assets from './Assets';
import Downtime from './Downtime';
import Maintenance from './Maintenance';
import Reports from './Reports';
import Users from './Users';
import Login from './Login';
import Register from './Register';
import Forms from './Forms';
import Scanner from './Scanner';
import AssetPage from './MachineProfile';
import MasterAdmin from './MasterAdmin';
import { supabase } from './supabase';
import OilSampling from './OilSampling';
import Settings from './Settings';

function App() {
  const [currentPage, setCurrentPageRaw] = useState('dashboard');
  const [currentSubPage, setCurrentSubPage] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState('login');
  const [viewingAssetId, setViewingAssetId] = useState(null);
  const [prestartAssetId, setPrestartAssetId] = useState(null);
  const [prestartAsset, setPrestartAsset] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);

  // Navbar calls setCurrentPage(pageId, subPage)
  // Components that have internal tabs receive initialTab prop
  const setCurrentPage = (page, subPage = null) => {
    setCurrentPageRaw(page);
    // Always update subPage — even if navigating to same page with different sub
    // Use functional update + tiny delay to force useEffect to fire in child
    setCurrentSubPage(null);
    setTimeout(() => setCurrentSubPage(subPage), 0);
  };

  // Apply saved theme on every load
  useEffect(() => {
    const savedTheme = localStorage.getItem('mechiq_theme') || 'default';
    const THEME_MAP = {
      default: { primary: '#00ABE4', primaryDark: '#0088b8', bg: '#E9F1FA', dark: '#1a2b3c', textMid: '#3d5166', textMuted: '#7a92a8', border: '#d6e6f2' },
      slate:   { primary: '#475569', primaryDark: '#334155', bg: '#f1f5f9', dark: '#0f172a', textMid: '#334155', textMuted: '#64748b', border: '#cbd5e1' },
      green:   { primary: '#16a34a', primaryDark: '#15803d', bg: '#f0fdf4', dark: '#14532d', textMid: '#166534', textMuted: '#4ade80', border: '#bbf7d0' },
      orange:  { primary: '#d97706', primaryDark: '#b45309', bg: '#fffbeb', dark: '#78350f', textMid: '#92400e', textMuted: '#a16207', border: '#fde68a' },
      purple:  { primary: '#7c3aed', primaryDark: '#6d28d9', bg: '#f5f3ff', dark: '#2e1065', textMid: '#4c1d95', textMuted: '#7c3aed', border: '#ddd6fe' },
      red:     { primary: '#dc2626', primaryDark: '#b91c1c', bg: '#fef2f2', dark: '#7f1d1d', textMid: '#991b1b', textMuted: '#b91c1c', border: '#fecaca' },
      teal:    { primary: '#0d9488', primaryDark: '#0f766e', bg: '#f0fdfa', dark: '#134e4a', textMid: '#115e59', textMuted: '#0f766e', border: '#99f6e4' },
      dark:    { primary: '#00ABE4', primaryDark: '#0088b8', bg: '#1e2d3d', dark: '#060d18', textMid: '#94a3b8', textMuted: '#64748b', border: '#2d3f52' },
    };
    const t = THEME_MAP[savedTheme] || THEME_MAP.default;
    const r = document.documentElement;
    r.style.setProperty('--blue-bright',  t.primary);
    r.style.setProperty('--blue-dark',    t.primaryDark);
    r.style.setProperty('--blue-deeper',  t.primaryDark);
    r.style.setProperty('--blue-light',   t.bg);
    r.style.setProperty('--blue-mid',     t.border);
    r.style.setProperty('--text-dark',    t.dark);
    r.style.setProperty('--text-mid',     t.textMid);
    r.style.setProperty('--text-muted',   t.textMuted);
    r.style.setProperty('--border',       t.border);
    document.body.style.backgroundColor = t.bg;
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const pathMatch = path.match(/^\/asset\/(.+)/);
    if (pathMatch) {
      sessionStorage.setItem('pendingAssetId', pathMatch[1]);
      window.history.replaceState({}, '', '/');
    }
    const params = new URLSearchParams(window.location.search);
    const assetParam = params.get('asset');
    if (assetParam) {
      sessionStorage.setItem('pendingAssetId', assetParam);
      window.history.replaceState({}, '', '/');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.email);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.email);
      else { setUserRole(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (email) => {
    const { data: roleData, error } = await supabase
      .from('user_roles').select('*').eq('email', email).single();
    if (error) {
      setUserRole({ role: 'technician', name: email });
      setLoading(false);
      return;
    }
    if (roleData.role === 'master') {
      setUserRole({ ...roleData, company_features: {} });
      setCurrentPage('master');
      setLoading(false);
      return;
    }
    let companyFeatures = {};
    if (roleData.company_id) {
      const { data: company } = await supabase
        .from('companies').select('features, status').eq('id', roleData.company_id).single();
      if (company?.features) companyFeatures = company.features;
    }
    setUserRole({ ...roleData, company_features: companyFeatures });
    setLoading(false);
  };

  useEffect(() => {
    if (userRole && userRole.role !== 'master') {
      const pendingAssetId = sessionStorage.getItem('pendingAssetId');
      if (pendingAssetId) {
        sessionStorage.removeItem('pendingAssetId');
        setPrestartAssetId(pendingAssetId);
        setCurrentPage('forms', 'prestarts');
      }
    }
  }, [userRole]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const handleViewAsset = (assetId) => {
    setViewingAssetId(assetId);
    setCurrentPageRaw('assetpage');
  };

  const handleStartPrestartFromAsset = (assetName) => {
    setPrestartAsset(assetName);
    setCurrentPage('forms', 'prestarts');
    setViewingAssetId(null);
  };

  const handleSelectCompany = async (company) => {
    const { data } = await supabase.from('companies').select('*').eq('id', company.id).single();
    setViewingCompany(data || company);
    setCurrentPage('dashboard');
  };

  const handleExitCompany = () => {
    setViewingCompany(null);
    setCurrentPage('master');
  };

  const effectiveCompanyId = viewingCompany?.id || userRole?.company_id;
  const effectiveUserRole = viewingCompany
    ? { ...userRole, role: 'admin', company_id: viewingCompany.id, company_features: viewingCompany.features || {} }
    : userRole;

  const renderPage = () => {
    if (userRole?.role === 'master' && currentPage === 'master' && !viewingCompany) return <MasterAdmin />;

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard companyId={effectiveCompanyId} />;
      case 'assets':
        return <Assets userRole={effectiveUserRole} onViewAsset={handleViewAsset} />;
      case 'downtime':
        return <Downtime userRole={effectiveUserRole} />;
      case 'maintenance':
        return <Maintenance userRole={effectiveUserRole} initialTab={currentSubPage} />;
      case 'forms':
        return (
          <Forms
            userRole={effectiveUserRole}
            initialTab={currentSubPage}
            prestartAsset={prestartAsset}
            prestartAssetId={prestartAssetId}
            onClearPreload={() => { setPrestartAsset(null); setPrestartAssetId(null); }}
          />
        );
      case 'scanner':
        return (
          <Scanner
            userRole={effectiveUserRole}
            onAssetFound={(assetId) => { setPrestartAssetId(assetId); setCurrentPage('forms', 'prestarts'); }}
          />
        );
      case 'assetpage':
        return (
          <div>
            <button
              onClick={() => { setCurrentPage('assets'); setViewingAssetId(null); }}
              style={{ marginBottom: '15px', backgroundColor: '#E9F1FA', color: '#1a2b3c', border: '1px solid #d6e6f2', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Back to Assets
            </button>
            <AssetPage assetId={viewingAssetId} userRole={effectiveUserRole} onStartPrestart={handleStartPrestartFromAsset} />
          </div>
        );
      case 'reports':
        return <Reports companyId={effectiveCompanyId} userRole={effectiveUserRole} initialTab={currentSubPage} />;
      case 'users':
        return <Users companyId={effectiveCompanyId} userRole={effectiveUserRole} />;
      case 'export':
        // Placeholder until Data Export component is built
        return <Users companyId={effectiveCompanyId} userRole={effectiveUserRole} />;
      case 'oil_sampling':
        return <OilSampling userRole={effectiveUserRole} />;
      case 'settings':
        return <Settings userRole={effectiveUserRole} initialTab={currentSubPage || 'company'} />;
      case 'master':
        return <MasterAdmin />;
      default:
        return <Dashboard companyId={effectiveCompanyId} />;
    }
  };

  if (loading) return (
    <div style={{ color: '#1a2b3c', padding: '50px', textAlign: 'center', backgroundColor: '#E9F1FA', height: '100vh' }}>
      Loading...
    </div>
  );

  if (!session) {
    if (authScreen === 'register') return <Register onBackToLogin={() => setAuthScreen('login')} />;
    return <Login onShowRegister={() => setAuthScreen('register')} />;
  }

  return (
    <div className="App">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
        session={session}
        userRole={userRole}
        viewingCompany={viewingCompany}
        onSelectCompany={handleSelectCompany}
        onExitCompany={handleExitCompany}
      />
      <div className="main-content">{renderPage()}</div>
    </div>
  );
}

export default App;
