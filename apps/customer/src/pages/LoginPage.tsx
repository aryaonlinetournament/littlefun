import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      const result = await signIn(email, password);
      if (result?.isPendingApproval) {
        navigate('/pending-verification', { replace: true });
      } else {
        navigate('/discover', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
        setError('Invalid email or password.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (msg.includes('network-request-failed')) {
        setError('Network error: Unable to reach authentication server. If you use Brave browser or an AdBlocker, please disable shields/adblock for localhost and retry.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
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

      {/* ── LOGIN CARD ─────────────────────────────────────────── */}
      <div className="login-card-container">
        <div className="login-form-header">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            Sign in to access your VIP account &amp; connections
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
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
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="input-icon-wrapper">
              <span className="input-lead-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input custom-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
            disabled={loading || !email || !password}
            id="login-submit-btn"
          >
            {loading ? (
              <span className="btn-loading-flex">
                <span className="spinner-small" />
                <span>Signing in…</span>
              </span>
            ) : (
              <span>Sign In ➔</span>
            )}
          </button>
        </form>

        {/* Footer info & security badge */}
        <div className="login-footer">
          <div style={{
            background: 'rgba(200, 56, 109, 0.08)',
            border: '1px solid rgba(200, 56, 109, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '4px' }}>
              Don't have a verified client account?
            </div>
            <Link to="/register" style={{
              color: '#C8386D',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              Apply for VIP Access &amp; Register ➔
            </Link>
          </div>

          <p className="login-help-text">
            Need VIP Access or Support? Contact us to get started.
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
          border-radius: 9999px;
          backdrop-filter: blur(8px);
        }

        /* ── CARD CONTAINER ─────────────────────────────────────── */
        .login-card-container {
          flex: 1;
          background: #ffffff;
          border-radius: 28px 28px 0 0;
          padding: 32px 24px 44px;
          margin-top: -18px;
          box-shadow: 0 -8px 32px rgba(26, 18, 40, 0.12);
          max-width: 480px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 2;
        }

        .login-form-header {
          margin-bottom: 24px;
          text-align: left;
        }

        .login-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
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
          gap: 18px;
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
          margin-top: 28px;
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

        .login-help-text {
          font-size: 0.82rem;
          color: #5A4E70;
        }
      `}</style>
    </div>
  );
}
