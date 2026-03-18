import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './AppLayout.css';

/* ── Inline SVG icons (design-system: no icon library) ── */
const CarIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);
const ClockIcon = ({ size = 14, color = '#666' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const StarIcon = ({ size = 11, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#F59E0B' : '#ddd'} stroke={filled ? '#F59E0B' : '#ddd'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const SearchIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const MessageIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const BellIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);
const SettingsIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);
const LogOutIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const MyRidesIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);

// Mock available rides data
const availableRides = [
  { destination: 'Fez', price: 50, time: '14:00 today', driver: 'Ghita N.', rating: 4.8, seats: [true, true, false, false] },
  { destination: 'Rabat', price: 100, time: '17:30 today', driver: 'Ahmed B.', rating: 3.9, seats: [true, true, true, false] },
  { destination: 'Meknes', price: 40, time: '15:30 today', driver: 'Kenza N.', rating: 5.0, seats: [true, true, true, true] },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDriver, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/splash');
  };

  return (
    <div className="app-layout">
      {/* Fixed Left Sidebar — matches Figma center column */}
      <aside className="app-sidebar">
        {/* Logo Section */}
        <div className="sidebar-header" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <div className="logo-circle">
            <CarIcon size={40} color="#1b5e20" />
          </div>
          <h1 className="app-title">AUI Carpool</h1>
          <p className="app-subtitle">A Peer-to-Peer Ride-Sharing Platform</p>
        </div>

        {/* Available Rides Section */}
        <div className="available-rides-section">
          <div className="section-title-row">
            <h3 className="section-title">Available Rides</h3>
            <span className="section-count">{availableRides.length} found</span>
          </div>
          <div className="rides-preview-list">
            {availableRides.map((ride, idx) => (
              <div
                key={idx}
                className="ride-preview-card"
                onClick={() => navigate(`/rides/${idx + 1}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="ride-preview-header">
                  <span className="ride-destination">{ride.destination}</span>
                  <span className="ride-preview-price">{ride.price} MAD</span>
                </div>
                <div className="ride-preview-details">
                  <ClockIcon size={14} color="#666" />
                  <span className="ride-time">{ride.time}</span>
                </div>
                <div className="ride-driver-preview">
                  <span className="driver-initials">{ride.driver.charAt(0)}</span>
                  <div className="driver-info-preview">
                    <span className="driver-name-preview">{ride.driver}</span>
                    <div className="driver-rating">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} size={11} filled={i < Math.floor(ride.rating)} />
                      ))}
                      <span className="rating-text">{ride.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="ride-seats">
                  {ride.seats.map((available, i) => (
                    <span key={i} className={`seat-dot ${available ? 'available' : ''}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons — role-aware */}
        <div className="sidebar-nav">
          {isDriver ? (
            <button className="nav-btn nav-btn-primary" onClick={() => navigate('/rides/create')}>
              <PlusIcon size={20} />
              <span>Post a Ride</span>
            </button>
          ) : (
            <button className="nav-btn nav-btn-primary" onClick={() => navigate('/home')}>
              <SearchIcon size={20} />
              <span>Find a Ride</span>
            </button>
          )}
          <button
            className={`nav-btn ${isActive('/rides') ? 'active' : ''}`}
            onClick={() => navigate('/rides')}
          >
            <MyRidesIcon size={20} />
            <span>My Rides</span>
          </button>
          <button
            className={`nav-btn ${isActive('/messages') ? 'active' : ''}`}
            onClick={() => navigate('/messages')}
          >
            <MessageIcon size={20} />
            <span>Messages</span>
          </button>
          <button
            className={`nav-btn nav-btn-outline ${isActive('/notifications') ? 'active' : ''}`}
            onClick={() => navigate('/notifications')}
          >
            <BellIcon size={20} />
            <span>Alerts</span>
          </button>
        </div>

        {/* User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{user.initials}</div>
            <div className="user-info">
              <span className="user-name">{user.firstName} {user.lastName}</span>
              <span className="user-role">{isDriver ? 'Driver' : 'Passenger'}</span>
            </div>
          </div>
          <button className="settings-btn" onClick={() => navigate('/settings')} title="Settings">
            <SettingsIcon size={18} />
          </button>
          <button className="logout-btn" onClick={handleLogout} title="Log out">
            <LogOutIcon size={18} />
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
