import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './Navbar';
import Dashboard from './Dashboard';
import Assets from './Assets';
import Downtime from './Downtime';
import Maintenance from './Maintenance';
import Calendar from './Calendar';
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
import ForcePasswordChange from './ForcePasswordChange';
import { supabase } from './supabase';
import ContractorPortal from './ContractorPortal';
import DemoTour from './DemoTour';


// ─── Error Collector ──────────────────────────────────────────────────────────
const MechIQErrors = {
  _queue: [],
  _flushing: false,

  async log(error, context = {}) {
    const entry = {
      message:    error?.message || String(error),
      stack:      error?.stack || null,
      context:    JSON.stringify(context),
      url:        window.location.href,
      user_agent: navigator.userAgent.slice(0, 200),
      occurred_at: new Date().toISOString(),
    };
    this._queue.push(entry);
    if (!this._flushing) this._flush();
  },

  async _flush() {
    this._flushing = true;
    while (this._queue.length) {
      const batch = this._queue.splice(0, 10);
      try {
        // Get company_id from supabase session if available
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;
        const rows = batch.map(e => ({ ...e, user_id: userId }));
        await supabase.from('error_logs').insert(rows);
      } catch(e) { /* silently fail — don't cause recursive errors */ }
    }
    this._flushing = false;
  }
};

// Global error listeners
window.addEventListener('error', (e) => {
  MechIQErrors.log(e.error || new Error(e.message), { type: 'uncaught', source: e.filename, line: e.lineno });
});
window.addEventListener('unhandledrejection', (e) => {
  MechIQErrors.log(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), { type: 'unhandled_promise' });
});

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    MechIQErrors.log(error, { type: 'react_boundary', component: info.componentStack?.split('\n')[1]?.trim() || 'unknown' });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#09111f', flexDirection:'column', gap:16, padding:24, fontFamily:'sans-serif' }}>
          <div style={{ fontSize:22, fontWeight:900, letterSpacing:4, color:'#dde3ed' }}>MECH<span style={{color:'#1e88e5'}}>IQ</span></div>
          <div style={{ background:'#0f1b2d', border:'1px solid rgba(239,83,80,0.3)', borderTop:'3px solid #ef5350', borderRadius:6, padding:'28px 24px', maxWidth:420, width:'100%', textAlign:'center' }}>
            <div style={{fontSize:32, marginBottom:12}}>⚠️</div>
            <div style={{fontSize:16, fontWeight:700, color:'#dde3ed', marginBottom:8}}>Something went wrong</div>
            <div style={{fontSize:13, color:'rgba(221,227,237,0.5)', marginBottom:20, lineHeight:1.5}}>
              This error has been logged automatically. Click below to reload.
            </div>
            <div style={{fontSize:11, fontFamily:'monospace', color:'rgba(239,83,80,0.7)', background:'rgba(239,83,80,0.05)', padding:'8px 12px', borderRadius:4, marginBottom:20, textAlign:'left', wordBreak:'break-all'}}>
              {this.state.error?.message}
            </div>
            <button onClick={() => window.location.reload()}
              style={{padding:'10px 24px', background:'#1e88e5', color:'#fff', border:'none', borderRadius:4, fontSize:13, fontWeight:700, cursor:'pointer'}}>
              Reload MechIQ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Label Scan Router ────────────────────────────────────────────────────────
