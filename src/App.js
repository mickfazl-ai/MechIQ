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
import Forms from './Forms';
import Scanner from './Scanner';
import AssetPage from './MachineProfile';
import MasterAdmin from './MasterAdmin';
import Settings from './Settings';
import Chat from './Chat';
import Parts from './Parts';
import OilSampling from './OilSampling';
import ScanPage from './ScanPage';
import { supabase } from './supabase';
import DemoTour from './DemoTour';

function App() {
  const [currentPage, setCurrentPageRaw] = useState('dashboard');
  const [currentSubPage, setCurrentSubPage] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingAssetId, setViewingAssetId] = useState(null);
  const [prestartAssetId, setPrestartAssetId] = useState(null);
  const [prestartAsset, setPrestartAsset] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [showTour, setShowTour] = useState(false);

  // ── Public scan route — no auth needed ──────────────────────
  const pathname = window.location.pathname;
  const scanMatch = pathname.match(/^\/scan\/([a-f0-9-]{36})$/);
  const partScanMatch = pathname.match(/^\/scan\/part\/([a-f0-9-]{36})$/);

  const setCurrentPage = (page, subPage = null) => {
    if (page === 'assets') {
      const intent = sessionStorage.getItem('mechiq_open_asset');
      if (intent) {
        try {
          const { assetId } = JSON.parse(intent);
          if (assetId) {
            setViewingAssetId(assetId);
            setCurrentPageRaw('assetpage');
            return;
          }
        } catch(e) {}
      }
    }
    setCurrentPageRaw(page);
    setCurrentSubPage(subPage);
  };

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
      setCurrentPageRaw(prev => (prev && prev !== 'login') ? prev : 'master');
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
    if (roleData.email === 'demo@mechiq.com.au' || roleData.company_id === 'de000000-0000-0000-0000-000000000001') {
      setTimeout(() => setShowTour(true), 800);
    }
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

  const isDemo = userRole?.email === 'demo@mechiq.com.au' || userRole?.company_id === 'de000000-0000-0000-0000-000000000001';
  const effectiveCompanyId = viewingCompany?.id || userRole?.company_id;
  const effectiveUserRole = viewingCompany
    ? { ...userRole, role: 'admin', company_id: viewingCompany.id, company_features: viewingCompany.features || {} }
    : userRole;

  // ── Public scan route — render before auth check ─────────────
  if (scanMatch) return <ScanPage assetId={scanMatch[1]} />;
  if (partScanMatch) return <ScanPage partId={partScanMatch[1]} />;

  const renderPage = () => {
    if (userRole?.role === 'master' && currentPage === 'master' && !viewingCompany) return <MasterAdmin />;

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard companyId={effectiveCompanyId} userRole={effectiveUserRole} />;
      case 'assets':
        return <Assets userRole={effectiveUserRole} onViewAsset={handleViewAsset} initialTab={currentSubPage || 'units'} key={currentSubPage} />;
      case 'downtime':
        return <Downtime userRole={effectiveUserRole} />;
      case 'maintenance':
        return <Maintenance userRole={effectiveUserRole} initialTab={currentSubPage} setCurrentPage={setCurrentPage} />;
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
      case 'admin':
        return <Settings userRole={effectiveUserRole} initialTab={currentSubPage || 'company'} key={currentSubPage} adminMode />;
      case 'settings':
        return <Settings userRole={effectiveUserRole} initialTab={currentSubPage || 'format'} key={currentSubPage} personalMode />;
      case 'oil_sampling':
        return <OilSampling userRole={effectiveUserRole} />;
      case 'parts':
        return <Parts userRole={effectiveUserRole} />;
      case 'chat':
        return <Chat userRole={effectiveUserRole} />;
      case 'master':
        return <MasterAdmin />;
      default:
        return <Dashboard companyId={effectiveCompanyId} userRole={effectiveUserRole} />;
    }
  };

  if (loading) return (
    <div style={{ color: '#1a2b3c', padding: '50px', textAlign: 'center', backgroundColor: '#E9F1FA', height: '100vh' }}>
      Loading...
    </div>
  );

  if (!session) {
    return <Login onAuth={(session) => { /* handled by onAuthStateChange */ }} />;
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
        isDemo={isDemo}
      />
      {isDemo && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 199,
          background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
          padding: '9px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Demo Mode</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>— Read only. Explore freely.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowTour(true)} style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              🗺️ How It Works
            </button>
            <button onClick={() => setShowTour(true)} style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              ▶ Guided Tour
            </button>
            <a href="mailto:info@mechiq.com.au?subject=MechIQ Demo Enquiry" style={{ padding: '5px 14px', background: '#fff', color: '#0ea5e9', borderRadius: 7, fontSize: 12, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Get Started →
            </a>
          </div>
        </div>
      )}
      <div className="main-content" style={isDemo ? { marginTop: 96 } : {}}>{renderPage()}</div>
      {showTour && (
        <DemoTour
          onNavigate={(page, subPage) => setCurrentPage(page, subPage)}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}

export default App;
