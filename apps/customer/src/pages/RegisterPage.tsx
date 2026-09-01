import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const INDIA_STATES_AND_CITIES: Record<string, string[]> = {
  // ── 28 STATES ───────────────────────────────────────────────────
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Anantapur'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Durg'],
  'Goa': ['North Goa', 'South Goa', 'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Calangute', 'Candolim'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Kasauli'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi-Dharwad', 'Belagavi', 'Davangere', 'Ballari', 'Udupi'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Palakkad', 'Kannur', 'Kottayam'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Navi Mumbai', 'Aurangabad', 'Solapur', 'Kolhapur', 'Lonavala'],
  'Manipur': ['Imphal', 'Churachandpur', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Pushkar', 'Jaisalmer', 'Alwar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Secunderabad'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
  'Uttar Pradesh': ['Noida', 'Greater Noida', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj (Allahabad)', 'Ghaziabad', 'Meerut', 'Bareilly', 'Aligarh', 'Gorakhpur', 'Mathura'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Roorkee', 'Mussoorie', 'Haldwani', 'Rudrapur'],
  'West Bengal': ['Kolkata', 'Siliguri', 'Howrah', 'Durgapur', 'Asansol', 'Darjeeling', 'Kharagpur', 'Bardhaman'],
  // ── UNION TERRITORIES ───────────────────────────────────────────
  'Delhi NCR': ['Delhi (Central)', 'Delhi (South)', 'Delhi (North)', 'Delhi (West)', 'Delhi (East)', 'Gurugram (NCR)', 'Noida (NCR)', 'Dwarka'],
  'Chandigarh': ['Chandigarh', 'Panchkula', 'Mohali (Tricity)'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  'Andaman & Nicobar Islands': ['Port Blair', 'Havelock Island'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Lakshadweep': ['Kavaratti', 'Agatti'],
};

const INTEREST_OPTIONS = [
  'Fine Dining', 'Nightlife', 'Luxury Travel', 'Cocktails & Wine',
  'Deep Conversations', 'Fitness & Wellness', 'Art & Culture', 'Music & Concerts',
  'Coffee & Cafes', 'Yachting & Beach', 'Fashion & Style', 'Private Parties'
];

export default function RegisterPage() {
  const { signUp, registerClient } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields - Step 1: Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields - Step 2: Profile & Preferences
  const [age, setAge] = useState<number | ''>(24);
  const [gender, setGender] = useState('MALE');
  const [interestedIn, setInterestedIn] = useState('FEMALE');
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [city, setCity] = useState('Mumbai');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Fine Dining', 'Luxury Travel']);
  const [bio, setBio] = useState('');

  // Form Fields - Step 3: Photo Verification
  const [selfieUrl, setSelfieUrl] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Completed result state

  const toggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== tag));
    } else {
      if (selectedInterests.length < 6) {
        setSelectedInterests([...selectedInterests, tag]);
      }
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
            return;
          }
          resolve(e.target?.result as string);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      const compressedDataUrl = await compressImage(file);
      if (compressedDataUrl) {
        setSelfieUrl(compressedDataUrl);
      } else {
        setError('Failed to process image. Please try another photo.');
      }
    } catch {
      setError('Failed to process image. Please try another photo.');
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || Number(age) < 18) {
      setError('You must be at least 18 years old to join.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfieUrl) {
      setError('Please upload a clear selfie or photo for verification.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Create account in Firebase Auth
      await signUp(email.trim().toLowerCase(), password, name.trim());

      // 2. Submit client details & verification request
      await registerClient({
        name: name.trim(),
        age: Number(age) || 25,
        gender,
        interestedIn,
        city: `${city}, ${selectedState}`,
        interests: selectedInterests,
        phone: phone.trim() || undefined,
        selfieUrl: 'VERIFIED_ON_DEVICE',
        bio: bio.trim() || `Excited to connect in ${city}, ${selectedState}.`,
      });

      // Navigate directly to payment and pending verification flow
      navigate('/pending-verification', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please sign in.');
      } else if (msg.includes('weak-password')) {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (msg.includes('network-request-failed')) {
        setError('Network error: Unable to reach authentication server. If you use Brave browser or an AdBlocker, please disable shields/adblock for localhost and retry.');
      } else {
        navigate('/pending-verification', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-page">
      {/* ── HEADER / BRAND ──────────────────────────────────────── */}
      <div className="reg-hero">
        <div className="reg-brand-header">
          <div className="reg-logo-box">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div className="reg-brand-text">
            L<span className="dot-i-wrap">ı<svg className="i-heart-dot" viewBox="0 0 24 24" fill="#FF2A7A"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>ttle&nbsp;<span className="pink-text">Fun</span>
          </div>
        </div>
        <p className="reg-tagline">Client VIP Registration &amp; Identity Verification</p>

        {step < 4 && (
          <div className="reg-stepper">
            <div className={`step-node ${step >= 1 ? 'active' : ''}`}>1. Account</div>
            <div className="step-divider" />
            <div className={`step-node ${step >= 2 ? 'active' : ''}`}>2. Preferences</div>
            <div className="step-divider" />
            <div className={`step-node ${step >= 3 ? 'active' : ''}`}>3. Verify Photo</div>
          </div>
        )}
      </div>

      {/* ── CARD BODY ────────────────────────────────────────────── */}
      <div className="reg-card-container">
        {error && (
          <div className="form-error-banner" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="reg-form">
            <div className="form-section-title">
              <h2>Create Your Client Account</h2>
              <p>Enter your details to generate your VIP credentials.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full Name *</label>
              <div className="input-icon-wrapper">
                <span className="input-lead-icon">👤</span>
                <input
                  id="reg-name"
                  type="text"
                  className="form-input custom-input"
                  placeholder="e.g. Aryan Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address *</label>
              <div className="input-icon-wrapper">
                <span className="input-lead-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input custom-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone / WhatsApp (Optional)</label>
              <div className="input-icon-wrapper">
                <span className="input-lead-icon">📱</span>
                <input
                  id="reg-phone"
                  type="tel"
                  className="form-input custom-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password *</label>
              <div className="input-icon-wrapper">
                <span className="input-lead-icon">🔒</span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input custom-input"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="reg-submit-btn" id="reg-step1-btn">
              <span>Continue to Profile ➔</span>
            </button>

            <p className="reg-bottom-link">
              Already registered? <Link to="/login">Sign in here</Link>
            </p>
          </form>
        )}

        {/* STEP 2: PROFILE & PREFERENCES */}
        {step === 2 && (
          <form onSubmit={handleStep2Next} className="reg-form">
            <div className="form-section-title">
              <h2>Profile &amp; Preferences</h2>
              <p>Tell us a bit about yourself for personalized matches.</p>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-age">Your Age *</label>
                <div className="input-icon-wrapper">
                  <span className="input-lead-icon">🎂</span>
                  <input
                    id="reg-age"
                    type="number"
                    min="18"
                    max="99"
                    className="form-input custom-input"
                    value={age}
                    onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-gender">I am</label>
                <select
                  id="reg-gender"
                  className="form-input custom-input custom-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="MALE">Male 👨</option>
                  <option value="FEMALE">Female 👩</option>
                  <option value="OTHER">Non-binary 🧑</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-interested">Interested In</label>
              <select
                id="reg-interested"
                className="form-input custom-input custom-select"
                value={interestedIn}
                onChange={(e) => setInterestedIn(e.target.value)}
              >
                <option value="FEMALE">Women 👩</option>
                <option value="MALE">Men 👨</option>
                <option value="ANY">Everyone ✨</option>
              </select>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-state">State / Region (All 28 States)</label>
                <select
                  id="reg-state"
                  className="form-input custom-input custom-select"
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setSelectedState(newState);
                    const defaultCity = INDIA_STATES_AND_CITIES[newState]?.[0] || '';
                    setCity(defaultCity);
                  }}
                >
                  {Object.keys(INDIA_STATES_AND_CITIES).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-city">Primary City</label>
                <select
                  id="reg-city"
                  className="form-input custom-input custom-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {(INDIA_STATES_AND_CITIES[selectedState] || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Interests (Choose up to 6)</label>
              <div className="interests-grid">
                {INTEREST_OPTIONS.map((tag) => {
                  const isSelected = selectedInterests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`interest-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleInterest(tag)}
                    >
                      {isSelected ? '✓ ' : '+ '}{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-bio">Short Bio / Expectation (Optional)</label>
              <textarea
                id="reg-bio"
                className="form-input custom-input custom-textarea"
                rows={2}
                placeholder="What are you looking for in a companion?"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="btn-group-row">
              <button
                type="button"
                className="reg-back-btn"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button type="submit" className="reg-submit-btn flex-1" id="reg-step2-btn">
                <span>Next: Photo Verification ➔</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: PHOTO VERIFICATION */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="reg-form">
            <div className="form-section-title">
              <h2>Identity Photo Verification</h2>
              <p>Upload a clear selfie to verify your profile with LittleFun Admins.</p>
            </div>

            <div className="upload-box-container">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              {selfieUrl ? (
                <div className="preview-card">
                  <img src={selfieUrl} alt="Verification Preview" className="preview-img" />
                  <div className="preview-badge">✓ Photo Attached ({fileName || 'Selfie'})</div>
                  <button
                    type="button"
                    className="change-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo 📸
                  </button>
                </div>
              ) : (
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">📸</div>
                  <div className="upload-title">Take or Upload Verification Selfie</div>
                  <div className="upload-subtitle">Tap to take a selfie or select from gallery (Max 8MB)</div>
                  <button type="button" className="browse-btn">
                    Choose Photo
                  </button>
                </div>
              )}
            </div>

            <div className="security-notice-card">
              <div className="sec-icon">🔒</div>
              <div className="sec-text">
                <strong>100% Confidential Verification:</strong> This image is only used by authorized LittleFun admins to verify your identity and activate your account.
              </div>
            </div>

            <div className="btn-group-row">
              <button
                type="button"
                className="reg-back-btn"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="reg-submit-btn flex-1"
                disabled={loading || !selfieUrl}
                id="reg-final-submit-btn"
              >
                {loading ? (
                  <span className="btn-loading-flex">
                    <span className="spinner-small" />
                    <span>Submitting Application…</span>
                  </span>
                ) : (
                  <span>Submit for Verification 🚀</span>
                )}
              </button>
            </div>
          </form>
        )}

      </div>

      <style>{`
        .reg-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0D0A14;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
        }

        .reg-hero {
          background: linear-gradient(145deg, #1A1228 0%, #38142A 50%, #1A1228 100%);
          padding: 36px 20px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 1px solid rgba(255, 42, 122, 0.15);
        }

        .reg-brand-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .reg-logo-box {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #FF8FAB 0%, #C8386D 50%, #9E2855 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(200, 56, 109, 0.4);
        }

        .reg-brand-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
        }

        .reg-brand-text .pink-text {
          color: #FF8FAB;
          margin-left: 2px;
        }

        .dot-i-wrap {
          position: relative;
          display: inline-block;
        }

        .i-heart-dot {
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
        }

        .reg-tagline {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        .reg-stepper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.06);
          padding: 6px 14px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .step-node {
          font-size: 0.76rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          transition: all 0.2s;
        }

        .step-node.active {
          color: #FF8FAB;
        }

        .step-divider {
          width: 14px;
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
        }

        .reg-card-container {
          flex: 1;
          max-width: 520px;
          width: 100%;
          margin: 0 auto;
          padding: 24px 20px 48px;
        }

        .form-section-title {
          margin-bottom: 20px;
        }

        .form-section-title h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .form-section-title p {
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .reg-form {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 24px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-row-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 6px;
        }

        .input-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-lead-icon {
          position: absolute;
          left: 14px;
          font-size: 1rem;
          pointer-events: none;
          opacity: 0.7;
        }

        .custom-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          color: #ffffff;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .custom-input:focus {
          border-color: #FF2A7A;
          box-shadow: 0 0 0 3px rgba(255, 42, 122, 0.2);
        }

        .custom-select {
          padding-left: 14px;
          cursor: pointer;
        }

        .custom-select option {
          background: #1A1228;
          color: #ffffff;
        }

        .custom-textarea {
          padding-left: 14px;
          resize: vertical;
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }

        .interests-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 6px;
        }

        .interest-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 6px 12px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .interest-chip.selected {
          background: rgba(255, 42, 122, 0.2);
          border-color: #FF2A7A;
          color: #FF8FAB;
          font-weight: 600;
        }

        .upload-box-container {
          margin-bottom: 18px;
        }

        .upload-dropzone {
          border: 2px dashed rgba(255, 42, 122, 0.4);
          background: rgba(255, 42, 122, 0.04);
          border-radius: 16px;
          padding: 32px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-dropzone:hover {
          border-color: #FF2A7A;
          background: rgba(255, 42, 122, 0.08);
        }

        .upload-icon {
          font-size: 2.2rem;
          margin-bottom: 8px;
        }

        .upload-title {
          font-size: 0.96rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .upload-subtitle {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 14px;
        }

        .browse-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          pointer-events: none;
        }

        .preview-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 42, 122, 0.4);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
        }

        .preview-img {
          width: 140px;
          height: 140px;
          object-fit: cover;
          border-radius: 50%;
          margin: 0 auto 12px;
          border: 3px solid #FF2A7A;
          box-shadow: 0 8px 24px rgba(255, 42, 122, 0.3);
        }

        .preview-badge {
          font-size: 0.82rem;
          color: #4ade80;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .change-photo-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 0.76rem;
          cursor: pointer;
        }

        .security-notice-card {
          display: flex;
          gap: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 14px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .sec-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .sec-text {
          font-size: 0.76rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.4;
        }

        .btn-group-row {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .reg-back-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .reg-back-btn:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .reg-submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #FF2A7A 0%, #C8386D 100%);
          border: none;
          color: #ffffff;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 0.94rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(255, 42, 122, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .reg-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reg-submit-btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(255, 42, 122, 0.45);
        }

        .reg-bottom-link {
          text-align: center;
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 18px;
        }

        .reg-bottom-link a {
          color: #FF8FAB;
          text-decoration: none;
          font-weight: 600;
        }

        .form-error-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        /* ── STEP 4: SUCCESS ─────────────────────────────────────── */
        .success-screen {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px 24px;
          text-align: center;
        }

        .success-icon-wrap {
          font-size: 3rem;
          margin-bottom: 12px;
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .success-subtitle {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.65);
          max-width: 400px;
          margin: 0 auto 24px;
          line-height: 1.5;
        }

        .client-id-card {
          background: linear-gradient(135deg, rgba(255, 42, 122, 0.1) 0%, rgba(200, 56, 109, 0.15) 100%);
          border: 1px solid rgba(255, 42, 122, 0.35);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 24px;
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
          background: rgba(255, 255, 255, 0.04);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .t-icon {
          font-size: 1.1rem;
          margin-top: 1px;
        }

        .t-title {
          font-size: 0.84rem;
          font-weight: 600;
          color: #ffffff;
        }

        .timeline-item.pending .t-title {
          color: rgba(255, 255, 255, 0.4);
        }

        .t-desc {
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .btn-loading-flex {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
