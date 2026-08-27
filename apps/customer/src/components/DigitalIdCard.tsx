import { useState } from 'react';

interface DigitalIdCardProps {
  displayName: string;
  photoUrl?: string;
  uniqueId?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  isVerified?: boolean;
  email?: string;
  phone?: string;
  memberSince?: string;
  onEdit?: () => void;
}

export default function DigitalIdCard({
  displayName,
  photoUrl,
  uniqueId = '#LF-88201',
  dateOfBirth,
  gender,
  city = 'Mumbai, IN',
  isVerified = false,
  memberSince = '2026',
  onEdit,
}: DigitalIdCardProps) {
  const [activeTab, setActiveTab] = useState<'card' | 'qr'>('card');
  const [copied, setCopied] = useState(false);

  // Format Date of Birth
  const formattedDob = dateOfBirth
    ? new Date(dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not Specified';

  // Calculate age if DOB provided
  const age = dateOfBirth ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / 31557600000) : null;

  // Generate QR payload
  const qrData = encodeURIComponent(
    JSON.stringify({
      id: uniqueId,
      name: displayName,
      gender: gender || 'Not Specified',
      city,
      status: isVerified ? 'VERIFIED' : 'ACTIVE',
      url: `https://littlefunwithpartner.web.app/discover?id=${encodeURIComponent(uniqueId)}`,
    })
  );

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}&color=1a1a2e&bgcolor=ffffff&margin=6`;

  const copyId = () => {
    navigator.clipboard.writeText(uniqueId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ margin: 'var(--space-md) 0 var(--space-lg)' }}>
      {/* ── Tabs / Toggle ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.2rem' }}>🪪</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
            Digital Identity Pass
          </span>
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 3, gap: 2 }}>
          <button
            onClick={() => setActiveTab('card')}
            style={{
              border: 'none',
              background: activeTab === 'card' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'card' ? '#fff' : 'var(--color-text-muted)',
              borderRadius: 16,
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ID Card
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            style={{
              border: 'none',
              background: activeTab === 'qr' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'qr' ? '#fff' : 'var(--color-text-muted)',
              borderRadius: 16,
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Scan QR
          </button>
        </div>
      </div>

      {/* ── CARD FRONT ───────────────────────────────────────────── */}
      {activeTab === 'card' ? (
        <div
          onClick={() => setActiveTab('qr')}
          title="Click to view Scannable QR Code"
          style={{
            position: 'relative',
            borderRadius: 20,
            padding: '20px 22px',
            background: isVerified
              ? 'linear-gradient(135deg, #1f1435 0%, #2a1b4e 45%, #150f28 100%)'
              : 'linear-gradient(135deg, #181926 0%, #24273a 50%, #1e2030 100%)',
            border: isVerified ? '1px solid rgba(232, 90, 143, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: isVerified
              ? '0 16px 36px rgba(232, 90, 143, 0.2), 0 0 20px rgba(128, 90, 213, 0.15)'
              : '0 12px 30px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            color: '#fff',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {/* Holographic Watermark / Accent Glow */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: isVerified
                ? 'radial-gradient(circle, rgba(232, 90, 143, 0.35) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>💛</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>
                  LITTLEFUN
                </div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Member Identity Pass
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  style={{
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    borderRadius: 12,
                    padding: '3px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: isVerified ? 'rgba(232, 90, 143, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: isVerified ? '1px solid #E85A8F' : '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: isVerified ? '#FF8DB3' : '#cbd5e1',
                }}
              >
                <span>{isVerified ? '✓ VERIFIED' : 'ACTIVE'}</span>
              </div>
            </div>
          </div>

          {/* Identity Body */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
            {/* Photo Avatar */}
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 16,
                border: isVerified ? '2px solid #E85A8F' : '2px solid rgba(255,255,255,0.2)',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 14px rgba(0,0,0,0.3)',
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem' }}>👤</span>
              )}
            </div>

            {/* Main Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: '#fff',
                  marginBottom: 2,
                }}
              >
                {displayName}
              </div>

              {/* ID Tag */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  copyId();
                }}
                title="Click to copy ID"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 6,
                }}
              >
                <span>{uniqueId}</span>
                <span style={{ fontSize: '0.65rem' }}>{copied ? '✓ Copied' : '📋'}</span>
              </div>

              {/* City & Status */}
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>📍 {city}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              onClick={(e) => {
                if (onEdit) {
                  e.stopPropagation();
                  onEdit();
                }
              }}
              style={{ cursor: onEdit ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>
                DOB / Age
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: dateOfBirth ? '#f1f5f9' : '#e85a8f' }}>
                {age ? `${formattedDob} (${age}y)` : (dateOfBirth ? formattedDob : '✏️ Set DOB')}
              </div>
            </div>

            <div
              onClick={(e) => {
                if (onEdit) {
                  e.stopPropagation();
                  onEdit();
                }
              }}
              style={{ cursor: onEdit ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>
                Gender
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: gender ? '#f1f5f9' : '#e85a8f', textTransform: 'capitalize' }}>
                {gender || '✏️ Set Gender'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>
                Member Since
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>
                {memberSince}
              </div>
            </div>
          </div>

          {/* Micro Chip & Security Stripe */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 24,
                  height: 18,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #d4af37 0%, #f3e5ab 50%, #aa7c11 100%)',
                  border: '1px solid rgba(0,0,0,0.3)',
                }}
              />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                TAP CARD TO FLIP QR ➔
              </span>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Show QR</span>
              <span>➔</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── QR CODE VIEW ────────────────────────────────────────── */
        <div
          style={{
            borderRadius: 20,
            padding: '24px 20px',
            background: 'linear-gradient(135deg, #181926 0%, #24273a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 4 }}>
            SCAN TO CONNECT & VERIFY
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            Show this QR code to nearby partners to instantly share your verified profile
          </div>

          {/* QR Container */}
          <div
            style={{
              display: 'inline-block',
              padding: 12,
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              marginBottom: 16,
            }}
          >
            <img
              src={qrImageUrl}
              alt="Profile QR Code"
              style={{ width: 170, height: 170, display: 'block', borderRadius: 8 }}
            />
          </div>

          {/* QR Meta */}
          <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 2 }}>{displayName}</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', marginBottom: 14 }}>
            {uniqueId} • {city}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={copyId}
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ ID Copied' : '📋 Copy ID'}
            </button>
            <button
              onClick={() => setActiveTab('card')}
              style={{
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
