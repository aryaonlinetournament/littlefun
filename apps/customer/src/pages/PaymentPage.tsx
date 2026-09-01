import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { user, uniqueId } = useAuth();

  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [custName, setCustName] = useState(user?.displayName || '');
  const [custPhone, setCustPhone] = useState('');
  const [custCity, setCustCity] = useState('');
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

    setIsSubmitted(true);
  };

  const waTextFormProof = encodeURIComponent(
    `*LittleFun VIP Registration Payment Proof*\n` +
    `--------------------------\n` +
    `*Client ID:* ${uniqueId || 'New Registration'}\n` +
    `*Name:* ${custName || 'Customer'}\n` +
    `*Phone:* ${custPhone}\n` +
    `*City:* ${custCity || 'N/A'}\n` +
    `*Amount:* ₹299\n` +
    `*UTR / Ref No:* ${utrNumber}\n\n` +
    `📸 I have submitted my payment proof. Please activate my account and provide meeting profiles.`
  );
  const waUrlFormProof = `https://wa.me/91${SUPPORT_PHONE}?text=${waTextFormProof}`;

  const waDirectText = encodeURIComponent(
    `*Hi LittleFun Admin, I want to activate my VIP account.*\n` +
    `--------------------------\n` +
    `*Client ID:* ${uniqueId || 'New Registration'}\n` +
    `*Name:* ${custName || 'Customer'}\n` +
    `*City:* ${custCity || 'N/A'}\n` +
    `*Fee:* ₹299 (Paid via UPI)\n\n` +
    `I am sending my payment screenshot / UTR number here. Please verify and activate my access!`
  );
  const waDirectUrl = `https://wa.me/91${SUPPORT_PHONE}?text=${waDirectText}`;

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

        {/* Urgency Pill */}
        <div className="urgency-banner">
          <span>🔥 Special VIP Slot Offer Ends In:</span>
          <span className="urgency-timer">{formatTime(timeLeft)}</span>
        </div>

        {/* Pricing Card */}
        <div className="pay-card">
          <div className="badge-vip">VIP MEMBER REGISTRATION</div>
          <h1 className="pay-main-title">LittleFun With Partner</h1>
          <p className="pay-sub">For activating, registration charge is ₹299/-</p>

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
            <div>✓ <strong>100% Verified Profiles on App</strong></div>
            <div>✓ <strong>100% Discreet & Safe Checkout</strong></div>
          </div>

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
              <img src={qrCodeImgUrl} alt="QR Code" style={{ width: '170px', height: '170px', display: 'block' }} />
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
        </div>

        {/* Verification Options Card */}
        <div className="pay-card proof-card">
          <h3 className="form-head">Submit Verification Proof</h3>
          <p className="form-sub">Choose your preferred verification method below:</p>

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

          {/* TAB 1: WHATSAPP DIRECT */}
          {activeTab === 'whatsapp' && (
            <div className="tab-wa-panel">
              <div className="wa-feature-badge">
                <span className="wa-pulse"></span> ⚡ Instant 2-Minute Approval
              </div>
              <p className="wa-panel-desc">
                Payment screenshot direct hamare official WhatsApp number <strong>{SUPPORT_PHONE_DISPLAY}</strong> par bhejein:
              </p>

              <div className="wa-number-box">
                <span>📱 Official WhatsApp:</span>
                <strong>{SUPPORT_PHONE_DISPLAY}</strong>
              </div>

              <a href={waDirectUrl} target="_blank" rel="noopener noreferrer" className="btn-wa-full">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.146-.538-1.523-.628-2.5-2.164-2.576-2.264-.075-.101-.617-.821-.617-1.565 0-.743.39-1.109.529-1.26.138-.15.302-.188.403-.188.101 0 .202.001.291.006.094.004.22-.036.345.263.129.313.44 1.072.478 1.15.038.077.063.168.013.268-.05.1-.076.163-.151.251-.075.088-.158.196-.226.264-.076.075-.155.157-.067.308.088.151.391.644.838 1.042.576.513 1.062.671 1.213.746.151.076.24.063.328-.038.088-.1.378-.44.479-.59.101-.15.202-.126.34-.076.139.05.882.416 1.033.491.151.076.252.114.29.177.038.063.038.366-.106.771z"/>
                </svg>
                <span>Send Screenshot on WhatsApp</span>
              </a>

              <div className="wa-help-note">
                ✓ 24/7 Verified Support • Instant Verification
              </div>
            </div>
          )}

          {/* TAB 2: IN-APP FORM & SCREENSHOT UPLOAD */}
          {activeTab === 'form' && (
            <div>
              {isSubmitted ? (
                <div className="success-box">
                  <div className="success-icon-badge">✓</div>
                  <div className="success-head">Details Submitted Successfully!</div>
                  <p className="success-sub">Admin verify karke 5-15 minute me access unlock karega.</p>
                  <a href={waUrlFormProof} target="_blank" rel="noopener noreferrer" className="btn-wa-full">
                    Forward Proof on WhatsApp for Fast Track
                  </a>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="pay-form">
                  <div>
                    <label className="f-lbl">YOUR NAME</label>
                    <input type="text" value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Full name" className="f-in" required />
                  </div>
                  <div>
                    <label className="f-lbl">WHATSAPP / MOBILE NUMBER</label>
                    <input type="tel" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} placeholder="10-digit number" className="f-in" required />
                  </div>
                  <div>
                    <label className="f-lbl">CITY / AREA</label>
                    <input type="text" value={custCity} onChange={(e) => setCustCity(e.target.value)} placeholder="e.g. Delhi NCR, Mumbai" className="f-in" />
                  </div>
                  <div>
                    <label className="f-lbl">12-DIGIT UPI REFERENCE / UTR NO.</label>
                    <input type="text" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} placeholder="e.g. 423589123456" className="f-in" required />
                  </div>

                  {/* Screenshot File Upload */}
                  <div>
                    <label className="f-lbl">ATTACH PAYMENT SCREENSHOT (OPTIONAL)</label>
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
                          <span className="upload-text">Tap to select payment screenshot</span>
                          <span className="upload-sub">PNG, JPG up to 10MB</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <button type="submit" className="btn-submit-green">
                    ✓ Submit Verification Request
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pay-page {
          min-height: 100vh;
          background: #09070F;
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
          margin-bottom: 16px;
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
        .urgency-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
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
        .pay-card {
          background: linear-gradient(180deg, #1b1126 0%, #110c1c 100%);
          border: 1px solid rgba(255, 42, 122, 0.35);
          border-radius: 20px;
          padding: 22px 18px;
          margin-bottom: 16px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
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
        .price-tag-sm {
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
        }
        .price-num {
          font-size: 1.4rem;
          font-weight: 900;
        }
        .cut {
          font-size: 0.85rem;
          color: #64748b;
          text-decoration: line-through;
          margin-left: 6px;
        }
        .tag-save {
          background: #10B981;
          color: #fff;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 10px;
        }
        .perks-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.8rem;
          color: #e2e8f0;
          margin-bottom: 18px;
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
        .app-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
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
        .qr-text {
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 10px;
        }
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
        .upi-details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }
        .upi-id-lbl {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
        }
        .upi-id-val {
          font-family: monospace;
          color: #38bdf8;
          font-weight: 700;
          font-size: 0.85rem;
        }
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

        /* ── METHOD TABS & VERIFICATION FORM ─────────────────────── */
        .proof-card {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .form-head {
          font-size: 1.05rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .form-sub {
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
        }
        .method-tab.active-tab {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        .badge-fast {
          background: #10B981;
          color: #fff;
          font-size: 0.62rem;
          font-weight: 900;
          padding: 2px 5px;
          border-radius: 4px;
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
        .wa-panel-desc {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.45;
          margin-bottom: 14px;
        }
        .wa-number-box {
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
        .wa-number-box strong {
          color: #25D366;
          font-size: 0.95rem;
          font-family: monospace;
        }
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
          font-size: 0.92rem;
          font-weight: 800;
          box-shadow: 0 8px 25px rgba(37, 211, 102, 0.35);
          margin-bottom: 10px;
        }
        .wa-help-note {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
        }
        .pay-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .f-lbl {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
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
        .f-in:focus {
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
        .btn-submit-green {
          width: 100%;
          background: linear-gradient(135deg, #10B981, #059669);
          border: none;
          color: #fff;
          padding: 13px;
          border-radius: 12px;
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
          margin-top: 4px;
        }
        .success-box {
          text-align: center;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 14px;
          padding: 20px 14px;
        }
        .success-icon-badge {
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
        .success-head {
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 6px;
        }
        .success-sub {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 14px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
