import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import '../../components/auth/AuthLayout.css';

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
      if (passcode === ADMIN_PASSCODE) {
        setLoading(false);
        navigate('/admin/dashboard');
      } else {
        setLoading(false);
        setError('Invalid passcode');
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
        <ArrowLeft size={18} /> Back to Login
      </button>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Lock size={48} color="#1b5e20" style={{ marginBottom: 12 }} />
        <h1 className="auth-title">Admin Access</h1>
        <p className="auth-subtitle">Enter the admin passcode to continue</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label">Passcode</label>
          <input
            className={`auth-input ${error ? 'input-error' : ''}`}
            type="password"
            placeholder="Enter admin passcode"
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
