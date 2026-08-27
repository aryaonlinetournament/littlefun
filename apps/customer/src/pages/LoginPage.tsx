import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
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
      if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please enter your full name or nickname.');
        }
        await signUp(email, password, displayName.trim());
      } else {
        await signIn(email, password);
      }
      navigate('/discover');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please Sign In.');
      } else if (msg.includes('weak-password')) {
        setError('Password should be at least 6 characters.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('aryaonlinetournament@gmail.com');
    setPassword('123456');
    setMode('signin');
    setError('');
  };

  return (
    <div className="login-page">
      {/* ── TOP HERO HEADER (LittleFun Signature Style) ──────────── */}
      <div className="login-hero">
        <div className="login-brand-header">
          <div className="login-logo-box">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>

          <div className="login-brand-text">
            L<span className="dot-i-wrap">ı<svg className="i-heart-dot" viewBox="0 0 24 24" fill="#FF2A7A"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>ttle&nbsp;<span className="pink-text">Fun</span>
          </div>
        </div>

        <p className="login-tagline">
          Exclusive VIP Companionship &amp; Verified Connections
        </p>

        {/* Decorative Floating Heart Chips */}
        <div className="login-hero-badges">
          <span className="hero-badge">✨ 100% Verified Profiles</span>
          <span className="hero-badge">🔒 Private &amp; Secure</span>
        </div>
      </div>

      {/* ── LOGIN / SIGNUP CARD ──────────────────────────────────── */}
      <div className="login-card-container">
        {/* Tab Toggle */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Create Account
          </button>
        </div>

        <div className="login-form-header">
          <h1 className="login-title">
            {mode === 'signin' ? 'Welcome back' : 'Join LittleFun'}
          </h1>
          <p className="login-subtitle">
            {mode === 'signin'
              ? 'Enter your credentials to access your VIP account'
              : 'Sign up to discover and connect with companions'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label" htmlFor="displayName">
                Full Name / Nickname
              </label>
              <div className="input-icon-wrapper">
                <span className="input-lead-icon">👤</span>
                <input
                  id="displayName"
                  type="text"
                  className="form-input custom-input"
                  placeholder="e.g. Arya / Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email address
            </label>
            <div className="input-icon-wrapper">
              <span className="input-lead-icon">✉️</span>
              <input
                id="email"
                type="email"
                className="form-input custom-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="password">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="demo-fill-btn"
                  title="Auto-fill demo test account"
                >
                  ⚡ Quick Demo Login
                </button>
              )}
            </div>
            <div className="input-icon-wrapper">
              <span className="input-lead-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input custom-input"
                placeholder={mode === 'signup' ? 'Create a secure password (min 6 chars)' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error-banner" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading || !email || !password || (mode === 'signup' && !displayName)}
            id="login-submit-btn"
          >
            {loading ? (
              <span className="btn-loading-flex">
                <span className="spinner-small" />
                <span>{mode === 'signin' ? 'Signing in…' : 'Creating Account…'}</span>
              </span>
            ) : (
              <span>{mode === 'signin' ? 'Sign In ➔' : 'Create Account ➔'}</span>
            )}
          </button>
        </form>

        {/* Footer info & security badge */}
        <div className="login-footer">
          <div className="security-badge">
            <span className="shield-icon">🛡️</span>
            <span>256-Bit SSL Encrypted • 100% Confidential</span>
          </div>

          <p className="toggle-mode-text">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button type="button" className="inline-link-btn" onClick={() => { setMode('signup'); setError(''); }}>
                  Sign up now
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="inline-link-btn" onClick={() => { setMode('signin'); setError(''); }}>
                  Sign in here
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #F8F8FC;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* ── HERO BANNER ────────────────────────────────────────── */
        .login-hero {
          background: linear-gradient(145deg, #1A1228 0%, #38142A 50%, #1A1228 100%);
          padding: 48px 24px 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
          border-bottom: 2px solid rgba(232, 90, 143, 0.35);
        }

        .login-hero::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232, 90, 143, 0.3) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .login-logo-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #FF8FAB 0%, #C8386D 50%, #9E2855 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(200, 56, 109, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.25);
        }

        .login-brand-text {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
        }

        .login-brand-text .pink-text {
          color: #FF8FAB;
          margin-left: 2px;
        }

        .dot-i-wrap {
          position: relative;
          display: inline-block;
        }

        .i-heart-dot {
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 9px;
          height: 9px;
        }

        .login-tagline {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.94rem;
          max-width: 320px;
          line-height: 1.45;
          margin-bottom: 18px;
        }

        .login-hero-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .hero-badge {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #FF8FAB;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 12px;
          borderRadius: 9999px;
          backdrop-filter: blur(8px);
        }

        /* ── CARD CONTAINER ─────────────────────────────────────── */
        .login-card-container {
          flex: 1;
          background: #ffffff;
          border-radius: 28px 28px 0 0;
          padding: 28px 24px 40px;
          margin-top: -18px;
          box-shadow: 0 -8px 32px rgba(26, 18, 40, 0.12);
          max-width: 480px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 2;
        }

        /* ── TABS ───────────────────────────────────────────────── */
        .login-tabs {
          display: flex;
          background: #F0F0F8;
          padding: 4px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .login-tab {
          flex: 1;
          padding: 10px 0;
          text-align: center;
          font-size: 0.88rem;
          font-weight: 700;
          color: #5A4E70;
          border: none;
          background: transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .login-tab.active {
          background: #ffffff;
          color: #C8386D;
          box-shadow: 0 2px 8px rgba(26, 18, 40, 0.08);
        }

        .login-form-header {
          margin-bottom: 20px;
        }

        .login-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.55rem;
          font-weight: 800;
          color: #1A1228;
          margin-bottom: 4px;
        }

        .login-subtitle {
          color: #5A4E70;
          font-size: 0.88rem;
        }

        /* ── FORM INPUTS ────────────────────────────────────────── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #1A1228;
        }

        .input-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-lead-icon {
          position: absolute;
          left: 14px;
          font-size: 1.05rem;
          pointer-events: none;
          z-index: 1;
        }

        .custom-input {
          width: 100%;
          padding: 13px 44px 13px 42px;
          border-radius: 14px;
          border: 1.5px solid #E8E0F0;
          background: #F8F8FC;
          font-size: 0.92rem;
          color: #1A1228;
          transition: all 0.2s ease;
          outline: none;
        }

        .custom-input:focus {
          border-color: #E85A8F;
          background: #ffffff;
          box-shadow: 0 0 0 3.5px rgba(232, 90, 143, 0.18);
        }

        .input-eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 4px;
          color: #9B8FB0;
        }

        .demo-fill-btn {
          background: none;
          border: none;
          color: #C8386D;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
          transition: background 0.15s;
        }

        .demo-fill-btn:hover {
          background: #FFF0F5;
        }

        .form-error-banner {
          background: #FFF0F5;
          border: 1.5px solid #FF8FAB;
          color: #C8386D;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 0.84rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── SUBMIT BUTTON ──────────────────────────────────────── */
        .login-submit-btn {
          margin-top: 6px;
          background: linear-gradient(135deg, #C8386D 0%, #E85A8F 100%);
          color: #ffffff;
          border: none;
          padding: 15px 20px;
          border-radius: 16px;
          font-size: 0.96rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(200, 56, 109, 0.32);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 26px rgba(200, 56, 109, 0.42);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-loading-flex {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── FOOTER ─────────────────────────────────────────────── */
        .login-footer {
          margin-top: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F8F8FC;
          border: 1px solid #E8E0F0;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 600;
          color: #5A4E70;
        }

        .toggle-mode-text {
          font-size: 0.86rem;
          color: #5A4E70;
        }

        .inline-link-btn {
          background: none;
          border: none;
          color: #C8386D;
          font-weight: 800;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          font-size: inherit;
        }
      `}</style>
    </div>
  );
}
