import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PendingVerificationPage() {
  const { user, uniqueId, userStatus, verificationStatus, refreshUser, logOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');
  
  // Payment State
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const UPI_ID = 'aryafun@ptaxis';
  const PAYEE_NAME = 'LittleFun With Partner';
  const AMOUNT = '299';
  const NOTE = `LittleFun Registration ID ${uniqueId || 'NEW'}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`;
  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

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

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUtrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || !custPhone.trim()) return;

    // Save record
    const record = {
      memberId: uniqueId || 'N/A',
      email: user?.email,
      phone: custPhone,
      utr: utrNumber,
      amount: 299,
      date: new Date().toISOString()
    };
    try {
      const saved = JSON.parse(localStorage.getItem('littlefun_dating_payments') || '[]');
      saved.push(record);
      localStorage.setItem('littlefun_dating_payments', JSON.stringify(saved));
    } catch {}

    setIsSubmitted(true);
  };

    const waNumber = '918796215984';
    const waText = encodeURIComponent(
      `*LittleFun VIP Registration Payment Proof*\n` +
      `--------------------------\n` +
      `*Client ID:* ${uniqueId || 'Pending'}\n` +
      `*Email:* ${user?.email || 'N/A'}\n` +
      `*Phone:* ${custPhone}\n` +
      `*Amount:* ₹299\n` +
      `*UTR / Ref No:* ${utrNumber}\n\n` +
      `Please approve my account and provide 2-3 meeting profiles for my area.`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

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
        
        {/* Status Info Card */}
        <div className="pending-card">
          <div className="status-badge-wrap">
            <span className="status-pill-pending">⏳ Under Review</span>
          </div>

          <h1 className="pending-title">Under Review</h1>
          <p className="pending-desc">
            Welcome to LittleFun. To ensure a safe and exclusive experience, all new member profiles are verified by Admin before granting full access.
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
        </div>

        {/* ── DEDICATED ₹299 ACTIVATION PAYMENT CARD ─────────────── */}
        <div className="payment-card">
          <div className="payment-badge-row">
            <span className="payment-tag">⚡ FAST-TRACK ACTIVATION</span>
            <span className="discount-pill">50% OFF TODAY</span>
          </div>

          <h2 className="payment-headline">For Activating, Payment Charge is ₹299/-</h2>
          <p className="payment-subtext">
            Pay ₹299 to verify your profile, get instant admin approval, and unlock <strong>2-3 genuine partner meetings</strong> in your area.
          </p>

          {/* Price Box */}
          <div className="price-tag-box">
            <div>
              <div className="price-lbl">ONE-TIME REGISTRATION FEE</div>
              <div className="price-row">
                <span className="current-price">₹299</span>
                <span className="old-price">₹599</span>
              </div>
            </div>
            <div className="price-perks">
              <div>✓ Instant Approval</div>
              <div>✓ 2-3 Local Meetings</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="benefits-list">
            <div className="benefit-row">
              <span className="benefit-check">✓</span>
              <span><strong>2-3 Genuine Meetings</strong> aapke city/area me provide ki jayegi</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-check">✓</span>
              <span><strong>100% Verified Profiles on App</strong> (real photos & chat access)</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-check">✓</span>
              <span><strong>100% Privacy & Discreet:</strong> Aapki identity safe rahegi</span>
            </div>
          </div>

          {/* 1-Tap Mobile UPI Direct Pay Button */}
          <a href={upiUrl} className="btn-pay-upi">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
            <span>Pay ₹299 Now (Open Any UPI App)</span>
          </a>

          {/* Quick UPI App Links Grid */}
          <div className="upi-grid-title">SELECT PAYMENT APP:</div>
          <div className="upi-app-grid">
            <a href={`tez://upi/pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-pill gpay">
              Google Pay
            </a>
            <a href={`phonepe://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-pill phonepe">
              PhonePe
            </a>
            <a href={`paytmmp://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-pill paytm">
              Paytm UPI
            </a>
            <a href={upiUrl} className="upi-pill bhim">
              BHIM / Other
            </a>
          </div>

          {/* Dynamic QR Code Box */}
          <div className="qr-container">
            <div className="qr-title">Scan QR Code to Pay ₹299</div>
            <div className="qr-box">
              <img src={qrCodeImgUrl} alt="UPI Payment QR Code" className="qr-img" />
            </div>
            
            {/* Copy UPI Box */}
            <div className="upi-copy-container">
              <span className="upi-text">{UPI_ID}</span>
              <button type="button" onClick={copyUpiId} className="copy-btn">
                {copied ? '✓ Copied' : 'Copy UPI'}
              </button>
            </div>
          </div>

          {/* View Full Page Link */}
          <a href="/pay" target="_blank" rel="noreferrer" className="link-full-page">
            Open Full Payment & Verification Page ↗
          </a>

          {/* Payment Proof / UTR Submission */}
          <div className="utr-submit-section">
            <div className="utr-title">Submit Payment Details / UTR</div>
            <div className="utr-desc">Payment ke baad 12-digit UTR number yahan submit karein taaki admin turant approve kare.</div>

            {isSubmitted ? (
              <div className="submitted-box">
                <div className="submitted-icon">✓</div>
                <div className="submitted-heading">Details Submitted Successfully!</div>
                <p className="submitted-note">Admin payment verify karke agle 5-15 minute me aapka access unlock karega.</p>
                <a href={waUrl} target="_blank" rel="noreferrer" className="btn-wa">
                  Send Screenshot on WhatsApp
                </a>
              </div>
            ) : (
              <form onSubmit={handleUtrSubmit} className="utr-form">
                <div>
                  <label className="utr-lbl">WHATSAPP / MOBILE NUMBER</label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="utr-input"
                    required
                  />
                </div>
                <div>
                  <label className="utr-lbl">12-DIGIT UPI REFERENCE / UTR NO.</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 423589123456"
                    className="utr-input"
                    required
                  />
                </div>
                <button type="submit" className="btn-submit-utr">
                  ✓ Submit UTR for Fast Approval
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── ACTION BUTTONS ─────────────────────────────────────── */}
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
          <span>Once verified & approved, you will receive instant access to VIP profiles and private chats.</span>
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
          padding: 40px 20px 24px;
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
          max-width: 500px;
          width: 100%;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .pending-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 24px 20px;
          text-align: center;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          margin-bottom: 20px;
        }

        .status-badge-wrap {
          margin-bottom: 14px;
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
          font-size: 1.4rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .pending-desc {
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .client-info-box {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px 16px;
          text-align: left;
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

        /* ── PAYMENT CARD STYLES ───────────────────────────────── */
        .payment-card {
          background: linear-gradient(180deg, rgba(38, 20, 48, 0.95) 0%, rgba(20, 14, 30, 0.95) 100%);
          border: 1px solid rgba(255, 42, 122, 0.45);
          border-radius: 22px;
          padding: 24px 20px;
          margin-bottom: 20px;
          box-shadow: 0 16px 40px rgba(255, 42, 122, 0.18);
          position: relative;
          overflow: hidden;
        }

        .payment-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #FF2A7A, #A855F7);
        }

        .payment-badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .payment-tag {
          font-size: 0.72rem;
          font-weight: 800;
          color: #FF758F;
          background: rgba(255, 42, 122, 0.15);
          border: 1px solid rgba(255, 42, 122, 0.35);
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }

        .discount-pill {
          background: #10B981;
          color: #FFFFFF;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .payment-headline {
          font-size: 1.28rem;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .payment-subtext {
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.45;
          margin-bottom: 16px;
        }

        .price-tag-box {
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .price-lbl {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .current-price {
          font-size: 1.85rem;
          font-weight: 900;
          color: #ffffff;
        }

        .old-price {
          font-size: 0.9rem;
          color: #64748b;
          text-decoration: line-through;
        }

        .price-perks {
          font-size: 0.76rem;
          color: #34d399;
          font-weight: 700;
          text-align: right;
          line-height: 1.4;
        }

        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
          font-size: 0.82rem;
          color: #e2e8f0;
          text-align: left;
        }

        .benefit-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.4;
        }

        .benefit-check {
          color: #10B981;
          font-weight: 900;
          font-size: 0.9rem;
        }

        .btn-pay-upi {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #FF2A7A 0%, #9333EA 100%);
          color: #ffffff;
          padding: 14px;
          border-radius: 14px;
          font-size: 0.95rem;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 25px rgba(255, 42, 122, 0.4);
          margin-bottom: 14px;
          transition: transform 0.15s;
        }

        .btn-pay-upi:active {
          transform: scale(0.98);
        }

        .upi-grid-title {
          font-size: 0.72rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          text-align: left;
        }

        .upi-app-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .upi-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 10px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          text-align: center;
          transition: background 0.2s;
        }

        .upi-pill:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .upi-pill.gpay { border-color: rgba(66, 133, 244, 0.4); }
        .upi-pill.phonepe { border-color: rgba(168, 85, 247, 0.4); }
        .upi-pill.paytm { border-color: rgba(0, 186, 242, 0.4); }
        .upi-pill.bhim { border-color: rgba(249, 115, 22, 0.4); }

        .qr-container {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          margin-bottom: 16px;
        }

        .qr-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
        }

        .qr-box {
          background: #ffffff;
          padding: 10px;
          border-radius: 12px;
          display: inline-block;
          margin-bottom: 10px;
        }

        .qr-img {
          width: 170px;
          height: 170px;
          display: block;
        }

        .upi-copy-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.06);
          padding: 8px 12px;
          border-radius: 10px;
        }

        .upi-text {
          font-family: monospace;
          font-size: 0.86rem;
          color: #38bdf8;
          font-weight: 700;
        }

        .copy-btn {
          background: rgba(56, 189, 248, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #38bdf8;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .link-full-page {
          display: block;
          color: #38bdf8;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          padding: 8px;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: 10px;
          margin-bottom: 18px;
          text-align: center;
        }

        /* ── UTR SECTION ───────────────────────────────────────── */
        .utr-submit-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px;
          text-align: left;
        }

        .utr-title {
          font-size: 0.92rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .utr-desc {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .utr-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .utr-lbl {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 4px;
        }

        .utr-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
          color: #ffffff;
          font-size: 0.86rem;
          box-sizing: border-box;
          outline: none;
        }

        .utr-input:focus {
          border-color: #FF2A7A;
        }

        .btn-submit-utr {
          width: 100%;
          background: linear-gradient(135deg, #10B981, #059669);
          border: none;
          color: #ffffff;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          margin-top: 4px;
        }

        .submitted-box {
          text-align: center;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          padding: 16px;
        }

        .submitted-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #10B981;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .submitted-heading {
          font-size: 0.9rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 4px;
        }

        .submitted-note {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 12px;
        }

        .btn-wa {
          display: block;
          background: #25D366;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.84rem;
          font-weight: 700;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
        }

        /* ── ACTION BUTTONS ─────────────────────────────────────── */
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
