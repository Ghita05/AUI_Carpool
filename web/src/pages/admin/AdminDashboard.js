import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Car, AlertCircle, BarChart3, Settings } from 'lucide-react';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    navigate('/login');
  };

  // Mock admin data
  const stats = {
    totalUsers: 248,
    totalRides: 1042,
    activeRides: 32,
    reportedIssues: 5
  };

  const recentRides = [
    { id: 1, driver: 'Ghita N.', destination: 'Fez', price: 50, time: '14:00', status: 'completed' },
    { id: 2, driver: 'Ahmed B.', destination: 'Rabat', price: 100, time: '17:30', status: 'active' },
    { id: 3, driver: 'Kenza N.', destination: 'Meknes', price: 40, time: '15:30', status: 'completed' }
  ];

  const recentUsers = [
    { id: 1, name: 'Ghita Nafa', email: 'ghita@aui.ma', role: 'Driver', joined: '2024-03-01' },
    { id: 2, name: 'Ahmed B.', email: 'ahmed@aui.ma', role: 'Driver', joined: '2024-02-15' },
    { id: 3, name: 'Sara M.', email: 'sara@aui.ma', role: 'Rider', joined: '2024-02-20' }
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Manage users, rides, and platform activity</p>
        </div>
        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <Users size={24} color="#1b5e20" />
          <div className="stat-content">
            <p className="stat-label">Total Users</p>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <Car size={24} color="#1b5e20" />
          <div className="stat-content">
            <p className="stat-label">Total Rides</p>
            <p className="stat-value">{stats.totalRides}</p>
          </div>
        </div>
        <div className="admin-stat-card">
          <BarChart3 size={24} color="#f59e0b" />
          <div className="stat-content">
            <p className="stat-label">Active Now</p>
            <p className="stat-value">{stats.activeRides}</p>
          </div>
        </div>
        <div className="admin-stat-card alert">
          <AlertCircle size={24} color="#ef4444" />
          <div className="stat-content">
            <p className="stat-label">Reports</p>
            <p className="stat-value">{stats.reportedIssues}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`admin-tab ${activeTab === 'rides' ? 'active' : ''}`}
          onClick={() => setActiveTab('rides')}
        >
          Rides
        </button>
        <button 
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {activeTab === 'overview' && (
          <div>
            <h2 className="admin-section-title">Recent Rides</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Destination</th>
                  <th>Price</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRides.map(ride => (
                  <tr key={ride.id}>
                    <td>{ride.driver}</td>
                    <td>{ride.destination}</td>
                    <td>{ride.price} MAD</td>
                    <td>{ride.time}</td>
                    <td>
                      <span className={`status-badge ${ride.status}`}>
                        {ride.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="admin-section-title">Recent Users</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'rides' && (
          <div className="admin-empty-state">
            <Car size={48} color="#ccc" />
            <p>Detailed ride management coming soon</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="admin-empty-state">
            <Settings size={48} color="#ccc" />
            <p>Admin settings coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
