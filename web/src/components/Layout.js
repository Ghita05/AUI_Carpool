import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Car, Map, MessageSquare, Bell, Settings, Plus, User } from 'lucide-react';
import './Layout.css';

const NAV_ITEMS = [
  { path: '/home',          Icon: Map,           label: 'Home'      },
  { path: '/rides',         Icon: Car,           label: 'My Rides'  },
  { path: '/messages',      Icon: MessageSquare, label: 'Messages'  },
  { path: '/notifications', Icon: Bell,          label: 'Alerts'    },
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
            <Car size={22} color="var(--color-primary)" strokeWidth={1.8} />
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
          <Plus size={16} />
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
            <Settings size={16} color="var(--color-text-secondary)" />
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
