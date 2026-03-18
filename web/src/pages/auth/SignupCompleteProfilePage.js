import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import StepIndicator from '../../components/common/StepIndicator';
import '../../components/auth/AuthLayout.css';
import './SignupCompleteProfilePage.css';

const EyeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const CheckCircleIcon = ({ size = 14 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const UserIcon = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CarIcon = ({ size = 15 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.4A2 2 0 0 0 13.7 6H10.3a2 2 0 0 0-1.6.6L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
const UploadIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;

export default function SignupCompleteProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const email = location.state?.email || 'yourname@aui.ma';

  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirmPassword: '', phone: '', role: 'Passenger' });
  const [cashwalletFile, setCashwalletFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const update = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: null })); };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.password || form.password.length < 8) e.password = 'Min. 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Required';
    if (!cashwalletFile) e.cashwallet = 'Please upload your cashwallet scan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setUser({
        firstName: form.firstName, lastName: form.lastName, email,
        role: form.role.toLowerCase(),
        initials: (form.firstName[0] + form.lastName[0]).toUpperCase(),
        rating: 0, rides: 0, isAuthenticated: true,
      });
      setLoading(false);
      navigate('/home');
    }, 1200);
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Complete Your Profile</h1>
      <p className="auth-subtitle">Almost there!</p>
      <StepIndicator currentStep={3} totalSteps={3} />
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label">AUI Email</label>
          <div className="auth-input-wrapper">
            <input className="auth-input input-verified" value={email} disabled />
            <span className="auth-input-right verified-badge" style={{ cursor: 'default' }}><CheckCircleIcon size={14} /> Verified</span>
          </div>
        </div>
        <div className="auth-row">
          <div className="auth-field"><label className="auth-label">First Name</label><input className={`auth-input ${errors.firstName ? 'input-error' : ''}`} placeholder="Enter your first name" value={form.firstName} onChange={e => update('firstName', e.target.value)} />{errors.firstName && <p className="auth-error">{errors.firstName}</p>}</div>
          <div className="auth-field"><label className="auth-label">Last Name</label><input className={`auth-input ${errors.lastName ? 'input-error' : ''}`} placeholder="Enter your last name" value={form.lastName} onChange={e => update('lastName', e.target.value)} />{errors.lastName && <p className="auth-error">{errors.lastName}</p>}</div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <div className="auth-input-wrapper"><input className={`auth-input ${errors.password ? 'input-error' : ''}`} type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={e => update('password', e.target.value)} /><button type="button" className="auth-input-right" onClick={() => setShowPw(s => !s)}>{showPw ? <EyeOffIcon /> : <EyeIcon />}</button></div>
          {errors.password && <p className="auth-error">{errors.password}</p>}
        </div>
        <div className="auth-field">
          <label className="auth-label">Confirm Password</label>
          <div className="auth-input-wrapper"><input className={`auth-input ${errors.confirmPassword ? 'input-error' : ''}`} type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} /><button type="button" className="auth-input-right" onClick={() => setShowConfirm(s => !s)}>{showConfirm ? <EyeOffIcon /> : <EyeIcon />}</button></div>
          {errors.confirmPassword && <p className="auth-error">{errors.confirmPassword}</p>}
        </div>
        <div className="auth-field">
          <label className="auth-label">Phone Number</label>
          <input className={`auth-input ${errors.phone ? 'input-error' : ''}`} placeholder="Enter your phone number" value={form.phone} onChange={e => update('phone', e.target.value)} />
          {errors.phone && <p className="auth-error">{errors.phone}</p>}
        </div>
        <div className="auth-field">
          <label className="auth-label">CashWallet</label>
          <label className={`auth-upload-area ${errors.cashwallet ? 'upload-error' : ''} ${cashwalletFile ? 'upload-done' : ''}`}>
            <UploadIcon size={18} />
            <span>{cashwalletFile ? cashwalletFile.name : 'Upload a clear picture of your cashwallet'}</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { setCashwalletFile(e.target.files[0] || null); if (errors.cashwallet) setErrors(p => ({ ...p, cashwallet: null })); }} />
          </label>
          {errors.cashwallet && <p className="auth-error">{errors.cashwallet}</p>}
          <p className="auth-helper">The cashwallet scan is used for identity verification purposes</p>
        </div>
        <div className="auth-field">
          <label className="auth-label">I am a...</label>
          <div className="role-row">
            {[{ label: 'Passenger', Icon: UserIcon }, { label: 'Driver', Icon: CarIcon }].map(({ label, Icon }) => (
              <button key={label} type="button" className={`role-pill ${form.role === label ? 'role-pill-active' : ''}`} onClick={() => update('role', label)}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        </div>
        <button className="auth-btn" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create My Account'}</button>
      </form>
      <p className="auth-link-row">Already have an account?{' '}<button className="auth-link" onClick={() => navigate('/login')}>Sign In</button></p>
    </AuthLayout>
  );
}
