import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user, uniqueId } = useAuth();

  // Multi-step Card State: 1 = Offer/Review, 2 = Payment Gateway, 3 = UTR & Details Upload, 4 = Send Screenshot WhatsApp
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [custName, setCustName] = useState(user?.displayName || '');
  const [custPhone, setCustPhone] = useState('');
  const [custCity, setCustCity] = useState('');
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || !custPhone.trim()) return;

    const record = {
      memberId: uniqueId || 'N/A',
      name: custName,
      phone: custPhone,
      city: custCity,
      utr: utrNumber,
      amount: 299,
      screenshot: screenshotName ? 'Attached' : 'None',
      date: new Date().toISOString(),
    };
    try {
      const saved = JSON.parse(localStorage.getItem('littlefun_dating_payments') || '[]');
      saved.push(record);
      localStorage.setItem('littlefun_dating_payments', JSON.stringify(saved));
    } catch {}

    setCurrentStep(4);
  };

  const waTextProof = encodeURIComponent(
    `*LittleFun VIP Registration Payment Proof*\n` +
    `--------------------------\n` +
    `*Client ID:* ${uniqueId || 'New Registration'}\n` +
    `*Name:* ${custName || 'Customer'}\n` +
    `*Phone:* ${custPhone}\n` +
    `*City:* ${custCity || 'N/A'}\n` +
    `*Amount:* ₹299\n` +
    `*UTR / Ref No:* ${utrNumber}\n\n` +
    `📸 I have completed payment and sending screenshot here. Please activate my VIP account!`
  );
  const waUrlProof = `https://wa.me/91${SUPPORT_PHONE}?text=${waTextProof}`;

  return (
    <div className="pay-page">
      <div className="pay-container">
        {/* Top Header */}
        <div className="pay-topbar">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← Back
          </button>
          <div className="badge-secure">🛡️ 100% SECURE CHECKOUT</div>
        </div>

        {/* Step Progress Tracker */}
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
            <span className={currentStep === 1 ? 'active-lbl' : ''}>Overview</span>
            <span className={currentStep === 2 ? 'active-lbl' : ''}>Pay ₹299</span>
            <span className={currentStep === 3 ? 'active-lbl' : ''}>Upload UTR</span>
            <span className={currentStep === 4 ? 'active-lbl' : ''}>WhatsApp Proof</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 1: VIP ACTIVATION OVERVIEW                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="pay-card animated-in">
            <div className="badge-vip">VIP MEMBER REGISTRATION</div>
            <h1 className="pay-main-title">LittleFun With Partner</h1>
            <p className="pay-sub">VIP access activate karne ke liye registration fee ₹299/- complete karein</p>

            <div className="price-split">
              <div>
                <div className="price-tag-sm">ONE-TIME FEE</div>
                <div className="price-num">
                  <span>₹299</span> <span className="cut">₹599</span>
                </div>
              </div>
              <div className="tag-save">50% OFF TODAY</div>
            </div>

            <div className="perks-list">
              <div>✓ <strong>2-3 Genuine Meetings</strong> aapke area/city me arrange ki jayegi</div>
              <div>✓ <strong>100% Verified Profiles</strong> with direct chat unlock</div>
              <div>✓ <strong>Discreet & Confidential:</strong> 256-bit safe system</div>
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
        {/* CARD 2: PAYMENT GATEWAY (UPI & QR CODE)                    */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="pay-card animated-in">
            <div className="card-top-nav">
              <button type="button" className="btn-back-step" onClick={() => setCurrentStep(1)}>
                ← Back
              </button>
              <span className="step-counter-pill">Step 2 of 4</span>
            </div>

            <div className="urgency-banner">
              <span>🔥 Special 50% Off Offer Ends In:</span>
              <span className="urgency-timer">{formatTime(timeLeft)}</span>
            </div>

            <h2 className="step-heading">Pay ₹299 via UPI</h2>
            <p className="step-sub">Kisi bhi app se ₹299 pay karein, phir neeche Next button click karein:</p>

            <a href={upiUrl} className="btn-upi-primary">
              ⚡ Pay ₹299 Now (Open Any UPI App)
            </a>

            <div className="upi-options-grid">
              <a href={`tez://upi/pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-app gpay">
                <span className="app-dot gpay-dot"></span> Google Pay
              </a>
              <a href={`phonepe://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-app phonepe">
                <span className="app-dot phonepe-dot"></span> PhonePe
              </a>
              <a href={`paytmmp://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-app paytm">
                <span className="app-dot paytm-dot"></span> Paytm UPI
              </a>
              <a href={upiUrl} className="upi-app bhim">
                <span className="app-dot bhim-dot"></span> BHIM / Other
              </a>
            </div>

            {/* QR */}
            <div className="qr-wrap">
              <div className="qr-text">Scan QR Code to Pay ₹299</div>
              <div className="qr-white">
                <img src={qrCodeImgUrl} alt="QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
              </div>
              <div className="upi-copy-line">
                <div className="upi-details">
                  <span className="upi-id-lbl">UPI ID:</span>
                  <span className="upi-id-val">{UPI_ID}</span>
                </div>
                <button onClick={copyUpiId} className="btn-copy-sm">
                  {copied ? '✓ Copied' : 'Copy'}
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
        {/* CARD 3: SUBMIT MOBILE, UTR & SCREENSHOT PHOTO              */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="pay-card animated-in">
            <div className="card-top-nav">
              <button type="button" className="btn-back-step" onClick={() => setCurrentStep(2)}>
                ← Back to Payment
              </button>
              <span className="step-counter-pill">Step 3 of 4</span>
            </div>

            <h2 className="step-heading">Submit UTR & Details</h2>
            <p className="step-sub">Apna mobile number, 12-digit UTR enter karein aur screenshot select karein:</p>

            <form onSubmit={handleFormSubmit} className="pay-form">
              <div>
                <label className="f-lbl">YOUR NAME</label>
                <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Full name" className="f-in" required />
              </div>
              <div>
                <label className="f-lbl">WHATSAPP / MOBILE NUMBER *</label>
                <input type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="10-digit number" className="f-in" required />
              </div>
              <div>
                <label className="f-lbl">CITY / AREA</label>
                <input type="text" value={custCity} onChange={(e) => setCustCity(e.target.value)} placeholder="e.g. Delhi NCR, Mumbai" className="f-in" />
              </div>
              <div>
                <label className="f-lbl">12-DIGIT UPI REFERENCE / UTR NO. *</label>
                <input type="text" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} placeholder="e.g. 423589123456" className="f-in" required />
              </div>

              {/* Screenshot File Upload */}
              <div>
                <label className="f-lbl">ATTACH PAYMENT SCREENSHOT</label>
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
                        <span className="file-status">✓ Image Attached</span>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📷</span>
                      <span className="upload-text">Click to choose Screenshot photo</span>
                      <span className="upload-sub">PNG, JPG up to 10MB</span>
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
        {/* CARD 4: SEND SCREENSHOT ON WHATSAPP & INSTANT ACTIVATION   */}
        {/* ══════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="pay-card animated-in">
            <div className="success-box">
              <div className="success-icon-badge">✓</div>
              <h2 className="success-head">Details Submitted Successfully!</h2>
              
              {/* Highlighted Direct Screenshot Alert Box */}
              <div className="wa-instruction-card">
                <div className="wa-instr-head">
                  <span className="wa-camera-icon">📸</span>
                  <span>Payment Screenshot WhatsApp Par Bhejein</span>
                </div>
                <p className="wa-instr-desc">
                  Jo payment aapne <strong>₹299</strong> ki hai, uska <strong>Screenshot / Payment Success Image</strong> neeche diye button par click karke direct WhatsApp par bhej dijiye taaki admin matching karke <strong>2 minute me aapka profile access unlock</strong> kare!
                </p>
              </div>

              <div className="submission-summary-box">
                <div className="sum-row">
                  <span>Client ID:</span>
                  <strong>{uniqueId || 'New VIP'}</strong>
                </div>
                <div className="sum-row">
                  <span>Name:</span>
                  <strong>{custName || 'Customer'}</strong>
                </div>
                <div className="sum-row">
                  <span>Phone:</span>
                  <strong>{custPhone}</strong>
                </div>
                <div className="sum-row">
                  <span>UTR No:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{utrNumber}</strong>
                </div>
              </div>

              <div className="wa-action-highlight">
                <div className="wa-badge-top">📱 Official WhatsApp Support: {SUPPORT_PHONE_DISPLAY}</div>
                <a
                  href={waUrlProof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wa-full"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.146-.538-1.523-.628-2.5-2.164-2.576-2.264-.075-.101-.617-.821-.617-1.565 0-.743.39-1.109.529-1.26.138-.15.302-.188.403-.188.101 0 .202.001.291.006.094.004.22-.036.345.263.129.313.44 1.072.478 1.15.038.077.063.168.013.268-.05.1-.076.163-.151.251-.075.088-.158.196-.226.264-.076.075-.155.157-.067.308.088.151.391.644.838 1.042.576.513 1.062.671 1.213.746.151.076.24.063.328-.038.088-.1.378-.44.479-.59.101-.15.202-.126.34-.076.139.05.882.416 1.033.491.151.076.252.114.29.177.038.063.038.366-.106.771z"/>
                  </svg>
                  <span>Send Payment Image on WhatsApp</span>
                </a>
                <p className="wa-btn-tip">👉 Click karte hi WhatsApp open hoga — wahan payment ki photo attach karke send karein</p>
              </div>

              <button
                type="button"
                className="btn-edit-steps"
                onClick={() => setCurrentStep(2)}
              >
                ← Edit Payment / Resubmit
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pay-page {
          min-height: 100vh;
          background: #08060E;
          font-family: 'Inter', system-ui, sans-serif;
          color: #fff;
          padding: 20px 16px 60px;
        }
        .pay-container {
          max-width: 480px;
          margin: 0 auto;
        }
        .pay-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .btn-back {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .badge-secure {
          font-size: 0.72rem;
          font-weight: 700;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* ── STEP TRACKER ────────────────────────────────────────── */
        .step-progress-wrapper {
          background: rgba(23, 17, 34, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px 12px;
          margin-bottom: 16px;
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
        .step-line.active { background: #FF2A7A; }
        .step-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 600;
          margin-top: 8px;
          text-align: center;
        }
        .step-labels span { width: 25%; }
        .step-labels .active-lbl { color: #FF2A7A; font-weight: 800; }

        /* ── CARD STYLING ────────────────────────────────────────── */
        .pay-card {
          background: linear-gradient(180deg, #1c1129 0%, #110c1c 100%);
          border: 1px solid rgba(255, 42, 122, 0.35);
          border-radius: 20px;
          padding: 22px 18px;
          margin-bottom: 16px;
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

        .badge-vip {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 800;
          color: #ff758f;
          background: rgba(255, 42, 122, 0.15);
          border: 1px solid rgba(255, 42, 122, 0.3);
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 8px;
        }
        .pay-main-title {
          font-size: 1.35rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .pay-sub {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 16px;
        }
        .step-heading {
          font-size: 1.25rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 6px;
        }
        .step-sub {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-bottom: 16px;
        }

        .price-split {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 42, 122, 0.08);
          border: 1px solid rgba(255, 42, 122, 0.25);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .price-tag-sm { font-size: 0.68rem; font-weight: 700; color: rgba(255, 255, 255, 0.6); }
        .price-num { font-size: 1.4rem; font-weight: 900; }
        .cut { font-size: 0.85rem; color: #64748b; text-decoration: line-through; margin-left: 6px; }
        .tag-save { background: #10B981; color: #fff; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 10px; }

        .perks-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.8rem;
          color: #e2e8f0;
          margin-bottom: 18px;
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

        .urgency-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          color: #fca5a5;
          margin-bottom: 16px;
        }
        .urgency-timer {
          background: #ef4444;
          color: #fff;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          font-family: monospace;
        }

        .btn-upi-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #FF2A7A 0%, #9333EA 100%);
          color: #fff;
          padding: 13px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 0.92rem;
          text-decoration: none;
          box-shadow: 0 8px 25px rgba(255, 42, 122, 0.4);
          margin-bottom: 14px;
        }
        .upi-options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .upi-app {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
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

        .qr-wrap {
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
        }
        .qr-text { font-size: 0.8rem; font-weight: 700; margin-bottom: 10px; }
        .qr-white {
          background: #fff;
          padding: 10px;
          border-radius: 12px;
          display: inline-block;
          margin-bottom: 10px;
        }
        .upi-copy-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.06);
          padding: 8px 12px;
          border-radius: 10px;
        }
        .upi-details { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .upi-id-lbl { font-size: 0.65rem; color: rgba(255, 255, 255, 0.5); font-weight: 700; }
        .upi-id-val { font-family: monospace; color: #38bdf8; font-weight: 700; font-size: 0.85rem; }
        .btn-copy-sm {
          background: rgba(56, 189, 248, 0.2);
          border: 1px solid rgba(56, 189, 248, 0.4);
          color: #38bdf8;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
        }

        .pay-form { display: flex; flex-direction: column; gap: 12px; }
        .f-lbl { display: block; font-size: 0.72rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px; }
        .f-in {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 10px 12px;
          color: #fff;
          font-size: 0.86rem;
          box-sizing: border-box;
          outline: none;
        }
        .f-in:focus { border-color: #FF2A7A; }

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
        .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .upload-icon { font-size: 1.3rem; }
        .upload-text { font-size: 0.82rem; font-weight: 700; color: #ffffff; }
        .upload-sub { font-size: 0.68rem; color: rgba(255, 255, 255, 0.4); }

        .file-preview-wrap { display: flex; align-items: center; gap: 12px; }
        .preview-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255, 255, 255, 0.2); }
        .preview-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; overflow: hidden; }
        .file-name { font-size: 0.82rem; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        .file-status { font-size: 0.72rem; color: #10B981; font-weight: 700; }

        .success-box { text-align: center; padding: 6px 0; }
        .success-icon-badge {
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
          margin-bottom: 10px;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
        }
        .success-head { font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 12px; }

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

        .submission-summary-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
          text-align: left;
        }
        .sum-row { display: flex; justify-content: space-between; font-size: 0.8rem; color: rgba(255, 255, 255, 0.7); }
        .sum-row strong { color: #fff; }

        .wa-action-highlight {
          background: rgba(37, 211, 102, 0.1);
          border: 1px solid rgba(37, 211, 102, 0.35);
          border-radius: 16px;
          padding: 16px 14px;
          margin-bottom: 16px;
        }
        .wa-badge-top { font-size: 0.76rem; font-weight: 800; color: #25D366; margin-bottom: 10px; }
        .btn-wa-full {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #25D366;
          color: #fff;
          text-decoration: none;
          padding: 14px;
          border-radius: 14px;
          font-size: 0.95rem;
          font-weight: 800;
          box-shadow: 0 8px 25px rgba(37, 211, 102, 0.4);
        }
        .wa-btn-tip { font-size: 0.72rem; color: rgba(255, 255, 255, 0.6); margin-top: 8px; }

        .btn-edit-steps {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          padding: 6px;
        }
      `}</style>
    </div>
  );
}
