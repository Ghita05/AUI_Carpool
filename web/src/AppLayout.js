import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Home, MapPin, MessageSquare, Bell, Plus, Settings, Star, Clock, Car } from 'lucide-react';
import './AppLayout.css';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  // Mock available rides data
  const availableRides = [
    { destination: 'Fez', price: 50, time: '14:00 today', driver: 'Ahmed', rating: 4.8, seats: [true, true, false, false] },
    { destination: 'Rabat', price: 100, time: '08:00 today', driver: 'Sara', rating: 4.9, seats: [true, true, true, false] },
    { destination: 'Meknes', price: 40, time: '19:30 today', driver: 'Karim', rating: 5.0, seats: [true, true, true, true] }
  ];

  return (
    <div className="app-layout">
      {/* Fixed Left Sidebar */}
      <aside className="app-sidebar">
        {/* Logo Section */}
        <div className="sidebar-header" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <div className="logo-circle">
            <Car size={40} color="#1b5e20" />
          </div>
          <h1 className="app-title">AUI Carpool</h1>
          <p className="app-subtitle">A Peer-to-Peer Ride-Sharing Platform</p>
        </div>

        {/* Available Rides Section */}
        <div className="available-rides-section">
          <h3 className="section-title">Available Rides</h3>
          <div className="rides-preview-list">
            {availableRides.map((ride, idx) => (
              <div
                key={idx}
                className="ride-preview-card"
                onClick={() => navigate(`/rides/${ride.destination.toLowerCase()}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="ride-preview-header">
                  <span className="ride-destination">{ride.destination}</span>
                  <span className="ride-preview-price">{ride.price} MAD</span>
                </div>
                <div className="ride-preview-details">
                  <Clock size={14} color="#666" />
                  <span className="ride-time">{ride.time}</span>
                </div>
                <div className="ride-driver-preview">
                  <span className="driver-initials">{ride.driver.charAt(0)}</span>
                  <div className="driver-info-preview">
                    <span className="driver-name-preview">{ride.driver}</span>
                    <div className="driver-rating">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          fill={i < Math.floor(ride.rating) ? '#F59E0B' : '#ddd'}
                          color={i < Math.floor(ride.rating) ? '#F59E0B' : '#ddd'}
                        />
                      ))}
                      <span className="rating-text">{ride.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="ride-seats">
                  {ride.seats.map((available, i) => (
                    <span
                      key={i}
                      className={`seat-dot ${available ? 'available' : ''}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="sidebar-nav">
          <button className="nav-btn nav-btn-primary" onClick={() => navigate('/rides/create')}>
            <Plus size={20} />
            <span>Post a Ride</span>
          </button>
          <button 
            className={`nav-btn ${isActive('/rides') ? 'active' : ''}`}
            onClick={() => navigate('/rides')}
          >
            <Car size={20} />
            <span>My Rides</span>
          </button>
          <button 
            className={`nav-btn ${isActive('/messages') ? 'active' : ''}`}
            onClick={() => navigate('/messages')}
          >
            <MessageSquare size={20} />
            <span>Messages</span>
          </button>
          <button 
            className={`nav-btn nav-btn-outline ${isActive('/notifications') ? 'active' : ''}`}
            onClick={() => navigate('/notifications')}
          >
            <Bell size={20} />
            <span>Alerts</span>
          </button>
        </div>

        {/* User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">GN</div>
            <div className="user-info">
              <span className="user-name">Ghita Nafa</span>
              <span className="user-role">Driver</span>
            </div>
          </div>
          <button className="settings-btn" onClick={() => navigate('/settings')}>
            <Settings size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
