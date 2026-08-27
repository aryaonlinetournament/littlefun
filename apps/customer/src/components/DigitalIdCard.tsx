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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'qr'>('card');
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Format Date of Birth
  const formattedDob = dateOfBirth
    ? new Date(dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not Specified';

  // Calculate age if DOB provided
  const age = dateOfBirth ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / 31557600000) : null;

  // Profile URL & QR
  const profileUrl = `https://littlefunwithpartner.web.app/discover?id=${encodeURIComponent(uniqueId)}`;
  const qrData = encodeURIComponent(
    JSON.stringify({
      id: uniqueId,
      name: displayName,
      gender: gender || 'Not Specified',
      city,
      status: isVerified ? 'VERIFIED' : 'ACTIVE',
      url: profileUrl,
    })
  );

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&color=161828&bgcolor=ffffff&margin=6`;

  const copyId = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(uniqueId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}'s LittleFun ID Pass`,
          text: `Check out my verified LittleFun profile (${uniqueId})!`,
          url: profileUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch {
        copyId();
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  return (
    <>
      {/* ── PROFILE TRIGGER BUTTON / BAR ─────────────────────────── */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          margin: 'var(--space-md) 0',
          padding: '14px 18px',
          borderRadius: 18,
          background: isVerified
            ? 'linear-gradient(135deg, rgba(232, 90, 143, 0.15) 0%, rgba(139, 92, 246, 0.18) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
          border: isVerified ? '1px solid rgba(232, 90, 143, 0.45)' : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isVerified
            ? '0 8px 24px rgba(232, 90, 143, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            : '0 6px 18px rgba(0, 0, 0, 0.25)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(232, 90, 143, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = isVerified
            ? '0 8px 24px rgba(232, 90, 143, 0.2)'
            : '0 6px 18px rgba(0, 0, 0, 0.25)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Avatar / Icon Chip */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isVerified
                ? 'linear-gradient(135deg, #E85A8F, #8B5CF6)'
                : 'linear-gradient(135deg, #374151, #1F2937)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1.5px solid rgba(255,255,255,0.2)',
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '🪪'
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
                Digital Identity Pass
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 6,
                  background: isVerified ? 'rgba(232, 90, 143, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  color: isVerified ? '#FF9BC0' : '#cbd5e1',
                  border: isVerified ? '1px solid rgba(232, 90, 143, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                {isVerified ? '✓ VERIFIED' : 'ACTIVE'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', marginTop: 2, display: 'flex', gap: 6 }}>
              <span style={{ fontFamily: 'monospace' }}>{uniqueId}</span>
              <span>•</span>
              <span>Tap to view pass & QR</span>
            </div>
          </div>
        </div>

        {/* Action Button Pill */}
        <div
          style={{
            background: 'linear-gradient(135deg, #E85A8F 0%, #C8386D 100%)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 12,
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(232, 90, 143, 0.4)',
            flexShrink: 0,
          }}
        >
          <span>View Card</span>
          <span>➔</span>
        </div>
      </div>

      {/* ── FLOATING GLASSMORPHIC MODAL WINDOW ───────────────────── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 7, 15, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'rgba(22, 25, 41, 0.95)',
              borderRadius: 24,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 35px rgba(232, 90, 143, 0.25)',
              overflow: 'hidden',
              animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🪪</span>
                <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff', letterSpacing: '0.02em' }}>
                  LittleFun Identity Pass
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Card / QR Toggle */}
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 20,
                    padding: 3,
                    gap: 2,
                  }}
                >
                  <button
                    onClick={() => setActiveTab('card')}
                    style={{
                      border: 'none',
                      background: activeTab === 'card' ? 'var(--color-primary)' : 'transparent',
                      color: activeTab === 'card' ? '#fff' : 'rgba(255,255,255,0.6)',
                      borderRadius: 14,
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Card
                  </button>
                  <button
                    onClick={() => setActiveTab('qr')}
                    style={{
                      border: 'none',
                      background: activeTab === 'qr' ? 'var(--color-primary)' : 'transparent',
                      color: activeTab === 'qr' ? '#fff' : 'rgba(255,255,255,0.6)',
                      borderRadius: 14,
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    QR Code
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {activeTab === 'card' ? (
                /* ── ULTRA-PREMIUM HOLOGRAPHIC ID CARD ─────────────── */
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 22,
                    padding: '24px 22px',
                    background: isVerified
                      ? 'linear-gradient(145deg, #241442 0%, #3b1d68 45%, #180d30 100%)'
                      : 'linear-gradient(145deg, #181926 0%, #292c3f 50%, #1e2030 100%)',
                    border: isVerified
                      ? '1px solid rgba(232, 90, 143, 0.55)'
                      : '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: isVerified
                      ? '0 20px 45px rgba(232, 90, 143, 0.3), 0 0 30px rgba(139, 92, 246, 0.25)'
                      : '0 16px 36px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    color: '#fff',
                  }}
                >
                  {/* Holographic foil shimmer effects */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -60,
                      right: -60,
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      background: isVerified
                        ? 'radial-gradient(circle, rgba(232, 90, 143, 0.4) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Card Brand Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>💛</span>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
                          LITTLEFUN
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                          OFFICIAL VIP MEMBER PASS
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        background: isVerified ? 'rgba(232, 90, 143, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                        border: isVerified ? '1px solid #E85A8F' : '1px solid rgba(255, 255, 255, 0.2)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: isVerified ? '#FF9BC0' : '#e2e8f0',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {isVerified ? '✓ VERIFIED' : 'ACTIVE'}
                    </div>
                  </div>

                  {/* Photo & Main Details */}
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                    {/* High-res Avatar */}
                    <div
                      style={{
                        width: 82,
                        height: 82,
                        borderRadius: 20,
                        border: isVerified ? '2.5px solid #E85A8F' : '2px solid rgba(255,255,255,0.25)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                      }}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '2.4rem' }}>👤</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#fff',
                          marginBottom: 3,
                        }}
                      >
                        {displayName}
                      </div>

                      {/* ID Tag */}
                      <div
                        onClick={copyId}
                        title="Click to copy ID"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.74rem',
                          fontFamily: 'monospace',
                          color: '#f8fafc',
                          background: 'rgba(0,0,0,0.35)',
                          padding: '3px 9px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          marginBottom: 6,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <span>{uniqueId}</span>
                        <span style={{ fontSize: '0.7rem' }}>{copied ? '✓' : '📋'}</span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>📍 {city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Demographics Grid with 1-Click Edit Triggers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '12px',
                      borderRadius: 14,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      onClick={() => {
                        if (onEdit) {
                          setIsOpen(false);
                          onEdit();
                        }
                      }}
                      style={{ cursor: onEdit ? 'pointer' : 'default' }}
                      title="Click to edit Date of Birth"
                    >
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: 700 }}>
                        DOB / Age
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: dateOfBirth ? '#fff' : '#FF6584', marginTop: 2 }}>
                        {age ? `${formattedDob} (${age}y)` : (dateOfBirth ? formattedDob : '✏️ Set DOB')}
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        if (onEdit) {
                          setIsOpen(false);
                          onEdit();
                        }
                      }}
                      style={{ cursor: onEdit ? 'pointer' : 'default' }}
                      title="Click to edit Gender"
                    >
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Gender
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: gender ? '#fff' : '#FF6584', textTransform: 'capitalize', marginTop: 2 }}>
                        {gender || '✏️ Set Gender'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Member Since
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                        {memberSince}
                      </div>
                    </div>
                  </div>

                  {/* Card Security Chip & Barcode Stripe */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 20,
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, #d4af37 0%, #f3e5ab 50%, #aa7c11 100%)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          border: '1px solid rgba(0,0,0,0.4)',
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
                        NFC SECURE ID
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTab('qr')}
                      style={{
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 10,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>Show QR Code</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── SCANNABLE QR CODE VIEW ───────────────────────── */
                <div
                  style={{
                    borderRadius: 22,
                    padding: '24px 20px',
                    background: 'linear-gradient(145deg, #181926 0%, #292c3f 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>
                    SCAN TO VERIFY & CONNECT
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginBottom: 18 }}>
                    Show this QR code to instantly share your verified ID details
                  </div>

                  {/* QR Image Box */}
                  <div
                    style={{
                      display: 'inline-block',
                      padding: 14,
                      background: '#ffffff',
                      borderRadius: 18,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      marginBottom: 16,
                    }}
                  >
                    <img
                      src={qrImageUrl}
                      alt="Identity QR Code"
                      style={{ width: 190, height: 190, display: 'block', borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: 2 }}>{displayName}</div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                    {uniqueId} • {city}
                  </div>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={copyId}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span>{copied ? 'ID Copied' : 'Copy ID'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    border: 'none',
                    background: 'linear-gradient(135deg, #E85A8F 0%, #C8386D 100%)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(232, 90, 143, 0.4)',
                  }}
                >
                  <span>🔗</span>
                  <span>{shareSuccess ? 'Link Copied!' : 'Share Pass'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
