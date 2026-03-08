import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import StepIndicator from '../../components/common/StepIndicator';
import '../../components/auth/AuthLayout.css';
import './SignupCheckInboxPage.css';

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
        <Mail size={36} color="var(--color-primary)" strokeWidth={1.5} />
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
