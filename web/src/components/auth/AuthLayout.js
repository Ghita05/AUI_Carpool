import React from 'react';
import './AuthLayout.css';

const CarIcon = ({ size = 44, color = 'rgba(255,255,255,0.9)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      {/* Left green branding panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo-circle">
            <CarIcon size={44} color="rgba(255,255,255,0.9)" />
          </div>
          <h1 className="auth-brand-name">AUI Carpool</h1>
          <p className="auth-brand-tag">A Peer-to-Peer Ride Sharing Platform</p>

          <div className="auth-features">
            {[
              'Verified AUI community members only',
              'Real-time seat availability',
              'Trusted carpooling network',
            ].map((f) => (
              <div key={f} className="auth-feature-item">
                <CheckCircleIcon />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="auth-brand-badge">
            <CarIcon size={16} color="var(--color-primary)" />
            <span>AUI Carpool</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
