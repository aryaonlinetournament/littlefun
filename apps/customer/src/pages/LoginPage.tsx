import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/discover');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-logo">
          <span className="login-logo-icon">💛</span>
          <span className="login-logo-text">LittleFun</span>
        </div>
        <p className="login-tagline">Discover meaningful connections</p>
      </div>

      <div className="login-form-container">
        <h1 className="login-form-title">Welcome back</h1>
        <p className="login-form-sub">Sign in to continue your journey</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || !email || !password}
            id="login-submit-btn"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-help-text">
          Don't have an account? Contact us to get started.
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--gradient-surface);
        }
        .login-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-3xl) var(--space-xl);
          background: var(--gradient-warm);
          min-height: 280px;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }
        .login-logo-icon { font-size: 2.5rem; }
        .login-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
        }
        .login-tagline {
          color: rgba(255,255,255,0.85);
          font-size: 1rem;
          text-align: center;
        }
        .login-form-container {
          background: var(--color-surface);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          padding: var(--space-xl) var(--space-lg) var(--space-3xl);
          margin-top: -24px;
        }
        .login-form-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--color-text);
          margin-bottom: 4px;
        }
        .login-form-sub {
          color: var(--color-text-3);
          font-size: 0.9rem;
          margin-bottom: var(--space-xl);
        }
        .login-form { display: flex; flex-direction: column; gap: 4px; }
        .input-wrapper { position: relative; }
        .input-wrapper .form-input { padding-right: 48px; }
        .input-suffix-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
          color: var(--color-text-3);
          padding: 4px;
        }
        .form-error-banner {
          background: #FDEDEC;
          color: #C0392B;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          margin-bottom: 4px;
        }
        .login-help-text {
          text-align: center;
          color: var(--color-text-3);
          font-size: 0.85rem;
          margin-top: var(--space-lg);
        }
      `}</style>
    </div>
  );
}
