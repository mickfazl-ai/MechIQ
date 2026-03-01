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
import { supabase } from './supabase';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
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
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('email', email)
      .single();
    if (error) {
      setUserRole({ role: 'technician', name: email });
    } else {
      setUserRole(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard companyId={userRole?.company_id} />;
      case 'assets': return <Assets userRole={userRole} />;
      case 'downtime': return <Downtime userRole={userRole} />;
      case 'maintenance': return <Maintenance userRole={userRole} />;
      case 'prestart': return <Prestart userRole={userRole} />;
      case 'reports':
        if (userRole?.role === 'technician') {
          return <div style={{padding:'20px'}}><h2>Access Denied</h2><p style={{color:'#a0b0b0', marginTop:'10px'}}>You don't have permission to view reports.</p></div>;
        }
        return <Reports companyId={userRole?.company_id} />;
      case 'users':
        if (userRole?.role !== 'admin') {
          return <div style={{padding:'20px'}}><h2>Access Denied</h2><p style={{color:'#a0b0b0', marginTop:'10px'}}>Only admins can manage users.</p></div>;
        }
        return <Users companyId={userRole?.company_id} userRole={userRole} />;
      default: return <Dashboard companyId={userRole?.company_id} />;
    }
  };

  if (loading) return <div style={{color:'white', padding:'50px', textAlign:'center', backgroundColor:'#0a0f0f', height:'100vh'}}>Loading...</div>;

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
      />
      <div className="main-content">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;