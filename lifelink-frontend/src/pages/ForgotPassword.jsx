import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Enter your email or phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { identifier: identifier.trim() });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Enter the 6-digit OTP sent to your email');
      return;
    }
    setStep('password');
    setError('');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters with uppercase, lowercase, number, and special character (@$!%*?&)');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(newPassword)) {
      setError('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { identifier: identifier.trim(), otp, newPassword });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-icons">
        <img src="/heart.avif" className="auth-bg-icon i1" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i2" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i3" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i4" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i5" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i6" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i7" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i8" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i9" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i10" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i11" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i12" alt="" />
        <img src="/heart.avif" className="auth-bg-icon i13" alt="" />
      </div>
      <div className="auth-card glass-strong">
        <div className="auth-logo">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <path
              d="M16 3C16 3 26 12 26 18C26 23.5228 21.5228 28 16 28C10.4772 28 6 23.5228 6 18C6 12 16 3 16 3Z"
              fill="url(#logoGrad)"
            />
            <path
              d="M11 18H13.5L15 13L17 21L18.5 18H21"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="logo-text">LIFELINK</span>
        </div>
        <h2>Reset Password</h2>
        <p className="auth-subtitle">
          {step === 'identifier' && 'Enter your email or phone to receive OTP'}
          {step === 'otp' && 'Enter the OTP sent to your email'}
          {step === 'password' && 'Create your new password'}
        </p>

        {step === 'identifier' && (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label className="form-label">Email or Phone</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter email or phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <div className="form-group">
              <label className="form-label">OTP</label>
              <input
                className="form-input"
                type="text"
                placeholder="6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
              Verify OTP
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Min 12 chars, uppercase, lowercase, number, special char"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-footer" style={{ marginTop: 24 }}>
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
