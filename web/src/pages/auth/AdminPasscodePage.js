import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import '../../components/auth/AuthLayout.css';

const ArrowLeftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const LockIcon = ({ size = 48 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1b5e20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

const ADMIN_PASSCODE = '1234'; // Simple passcode - change as needed

export default function AdminPasscodePage() {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (ev) => {
    ev.preventDefault();
    setError('');

    if (!passcode) {
      setError('Passcode is required');
      return;
    }

    if (passcode.length < 4) {
      setError('Passcode must be at least 4 digits');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      if (passcode.trim() === ADMIN_PASSCODE) {
        setLoading(false);
        navigate('/admin/dashboard');
      } else {
        setLoading(false);
        setError('Invalid passcode. Hint: try 1234');
        setPasscode('');
      }
    }, 800);
  };

  return (
    <AuthLayout>
      <button 
        onClick={() => navigate('/login')}
        style={{ 
          background: 'none', 
          border: 'none',
          cursor: 'pointer',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#1b5e20',
          fontSize: 14,
          fontWeight: 600
        }}
      >
        <ArrowLeftIcon /> Back to Login
      </button>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <LockIcon size={48} />
        <h1 className="auth-title">Admin Access</h1>
        <p className="auth-subtitle">Enter the admin passcode to continue</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label">Passcode</label>
          <input
            className={`auth-input ${error ? 'input-error' : ''}`}
            type="text"
            inputMode="numeric"
            placeholder="Enter admin passcode (e.g. 1234)"
            value={passcode}
            onChange={e => {
              setPasscode(e.target.value);
              setError('');
            }}
            maxLength="10"
          />
          {error && <p className="auth-error">{error}</p>}
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Access Admin Panel'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 20 }}>
        Only authorized administrators can access this panel.
      </p>
    </AuthLayout>
  );
}
