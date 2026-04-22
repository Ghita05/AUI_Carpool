import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import '../../components/auth/AuthLayout.css';

const ShieldIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1b5e20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setErrorMsg('');

    if (!email.trim()) { setErrorMsg('Email is required.'); return; }
    if (!password) { setErrorMsg('Password is required.'); return; }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ShieldIcon />
        <h1 className="auth-title">Admin Portal</h1>
        <p className="auth-subtitle">Sign in with your admin account to access the dashboard</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className={`auth-input ${errorMsg ? 'input-error' : ''}`}
            type="email"
            placeholder="admin@aui.ma"
            value={email}
            autoComplete="username"
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input
            className={`auth-input ${errorMsg ? 'input-error' : ''}`}
            type="password"
            placeholder="Your password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
          />
          {errorMsg && <p className="auth-error">{errorMsg}</p>}
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 20 }}>
        Only users with an Admin role can access this panel.
      </p>
    </AuthLayout>
  );
}
