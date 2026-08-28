import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PendingVerificationPage() {
  const { user, uniqueId, userStatus, verificationStatus, refreshUser, logOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');

  useEffect(() => {
    // If approved or active, redirect straight to discover
    if (userStatus === 'ACTIVE' || verificationStatus === 'APPROVED') {
      navigate('/discover', { replace: true });
    }
  }, [userStatus, verificationStatus, navigate]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMsg('');
    try {
      await refreshUser();
    } catch {
      setCheckMsg('Unable to refresh status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await logOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="pending-page">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="pending-hero">
        <div className="pending-logo-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="pending-brand-title">LittleFun VIP Access</div>
        <p className="pending-tagline">Verification In Progress</p>
      </div>

      {/* ── CARD CONTENT ────────────────────────────────────────── */}
      <div className="pending-card-container">
        <div className="pending-card">
          <div className="status-badge-wrap">
            <span className="status-pill-pending">⏳ Under Review</span>
          </div>

          <h1 className="pending-title">Under Review</h1>
          <p className="pending-desc">
            Welcome to LittleFun. To ensure a safe and exclusive experience, all new member profiles are verified before granting full access.
          </p>

          <div className="client-info-box">
            <div className="info-row">
              <span className="info-lbl">Client ID:</span>
              <span className="info-val highlight">{uniqueId || '#LF-PENDING'}</span>
            </div>
            <div className="info-row">
              <span className="info-lbl">Account Email:</span>
              <span className="info-val">{user?.email || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-lbl">Review Status:</span>
              <span className="info-val yellow">Under Review</span>
            </div>
          </div>

          {checkMsg && (
            <div className="status-toast-msg">
              ℹ️ {checkMsg}
            </div>
          )}

          <div className="pending-actions">
            <button
              type="button"
              className="refresh-btn"
              onClick={handleCheckStatus}
              disabled={checking}
            >
              {checking ? 'Checking Status…' : '🔄 Check Status'}
            </button>

            <button
              type="button"
              className="signout-btn"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>

          <div className="vip-support-note">
            <span>✨</span>
            <span>Once verified, you will receive instant access to VIP profiles and private chats.</span>
          </div>
        </div>
      </div>

      <style>{`
        .pending-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0D0A14;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
        }

        .pending-hero {
          background: linear-gradient(145deg, #1A1228 0%, #38142A 50%, #1A1228 100%);
          padding: 44px 20px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 1px solid rgba(255, 42, 122, 0.15);
        }

        .pending-logo-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #FF8FAB 0%, #C8386D 50%, #9E2855 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(200, 56, 109, 0.4);
          margin-bottom: 10px;
        }

        .pending-brand-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .pending-tagline {
          font-size: 0.86rem;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 4px;
        }

        .pending-card-container {
          flex: 1;
          max-width: 480px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 20px 48px;
        }

        .pending-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        }

        .status-badge-wrap {
          margin-bottom: 16px;
        }

        .status-pill-pending {
          display: inline-block;
          background: rgba(234, 179, 8, 0.15);
          border: 1px solid rgba(234, 179, 8, 0.4);
          color: #fde047;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: 20px;
          letter-spacing: 0.04em;
        }

        .pending-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .pending-desc {
          font-size: 0.86rem;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.55;
          margin-bottom: 24px;
        }

        .client-info-box {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
          text-align: left;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.84rem;
        }

        .info-lbl {
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .info-val {
          font-weight: 600;
          color: #ffffff;
        }

        .info-val.highlight {
          color: #FF8FAB;
          font-family: monospace;
          font-size: 0.95rem;
        }

        .info-val.yellow {
          color: #fde047;
        }

        .status-toast-msg {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #93c5fd;
          font-size: 0.8rem;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .pending-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .refresh-btn {
          width: 100%;
          background: linear-gradient(135deg, #FF2A7A 0%, #C8386D 100%);
          border: none;
          color: #ffffff;
          padding: 13px 20px;
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(255, 42, 122, 0.35);
          transition: transform 0.15s;
        }

        .refresh-btn:hover {
          transform: translateY(-1px);
        }

        .signout-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.7);
          padding: 11px 20px;
          border-radius: 12px;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
        }

        .signout-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .vip-support-note {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.76rem;
          color: rgba(255, 255, 255, 0.45);
          text-align: left;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
