import React, { useEffect, useState } from 'react';
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
  const [screenshotFile, setScreenshotFile] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'form'>('whatsapp');
  const [timeLeft, setTimeLeft] = useState(14 * 60 + 59);

  const SUPPORT_PHONE = '8796215984';
  const SUPPORT_PHONE_DISPLAY = '+91 8796215984';
  const UPI_ID = 'aryafun@ptaxis';
  const PAYEE_NAME = 'LittleFun With Partner';
  const AMOUNT = '299';
  const NOTE = `LittleFun Registration ID ${uniqueId || 'NEW'}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`;
  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 14 * 60 + 59));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUtrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || !custPhone.trim()) return;

    const record = {
      memberId: uniqueId || 'N/A',
      email: user?.email,
      phone: custPhone,
      utr: utrNumber,
      amount: 299,
      screenshot: screenshotName ? 'Attached' : 'None',
      date: new Date().toISOString()
    };
    try {
      const saved = JSON.parse(localStorage.getItem('littlefun_dating_payments') || '[]');
      saved.push(record);
      localStorage.setItem('littlefun_dating_payments', JSON.stringify(saved));
    } catch {}

    setIsSubmitted(true);
  };

  const waTextFormProof = encodeURIComponent(
    `*LittleFun VIP Registration Payment Proof*\n` +
    `--------------------------\n` +
    `*Client ID:* ${uniqueId || 'Pending'}\n` +
    `*Email:* ${user?.email || 'N/A'}\n` +
    `*Phone:* ${custPhone || 'Provided in app'}\n` +
    `*Amount:* ₹299\n` +
    `*UTR / Ref No:* ${utrNumber || 'N/A'}\n\n` +
    `📸 I have completed payment and attached screenshot. Please approve my profile!`
  );
  const waUrlFormProof = `https://wa.me/91${SUPPORT_PHONE}?text=${waTextFormProof}`;

  const waDirectText = encodeURIComponent(
    `*Hi LittleFun Admin, I want to activate my VIP account.*\n` +
    `--------------------------\n` +
    `*Client ID:* ${uniqueId || 'New Registration'}\n` +
    `*Email:* ${user?.email || 'N/A'}\n` +
    `*Fee:* ₹299 (Paid via UPI)\n\n` +
    `I am sending my payment screenshot / UTR number here. Please verify and activate my access!`
  );
  const waDirectUrl = `https://wa.me/91${SUPPORT_PHONE}?text=${waDirectText}`;

  return (
    <div className="pending-page">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="pending-hero">
        <div className="hero-glow-blob"></div>
        <div className="pending-logo-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="pending-brand-title">LittleFun VIP Access</div>
        <p className="pending-tagline">Official Partner Meeting Platform</p>
      </div>

      {/* ── CARD CONTENT ────────────────────────────────────────── */}
      <div className="pending-card-container">
        
        {/* Status Info Card */}
        <div className="pending-card client-header-card">
          <div className="status-badge-wrap">
            <span className="status-pill-pending">
              <span className="pulsing-dot"></span> Under Review
            </span>
          </div>

          <h1 className="pending-title">Profile Under Verification</h1>
          <p className="pending-desc">
            To maintain a 100% genuine & verified community, complete your one-time activation fee to unlock instant admin approval.
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
              <span className="info-val yellow">Pending Fast-Track Fee</span>
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
          {/* Urgency Badge */}
          <div className="offer-countdown-bar">
            <span>🔥 Limited VIP Slot Offer:</span>
            <span className="timer-tag">{formatTime(timeLeft)}</span>
          </div>

          <div className="payment-badge-row">
            <span className="payment-tag">⚡ FAST-TRACK ACTIVATION</span>
            <span className="discount-pill">50% OFF TODAY</span>
          </div>

          <h2 className="payment-headline">VIP Membership Fee ₹299/-</h2>
          <p className="payment-subtext">
            Pay ₹299 to verify your profile and unlock <strong>2-3 genuine partner meetings</strong> in your city/area.
          </p>

          {/* Price Box */}
          <div className="price-tag-box">
            <div>
              <div className="price-lbl">ONE-TIME REGISTRATION CHARGE</div>
              <div className="price-row">
                <span className="current-price">₹299</span>
                <span className="old-price">₹599</span>
              </div>
            </div>
            <div className="price-perks">
              <div>✓ Instant Approval</div>
              <div>✓ 2-3 Local Meetings</div>
              <div>✓ Direct Chat Access</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="benefits-list">
            <div className="benefit-row">
              <span className="benefit-check">✓</span>
              <span><strong>2-3 Genuine Meetings</strong> guaranteed in your area</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-check">✓</span>
              <span><strong>100% Verified Profiles</strong> with real photos & direct chats</span>
            </div>
            <div className="benefit-row">
              <span className="benefit-check">✓</span>
              <span><strong>100% Privacy & Discreet:</strong> 256-bit safe checkout</span>
            </div>
          </div>

          {/* 1-Tap Mobile UPI Direct Pay Button */}
          <a href={upiUrl} className="btn-pay-upi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
            <span>Pay ₹299 via Any UPI App</span>
          </a>

          {/* Quick UPI App Links Grid */}
          <div className="upi-grid-title">SELECT PAYMENT APP:</div>
          <div className="upi-app-grid">
            <a href={`tez://upi/pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-pill gpay">
              <span className="app-dot gpay-dot"></span> Google Pay
            </a>
            <a href={`phonepe://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-pill phonepe">
              <span className="app-dot phonepe-dot"></span> PhonePe
            </a>
            <a href={`paytmmp://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-pill paytm">
              <span className="app-dot paytm-dot"></span> Paytm UPI
            </a>
            <a href={upiUrl} className="upi-pill bhim">
              <span className="app-dot bhim-dot"></span> BHIM / Other
            </a>
          </div>

          {/* Dynamic QR Code Box */}
          <div className="qr-container">
            <div className="qr-title">Or Scan QR Code to Pay ₹299</div>
            <div className="qr-box">
              <img src={qrCodeImgUrl} alt="UPI Payment QR Code" className="qr-img" />
            </div>
            
            {/* Copy UPI Box */}
            <div className="upi-copy-container">
              <div className="upi-info">
                <span className="upi-label">UPI ID:</span>
                <span className="upi-text">{UPI_ID}</span>
              </div>
              <button type="button" onClick={copyUpiId} className="copy-btn">
                {copied ? '✓ Copied' : 'Copy UPI'}
              </button>
            </div>
          </div>
        </div>

        {/* ── UTR & SCREENSHOT SUBMISSION OPTIONS ─────────────────── */}
        <div className="verification-methods-card">
          <div className="card-header-row">
            <div>
              <h3 className="section-title">Submit Proof for Fast Activation</h3>
              <p className="section-subtitle">Choose how you want to share your payment proof:</p>
            </div>
          </div>

          {/* Option Selector Tabs */}
          <div className="method-tabs">
            <button
              type="button"
              className={`method-tab ${activeTab === 'whatsapp' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('whatsapp')}
            >
              <span className="tab-icon">💬</span>
              <span>WhatsApp Direct</span>
              <span className="badge-fast">Fastest</span>
            </button>
            <button
              type="button"
              className={`method-tab ${activeTab === 'form' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <span className="tab-icon">📝</span>
              <span>Upload UTR & Photo</span>
            </button>
          </div>

          {/* TAB 1: DIRECT WHATSAPP OPTION */}
          {activeTab === 'whatsapp' && (
            <div className="tab-content-panel whatsapp-panel">
              <div className="wa-feature-badge">
                <span className="wa-pulse"></span> ⚡ Instant 2-Minute Verification
              </div>
              <h4 className="wa-headline">Direct WhatsApp Approval</h4>
              <p className="wa-desc">
                Payment screenshot direct hamare WhatsApp support number <strong>{SUPPORT_PHONE_DISPLAY}</strong> par bhejein. Admin turant verify karke profiles unlock karega.
              </p>

              <div className="wa-number-badge">
                <span>📱 Official WhatsApp:</span>
                <strong>{SUPPORT_PHONE_DISPLAY}</strong>
              </div>

              <a href={waDirectUrl} target="_blank" rel="noopener noreferrer" className="btn-wa-direct">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.146-.538-1.523-.628-2.5-2.164-2.576-2.264-.075-.101-.617-.821-.617-1.565 0-.743.39-1.109.529-1.26.138-.15.302-.188.403-.188.101 0 .202.001.291.006.094.004.22-.036.345.263.129.313.44 1.072.478 1.15.038.077.063.168.013.268-.05.1-.076.163-.151.251-.075.088-.158.196-.226.264-.076.075-.155.157-.067.308.088.151.391.644.838 1.042.576.513 1.062.671 1.213.746.151.076.24.063.328-.038.088-.1.378-.44.479-.59.101-.15.202-.126.34-.076.139.05.882.416 1.033.491.151.076.252.114.29.177.038.063.038.366-.106.771z"/>
                </svg>
                <span>Send Screenshot on WhatsApp</span>
              </a>

              <div className="wa-help-note">
                ✓ Available 24x7 for Instant Member Approvals
              </div>
            </div>
          )}

          {/* TAB 2: IN-APP FORM & SCREENSHOT UPLOAD */}
          {activeTab === 'form' && (
            <div className="tab-content-panel form-panel">
              {isSubmitted ? (
                <div className="submitted-box">
                  <div className="submitted-icon">✓</div>
                  <div className="submitted-heading">Details Submitted Successfully!</div>
                  <p className="submitted-note">
                    Aapka UTR submit ho gaya hai. Admin verify karke agle 5-15 minute me access unlock karega.
                  </p>
                  
                  <a href={waUrlFormProof} target="_blank" rel="noopener noreferrer" className="btn-wa-direct">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771z"/>
                    </svg>
                    <span>Forward Proof on WhatsApp for 2-Min Approval</span>
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

                  {/* Screenshot File Upload */}
                  <div>
                    <label className="utr-lbl">ATTACH PAYMENT SCREENSHOT (OPTIONAL)</label>
                    <label className="screenshot-upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="file-hidden-input"
                      />
                      {screenshotFile ? (
                        <div className="file-preview-wrap">
                          <img src={screenshotFile} alt="Screenshot preview" className="preview-thumb" />
                          <div className="preview-info">
                            <span className="file-name">{screenshotName}</span>
                            <span className="file-status">✓ Image Selected</span>
                          </div>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <span className="upload-icon">📷</span>
                          <span className="upload-text">Tap to select payment screenshot</span>
                          <span className="upload-sub">PNG, JPG up to 10MB</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <button type="submit" className="btn-submit-utr">
                    ✓ Submit Verification Request
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── ACTION BUTTONS ─────────────────────────────────────── */}
        <div className="pending-actions">
          <button
            type="button"
            className="refresh-btn"
            onClick={handleCheckStatus}
            disabled={checking}
          >
            {checking ? 'Checking Status…' : '🔄 Refresh Approval Status'}
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
          <span>🛡️</span>
          <span>100% Confidential & Secure • 24/7 Verified Support</span>
        </div>

      </div>

      <style>{`
        .pending-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #09070F;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
        }

        .pending-hero {
          background: linear-gradient(180deg, #1f102c 0%, #0d0917 100%);
          padding: 36px 20px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 1px solid rgba(255, 42, 122, 0.2);
          position: relative;
        }

        .hero-glow-blob {
          position: absolute;
          top: -40px;
          width: 250px;
          height: 100px;
          background: radial-gradient(circle, rgba(255, 42, 122, 0.4) 0%, rgba(147, 51, 234, 0) 70%);
          filter: blur(40px);
          pointer-events: none;
        }

        .pending-logo-box {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #FF2A7A 0%, #7928CA 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(255, 42, 122, 0.45);
          margin-bottom: 12px;
        }

        .pending-brand-title {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.3px;
          background: linear-gradient(135deg, #ffffff 30%, #ff85b3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pending-tagline {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 4px;
        }

        .pending-card-container {
          max-width: 480px;
          width: 100%;
          margin: 0 auto;
          padding: 20px 16px 60px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .pending-card {
          background: rgba(23, 17, 34, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 22px 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .status-badge-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }

        .status-pill-pending {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(234, 179, 8, 0.12);
          border: 1px solid rgba(234, 179, 8, 0.35);
          color: #facc15;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 5px 14px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pulsing-dot {
          width: 8px;
          height: 8px;
          background: #facc15;
          border-radius: 50%;
          box-shadow: 0 0 8px #facc15;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }

        .pending-title {
          font-size: 1.25rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 8px;
        }

        .pending-desc {
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          line-height: 1.45;
          margin-bottom: 18px;
        }

        .client-info-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
        }

        .info-lbl {
          color: rgba(255, 255, 255, 0.5);
        }

        .info-val {
          font-weight: 600;
        }

        .info-val.highlight {
          color: #FF2A7A;
          font-family: monospace;
          font-size: 0.88rem;
        }

        .info-val.yellow {
          color: #facc15;
        }

        .status-toast-msg {
          margin-top: 12px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          font-size: 0.8rem;
          padding: 8px 12px;
          border-radius: 10px;
          text-align: center;
        }

        /* ── PAYMENT CARD ────────────────────────────────────────── */
        .payment-card {
          background: linear-gradient(180deg, #1b1126 0%, #110c1c 100%);
          border: 1px solid rgba(255, 42, 122, 0.4);
          border-radius: 20px;
          padding: 22px 18px;
          box-shadow: 0 12px 35px rgba(255, 42, 122, 0.15);
        }

        .offer-countdown-bar {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: #fca5a5;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .timer-tag {
          background: #ef4444;
          color: #ffffff;
          font-weight: 800;
          font-family: monospace;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .payment-badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .payment-tag {
          font-size: 0.72rem;
          font-weight: 800;
          color: #FF2A7A;
          letter-spacing: 0.5px;
        }

        .discount-pill {
          background: linear-gradient(135deg, #10B981, #059669);
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 12px;
        }

        .payment-headline {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .payment-subtext {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.45;
          margin-bottom: 16px;
        }

        .price-tag-box {
          background: rgba(255, 42, 122, 0.08);
          border: 1px solid rgba(255, 42, 122, 0.25);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .price-lbl {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.5px;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 2px;
        }

        .current-price {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
        }

        .old-price {
          font-size: 0.88rem;
          color: #64748b;
          text-decoration: line-through;
        }

        .price-perks {
          font-size: 0.75rem;
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
        }

        .upi-app-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .upi-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 10px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.2s;
        }

        .app-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .gpay-dot { background: #4285F4; }
        .phonepe-dot { background: #8B5CF6; }
        .paytm-dot { background: #00BAF2; }
        .bhim-dot { background: #F97316; }

        .qr-container {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
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

        .upi-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .upi-label {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
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
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* ── VERIFICATION TABS & PANELS ──────────────────────────── */
        .verification-methods-card {
          background: rgba(23, 17, 34, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 20px 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .section-title {
          font-size: 1.05rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .section-subtitle {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 14px;
        }

        .method-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          background: rgba(0, 0, 0, 0.35);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .method-tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          padding: 10px 8px;
          border-radius: 9px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .method-tab.active-tab {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .badge-fast {
          background: #10B981;
          color: #fff;
          font-size: 0.62rem;
          font-weight: 900;
          padding: 2px 5px;
          border-radius: 4px;
        }

        .tab-content-panel {
          padding-top: 4px;
        }

        .wa-feature-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(37, 211, 102, 0.12);
          border: 1px solid rgba(37, 211, 102, 0.3);
          color: #25D366;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 10px;
        }

        .wa-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #25D366;
        }

        .wa-headline {
          font-size: 1rem;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .wa-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.45;
          margin-bottom: 14px;
        }

        .wa-number-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.18);
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
          color: #e2e8f0;
          margin-bottom: 14px;
        }

        .wa-number-badge strong {
          color: #25D366;
          font-size: 0.95rem;
          font-family: monospace;
        }

        .btn-wa-direct {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #25D366;
          color: #ffffff;
          text-decoration: none;
          padding: 14px;
          border-radius: 14px;
          font-size: 0.95rem;
          font-weight: 800;
          box-shadow: 0 8px 25px rgba(37, 211, 102, 0.35);
          margin-bottom: 10px;
          transition: transform 0.15s;
        }

        .btn-wa-direct:active {
          transform: scale(0.98);
        }

        .wa-help-note {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
        }

        /* ── FORM STYLES ─────────────────────────────────────────── */
        .utr-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .utr-lbl {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 5px;
          letter-spacing: 0.3px;
        }

        .utr-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 11px 14px;
          color: #ffffff;
          font-size: 0.88rem;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }

        .utr-input:focus {
          border-color: #FF2A7A;
        }

        .screenshot-upload-box {
          display: block;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 14px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .screenshot-upload-box:hover {
          border-color: #FF2A7A;
        }

        .file-hidden-input {
          display: none;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .upload-icon {
          font-size: 1.3rem;
        }

        .upload-text {
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
        }

        .upload-sub {
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .file-preview-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .preview-thumb {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .preview-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          overflow: hidden;
        }

        .file-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .file-status {
          font-size: 0.72rem;
          color: #10B981;
          font-weight: 700;
        }

        .btn-submit-utr {
          width: 100%;
          background: linear-gradient(135deg, #10B981, #059669);
          border: none;
          color: #ffffff;
          padding: 13px;
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          margin-top: 4px;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
        }

        .submitted-box {
          text-align: center;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 14px;
          padding: 20px 14px;
        }

        .submitted-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #10B981;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.1rem;
          margin-bottom: 8px;
        }

        .submitted-heading {
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 6px;
        }

        .submitted-note {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 14px;
          line-height: 1.4;
        }

        /* ── ACTION BUTTONS ─────────────────────────────────────── */
        .pending-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }

        .refresh-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 13px;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .signout-btn {
          width: 100%;
          background: none;
          border: none;
          color: #ef4444;
          padding: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }

        .vip-support-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.45);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
