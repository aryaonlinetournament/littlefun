import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export default function AdminLoginPage() {
  const { signIn, signUp, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('aryaonlinetournament@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [canSetup, setCanSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'setup'>('signin');

  if (isAdmin) { navigate('/dashboard', { replace: true }); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCanSetup(false);
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'setup') {
        await signUp(cleanEmail, password);
      } else {
        await signIn(cleanEmail, password);
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('user-not-found') || msg.includes('USER_NOT_FOUND') || msg.includes('User account not found')) {
        setError('Account not yet initialized in Firebase. Click below to setup/create this admin password.');
        setCanSetup(true);
      } else if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('auth/invalid-email')) {
        setError('Invalid email or password.');
      } else if (msg.includes('email-already-in-use')) {
        setError('Account already exists. Please switch to Sign In mode.');
        setMode('signin');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSetup = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Setup failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--sidebar-bg, #0D0A14)',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--surface, #181126)',
        borderRadius: 'var(--radius-xl, 20px)',
        padding: '36px 30px',
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255, 42, 122, 0.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💛</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>LittleFun</div>
          <div style={{ fontSize: '0.78rem', color: '#FF2A7A', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4, fontWeight: 700 }}>
            Super Admin Portal
          </div>
        </div>

        {/* Mode Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(0, 0, 0, 0.35)',
          padding: 4,
          borderRadius: 10,
          marginBottom: 20,
        }}>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); setCanSetup(false); }}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: 8,
              background: mode === 'signin' ? 'rgba(255, 42, 122, 0.25)' : 'none',
              color: mode === 'signin' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('setup'); setError(''); setCanSetup(false); }}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: 8,
              background: mode === 'setup' ? 'rgba(255, 42, 122, 0.25)' : 'none',
              color: mode === 'setup' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            First-Time Setup
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
              Admin Email
            </label>
            <input
              id="admin-email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@littlefun.in"
              autoComplete="email"
              required
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                padding: '11px 14px',
                color: '#fff',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 4 }}>
              {mode === 'setup' ? 'Set New Password (min 6 characters)' : 'Password'}
            </label>
            <input
              id="admin-password"
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
              required
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 10,
                padding: '11px 14px',
                color: '#fff',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: '0.8rem',
              marginBottom: 16,
              lineHeight: 1.4,
            }}>
              ⚠️ {error}
            </div>
          )}

          {canSetup && (
            <button
              type="button"
              onClick={handleQuickSetup}
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '12px',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                marginBottom: 12,
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              {loading ? 'Initializing…' : '⚡ Initialize / Register This Admin Account'}
            </button>
          )}

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #FF2A7A 0%, #9333EA 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '13px',
              borderRadius: 12,
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(255, 42, 122, 0.35)',
            }}
          >
            {loading ? 'Processing…' : (mode === 'setup' ? 'Set Password & Enter Admin' : 'Sign In to Admin')}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.45)', marginTop: 20, lineHeight: 1.4 }}>
          Super Admin email: <code style={{ color: '#FF2A7A' }}>aryaonlinetournament@gmail.com</code>
        </p>
      </div>
    </div>
  );
}