function LabelScanRouter({ labelCode }) {
  const [state,   setState]   = React.useState('loading');
  const [assetId, setAssetId] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('generated_labels')
          .select('asset_id, label_code')
          .ilike('label_code', labelCode)
          .maybeSingle();
        if (error || !data)     { setState('notfound');   return; }
        if (!data.asset_id)     { setState('unassigned'); return; }
        setAssetId(data.asset_id);
        setState('found');
      } catch(e) { setState('notfound'); }
    })();
  }, [labelCode]);

  const W = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#09111f', flexDirection:'column', gap:16, padding:24, fontFamily:'Barlow,sans-serif' };
  const C = { background:'#0f1b2d', border:'1px solid rgba(255,255,255,0.09)', borderTop:'2px solid #1e88e5', borderRadius:4, padding:'32px 28px', width:'100%', maxWidth:380, textAlign:'center', color:'#dde3ed' };

  if (state === 'loading') return (
    <div style={W}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{fontSize:22,fontWeight:900,letterSpacing:4,color:'#dde3ed'}}>MECH<span style={{color:'#1e88e5'}}>IQ</span></div>
      <div style={{width:36,height:36,border:'3px solid rgba(30,136,229,0.2)',borderTopColor:'#1e88e5',borderRadius:'50%',animation:'sp 0.8s linear infinite'}} />
      <div style={{color:'rgba(221,227,237,0.4)',fontSize:13}}>Looking up {labelCode}…</div>
    </div>
  );

  if (state === 'notfound') return (
    <div style={W}>
      <div style={{fontSize:22,fontWeight:900,letterSpacing:4,color:'#dde3ed',marginBottom:8}}>MECH<span style={{color:'#1e88e5'}}>IQ</span></div>
      <div style={C}>
        <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Label not found</div>
        <div style={{fontSize:13,color:'rgba(221,227,237,0.45)'}}>Label <strong style={{color:'#1e88e5'}}>{labelCode}</strong> does not exist or has not been assigned.<br/>Contact your site administrator.</div>
      </div>
    </div>
  );

  if (state === 'unassigned') return (
    <div style={W}>
      <div style={{fontSize:22,fontWeight:900,letterSpacing:4,color:'#dde3ed',marginBottom:8}}>MECH<span style={{color:'#1e88e5'}}>IQ</span></div>
      <div style={C}>
        <div style={{fontSize:36,marginBottom:12}}>🏷️</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Label not assigned</div>
        <div style={{fontSize:13,color:'rgba(221,227,237,0.45)'}}>Label <strong style={{color:'#1e88e5'}}>{labelCode}</strong> has not been assigned to an asset yet.<br/>Contact your site administrator.</div>
      </div>
    </div>
  );

  return <ScanPage assetId={String(assetId)} />;
}


