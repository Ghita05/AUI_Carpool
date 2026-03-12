import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import '../../components/auth/AuthLayout.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!form.email.includes('@aui.ma')) e.email = 'Please use your AUI email (@aui.ma)';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate('/home'); }, 1200);
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">Sign in to your AUI Carpool account</p>

      <form onSubmit={handleLogin}>
        <div className="auth-field">
          <label className="auth-label">AUI Email</label>
          <input
            className={`auth-input ${errors.email ? 'input-error' : ''}`}
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          {errors.email && <p className="auth-error">{errors.email}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label">Password</label>
          <div className="auth-input-wrapper">
            <input
              className={`auth-input ${errors.password ? 'input-error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <button type="button" className="auth-input-right" onClick={() => setShowPassword(s => !s)}>
              {showPassword
                ? <EyeOff size={18} color="var(--color-text-secondary)" />
                : <Eye size={18} color="var(--color-text-secondary)" />}
            </button>
          </div>
          {errors.password && <p className="auth-error">{errors.password}</p>}
        </div>

        <div style={{ textAlign: 'right', marginBottom: 24, marginTop: -8 }}>
          <button type="button" className="auth-link">Forgot password?</button>
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Log In'}
        </button>
      </form>

      <p className="auth-link-row">
        Don't have an account?{' '}
        <button className="auth-link" onClick={() => navigate('/signup')}>Sign Up</button>
      </p>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
        <button 
          type="button" 
          className="auth-link"
          onClick={() => navigate('/admin-passcode')}
          style={{ fontSize: 12 }}
        >
          Are you an admin?
        </button>
      </div>
    </AuthLayout>
  );
}
