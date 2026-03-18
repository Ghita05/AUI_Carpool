import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import StepIndicator from '../../components/common/StepIndicator';
import '../../components/auth/AuthLayout.css';
import './SignupCheckInboxPage.css';

const MailIcon = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;

export default function SignupCheckInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'yourname@aui.ma';
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    setResent(true);
    // TODO: POST /auth/resend-verification
    setTimeout(() => setResent(false), 30000);
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Check Your Inbox</h1>
      <p className="auth-subtitle">One step closer</p>

      <StepIndicator currentStep={2} totalSteps={3} />

      <div className="inbox-icon-box">
        <MailIcon />
      </div>

      <div className="inbox-message">
        <h2 className="inbox-heading">Verification link sent!</h2>
        <p className="inbox-sub">We sent a link to</p>
        <p className="inbox-email">{email}</p>
        <p className="inbox-instruction">Click the link in your inbox to continue</p>
      </div>

      <div className="inbox-resend">
        <span>Didn't receive it? </span>
        <button
          className="auth-link"
          onClick={handleResend}
          disabled={resent}
        >
          {resent ? 'Link sent!' : 'Resend verification link'}
        </button>
      </div>

      <div className="inbox-divider" />

      <div className="inbox-change">
        <span>Wrong email address? </span>
        <button className="auth-link" onClick={() => navigate('/signup')}>
          Change it
        </button>
      </div>

      {/* Prototype shortcut */}
      <button
        className="auth-btn"
        style={{ marginTop: 24, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', fontSize: '13px' }}
        onClick={() => navigate('/signup/profile', { state: { email } })}
      >
        I've verified my email →
      </button>
    </AuthLayout>
  );
}
