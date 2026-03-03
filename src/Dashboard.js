import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

function Dashboard({ companyId }) {
  const [stats, setStats] = useState({ totalAssets: 0, machinesDown: 0, pendingMaintenance: 0, overduepm: 0 });
  const [recentDowntime, setRecentDowntime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (companyId) fetchDashboardData(); }, [companyId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const { data: assets } = await supabase.from('assets').select('*').eq('company_id', companyId);
    const { data: downtime } = await supabase.from('downtime').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5);
    const { data: maintenance } = await supabase.from('maintenance').select('*').eq('company_id', companyId);
    setStats({
      totalAssets: assets?.length || 0,
      machinesDown: assets?.filter(a => a.status === 'Down').length || 0,
      pendingMaintenance: maintenance?.filter(m => m.status === 'Upcoming' || m.status === 'Due Soon').length || 0,
      overduepm: maintenance?.filter(m => m.status === 'Overdue').length || 0,
    });
    setRecentDowntime(downtime || []);
    setLoading(false);
  };

  if (loading) return <p style={{ color: '#a0b0b0', padding: '20px' }}>Loading dashboard...</p>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p className="subtitle">Welcome back. Here's your overview.</p>
      <div className="stats-grid">
        <div className="stat-card"><h3>Total Assets</h3><p className="stat-number">{stats.totalAssets}</p></div>
        <div className="stat-card down"><h3>Machines Down</h3><p className="stat-number">{stats.machinesDown}</p></div>
        <div className="stat-card warning"><h3>Pending Maintenance</h3><p className="stat-number">{stats.pendingMaintenance}</p></div>
        <div className="stat-card overdue"><h3>Overdue PM's</h3><p className="stat-number">{stats.overduepm}</p></div>
      </div>
      <div className="recent-downtime">
        <h3>Recent Downtime Events</h3>
        {recentDowntime.length === 0 ? (
          <p style={{ color: '#a0b0b0', marginTop: '10px' }}>No downtime events logged yet</p>
        ) : (
          <table className="data-table" style={{ marginTop: '15px' }}>
            <thead>
              <tr><th>Asset</th><th>Date</th><th>Category</th><th>Hours Down</th><th>Description</th></tr>
            </thead>
            <tbody>
              {recentDowntime.map(d => (
                <tr key={d.id}>
                  <td>{d.asset}</td>
                  <td>{d.date}</td>
                  <td><span className="category-badge">{d.category}</span></td>
                  <td><span className="hours-badge">{d.hours}h</span></td>
                  <td>{d.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