function App() {
  const [currentPage, setCurrentPageRaw] = useState('dashboard');
  const [currentSubPage, setCurrentSubPage] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingAssetId, setViewingAssetId] = useState(null);
  const [prestartAssetId,     setPrestartAssetId]     = useState(null);
  const [prestartAsset,       setPrestartAsset]       = useState(null);
  const [prestartAssetNumber, setPrestartAssetNumber] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [showTour, setShowTour] = useState(false);

  // ── Public scan route — no auth needed ──────────────────────
  const pathname = window.location.pathname;
  const scanMatch = pathname.match(/^\/scan\/([a-f0-9-]{1,36}|\d+)$/);
  const partScanMatch = pathname.match(/^\/scan\/part\/([a-f0-9-]{1,36}|\d+)$/);
  const labelScanMatch = pathname.match(/^\/scan\/label\/([A-Za-z0-9-]+)$/);

  const setCurrentPage = (page, subPage = null) => {
    if (page === 'assets') {
      const intent = sessionStorage.getItem('mechiq_open_asset');
      if (intent) {
        try {
          const { assetId } = JSON.parse(intent);
          if (assetId) {
            setViewingAssetId(assetId);
            setCurrentPageRaw('assetpage');
            window.history.pushState({ page: 'assetpage', subPage: null, assetId }, '', '/');
            return;
          }
        } catch(e) {}
      }
    }
    setCurrentPageRaw(page);
    setCurrentSubPage(subPage);
    // Push to browser history so back button works within the app
    const state = { page, subPage };
    window.history.pushState(state, '', '/');
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

    // Global navigation event (fired from deep components like MachineProfile service tabs)
    const handleNavEvent = (e) => {
      const { page, subPage, assetName, assetId, assetNumber } = e.detail || {};
      if (page === 'forms' && subPage === 'service_sheets') {
        if (assetName) {
          sessionStorage.setItem('mechiq_prefill', JSON.stringify({ assetName, assetNumber, serviceType: '' }));
        }
        setCurrentPage('forms', 'service-sheets');
        setViewingAssetId(null);
      } else if (page) {
        setCurrentPage(page, subPage || null);
      }
    };
    window.addEventListener('mechiq-navigate', handleNavEvent);

    // Browser back/forward — restore app state from history
    const handlePopState = (e) => {
      const state = e.state;
      if (!state) {
        // No state = user went back to initial entry — go to dashboard
        setCurrentPageRaw('dashboard');
        setCurrentSubPage(null);
        setViewingAssetId(null);
        return;
      }
      if (state.page === 'assetpage' && state.assetId) {
        setViewingAssetId(state.assetId);
        setCurrentPageRaw('assetpage');
      } else {
        setCurrentPageRaw(state.page || 'dashboard');
        setCurrentSubPage(state.subPage || null);
        setViewingAssetId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);

    // Set initial history state so the first back press doesn't leave the app
    if (!window.history.state) {
      window.history.replaceState({ page: 'dashboard', subPage: null }, '', '/');
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('mechiq-navigate', handleNavEvent);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const fetchUserRole = async (email) => {
    const { data: roleData, error } = await supabase
      .from('user_roles').select('*').eq('email', email).single();
    if (error) {
      // No user_roles record — check auth metadata for company admin
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata || {};
      if (meta.role === 'admin' && meta.company_id) {
        // New company admin provisioned via edge function
        // Create their user_roles record on first login
        await supabase.from('user_roles').upsert({
          email: email.toLowerCase(),
          name: meta.name || email.split('@')[0],
          role: 'admin',
          company_id: meta.company_id,
          force_password_change: meta.force_password_change || false,
        }, { onConflict: 'email' });
        let companyFeatures = {};
        const { data: company } = await supabase
          .from('companies').select('features, status').eq('id', meta.company_id).single();
        if (company?.features) companyFeatures = company.features;
        setUserRole({ email, name: meta.name || email.split('@')[0], role: 'admin', company_id: meta.company_id, company_features: companyFeatures, force_password_change: meta.force_password_change || false });
        setLoading(false);
        return;
      }
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
    window.history.pushState({ page: 'assetpage', subPage: null, assetId }, '', '/');
  };

  const handleStartPrestartFromAsset = (assetName, assetId, assetNumber) => {
    setPrestartAsset(assetName);
    setPrestartAssetId(assetId || null);
    setPrestartAssetNumber(assetNumber || null);
    setCurrentPage('forms', 'prestarts');
    setViewingAssetId(null);
  };

  const handleStartServiceSheetFromAsset = (assetName, assetId, assetNumber) => {
    sessionStorage.setItem('mechiq_prefill', JSON.stringify({ assetName, assetNumber: assetNumber || '', serviceType: '' }));
    setCurrentPage('forms', 'service-sheets');
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

  const renderPage = () => {
    if (userRole?.role === 'master' && currentPage === 'master' && !viewingCompany) return <MasterAdmin initialTab={currentSubPage || 'companies'} key={currentSubPage} />;

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard companyId={effectiveCompanyId} userRole={effectiveUserRole} onViewAsset={handleViewAsset} />;
      case 'assets':
        return <Assets userRole={effectiveUserRole} onViewAsset={handleViewAsset} initialTab={currentSubPage || 'units'} key={currentSubPage} />;
      case 'downtime':
        return <Downtime userRole={effectiveUserRole} />;
      case 'maintenance':
        return <Maintenance userRole={effectiveUserRole} initialTab={currentSubPage} setCurrentPage={setCurrentPage} />;
      case 'calendar':
        return <Calendar userRole={effectiveUserRole} setCurrentPage={setCurrentPage} />;
      case 'forms':
        return (
          <Forms
            userRole={effectiveUserRole}
            initialTab={currentSubPage}
            prestartAsset={prestartAsset}
            prestartAssetId={prestartAssetId}
            prestartAssetNumber={prestartAssetNumber}
            onClearPreload={() => { setPrestartAsset(null); setPrestartAssetId(null); setPrestartAssetNumber(null); }}
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
            <AssetPage assetId={viewingAssetId} userRole={effectiveUserRole} onStartPrestart={handleStartPrestartFromAsset} onStartServiceSheet={handleStartServiceSheetFromAsset} onBack={() => { setCurrentPage('assets'); setViewingAssetId(null); }} />
          </div>
        );
      case 'reports':
        return <Reports companyId={effectiveCompanyId} userRole={effectiveUserRole} initialTab={currentSubPage} />;
      case 'users':
        return <Users companyId={effectiveCompanyId} userRole={effectiveUserRole} />;
      case 'onboarding':
        return <Settings userRole={effectiveUserRole} initialTab='onboarding_admin' adminMode />;
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
        if (userRole?.role !== 'master') return <Dashboard companyId={effectiveCompanyId} userRole={effectiveUserRole} onViewAsset={handleViewAsset} />;
        return <MasterAdmin initialTab={currentSubPage || 'companies'} key={currentSubPage} />;
      default:
        return <Dashboard companyId={effectiveCompanyId} userRole={effectiveUserRole} onViewAsset={handleViewAsset} />;
    }
  };

  // Public routes — must be before loading/auth checks
  if (labelScanMatch) return <LabelScanRouter labelCode={labelScanMatch[1]} />;
  if (scanMatch) return <ScanPage assetId={scanMatch[1]} />;
  if (partScanMatch) return <ScanPage partId={partScanMatch[1]} />;
  if (pathname.startsWith('/contractor')) return <ContractorPortal />;

  if (loading) return (
    <div style={{ color: '#1a2b3c', padding: '50px', textAlign: 'center', backgroundColor: '#E9F1FA', height: '100vh' }}>
      Loading...
    </div>
  );

  if (!session) {
    return <Login onAuth={(session) => { /* handled by onAuthStateChange */ }} />;
  }

  // First login — force password change for new company admins
  if (userRole?.force_password_change) {
    return <ForcePasswordChange session={session} onComplete={() => fetchUserRole(session.user.email)} />;
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

// ─── Root Router ──────────────────────────────────────────────────────────────
// Checks public routes BEFORE React state initialises - avoids auth race condition
function Root() {
  const pathname = window.location.pathname;
  if (/^\/scan\/label\/([A-Za-z0-9-]+)$/.test(pathname)) {
    const code = pathname.match(/^\/scan\/label\/([A-Za-z0-9-]+)$/)[1];
    return <ErrorBoundary><LabelScanRouter labelCode={code} /></ErrorBoundary>;
  }
  if (/^\/scan\/([a-f0-9-]{1,36}|\d+)$/.test(pathname)) {
    return <ErrorBoundary><ScanPage assetId={pathname.match(/^\/scan\/([a-f0-9-]{1,36}|\d+)$/)[1]} /></ErrorBoundary>;
  }
  if (/^\/scan\/part\/([a-f0-9-]{1,36}|\d+)$/.test(pathname)) {
    return <ErrorBoundary><ScanPage partId={pathname.match(/^\/scan\/part\/([a-f0-9-]{1,36}|\d+)$/)[1]} /></ErrorBoundary>;
  }
  if (pathname.startsWith('/contractor')) return <ErrorBoundary><ContractorPortal /></ErrorBoundary>;
  return <ErrorBoundary><App /></ErrorBoundary>;
}

export default Root;
