import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { profilesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';
import DigitalIdCard from '../components/DigitalIdCard';

const INTERESTS = [
  'Dining', 'Coffee', 'Travel', 'Art', 'Music', 'Fitness', 'Reading', 'Cinema',
  'Cooking', 'Dance', 'Photography', 'Adventure', 'Yoga', 'Concerts', 'Nature',
  'Fashion', 'Games', 'Sports', 'Comedy', 'Theatre'
];

type ProfilePhoto = { id: string; url: string; is_primary: boolean; sort_order: number };
type Profile = Record<string, unknown> & { profile_photos?: ProfilePhoto[]; users?: { email?: string; phone?: string } };

export default function ProfilePage() {
  const { user, logOut, uniqueId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [editing, setEditing] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profilesApi.me() as Promise<{ profile: Profile }>,
  });

  const profile = (profileData as { profile: Profile })?.profile as Profile | undefined;
  const primaryPhoto = profile?.profile_photos?.find((p) => p.is_primary) ?? profile?.profile_photos?.[0];

  const userEmail = (profile?.email as string) || profile?.users?.email || user?.email || '';
  const userPhone = (profile?.phone_number as string) || (profile as any)?.phone || profile?.users?.phone || user?.phoneNumber || '';
  const rawName = (profile?.display_name as string) || user?.displayName || (userEmail ? userEmail.split('@')[0] : '');
  const userDisplayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'Your Name';

  const rawCompletion = Number(profile?.profile_completion ?? 0);
  const completion = rawCompletion > 0 ? rawCompletion : (userDisplayName !== 'Your Name' ? 25 : 0);

  const [form, setForm] = useState<Record<string, unknown>>({});

  const updateMutation = useMutation({
    mutationFn: async (rawForm: Record<string, unknown>) => {
      const cleanForm: Record<string, unknown> = {};
      if (rawForm.display_name && String(rawForm.display_name).trim().length >= 2) {
        cleanForm.display_name = String(rawForm.display_name).trim();
      }
      if (rawForm.email && String(rawForm.email).trim().length > 0) {
        cleanForm.email = String(rawForm.email).trim();
      }
      if (rawForm.phone_number && String(rawForm.phone_number).trim().length > 0) {
        cleanForm.phone_number = String(rawForm.phone_number).trim();
      }
      if (rawForm.date_of_birth && /^\d{4}-\d{2}-\d{2}$/.test(String(rawForm.date_of_birth))) {
        cleanForm.date_of_birth = String(rawForm.date_of_birth);
      }
      if (rawForm.gender) cleanForm.gender = rawForm.gender;
      if (rawForm.bio) cleanForm.bio = String(rawForm.bio).trim();
      if (Array.isArray(rawForm.interests)) cleanForm.interests = rawForm.interests;

      const result = await profilesApi.update(cleanForm);
      if (cleanForm.display_name && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: String(cleanForm.display_name) });
        } catch {
          // ignore
        }
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    setForm({
      display_name: profile?.display_name || userDisplayName,
      email: userEmail,
      phone_number: userPhone,
      date_of_birth: profile?.date_of_birth ?? '',
      gender: profile?.gender ?? '',
      bio: profile?.bio ?? '',
      interests: profile?.interests ?? [],
    });
    setEditing(true);
  };

  const verificationStatus = (profile?.verification_status as string) ?? 'UNVERIFIED';
  const isVerified = verificationStatus === 'APPROVED';

  const toggleInterest = (interest: string) => {
    const cur = (form.interests as string[]) ?? [];
    setForm((f) => ({
      ...f,
      interests: cur.includes(interest) ? cur.filter((i) => i !== interest) : [...cur, interest],
    }));
  };

  const handleAvatarClick = () => {
    if (!isVerified) {
      setVerifyModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadError(null);
    try {
      await profilesApi.uploadPhoto(file);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Camera Video Stream Management ──────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: unknown) {
      setCameraError(err instanceof Error ? err.message : 'Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (verifyModal && !cameraActive && !cameraError) {
      startCamera();
    }
    if (!verifyModal) {
      stopCamera();
    }
  }, [verifyModal]);

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturingSelfie(true);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCapturingSelfie(false);
        return;
      }
      try {
        await profilesApi.submitSelfieVerification(blob);
        stopCamera();
        setVerifyModal(false);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        alert('📸 Face selfie submitted successfully! Sent to Admin Panel for review & verification.');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Verification submission failed');
      } finally {
        setCapturingSelfie(false);
      }
    }, 'image/jpeg', 0.9);
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header"><span className="page-title">Profile</span></div>
        <div className="app-loading"><div className="spinner" /></div>
        <BottomNav />
      </div>
    );
  }

  const [showIdModal, setShowIdModal] = useState(false);

  return (
    <div className="page">
      {/* Top Header with LittleFun Brand Logo, Notifications, and Chat */}
      <Header />

      <div className="page-content" style={{ paddingTop: 'var(--space-sm)' }}>

        {/* ── UPPER PROFILE HERO CARD (All-in-one Luxury Widget) ── */}
        <div
          style={{
            background: 'var(--color-surface, #ffffff)',
            borderRadius: 'var(--radius-xl, 24px)',
            border: '1.5px solid var(--color-border, #E8E0F0)',
            boxShadow: 'var(--shadow-card, 0 2px 12px rgba(26, 18, 40, 0.06))',
            padding: '24px 20px 20px',
            marginBottom: 'var(--space-md)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Pink Glow Accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 70,
              background: 'linear-gradient(180deg, rgba(232, 90, 143, 0.12) 0%, rgba(255, 255, 255, 0) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Avatar with Camera Overlay & Online Indicator */}
          <div
            onClick={handleAvatarClick}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              margin: '0 auto 12px',
              position: 'relative',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(200, 56, 109, 0.22)',
              border: '3px solid var(--color-primary-light, #E85A8F)',
              overflow: 'hidden',
              background: primaryPhoto ? 'transparent' : 'var(--gradient-warm, linear-gradient(135deg, #FF8FAB, #C8386D, #9E2855))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
            title={isVerified ? 'Click to change photo' : 'Verify to upload photo'}
          >
            {primaryPhoto ? (
              <img
                src={primaryPhoto.url}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '2.4rem', color: 'white' }}>
                {((profile?.display_name as string)?.[0]?.toUpperCase()) ?? '👤'}
              </span>
            )}

            {/* Camera overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: (avatarHover || uploadingPhoto) ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              {uploadingPhoto ? (
                <div
                  className="spinner"
                  style={{ width: 26, height: 26, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                />
              ) : (
                avatarHover && <span style={{ fontSize: '1.6rem' }}>📸</span>
              )}
            </div>

            {/* Online dot */}
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 16,
                height: 16,
                background: '#22C55E',
                border: '2.5px solid white',
                borderRadius: '50%',
                zIndex: 2,
              }}
            />
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {uploadError && (
            <div style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginBottom: 6 }}>
              ⚠️ {uploadError}
            </div>
          )}

          {/* Name & ID */}
          <div
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.38rem',
              fontWeight: 700,
              color: 'var(--color-text, #1A1228)',
            }}
          >
            {userDisplayName}
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-3, #9B8FB0)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--color-text-2, #5A4E70)' }}>
              {uniqueId || (profile?.unique_id as string) || '#LF-88201'}
            </span>
            <span>•</span>
            <span>📍 {(profile?.city as string) || 'Mumbai, IN'}</span>
          </div>

          {/* Badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 12,
              marginBottom: 18,
              flexWrap: 'wrap',
            }}
          >
            {isVerified ? (
              <span
                style={{
                  background: '#D5F5E3',
                  color: '#1E8449',
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ✓ Verified Member
              </span>
            ) : verificationStatus === 'PENDING' ? (
              <span
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                ⏳ Verification Pending
              </span>
            ) : (
              <span
                onClick={() => setVerifyModal(true)}
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚠️ Not Verified – Tap to verify
              </span>
            )}
            <span
              style={{
                background: '#E0E7FF',
                color: '#3730A3',
                borderRadius: 99,
                padding: '4px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              ⚡ Executive Provider
            </span>
          </div>

          {/* ── UPPER QUICK ACTIONS (Edit Profile & Digital ID Pass) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={startEdit}
              style={{
                background: 'var(--color-surface-2, #F8F8FC)',
                color: 'var(--color-text, #1A1228)',
                border: '1.5px solid var(--color-border, #E8E0F0)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 14px)',
                fontSize: '0.86rem',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s',
              }}
            >
              <span>✏️</span>
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIdModal(true)}
              style={{
                background: 'var(--gradient-primary, linear-gradient(135deg, #C8386D, #E85A8F))',
                color: '#ffffff',
                border: 'none',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md, 14px)',
                fontSize: '0.86rem',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: 'var(--shadow-md, 0 4px 16px rgba(200, 56, 109, 0.25))',
                transition: 'all 0.2s',
              }}
            >
              <span>🪪</span>
              <span>View ID Pass</span>
            </button>
          </div>
        </div>

        {/* ── Digital Member ID Modal Pass & QR (Triggered from Top Bar) ── */}
        <DigitalIdCard
          displayName={userDisplayName}
          photoUrl={primaryPhoto?.url}
          uniqueId={uniqueId || (profile?.unique_id as string) || '#LF-88201'}
          dateOfBirth={profile?.date_of_birth as string | undefined}
          gender={profile?.gender as string | undefined}
          city={(profile?.city as string) || 'Mumbai, IN'}
          isVerified={isVerified}
          email={userEmail}
          phone={userPhone}
          memberSince={profile?.created_at ? new Date(profile.created_at as string).getFullYear().toString() : '2026'}
          onEdit={startEdit}
          isOpen={showIdModal}
          onOpenChange={setShowIdModal}
          hideTriggerBar={true}
        />

        {/* ── Profile Completion ───────────────────────────── */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Profile Completion</span>
              <span style={{ fontWeight: 700, color: completion >= 80 ? '#16A34A' : 'var(--color-primary)' }}>{completion}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: completion + "%", background: completion >= 80 ? '#16A34A' : undefined }} />
            </div>
            {completion < 100 && !primaryPhoto && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: 6 }}>
                💡 {isVerified ? 'Click your avatar to upload a profile photo (+20%)' : 'Verify your identity to upload a photo (+20%)'}
              </div>
            )}
          </div>
        </div>

        {/* ── Edit Form / Profile View ─────────────────────── */}
        {editing ? (
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>✏️ Edit Profile</h3>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" value={(form.display_name as string) ?? ''}
                  placeholder="Your display name"
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" value={(form.phone_number as string) ?? ''}
                  placeholder="+91 98765 43210"
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={(form.email as string) ?? ''}
                  placeholder="you@example.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input" type="date" value={(form.date_of_birth as string) ?? ''}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-input" value={(form.gender as string) ?? ''}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">About You</label>
                <textarea className="form-input" rows={3} style={{ resize: 'none' }}
                  value={(form.bio as string) ?? ''} placeholder="Tell people about yourself… (min 20 chars)"
                  onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', marginTop: 4 }}>
                  {((form.bio as string)?.length ?? 0) + " / 500"}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Interests <span style={{ color: 'var(--color-text-3)', fontWeight: 400 }}>(select 3+)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {INTERESTS.map((interest) => {
                    const selected = ((form.interests as string[]) ?? []).includes(interest);
                    return (
                      <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                        style={{
                          padding: '5px 12px', borderRadius: 99, border: '2px solid',
                          borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                          background: selected ? 'var(--color-primary)' : 'transparent',
                          color: selected ? 'white' : 'var(--color-text-2)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}>
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {updateMutation.isError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: '0.8rem' }}>
                  ⚠️ {(updateMutation.error as Error)?.message ?? 'Save failed. Please try again.'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-ghost btn-block" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-primary btn-block"
                  onClick={() => updateMutation.mutate(form)}
                  disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="card-body">
              {/* Personal Details Grid (Age, Gender, Location) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 'var(--space-md)' }}>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>🎂 Age & Gender</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                    {profile?.age ? `${String(profile.age)} Yrs` : '24 Yrs'} · {profile?.gender === 'MALE' ? 'Male 👨' : profile?.gender === 'FEMALE' ? 'Female 👩' : String(profile?.gender || 'Male 👨')}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>📍 Location</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(profile?.city as string) || (profile?.bio && String(profile.bio).includes('in ') ? String(profile.bio).split('in ')[1]?.replace('.', '') : '') || 'Mumbai, Maharashtra'}
                  </div>
                </div>
              </div>

              {Boolean(profile?.bio) && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: '0.5px' }}>ABOUT</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: 1.5, margin: 0 }}>{profile!.bio as string}</p>
                </div>
              )}
              {Array.isArray(profile?.interests) && (profile!.interests as string[]).length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, letterSpacing: '0.5px' }}>INTERESTS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(profile!.interests as string[]).map((i) => (
                      <span key={i} style={{ padding: '4px 12px', borderRadius: 99, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', fontSize: '0.78rem', fontWeight: 600 }}>{i}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, letterSpacing: '0.5px' }}>CONTACT INFORMATION</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                  <div>📱 <strong style={{ color: 'var(--color-text)' }}>Phone:</strong> {userPhone || 'Not added'}</div>
                  <div>✉️ <strong style={{ color: 'var(--color-text)' }}>Email:</strong> {userEmail || 'Not added'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: '0.5px' }}>DISCOVERY STATUS</div>
                <span className={"badge " + (profile?.discovery_status === 'VISIBLE' ? 'badge-success' : 'badge-neutral')}>
                  {profile?.discovery_status === 'VISIBLE' ? '✓ Visible in discovery' : ("⬤ " + (profile?.discovery_status ?? 'Hidden'))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Verification Center ──────────────────────────── */}
        <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>🛡️ Trust & Verification</div>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: isVerified ? '#16A34A' : verificationStatus === 'PENDING' ? '#F59E0B' : '#DC2626' }}>
                {isVerified ? '98 / 100' : verificationStatus === 'PENDING' ? '65 / 100' : '35 / 100'}
              </span>
            </div>
            <div className="progress-bar" style={{ marginBottom: 12 }}>
              <div className="progress-fill" style={{ width: isVerified ? '98%' : verificationStatus === 'PENDING' ? '65%' : '35%', background: isVerified ? '#16A34A' : verificationStatus === 'PENDING' ? '#F59E0B' : '#DC2626' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '✓ Email Verified', sub: 'Primary email confirmed', done: true },
                { label: isVerified ? '✓ Phone Verified' : '✕ Phone', sub: isVerified ? 'OTP validated' : 'Not verified', done: isVerified },
                { label: isVerified ? '✓ Face Photo' : verificationStatus === 'PENDING' ? '⏳ Face Photo' : '✕ Face Photo', sub: isVerified ? 'Verified' : verificationStatus === 'PENDING' ? 'Admin Approval Pending' : 'Camera Selfie required', done: isVerified || verificationStatus === 'PENDING' },
                { label: isVerified ? '✓ Liveness' : '✕ Liveness', sub: isVerified ? '100% check' : 'Not completed', done: isVerified },
              ].map((item) => (
                <div key={item.label} style={{ padding: 10, borderRadius: 8, background: 'var(--color-surface-2)', border: "1px solid " + (item.done ? 'rgba(22,163,74,0.2)' : 'var(--color-border)') }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 700, color: item.done ? '#16A34A' : '#9CA3AF' }}>{item.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', marginTop: 2 }}>{item.sub}</div>
                </div>
              ))}
            </div>
            {!isVerified && (
              <button
                className="btn btn-primary btn-block btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setVerifyModal(true)}
              >
                📸 Open Camera & Take Face Selfie
              </button>
            )}
          </div>
        </div>

        {/* ── Sign Out ─────────────────────────────────────── */}
        <div style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
          <button className="btn btn-ghost btn-block" onClick={logOut}
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
            Sign Out
          </button>
        </div>

      </div>

      {/* ── Camera Verification Modal ──────────────────────── */}
      {verifyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 20,
            maxWidth: 400, width: '100%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700 }}>
              📸 Face Verification Camera
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Align your face inside the oval frame below and tap capture to submit for Admin verification.
            </p>

            {/* Video preview container with Face framing guide */}
            <div style={{
              position: 'relative', width: 280, height: 280, margin: '0 auto 16px',
              borderRadius: '50%', overflow: 'hidden', border: '4px solid #22C55E',
              background: '#000', boxShadow: '0 0 20px rgba(34,197,94,0.3)',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Oval Face Alignment Guide */}
              <div style={{
                position: 'absolute', inset: 20, borderRadius: '50%',
                border: '2px dashed rgba(255,255,255,0.7)', pointerEvents: 'none',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)',
              }} />
            </div>

            {cameraError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: '0.78rem', marginBottom: 12 }}>
                ⚠️ {cameraError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={() => {
                  stopCamera();
                  setVerifyModal(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={captureSelfie}
                disabled={capturingSelfie}
              >
                {capturingSelfie ? 'Capturing & Uploading…' : '📸 Snap & Submit Selfie'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
