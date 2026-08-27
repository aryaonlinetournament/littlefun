import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MEMBER_AVATARS = [
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80&auto=format&fit=crop',
    name: 'Priya, 23',
    city: 'Delhi',
    verified: true,
  },
  {
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=80&auto=format&fit=crop',
    name: 'Meera, 24',
    city: 'Mumbai',
    verified: true,
  },
  {
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80&auto=format&fit=crop',
    name: 'Ananya, 22',
    city: 'Bengaluru',
    verified: true,
  },
  {
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80&auto=format&fit=crop',
    name: 'Kabir, 25',
    city: 'Goa',
    verified: true,
  },
  {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop',
    name: 'Rhea, 23',
    city: 'Chandigarh',
    verified: true,
  },
];

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
        setError('Sign in failed. Please check credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── LUXURY HERO SECTION WITH YOUNG ADULT MEMBER SHOWCASE ── */}
      <div className="login-hero">
        {/* Ambient Glow Orbs */}
        <div className="hero-glow-orb glow-1" />
        <div className="hero-glow-orb glow-2" />

        {/* Brand Header */}
        <div className="login-logo">
          <div className="logo-badge">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span className="login-logo-text">LittleFun</span>
        </div>

        <p className="login-tagline">Where verified young adults meet & connect</p>

        {/* Dynamic Member Avatar Showcase */}
        <div className="member-showcase">
          <div className="member-avatar-row">
            {MEMBER_AVATARS.map((m, idx) => (
              <div key={idx} className="showcase-avatar-wrapper" style={{ animationDelay: `${idx * 0.15}s` }}>
                <img src={m.url} alt={m.name} className="showcase-avatar-img" />
                <span className="showcase-verified-dot">✓</span>
              </div>
            ))}
          </div>

          <div className="member-stat-badge">
            <span className="pulse-dot" />
            <span><strong>2,400+ Verified Members</strong> Active Now</span>
          </div>
        </div>
      </div>

      {/* ── LOGIN FORM CONTAINER ── */}
      <div className="login-form-container">
        <div className="form-card-header">
          <h1 className="login-form-title">Welcome back ✨</h1>
          <p className="login-form-sub">Sign in to access verified companions and events</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <span>📧 Email address</span>
            </label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="password">
                <span>🔒 Password</span>
              </label>
            </div>
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
            className="btn btn-primary btn-block btn-lg login-submit-btn"
            disabled={loading || !email || !password}
            id="login-submit-btn"
          >
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in…
              </span>
            ) : (
              'Sign In ➔'
            )}
          </button>
        </form>

        {/* Trust Badges */}
        <div className="trust-footer">
          <div className="trust-item">
            <span className="trust-icon">🛡️</span>
            <span>100% Aadhaar Verified</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span>End-to-End Privacy</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">⚡</span>
            <span>Instant Connections</span>
          </div>
        </div>

        <p className="login-help-text">
          Need assistance or onboarding? <a href="mailto:support@littlefun.in" className="help-link">Contact Concierge</a>
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #1A1228;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          position: relative;
        }

        .login-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          padding: 48px 20px 42px;
          background: linear-gradient(135deg, #240E1E 0%, #C8386D 50%, #9E2855 100%);
          overflow: hidden;
          text-align: center;
        }

        .hero-glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(50px);
          pointer-events: none;
        }
        .glow-1 {
          top: -30px;
          left: 10%;
          width: 140px;
          height: 140px;
          background: rgba(255, 143, 171, 0.4);
        }
        .glow-2 {
          bottom: 10px;
          right: 5%;
          width: 180px;
          height: 180px;
          background: rgba(139, 92, 246, 0.3);
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
          z-index: 1;
        }

        .logo-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: linear-gradient(135deg, #FF2A7A, #E85A8F);
          display: flex;
          align-items: center;
          justifyContent: center;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
          border: 1.5px solid rgba(255, 255, 255, 0.4);
        }

        .login-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.01em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .login-tagline {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.94rem;
          margin-bottom: 24px;
          z-index: 1;
          font-weight: 500;
        }

        /* Member Showcase */
        .member-showcase {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 1;
        }

        .member-avatar-row {
          display: flex;
          align-items: center;
          justifyContent: center;
          gap: -12px;
        }

        .showcase-avatar-wrapper {
          position: relative;
          margin: 0 -6px;
          transition: transform 0.25s ease;
          animation: floatSlow 3s ease-in-out infinite alternate;
        }

        .showcase-avatar-wrapper:hover {
          transform: translateY(-4px) scale(1.12);
          z-index: 10;
        }

        .showcase-avatar-img {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2.5px solid #ffffff;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
          display: block;
        }

        .showcase-verified-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 17px;
          height: 17px;
          background: #10B981;
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 50%;
          font-size: 0.6rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .member-stat-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 6px 14px;
          border-radius: 9999px;
          color: #ffffff;
          font-size: 0.78rem;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #22C55E;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.35);
          animation: pulseGreen 2s infinite;
        }

        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        @keyframes floatSlow {
          0% { transform: translateY(0); }
          100% { transform: translateY(-4px); }
        }

        /* Form Container */
        .login-form-container {
          background: #ffffff;
          border-radius: 28px 28px 0 0;
          padding: 30px 24px 40px;
          margin-top: -20px;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.15);
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .form-card-header {
          margin-bottom: 20px;
        }

        .login-form-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.55rem;
          font-weight: 700;
          color: var(--color-text, #1A1228);
          margin-bottom: 4px;
        }

        .login-form-sub {
          color: var(--color-text-2, #5A4E70);
          font-size: 0.88rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-text, #1A1228);
        }

        .form-input {
          width: 100%;
          padding: 13px 16px;
          border: 1.5px solid var(--color-border, #E8E0F0);
          border-radius: 14px;
          font-size: 0.94rem;
          color: var(--color-text, #1A1228);
          background: var(--color-surface-2, #F8F8FC);
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: var(--color-primary-light, #E85A8F);
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(232, 90, 143, 0.15);
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper .form-input {
          padding-right: 48px;
        }

        .input-suffix-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          color: var(--color-text-3, #9B8FB0);
          padding: 4px 6px;
          cursor: pointer;
          background: none;
          border: none;
        }

        .form-error-banner {
          background: #FDEDEC;
          color: #C0392B;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          border: 1px solid rgba(192, 57, 43, 0.2);
        }

        .login-submit-btn {
          margin-top: 6px;
          background: var(--gradient-primary, linear-gradient(135deg, #C8386D, #E85A8F));
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-size: 0.98rem;
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(200, 56, 109, 0.3);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(200, 56, 109, 0.4);
        }

        .login-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Trust Footer */
        .trust-footer {
          display: flex;
          justifyContent: space-around;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid var(--color-border, #E8E0F0);
        }

        .trust-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--color-text-2, #5A4E70);
          text-align: center;
        }

        .trust-icon {
          font-size: 1.1rem;
        }

        .login-help-text {
          text-align: center;
          color: var(--color-text-3, #9B8FB0);
          font-size: 0.8rem;
          margin-top: 18px;
        }

        .help-link {
          color: var(--color-primary, #C8386D);
          font-weight: 700;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
