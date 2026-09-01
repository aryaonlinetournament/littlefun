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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(14 * 60 + 59);

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
      date: new Date().toISOString(),
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
    `*Client ID:* ${uniqueId || 'New Registration'}\n` +
    `*Name:* ${custName || 'Customer'}\n` +
    `*Phone:* ${custPhone}\n` +
    `*City:* ${custCity || 'N/A'}\n` +
    `*Amount:* ₹299\n` +
    `*UTR / Ref No:* ${utrNumber}\n\n` +
    `Please approve my account and provide 2-3 meeting profiles.`
  );
  const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

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
          <span>🔥 Special 50% Off Offer Ends In:</span>
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
            <div>✓ <strong>100% Discreet & Safe</strong></div>
          </div>

          <a href={upiUrl} className="btn-upi-primary">
            ⚡ Pay ₹299 Now (Open Any UPI App)
          </a>

          <div className="upi-options-grid">
            <a href={`tez://upi/pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-app gpay">Google Pay</a>
            <a href={`phonepe://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-app phonepe">PhonePe</a>
            <a href={`paytmmp://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(NOTE)}`} className="upi-app paytm">Paytm</a>
            <a href={upiUrl} className="upi-app bhim">BHIM / Other</a>
          </div>

          {/* QR */}
          <div className="qr-wrap">
            <div className="qr-text">Scan QR Code to Pay ₹299</div>
            <div className="qr-white">
              <img src={qrCodeImgUrl} alt="QR Code" style={{ width: '170px', height: '170px', display: 'block' }} />
            </div>
            <div className="upi-copy-line">
              <span>{UPI_ID}</span>
              <button onClick={copyUpiId} className="btn-copy-sm">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Verification Form */}
        <div className="pay-card">
          <h3 className="form-head">Submit Payment Proof</h3>
          <p className="form-sub">Payment ke baad apna UTR number yahan submit karein</p>

          {isSubmitted ? (
            <div className="success-box">
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Details Submitted!</div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>Admin verify karke 5-15 minute me access unlock karega.</p>
              <a href={waUrl} target="_blank" rel="noreferrer" className="btn-wa-green">
                Send Proof on WhatsApp
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
              <button type="submit" className="btn-submit-green">
                ✓ Submit & Request Fast Approval
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .pay-page {
          min-height: 100vh;
          background: #0D0A14;
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
          padding: 2px 6px;
          border-radius: 4px;
        }
        .pay-card {
          background: linear-gradient(180deg, #1f152b 0%, #120d1c 100%);
          border: 1px solid rgba(255, 42, 122, 0.35);
          border-radius: 20px;
          padding: 24px 20px;
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
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .pay-sub {
          font-size: 0.82rem;
          color: #94a3b8;
          margin-bottom: 16px;
        }
        .price-split {
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .price-tag-sm {
          font-size: 0.7rem;
          color: #94a3b8;
        }
        .price-num {
          font-size: 1.8rem;
          font-weight: 900;
        }
        .cut {
          font-size: 0.85rem;
          color: #64748b;
          text-decoration: line-through;
          margin-left: 6px;
        }
        .tag-save {
          background: #10b981;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .perks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.82rem;
          color: #e2e8f0;
          margin-bottom: 16px;
        }
        .btn-upi-primary {
          display: block;
          background: linear-gradient(135deg, #ff2a7a 0%, #9333ea 100%);
          color: #fff;
          font-weight: 800;
          font-size: 0.95rem;
          text-align: center;
          padding: 14px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(255, 42, 122, 0.4);
          margin-bottom: 12px;
        }
        .upi-options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .upi-app {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          text-decoration: none;
        }
        .qr-wrap {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px;
          text-align: center;
        }
        .qr-text {
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .qr-white {
          background: #fff;
          padding: 8px;
          border-radius: 10px;
          display: inline-block;
          margin-bottom: 8px;
        }
        .upi-copy-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.06);
          padding: 6px 10px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.85rem;
          color: #38bdf8;
        }
        .btn-copy-sm {
          background: rgba(56, 189, 248, 0.2);
          border: none;
          color: #38bdf8;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .form-head {
          font-size: 1rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .form-sub {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 12px;
        }
        .pay-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .f-lbl {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .f-in {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 10px 12px;
          color: #fff;
          font-size: 0.85rem;
          box-sizing: border-box;
          outline: none;
        }
        .btn-submit-green {
          width: 100%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #fff;
          font-size: 0.88rem;
          font-weight: 800;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 4px;
        }
        .btn-wa-green {
          display: block;
          background: #25d366;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          text-decoration: none;
        }
        .success-box {
          text-align: center;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          padding: 16px;
        }
      `}</style>
    </div>
  );
}
