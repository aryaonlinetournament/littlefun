import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export default function AdminLoginPage() {
  const { signIn, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAdmin) { navigate('/dashboard', { replace: true }); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('auth/invalid-email')) {
        setError('Invalid email or password.');
      } else if (msg.includes('USER_NOT_FOUND')) {
        setError('No admin account found for this email.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
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
      background: 'var(--sidebar-bg)',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 36px',
        maxWidth: 400,
        width: '100%',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💛</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: 700 }}>LittleFun</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Admin Portal</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="admin-email" className="form-input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@littlefun.in" autoComplete="email" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="admin-password" className="form-input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>
          )}

          <button id="admin-login-btn" type="submit" className="btn btn-primary" disabled={loading || !email || !password}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? 'Signing in…' : 'Sign In to Admin'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 20 }}>
          This portal is for LittleFun staff only.
        </p>
      </div>
    </div>
  );
}
