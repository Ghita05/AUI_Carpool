import React from 'react';
import { Car, CheckCircle } from 'lucide-react';
import './AuthLayout.css';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      {/* Left green branding panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-logo-circle">
            <Car size={44} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
          </div>
          <h1 className="auth-brand-name">AUI Carpool</h1>
          <p className="auth-brand-tag">Your campus, connected.</p>

          <div className="auth-features">
            {[
              'Verified AUI community members only',
              'Real-time seat availability',
              'Trusted carpooling network',
            ].map((f) => (
              <div key={f} className="auth-feature-item">
                <CheckCircle size={18} color="#F59E0B" style={{ flexShrink: 0 }} />
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
            <Car size={16} color="var(--color-primary)" strokeWidth={1.5} />
            <span>AUI Carpool</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
