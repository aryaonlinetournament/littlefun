import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../lib/api';

export default function PendingVerificationPage() {
  const { user, uniqueId, userStatus, verificationStatus, refreshUser, logOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');
  
  // Multi-step Card State: 1 = Review/Intro, 2 = Payment Gateway, 3 = UTR & Details Upload, 4 = Send Screenshot WhatsApp
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Payment & Form State
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState('');
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

  const isSuperAdmin = user?.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com';
  const isApproved = isSuperAdmin || userStatus === 'ACTIVE' || verificationStatus === 'APPROVED';

  useEffect(() => {
    if (isApproved) {
      navigate('/discover', { replace: true });
    }
  }, [isApproved, navigate]);

  const [localSelfie, setLocalSelfie] = useState<string | null>(null);

  // Load local selfie preview from session (shown to customer only, 0 bytes in DB)
  useEffect(() => {
    try {
      const savedPreview = sessionStorage.getItem('littlefun_selfie_preview');
      if (savedPreview) setLocalSelfie(savedPreview);
    } catch {}
  }, []);

  // Smart polling to detect when Admin activates the user in real-time
  // 12s interval + instant refresh when user switches back to tab from WhatsApp
  useEffect(() => {
    refreshUser();
    const timer = setInterval(() => {
      refreshUser();
    }, 12_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshUser]);

  // Load saved payment step if user previously submitted UTR
  useEffect(() => {
    if (!user?.email) return;
    const userStorageKey = `littlefun_utr_submitted_${user.email.toLowerCase()}`;
    const savedUtr = localStorage.getItem(userStorageKey);
    if (savedUtr) {
      setUtrNumber(savedUtr);
      const savedPhone = localStorage.getItem(`littlefun_phone_${user.email.toLowerCase()}`);
      if (savedPhone) setCustPhone(savedPhone);
      setCurrentStep(4);
    }
  }, [user]);

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

    // Save phone number directly to Supabase users table so Admin Panel sees it
    usersApi.updateMe({ phone: custPhone.trim() }).catch((err) => {
      console.warn('Failed to sync phone to backend:', err);
    });

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
      if (user?.email) {
        localStorage.setItem(`littlefun_utr_submitted_${user.email.toLowerCase()}`, utrNumber.trim());
        localStorage.setItem(`littlefun_phone_${user.email.toLowerCase()}`, custPhone.trim());
      }
      const saved = JSON.parse(localStorage.getItem('littlefun_dating_payments') || '[]');
      saved.push(record);
      localStorage.setItem('littlefun_dating_payments', JSON.stringify(saved));
    } catch {}

    // Move to step 4 (WhatsApp Screenshot Share)
    setCurrentStep(4);
  };

  const waTextProof = encodeURIComponent(
    `*LittleFun VIP Registration Payment Proof*\n` +
    `--------------------------\n` +
    `*Client ID:* ${uniqueId || 'Pending'}\n` +
    `*Email:* ${user?.email || 'N/A'}\n` +
    `*Phone:* ${custPhone || 'Provided'}\n` +
    `*Amount:* ₹299\n` +
    `*UTR / Ref No:* ${utrNumber || 'Submitted'}\n\n` +
    `📸 I have completed my payment and sending screenshot here. Please verify & approve my profile!`
  );
  const waUrlProof = `https://wa.me/91${SUPPORT_PHONE}?text=${waTextProof}`;

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
        <p className="pending-tagline">100% Genuine Partner Meeting Verification</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(10px)',
            }}
          >
            👤 View &amp; Edit My Profile
          </button>
        </div>
      </div>

      <div className="pending-card-container">
        {/* Step Progress Bar */}
        <div className="step-progress-wrapper">
          <div className="step-tracker">
            <div className={`step-dot ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>1</div>
            <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>2</div>
            <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
            <div className={`step-dot ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>3</div>
            <div className={`step-line ${currentStep >= 4 ? 'active' : ''}`}></div>
            <div className={`step-dot ${currentStep >= 4 ? 'active' : ''}`}>4</div>
          </div>
          <div className="step-labels">
            <span className={currentStep === 1 ? 'active-lbl' : ''}>Under Review</span>
            <span className={currentStep === 2 ? 'active-lbl' : ''}>Pay ₹299</span>
            <span className={currentStep === 3 ? 'active-lbl' : ''}>Upload UTR</span>
            <span className={currentStep === 4 ? 'active-lbl' : ''}>WhatsApp Proof</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 1: UNDER REVIEW & MEMBERSHIP ACTIVATION               */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="flow-card animated-in">
            <div className="status-badge-wrap">
              <span className="status-pill-pending">
                <span className="pulsing-dot"></span> Under Review
              </span>
            </div>

            <h1 className="card-heading">Profile Verification In Progress</h1>
            <p className="card-desc">
              Aapka profile under review hai. Genuine partner meetings aur private chat access ke liye one-time ₹299 VIP registration complete karein.
            </p>

            <div className="client-info-box">
              <div className="info-row">
                <span className="info-lbl">Client ID:</span>
                <span className="info-val highlight">{uniqueId || (user?.uid ? `#LF-${user.uid.slice(-6).toUpperCase()}` : '#LF-PENDING')}</span>
              </div>
              <div className="info-row">
                <span className="info-lbl">Account Email:</span>
                <span className="info-val">{user?.email || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-lbl">Review Status:</span>
                <span className="info-val yellow">Action Required: Pay ₹299</span>
              </div>
            </div>

            {/* Price Banner */}
            <div className="price-tag-box">
              <div>
                <div className="price-lbl">VIP ACTIVATION FEE</div>
                <div className="price-row">
                  <span className="current-price">₹299</span>
                  <span className="old-price">₹599</span>
                </div>
              </div>
              <span className="discount-pill">50% OFF TODAY</span>
            </div>

            {/* Perks */}
            <div className="benefits-list">
              <div className="benefit-row">
                <span className="benefit-check">✓</span>
                <span><strong>2-3 Genuine Meetings</strong> guaranteed in your area/city</span>
              </div>
              <div className="benefit-row">
                <span className="benefit-check">✓</span>
                <span><strong>100% Verified Profiles</strong> with direct chat & contact unlock</span>
              </div>
              <div className="benefit-row">
                <span className="benefit-check">✓</span>
                <span><strong>Instant 5-15 Min Admin Approval</strong></span>
              </div>
            </div>

            <button
              type="button"
              className="btn-next-step"
              onClick={() => setCurrentStep(2)}
            >
              <span>Do Payment (Pay ₹299)</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 2: PAYMENT GATEWAY (UPI APPS & QR CODE)               */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="flow-card animated-in">
            <div className="card-top-nav">
              <button type="button" className="btn-back-step" onClick={() => setCurrentStep(1)}>
                ← Back
              </button>
              <span className="step-counter-pill">Step 2 of 4</span>
            </div>

            <div className="offer-countdown-bar">
              <span>🔥 VIP Special Discount Ends In:</span>
              <span className="timer-tag">{formatTime(timeLeft)}</span>
            </div>

            <h2 className="card-heading">Complete Payment (₹299)</h2>
            <p className="card-desc">
              Kisi bhi UPI app se ₹299 pay karein ya QR code scan karein. Payment hone ke baad neeche Next button dabayein:
            </p>

            {/* 1-Tap Mobile UPI Direct Pay Button */}
            <a href={upiUrl} className="btn-pay-upi">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
              <span>Pay ₹299 (Open Any UPI App)</span>
            </a>

            {/* Quick UPI App Links Grid */}
            <div className="upi-grid-title">SELECT PREFERRED UPI APP:</div>
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

            <button
              type="button"
              className="btn-next-step"
              style={{ marginTop: '16px' }}
              onClick={() => setCurrentStep(3)}
            >
              <span>I Have Made Payment → Next (Upload UTR)</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 3: UPLOAD NUMBER, UTR & SCREENSHOT                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="flow-card animated-in">
            <div className="card-top-nav">
              <button type="button" className="btn-back-step" onClick={() => setCurrentStep(2)}>
                ← Back to Payment
              </button>
              <span className="step-counter-pill">Step 3 of 4</span>
            </div>

            <h2 className="card-heading">Submit UTR & Details</h2>
            <p className="card-desc">
              Apna mobile number, 12-digit UTR number enter karein aur payment screenshot select karein:
            </p>

            <form onSubmit={handleUtrSubmit} className="utr-form">
              <div>
                <label className="utr-lbl">WHATSAPP / MOBILE NUMBER *</label>
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
                <label className="utr-lbl">12-DIGIT UPI REFERENCE / UTR NO. *</label>
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
                <label className="utr-lbl">ATTACH PAYMENT SCREENSHOT</label>
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
                      <span className="upload-text">Click to choose Screenshot photo</span>
                      <span className="upload-sub">PNG, JPG format</span>
                    </div>
                  )}
                </label>
              </div>

              <button type="submit" className="btn-next-step">
                <span>Save Details & Send on WhatsApp</span>
                <span>→</span>
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 4: CELEBRATORY CLIENT ID & WHATSAPP SCREENSHOT PROOF  */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="flow-card animated-in">
            <div className="submitted-box">
              <div className="success-icon-wrap" style={{ fontSize: '2.8rem', marginBottom: '8px' }}>🎉</div>
              <h2 className="success-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>Application Submitted!</h2>
              <p className="success-subtitle" style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.65)', maxWidth: '380px', margin: '0 auto 18px', lineHeight: 1.45 }}>
                Your profile and verification details have been submitted for review.
              </p>

              {/* YOUR ASSIGNED CLIENT ID CARD */}
              <div className="client-id-card">
                <div className="id-label">YOUR ASSIGNED CLIENT ID</div>
                <div className="id-value">{uniqueId || '#LF-1010'}</div>
                <div className="id-sub">Save this ID for your reference &amp; support communications.</div>
              </div>

              {/* TIMELINE PROGRESS */}
              <div className="status-timeline">
                <div className="timeline-item done">
                  <div className="t-icon">✅</div>
                  <div className="t-content">
                    <div className="t-title">Account Created</div>
                    <div className="t-desc">{user?.email || 'Registered Member'}</div>
                  </div>
                </div>
                <div className="timeline-item done">
                  <div className="t-icon">✅</div>
                  <div className="t-content">
                    <div className="t-title">Payment &amp; UTR Submitted</div>
                    <div className="t-desc">Phone: {custPhone} • UTR: {utrNumber}</div>
                  </div>
                </div>
                <div className="timeline-item current">
                  <div className="t-icon">⏳</div>
                  <div className="t-content">
                    <div className="t-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Profile &amp; Photo Verification</span>
                      {localSelfie && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(255, 42, 122, 0.15)', color: '#FF2A7A', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255, 42, 122, 0.3)' }}>
                          Selfie Captured ✓
                        </span>
                      )}
                    </div>
                    <div className="t-desc" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      {localSelfie && (
                        <img
                          src={localSelfie}
                          alt="Selfie preview"
                          style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #FF2A7A', flexShrink: 0 }}
                        />
                      )}
                      <span>Usually processed within a few hours (2 mins via WhatsApp).</span>
                    </div>
                  </div>
                </div>
                <div className="timeline-item pending">
                  <div className="t-icon">🔒</div>
                  <div className="t-content">
                    <div className="t-title">VIP Portal Access</div>
                    <div className="t-desc">Unlocked automatically once verified.</div>
                  </div>
                </div>
              </div>
              
              {/* Highlighted Direct Screenshot Alert Box */}
              <div className="wa-instruction-card">
                <div className="wa-instr-head">
                  <span className="wa-camera-icon">📸</span>
                  <span>Payment Screenshot WhatsApp Par Bhejein</span>
                </div>
                <p className="wa-instr-desc">
                  Jo payment aapne <strong>₹299</strong> ki hai, uska <strong>Screenshot / Payment Image</strong> neeche WhatsApp par bhej dijiye taaki admin matching karke <strong>2 minute me aapka access unlock</strong> kare!
                </p>
              </div>

              <div className="wa-action-highlight">
                <div className="wa-badge-top">📱 Official WhatsApp Support: {SUPPORT_PHONE_DISPLAY}</div>
                <a
                  href={waUrlProof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wa-final"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.146-.538-1.523-.628-2.5-2.164-2.576-2.264-.075-.101-.617-.821-.617-1.565 0-.743.39-1.109.529-1.26.138-.15.302-.188.403-.188.101 0 .202.001.291.006.094.004.22-.036.345.263.129.313.44 1.072.478 1.15.038.077.063.168.013.268-.05.1-.076.163-.151.251-.075.088-.158.196-.226.264-.076.075-.155.157-.067.308.088.151.391.644.838 1.042.576.513 1.062.671 1.213.746.151.076.24.063.328-.038.088-.1.378-.44.479-.59.101-.15.202-.126.34-.076.139.05.882.416 1.033.491.151.076.252.114.29.177.038.063.038.366-.106.771z"/>
                  </svg>
                  <span>Send Payment Image on WhatsApp</span>
                </a>
                <p className="wa-btn-tip">👉 Click karte hi WhatsApp open hoga — wahan payment ki photo attach karke send karein</p>
              </div>

              <div className="post-actions">
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
                  className="btn-edit-steps"
                  onClick={() => setCurrentStep(2)}
                >
                  ← Edit Payment / Resubmit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Action Links */}
        <div className="global-actions">
          {checkMsg && (
            <div className="status-toast-msg">
              ℹ️ {checkMsg}
            </div>
          )}

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
          <span>100% Confidential & Secure Platform • 24/7 Verified Support</span>
        </div>

      </div>

      <style>{`
        .pending-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #08060E;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
        }

        .pending-hero {
          background: linear-gradient(180deg, #1d0f2b 0%, #0d0917 100%);
          padding: 32px 20px 20px;
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
          background: radial-gradient(circle, rgba(255, 42, 122, 0.45) 0%, rgba(147, 51, 234, 0) 70%);
          filter: blur(40px);
          pointer-events: none;
        }

        .pending-logo-box {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          background: linear-gradient(135deg, #FF2A7A 0%, #7928CA 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(255, 42, 122, 0.45);
          margin-bottom: 10px;
        }

        .pending-brand-title {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.3px;
          background: linear-gradient(135deg, #ffffff 30%, #ff85b3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pending-tagline {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 3px;
        }

        .pending-card-container {
          max-width: 480px;
          width: 100%;
          margin: 0 auto;
          padding: 16px 16px 60px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── STEP TRACKER ────────────────────────────────────────── */
        .step-progress-wrapper {
          background: rgba(23, 17, 34, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px 12px;
        }

        .step-tracker {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 320px;
          margin: 0 auto;
        }

        .step-dot {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          transition: all 0.3s ease;
        }

        .step-dot.active {
          background: linear-gradient(135deg, #FF2A7A 0%, #9333EA 100%);
          color: #fff;
          box-shadow: 0 0 12px rgba(255, 42, 122, 0.6);
        }

        .step-dot.completed {
          background: #10B981;
          color: #fff;
        }

        .step-line {
          flex: 1;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 6px;
          transition: background 0.3s ease;
        }

        .step-line.active {
          background: #FF2A7A;
        }

        .step-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 600;
          margin-top: 8px;
          text-align: center;
        }

        .step-labels span {
          width: 25%;
        }

        .step-labels .active-lbl {
          color: #FF2A7A;
          font-weight: 800;
        }

        /* ── CARD STYLING ────────────────────────────────────────── */
        .flow-card {
          background: linear-gradient(180deg, #1c1129 0%, #110c1c 100%);
          border: 1px solid rgba(255, 42, 122, 0.35);
          border-radius: 20px;
          padding: 22px 18px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
        }

        .animated-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card-top-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .btn-back-step {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .step-counter-pill {
          font-size: 0.72rem;
          font-weight: 700;
          color: #FF2A7A;
          background: rgba(255, 42, 122, 0.12);
          padding: 3px 10px;
          border-radius: 20px;
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
        }

        .pulsing-dot {
          width: 8px;
          height: 8px;
          background: #facc15;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }

        .card-heading {
          font-size: 1.25rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 6px;
        }

        .card-desc {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          line-height: 1.45;
          margin-bottom: 16px;
        }

        .client-info-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
        }

        .info-lbl { color: rgba(255, 255, 255, 0.5); }
        .info-val { font-weight: 600; }
        .info-val.highlight { color: #FF2A7A; font-family: monospace; font-size: 0.88rem; }
        .info-val.yellow { color: #facc15; font-weight: 700; }

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

        .discount-pill {
          background: linear-gradient(135deg, #10B981, #059669);
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 12px;
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

        .btn-next-step {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #FF2A7A 0%, #9333EA 100%);
          border: none;
          color: #ffffff;
          padding: 14px;
          border-radius: 14px;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(255, 42, 122, 0.4);
          transition: transform 0.15s;
        }

        .btn-next-step:active { transform: scale(0.98); }

        /* ── PAYMENT GATEWAY ELEMENTS ────────────────────────────── */
        .offer-countdown-bar {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
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
        }

        .app-dot { width: 8px; height: 8px; border-radius: 50%; }
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
          font-size: 0.8rem;
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

        .qr-img { width: 160px; height: 160px; display: block; }

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

        .upi-label { font-size: 0.65rem; color: rgba(255, 255, 255, 0.5); font-weight: 700; }
        .upi-text { font-family: monospace; font-size: 0.85rem; color: #38bdf8; font-weight: 700; }

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

        /* ── UTR FORM & FILE UPLOAD ──────────────────────────────── */
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
        }

        .utr-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px 14px;
          color: #ffffff;
          font-size: 0.88rem;
          box-sizing: border-box;
          outline: none;
        }

        .utr-input:focus { border-color: #FF2A7A; }

        .screenshot-upload-box {
          display: block;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 14px;
          text-align: center;
          cursor: pointer;
        }

        .file-hidden-input { display: none; }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .upload-icon { font-size: 1.3rem; }
        .upload-text { font-size: 0.82rem; font-weight: 700; color: #ffffff; }
        .upload-sub { font-size: 0.68rem; color: rgba(255, 255, 255, 0.4); }

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

        .file-status { font-size: 0.72rem; color: #10B981; font-weight: 700; }

        /* ── STEP 4 SUBMISSION & WHATSAPP CARD ───────────────────── */
        .submitted-box {
          text-align: center;
          padding: 6px 0;
        }

        .submitted-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #10B981;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.3rem;
          margin-bottom: 12px;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }

        .submitted-heading {
          font-size: 1.15rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 12px;
        }

        .wa-instruction-card {
          background: rgba(37, 211, 102, 0.12);
          border: 1px solid rgba(37, 211, 102, 0.4);
          border-radius: 14px;
          padding: 14px 12px;
          margin-bottom: 16px;
          text-align: left;
        }

        .wa-instr-head {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
          font-weight: 800;
          color: #25D366;
          margin-bottom: 6px;
        }

        .wa-camera-icon {
          font-size: 1.1rem;
        }

        .wa-instr-desc {
          font-size: 0.82rem;
          color: #e2e8f0;
          line-height: 1.45;
          margin: 0;
        }

        .wa-instr-desc strong {
          color: #ffffff;
        }

        /* ── CLIENT ID CARD & TIMELINE STYLES ───────────────────── */
        .client-id-card {
          background: linear-gradient(135deg, rgba(255, 42, 122, 0.12) 0%, rgba(147, 51, 234, 0.18) 100%);
          border: 1px solid rgba(255, 42, 122, 0.35);
          border-radius: 16px;
          padding: 16px 18px;
          margin-bottom: 18px;
          text-align: center;
        }

        .id-label {
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          color: #FF8FAB;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .id-value {
          font-size: 1.8rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 0.05em;
          font-family: monospace;
          margin-bottom: 4px;
        }

        .id-sub {
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .status-timeline {
          text-align: left;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .t-icon {
          font-size: 1rem;
          margin-top: 1px;
        }

        .t-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #ffffff;
        }

        .timeline-item.pending .t-title {
          color: rgba(255, 255, 255, 0.4);
        }

        .t-desc {
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.55);
          margin-top: 1px;
        }

        .sum-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .sum-row strong { color: #fff; }

        .wa-action-highlight {
          background: rgba(37, 211, 102, 0.1);
          border: 1px solid rgba(37, 211, 102, 0.35);
          border-radius: 16px;
          padding: 16px 14px;
          margin-bottom: 16px;
        }

        .wa-badge-top {
          font-size: 0.76rem;
          font-weight: 800;
          color: #25D366;
          margin-bottom: 10px;
        }

        .btn-wa-final {
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
          box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
          transition: transform 0.15s;
        }

        .btn-wa-final:active { transform: scale(0.98); }

        .wa-btn-tip {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
        }

        .post-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .refresh-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-edit-steps {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          padding: 6px;
        }

        /* ── GLOBAL ACTIONS ──────────────────────────────────────── */
        .global-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }

        .status-toast-msg {
          width: 100%;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          font-size: 0.8rem;
          padding: 8px 12px;
          border-radius: 10px;
          text-align: center;
        }

        .signout-btn {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          padding: 6px 12px;
        }

        .vip-support-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.45);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
