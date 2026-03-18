import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Layout.css';

/* Inline SVG icons */
const CarIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const MapIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
const MessageSquareIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const BellIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const SettingsIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const PlusIcon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

const NAV_ITEMS = [
  { path: '/home',          Icon: MapIcon,           label: 'Home'      },
  { path: '/rides',         Icon: CarIcon,           label: 'My Rides'  },
  { path: '/messages',      Icon: MessageSquareIcon, label: 'Messages'  },
  { path: '/notifications', Icon: BellIcon,          label: 'Alerts'    },
];

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const active    = location.pathname;

  return (
    <div className="layout-root">
      {/* ── Sidebar ── */}
      <aside className="layout-sidebar">
        {/* Brand */}
        <div className="layout-brand" onClick={() => navigate('/home')}>
          <div className="layout-logo-circle">
            <CarIcon size={22} />
          </div>
          <div>
            <p className="layout-brand-name">AUI Carpool</p>
            <p className="layout-brand-tag">Your campus, connected.</p>
          </div>
        </div>

        <div className="layout-divider" />

        {/* Nav items */}
        <nav className="layout-nav">
          {NAV_ITEMS.map(({ path, Icon, label }) => (
            <button
              key={path}
              className={`layout-nav-btn ${active.startsWith(path) ? 'layout-nav-active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="layout-divider" />

        {/* Post a Ride */}
        <button className="layout-post-btn" onClick={() => navigate('/rides/create')}>
          <PlusIcon size={16} />
          Post a Ride
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        <div className="layout-divider" />

        {/* User row */}
        <div className="layout-user-row">
          <div className="layout-avatar">GN</div>
          <div className="layout-user-info">
            <p className="layout-user-name">Ghita Nafa</p>
            <p className="layout-user-role">Driver</p>
          </div>
          <button
            className="layout-settings-btn"
            onClick={() => navigate('/settings')}
            title="Account Settings"
          >
            <SettingsIcon size={16} />
          </button>
        </div>
      </aside>

      {/* ── Page content ── */}
      <main className="layout-content">
        {children}
      </main>
    </div>
  );
}
