import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, User, Car } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import StepIndicator from '../../components/common/StepIndicator';
import '../../components/auth/AuthLayout.css';
import './SignupCompleteProfilePage.css';

export default function SignupCompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'yourname@aui.ma';

  const [form, setForm] = useState({
    firstName: '', lastName: '',
    password: '', confirmPassword: '',
    phone: '', cin: '',
    role: 'Passenger',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.password || form.password.length < 8) e.password = 'Min. 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!form.cin.trim()) e.cin = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate('/home'); }, 1200);
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Complete Your Profile</h1>
      <p className="auth-subtitle">Almost there!</p>

      <StepIndicator currentStep={3} totalSteps={3} />

      <form onSubmit={handleSubmit}>
        {/* Verified email */}
        <div className="auth-field">
          <label className="auth-label">AUI Email</label>
          <div className="auth-input-wrapper">
            <input className="auth-input input-verified" value={email} disabled />
            <span className="auth-input-right verified-badge" style={{ cursor: 'default' }}>
              <CheckCircle size={14} color="var(--color-primary)" style={{ marginRight: 4 }} />
              Verified
            </span>
          </div>
        </div>

        {/* Name row */}
        <div className="auth-row">
          <div className="auth-field">
            <label className="auth-label">First Name</label>
            <input
              className={`auth-input ${errors.firstName ? 'input-error' : ''}`}
              placeholder="Enter your first name"
              value={form.firstName}
              onChange={e => update('firstName', e.target.value)}
            />
            {errors.firstName && <p className="auth-error">{errors.firstName}</p>}
          </div>
          <div className="auth-field">
            <label className="auth-label">Last Name</label>
            <input
              className={`auth-input ${errors.lastName ? 'input-error' : ''}`}
              placeholder="Enter your last name"
              value={form.lastName}
              onChange={e => update('lastName', e.target.value)}
            />
            {errors.lastName && <p className="auth-error">{errors.lastName}</p>}
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <div className="auth-input-wrapper">
            <input
              className={`auth-input ${errors.password ? 'input-error' : ''}`}
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              value={form.password}
              onChange={e => update('password', e.target.value)}
            />
            <button type="button" className="auth-input-right" onClick={() => setShowPw(s => !s)}>
              {showPw
                ? <EyeOff size={18} color="var(--color-text-secondary)" />
                : <Eye size={18} color="var(--color-text-secondary)" />}
            </button>
          </div>
          {errors.password && <p className="auth-error">{errors.password}</p>}
        </div>

        <div className="auth-field">
          <label className="auth-label">Confirm Password</label>
          <div className="auth-input-wrapper">
            <input
              className={`auth-input ${errors.confirmPassword ? 'input-error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
            />
            <button type="button" className="auth-input-right" onClick={() => setShowConfirm(s => !s)}>
              {showConfirm
                ? <EyeOff size={18} color="var(--color-text-secondary)" />
                : <Eye size={18} color="var(--color-text-secondary)" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="auth-error">{errors.confirmPassword}</p>}
        </div>

        {/* Phone */}
        <div className="auth-field">
          <label className="auth-label">Phone Number</label>
          <input
            className={`auth-input ${errors.phone ? 'input-error' : ''}`}
            placeholder="Enter your phone number"
            value={form.phone}
            onChange={e => update('phone', e.target.value)}
          />
          {errors.phone && <p className="auth-error">{errors.phone}</p>}
        </div>

        {/* CIN */}
        <div className="auth-field">
          <label className="auth-label">CIN</label>
          <input
            className={`auth-input ${errors.cin ? 'input-error' : ''}`}
            placeholder="Enter your national ID number"
            value={form.cin}
            onChange={e => update('cin', e.target.value.toUpperCase())}
          />
          {errors.cin && <p className="auth-error">{errors.cin}</p>}
          <p className="auth-helper">Your CIN is used for identity purposes only</p>
        </div>

        {/* Role selector */}
        <div className="auth-field">
          <label className="auth-label">I am a...</label>
          <div className="role-row">
            {[
              { label: 'Passenger', Icon: User },
              { label: 'Driver', Icon: Car },
            ].map(({ label, Icon }) => (
              <button
                key={label}
                type="button"
                className={`role-pill ${form.role === label ? 'role-pill-active' : ''}`}
                onClick={() => update('role', label)}
              >
                <Icon size={15} style={{ marginRight: 6 }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create My Account'}
        </button>
      </form>

      <p className="auth-link-row">
        Already have an account?{' '}
        <button className="auth-link" onClick={() => navigate('/login')}>Sign In</button>
      </p>
    </AuthLayout>
  );
}
