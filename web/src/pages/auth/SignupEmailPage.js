import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import StepIndicator from '../../components/common/StepIndicator';
import '../../components/auth/AuthLayout.css';

export default function SignupEmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = (v) => /^[^\s@]+@aui\.ma$/.test(v.toLowerCase().trim());

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!email) { setError('Please enter your AUI email address'); return; }
    if (!isValid(email)) { setError('Please use your AUI institutional email (@aui.ma)'); return; }
    setError('');
    setLoading(true);
    // TODO: POST /auth/send-verification
    setTimeout(() => {
      setLoading(false);
      navigate('/signup/inbox', { state: { email: email.trim() } });
    }, 1000);
  };

  const emailState = !email ? 'default' : isValid(email) ? 'valid' : email.length > 4 ? 'invalid' : 'default';

  return (
    <AuthLayout>
      <h1 className="auth-title">Join AUI Carpool</h1>
      <p className="auth-subtitle">Verify your AUI identity to get started</p>

      <StepIndicator currentStep={1} totalSteps={3} />

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label">Enter your AUI email:</label>
          <input
            className={`auth-input ${emailState === 'invalid' || error ? 'input-error' : emailState === 'valid' ? '' : ''}`}
            type="email"
            placeholder="yourname@aui.ma"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            autoFocus
          />
          {(error || emailState === 'invalid') && (
            <p className="auth-error">
              {error || 'Please use your AUI institutional email (@aui.ma)'}
            </p>
          )}
        </div>

        <button
          className="auth-btn"
          type="submit"
          disabled={loading || emailState === 'invalid'}
        >
          {loading ? 'Sending...' : 'Send Verification Link'}
        </button>
      </form>

      <p className="auth-link-row">
        Already have an account?{' '}
        <button className="auth-link" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </p>
    </AuthLayout>
  );
}
