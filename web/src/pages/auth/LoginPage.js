import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/auth/AuthLayout';
import '../../components/auth/AuthLayout.css';

const EyeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeOffIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const XIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const MailIcon = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;

const isAuiEmail = (email) => /^[^\s@]+@aui\.ma$/i.test(email.trim());

function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const handleSend = () => {
    if (!email) { setError('Email is required'); return; }
    if (!isAuiEmail(email)) { setError('Please use your AUI email (@aui.ma)'); return; }
    setSent(true);
  };
  if (sent) return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e=>e.stopPropagation()} style={{textAlign:'center'}}>
      <MailIcon />
      <h3 className="modal-title" style={{marginTop:12}}>Reset Link Sent</h3>
      <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20,lineHeight:1.5}}>We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.</p>
      <button className="auth-btn" onClick={onClose}>Back to Login</button>
    </div></div>
  );
  return (
    <div className="modal-overlay" onClick={onClose}><div className="modal-content" onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><h3 className="modal-title" style={{margin:0}}>Reset Password</h3><button style={{background:'none',border:'none',cursor:'pointer'}} onClick={onClose}><XIcon/></button></div>
      <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20,lineHeight:1.5}}>Enter your AUI email and we'll send you a link to reset your password.</p>
      <div className="auth-field">
        <label className="auth-label">AUI Email</label>
        <input className={`auth-input ${error?'input-error':''}`} type="email" placeholder="yourname@aui.ma" value={email} onChange={e=>{setEmail(e.target.value);setError('');}}/>
        {error && <p className="auth-error">{error}</p>}
      </div>
      <button className="auth-btn" onClick={handleSend}>Send Reset Link</button>
    </div></div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!isAuiEmail(form.email)) e.email = 'Please use your AUI institutional email (@aui.ma)';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const namePart = form.email.split('@')[0];
    const firstName = namePart.split('.')[0] || 'User';
    const lastName = namePart.split('.')[1] || '';
    const initials = (firstName[0] + (lastName[0] || '')).toUpperCase();
    setTimeout(() => {
      setUser(prev => ({ ...prev, firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1), lastName: lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '', email: form.email, initials, isAuthenticated: true }));
      setLoading(false);
      navigate('/home');
    }, 1200);
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">Sign in to your AUI Carpool account</p>
      <form onSubmit={handleLogin}>
        <div className="auth-field"><label className="auth-label">AUI Email</label><input className={`auth-input ${errors.email?'input-error':''}`} type="email" placeholder="yourname@aui.ma" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>{errors.email && <p className="auth-error">{errors.email}</p>}</div>
        <div className="auth-field"><label className="auth-label">Password</label><div className="auth-input-wrapper"><input className={`auth-input ${errors.password?'input-error':''}`} type={showPassword?'text':'password'} placeholder="Enter your password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" className="auth-input-right" onClick={()=>setShowPassword(s=>!s)}>{showPassword?<EyeOffIcon/>:<EyeIcon/>}</button></div>{errors.password && <p className="auth-error">{errors.password}</p>}</div>
        <div style={{textAlign:'right',marginBottom:24,marginTop:-8}}><button type="button" className="auth-link" onClick={()=>setShowForgot(true)}>Forgot password?</button></div>
        <button className="auth-btn" type="submit" disabled={loading}>{loading?'Signing in...':'Log In'}</button>
      </form>
      <p className="auth-link-row">Don't have an account?{' '}<button className="auth-link" onClick={()=>navigate('/signup')}>Sign Up</button></p>
      <div style={{marginTop:24,paddingTop:24,borderTop:'1px solid #f0f0f0',textAlign:'center'}}><button type="button" className="auth-link" onClick={()=>navigate('/admin-passcode')} style={{fontSize:12}}>Are you an admin?</button></div>
      {showForgot && <ForgotPasswordModal onClose={()=>setShowForgot(false)}/>}
    </AuthLayout>
  );
}
