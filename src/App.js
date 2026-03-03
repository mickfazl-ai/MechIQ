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
import Signup from './Signup';
import Prestart from './Prestart';
import Scanner from './Scanner';
import AssetPage from './MachineProfile';
import MasterAdmin from './MasterAdmin';
import { supabase } from './supabase';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [viewingAssetId, setViewingAssetId] = useState(null);
  const [prestartAssetId, setPrestartAssetId] = useState(null);
  const [prestartAsset, setPrestartAsset] = useState(null);

  // Company impersonation state
  const [viewingCompany, setViewingCompany] = useState(null);

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
        setCurrentPage('prestart-from-scan');
      }
    }
  }, [userRole]);

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const handleViewAsset = (assetId) => { setViewingAssetId(assetId); setCurrentPage('assetpage'); };
  const handleStartPrestartFromAsset = (assetName) => {
    setPrestartAsset(assetName);
    setCurrentPage('prestart');
    setViewingAssetId(null);
  };

  // When master selects a company to view
  const handleSelectCompany = async (company) => {
    // Fetch full company details including features
    const { data } = await supabase.from('companies').select('*').eq('id', company.id).single();
    setViewingCompany(data || company);
    setCurrentPage('dashboard');
  };

  const handleExitCompany = () => {
    setViewingCompany(null);
    setCurrentPage('master');
  };

  // The effective company_id to use for all pages
  // If master is viewing a company, use that company's ID; otherwise use own
  const effectiveCompanyId = viewingCompany?.id || userRole?.company_id;

  // Fake a userRole that looks like an admin for the viewed company
  const effectiveUserRole = viewingCompany
    ? { ...userRole, role: 'admin', company_id: viewingCompany.id, company_features: viewingCompany.features || {} }
    : userRole;

  const renderPage = () => {
    // Master on master tab and not viewing a company
    if (userRole?.role === 'master' && currentPage === 'master' && !viewingCompany) {
      return <MasterAdmin />;
    }

    switch (currentPage) {
      case 'dashboard':    return <Dashboard companyId={effectiveCompanyId} />;
      case 'assets':       return <Assets userRole={effectiveUserRole} onViewAsset={handleViewAsset} />;
      case 'downtime':     return <Downtime userRole={effectiveUserRole} />;
      case 'maintenance':  return <Maintenance userRole={effectiveUserRole} />;
      case 'prestart':     return <Prestart userRole={effectiveUserRole} preloadAsset={prestartAsset} onClearPreload={() => setPrestartAsset(null)} />;
      case 'scanner':      return <Scanner userRole={effectiveUserRole} onAssetFound={(assetId) => { setPrestartAssetId(assetId); setCurrentPage('prestart-from-scan'); }} />;
      case 'prestart-from-scan': return <Prestart userRole={effectiveUserRole} preloadAssetId={prestartAssetId} onClearPreload={() => { setPrestartAssetId(null); setCurrentPage('scanner'); }} />;
      case 'assetpage':    return (
        <div>
          <button onClick={() => { setCurrentPage('assets'); setViewingAssetId(null); }}
            style={{ marginBottom: '15px', backgroundColor: 'transparent', color: '#a0b0b0', border: '1px solid #1a2f2f', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>
            ← Back to Assets
          </button>
          <AssetPage assetId={viewingAssetId} userRole={effectiveUserRole} onStartPrestart={handleStartPrestartFromAsset} />
        </div>
      );
      case 'reports':      return <Reports companyId={effectiveCompanyId} />;
      case 'users':        return <Users companyId={effectiveCompanyId} userRole={effectiveUserRole} />;
      case 'master':       return <MasterAdmin />;
      default:             return <Dashboard companyId={effectiveCompanyId} />;
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '50px', textAlign: 'center', backgroundColor: '#0a0f0f', height: '100vh' }}>Loading...</div>;

  if (!session) {
    return showSignup
      ? <Signup onBackToLogin={() => setShowSignup(false)} />
      : <Login onShowSignup={() => setShowSignup(true)} />;
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
