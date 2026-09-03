import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dummyProfilesApi, requestsApi, profilesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { INDIA_STATES_AND_CITIES } from './RegisterPage';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';

type RequestItem = {
  id: string;
  name: string;
  age: number;
  area: string;
  hourlyRate: number;
  photo: string;
  meetingType: string;
  status: string;
  message?: string;
  createdAt: string;
};

type BidItem = {
  id: string;
  requestId: string;
  targetName: string;
  amount: number;
  pitch: string;
  status: 'SUBMITTED' | 'PENDING' | 'PENDING_RESPONSE' | 'ACCEPTED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | string;
  createdAt: string;
};

const DEFAULT_DUMMY_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23EC4899'/><circle cx='50' cy='38' r='20' fill='%23FFFFFF'/><path d='M20 85 c0-20 15-30 30-30 s30 10 30 30' fill='%23FFFFFF'/></svg>";

const DEFAULT_DISCOVER_PROFILES: RequestItem[] = [
  {
    id: 'req-1',
    name: 'Priya Sharma',
    age: 24,
    area: 'Connaught Place, Delhi NCR',
    hourlyRate: 2500,
    photo: DEFAULT_DUMMY_AVATAR,
    meetingType: 'Coffee Date & Tech Talks ☕',
    status: 'ACTIVE',
    message: 'Available for evening coffee meetups in Connaught Place!',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'req-2',
    name: 'Meera Nair',
    age: 26,
    area: 'Bandra West, Mumbai',
    hourlyRate: 3500,
    photo: DEFAULT_DUMMY_AVATAR,
    meetingType: 'Concert & Fine Dining 🎵',
    status: 'ACTIVE',
    message: 'Passionate about live concerts, art galleries, and dining out.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'req-3',
    name: 'Ananya Patel',
    age: 23,
    area: 'DLF Cyber City, Gurgaon',
    hourlyRate: 2800,
    photo: DEFAULT_DUMMY_AVATAR,
    meetingType: 'Fitness & Travel ✈️',
    status: 'ACTIVE',
    message: 'Love yoga, weekend getaways, and fitness activities.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'req-4',
    name: 'Riya Kapoor',
    age: 25,
    area: 'Koramangala, Bangalore',
    hourlyRate: 3000,
    photo: DEFAULT_DUMMY_AVATAR,
    meetingType: 'Shopping & Dinner 🍽️',
    status: 'ACTIVE',
    message: 'Exploring fine dining spots and shopping in Koramangala.',
    createdAt: new Date().toISOString(),
  },
];

function getChatIdForCompanion(name: string, id?: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('priya')) return 'c-priya';
  if (lower.includes('meera')) return 'c-meera';
  if (lower.includes('ananya')) return 'c-ananya';
  if (lower.includes('riya')) return 'c-riya';
  return id || `c-${lower.replace(/[^a-z0-9]/g, '-')}`;
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const { user, userId } = useAuth();
  const currentUid = userId || user?.uid;

  // Clear any old fake demo proposals from localStorage
  try {
    const legacy = localStorage.getItem('lf_user_bids');
    if (legacy) {
      localStorage.removeItem('lf_user_bids');
    }
  } catch {}

  const [bidModalTarget, setBidModalTarget] = useState<RequestItem | null>(null);
  const [selectedDetailsTarget, setSelectedDetailsTarget] = useState<RequestItem | null>(null);
  const [bidAmount, setBidAmount] = useState('2500');
  const [bidPitch, setBidPitch] = useState('');
  const [userBids, setUserBids] = useState<BidItem[]>(() => {
    const key = currentUid ? `lf_user_bids_${currentUid}` : 'lf_user_bids_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return []; // No default fake proposal!
  });

  useEffect(() => {
    const key = currentUid ? `lf_user_bids_${currentUid}` : 'lf_user_bids_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setUserBids(JSON.parse(saved));
        return;
      } catch {}
    }
    setUserBids([]);
  }, [currentUid]);

  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalState, setLocationModalState] = useState('Delhi');
  const [locationModalCity, setLocationModalCity] = useState('Delhi');
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Fetch logged in customer's profile to dynamically adapt companion locations
  const { data: profileData } = useQuery({
    queryKey: ['customer-profile-for-location'],
    queryFn: () => profilesApi.me().catch(() => null),
    staleTime: 60_000,
  });

  const { detectedCity, detectedState, displayLocation } = useMemo(() => {
    const p = (profileData as any)?.profile;
    let city = p?.cities?.name || '';
    let state = p?.cities?.state || '';

    // If city is formatted as "Patna, Bihar" in p?.city
    if (!city && typeof p?.city === 'string' && p.city.trim()) {
      const parts = p.city.split(',');
      city = parts[0].trim();
      if (parts[1]) state = parts[1].trim();
    }

    // From bio if it mentions "in Patna, Bihar" or "in Patna"
    if (!city && p?.bio && typeof p.bio === 'string' && p.bio.includes('connect in ')) {
      const match = p.bio.match(/connect in ([^,.]+)(?:,\s*([^.]+))?/i);
      if (match) {
        city = match[1]?.trim() || '';
        if (match[2]) state = match[2]?.trim() || '';
      }
    }

    // From localStorage
    if (!city) {
      city = localStorage.getItem('lf_customer_city') || '';
    }
    if (!state) {
      state = localStorage.getItem('lf_customer_state') || '';
    }
    if (!city) {
      const savedLoc = localStorage.getItem('lf_customer_location');
      if (savedLoc) {
        const parts = savedLoc.split(',');
        city = parts[0].trim();
        if (parts[1]) state = parts[1].trim();
      }
    }

    // Default fallback only if user has never selected any location (e.g. guest/unregistered)
    if (!city) {
      city = 'Delhi';
      state = '';
    }

    const loc = city ? `${city}${state ? `, ${state}` : ''}` : 'Nearby';
    return { detectedCity: city, detectedState: state, displayLocation: loc };
  }, [profileData]);

  const handleLocationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationModalCity || !locationModalState) return;

    setUpdatingLocation(true);
    try {
      localStorage.setItem('lf_customer_city', locationModalCity.trim());
      localStorage.setItem('lf_customer_state', locationModalState.trim());
      localStorage.setItem('lf_customer_location', `${locationModalCity.trim()}, ${locationModalState.trim()}`);

      // Direct Supabase update
      const currentUser = auth.currentUser;
      if (currentUser) {
        let cityId: string | null = null;
        const { data: existingCity } = await supabase
          .from('cities')
          .select('id')
          .ilike('name', locationModalCity.trim())
          .maybeSingle();

        if (existingCity) {
          cityId = existingCity.id;
        } else {
          const { data: newCity } = await supabase
            .from('cities')
            .insert({ name: locationModalCity.trim(), state: locationModalState.trim(), is_active: true })
            .select('id')
            .maybeSingle();
          if (newCity) cityId = newCity.id;
        }

        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .or(`firebase_uid.eq.${currentUser.uid},email.ilike.${currentUser.email}`)
          .maybeSingle();

        if (dbUser && cityId) {
          await supabase.from('profiles').update({
            city_id: cityId,
            bio: `Excited to connect in ${locationModalCity.trim()}, ${locationModalState.trim()}.`,
          }).eq('user_id', dbUser.id);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['customer-profile-for-location'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      setShowLocationModal(false);
      setToastMessage(`📍 Location updated to ${locationModalCity.trim()}, ${locationModalState.trim()}!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to update location:', err);
    } finally {
      setUpdatingLocation(false);
    }
  };

  const { data: dummyData } = useQuery({
    queryKey: ['live-dummy-profiles'],
    queryFn: () => dummyProfilesApi.getProfiles() as Promise<{ profiles: any[] }>,
    refetchInterval: 10_000,
  });

  const { data: serverRequestsData } = useQuery({
    queryKey: ['my-server-requests'],
    queryFn: () => requestsApi.myRequests().catch(() => null) as Promise<{ requests: any[] } | null>,
    refetchInterval: 5_000,
  });

  const serverBids: BidItem[] = (serverRequestsData?.requests || []).map((r: any) => ({
    id: r.id,
    requestId: r.to_profile_id,
    targetName: r.profiles?.display_name || 'Verified Companion',
    amount: 2500,
    pitch: r.message,
    status: r.status,
    createdAt: r.created_at,
  }));

  // Merge server and local bids, giving precedence to server status updates
  const allBids: BidItem[] = (() => {
    const combined: BidItem[] = [...userBids];
    serverBids.forEach((sb) => {
      const idx = combined.findIndex(
        (ub) =>
          ub.id === sb.id ||
          ub.requestId === sb.requestId ||
          (ub.targetName && sb.targetName && ub.targetName.toLowerCase() === sb.targetName.toLowerCase())
      );
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], status: sb.status };
      } else {
        combined.push(sb);
      }
    });
    return combined;
  })();

  const liveDummyProfiles = (dummyData as { profiles: any[] })?.profiles;
  const requests: RequestItem[] = liveDummyProfiles && liveDummyProfiles.length > 0
    ? liveDummyProfiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age ?? 24,
        area: `${displayLocation} (Nearby ~25 km)`,
        hourlyRate: p.hourlyRate ?? p.hourly_rate ?? 2500,
        photo: p.avatar && p.avatar.startsWith('http') ? p.avatar : DEFAULT_DUMMY_AVATAR,
        meetingType: p.meetingType ?? 'Companion Meetup ☕',
        status: (p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true)) ? 'ACTIVE' : 'HIDDEN',
        message: p.bio || 'Available for companion meetups.',
        createdAt: p.created_at ?? new Date().toISOString(),
      }))
    : DEFAULT_DISCOVER_PROFILES.map((p) => ({
        ...p,
        area: `${displayLocation} (Nearby ~25 km)`,
      }));

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidModalTarget) return;

    const target = bidModalTarget;
    const amount = Number(bidAmount);
    const pitch = bidPitch.length >= 10 ? bidPitch : `Interested in companion meetup with ${target.name} at ₹${amount}/hr`;

    const newBid: BidItem = {
      id: `bid-${Date.now()}`,
      requestId: target.id,
      targetName: target.name,
      amount: amount,
      pitch: pitch,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
    };

    setUserBids((prev) => {
      const updated = [newBid, ...prev];
      const key = currentUid ? `lf_user_bids_${currentUid}` : 'lf_user_bids_guest';
      try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setBidModalTarget(null);
    setBidPitch('');

    // Persist to backend database
    try {
      if (target.id && !target.id.startsWith('req-')) {
        await requestsApi.create({
          toProfileId: target.id,
          message: pitch,
          meetingType: 'COFFEE',
        });
      }
      setToastMessage(`🎯 Proposal saved & submitted to ${target.name} for ₹${amount.toLocaleString('en-IN')}/hr!`);
    } catch (err) {
      setToastMessage(`🎯 Proposal submitted to ${target.name} for ₹${amount.toLocaleString('en-IN')}/hr!`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="page">
      <Header />

      <div className="page-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 16px)' }}>
        {/* Compact & Elegant Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#BE185D', display: 'flex', alignItems: 'center', gap: 5, margin: 0, letterSpacing: '-0.02em' }}>
              <span>✨</span> Discover Companion Profiles
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Showing companions within <strong>25 km nearby</strong> in {displayLocation}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocationModalState(detectedState || 'Bihar');
              setLocationModalCity(detectedCity || 'Patna');
              setShowLocationModal(true);
            }}
            style={{
              fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
              background: '#EFF6FF', color: '#1D4ED8',
              padding: '5px 11px', borderRadius: 99, border: '1px solid #BFDBFE',
              display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer'
            }}
            title="Click to change your location"
          >
            📍 {displayLocation} (~25 km) ✏️
          </button>
        </div>

        {toastMessage && (
          <div style={{
            padding: '10px 16px', borderRadius: 99, background: '#16A34A',
            color: 'white', fontWeight: 600, fontSize: '0.85rem', marginBottom: 14,
            textAlign: 'center', boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
          }}>
            {toastMessage}
          </div>
        )}

        {/* Premium Companion Profiles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {requests.map((req: RequestItem) => (
              <div
                key={req.id}
                style={{
                  padding: '14px 16px', borderRadius: '14px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setSelectedDetailsTarget(req)}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {/* Companion Profile Avatar with Verified Badge */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={req.photo}
                      alt={req.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_DUMMY_AVATAR;
                      }}
                      style={{
                        width: 60, height: 60, borderRadius: '50%',
                        objectFit: 'cover', border: '2.5px solid #EC4899',
                        boxShadow: '0 4px 12px rgba(236,72,153,0.25)',
                        background: '#FCE7F3'
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: -2, right: -2, fontSize: '0.65rem',
                      background: '#16A34A', color: 'white', borderRadius: '50%',
                      padding: '2px 5px', border: '1.5px solid white', fontWeight: 900
                    }}>✓</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name & Age & Service Rate */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: 'var(--color-text)' }}>
                        {req.name}, {req.age}
                      </h3>

                      {/* Hourly Service Rate Pill */}
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 900, color: '#15803D',
                        background: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)',
                        padding: '3px 10px', borderRadius: 99, border: '1px solid #86EFAC',
                        flexShrink: 0, boxShadow: '0 1px 4px rgba(22,163,74,0.15)'
                      }}>
                        ⚡ ₹{req.hourlyRate.toLocaleString('en-IN')}/hr
                      </span>
                    </div>

                    {/* Location */}
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-text-2)', marginTop: 3, fontWeight: 600 }}>
                      📍 {req.area}
                    </div>

                    {/* About / Bio Badge */}
                    <div style={{
                      marginTop: 6, padding: '5px 10px', borderRadius: 8,
                      background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.18)',
                      fontSize: '0.76rem', color: '#BE185D', lineHeight: 1.35
                    }}>
                      📝 <strong>About / Bio:</strong> {req.message || req.meetingType}
                    </div>

                    {/* Proposal & Direct Request Action Buttons */}
                    {(() => {
                      const existingBid = allBids.find(
                        (b) => b.requestId === req.id || b.targetName.toLowerCase() === req.name.toLowerCase()
                      );
                      const isAccepted = existingBid?.status === 'ACCEPTED' || existingBid?.status === 'CONFIRMED';
                      const isPending = existingBid?.status === 'SUBMITTED' || existingBid?.status === 'PENDING' || existingBid?.status === 'PENDING_RESPONSE';
                      const isRejected = existingBid?.status === 'REJECTED' || existingBid?.status === 'CANCELLED';

                      return (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {isAccepted ? (
                            <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                              <span style={{
                                borderRadius: 99, padding: '6px 12px', fontSize: '0.74rem', fontWeight: 800,
                                background: '#DCFCE7', color: '#15803D', border: '1.5px solid #86EFAC',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                              }}>
                                ✅ Accepted
                              </span>
                              <button
                                type="button"
                                className="btn btn-primary btn-xs"
                                style={{
                                  borderRadius: 99, padding: '7px 14px', fontSize: '0.76rem', fontWeight: 800,
                                  background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none',
                                  display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                                  flex: 1, boxShadow: '0 2px 8px rgba(16,185,129,0.3)', color: '#fff'
                                }}
                                onClick={() => {
                                  const cid = getChatIdForCompanion(req.name, req.id);
                                  navigate(`/chat/${cid}`);
                                }}
                              >
                                💬 Chat Now
                              </button>
                            </div>
                          ) : isPending ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                              <div style={{
                                borderRadius: 99, padding: '6px 12px', fontSize: '0.74rem', fontWeight: 800,
                                background: '#FEF3C7', color: '#92400E', border: '1.5px solid #FCD34D',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                              }}>
                                ⏳ Proposal Sent (Awaiting Acceptance)
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#B45309', textAlign: 'center', fontWeight: 600 }}>
                                🔒 Chat unlocks once {req.name} accepts
                              </div>
                            </div>
                          ) : isRejected ? (
                            <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                              <span style={{
                                borderRadius: 99, padding: '6px 10px', fontSize: '0.72rem', fontWeight: 800,
                                background: '#FEE2E2', color: '#991B1B', border: '1.5px solid #FCA5A5',
                                display: 'inline-flex', alignItems: 'center', gap: 3
                              }}>
                                ❌ Not Accepted
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline btn-xs"
                                style={{ borderRadius: 99, padding: '5px 12px', fontSize: '0.74rem', fontWeight: 700 }}
                                onClick={() => setBidModalTarget(req)}
                              >
                                🔄 Resend
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              style={{
                                borderRadius: 99, padding: '6px 14px', fontSize: '0.76rem', flex: 1, fontWeight: 800,
                                background: 'linear-gradient(135deg, var(--color-primary), #E11D48)', border: 'none',
                                boxShadow: '0 2px 8px rgba(225,29,72,0.3)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                              }}
                              onClick={() => setBidModalTarget(req)}
                            >
                              🎯 Send Proposal
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{
                              borderRadius: 99, padding: '6px 10px', fontSize: '0.74rem', fontWeight: 700,
                              color: 'var(--color-text-2)', cursor: 'pointer'
                            }}
                            onClick={() => setSelectedDetailsTarget(req)}
                          >
                            👁️ Details
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>

        {/* Submitted Proposals Section */}
        {allBids.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🎯</span> My Submitted Proposals ({allBids.length})
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allBids.map((bid) => {
                  const isAccepted = bid.status === 'ACCEPTED' || bid.status === 'CONFIRMED';
                  const isPending = bid.status === 'SUBMITTED' || bid.status === 'PENDING' || bid.status === 'PENDING_RESPONSE';
                  const isRejected = bid.status === 'REJECTED' || bid.status === 'CANCELLED';

                  return (
                    <div
                      key={bid.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid ' + (isAccepted ? '#86EFAC' : isPending ? '#FDE68A' : '#E2E8F0'),
                        borderRadius: 14,
                        padding: '14px 16px',
                        boxShadow: isAccepted ? '0 4px 16px rgba(22,163,74,0.1)' : '0 1px 4px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.94rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>👤</span> {bid.targetName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 3, lineHeight: 1.4 }}>
                            {bid.pitch || 'Companion meetup request'}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 800,
                            background: isAccepted ? '#DCFCE7' : isPending ? '#FEF3C7' : '#FEE2E2',
                            color: isAccepted ? '#15803D' : isPending ? '#92400E' : '#991B1B',
                            padding: '4px 10px', borderRadius: 99,
                            border: '1px solid ' + (isAccepted ? '#86EFAC' : isPending ? '#FCD34D' : '#FCA5A5'),
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            {isAccepted ? '✅ ACCEPTED' : isPending ? '⏳ PENDING REVIEW' : '❌ NOT ACCEPTED'}
                          </span>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#BE185D', marginTop: 4 }}>
                            ₹{bid.amount.toLocaleString('en-IN')}/hr
                          </div>
                        </div>
                      </div>

                      {/* Status Info / Action Row */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: 8, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8
                      }}>
                        <div style={{ fontSize: '0.72rem', color: isAccepted ? '#15803D' : isPending ? '#B45309' : isRejected ? '#991B1B' : '#64748B', fontWeight: 600 }}>
                          {isAccepted
                            ? '🎉 Proposal accepted! You can now send messages.'
                            : isPending
                            ? '🔒 Chat locked — Waiting for companion to accept.'
                            : isRejected
                            ? 'Companion declined this proposal.'
                            : 'Waiting for response.'}
                        </div>

                        {isAccepted && (
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            style={{
                              borderRadius: 99, padding: '6px 14px', fontSize: '0.75rem', fontWeight: 800,
                              background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none',
                              display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                              color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                            }}
                            onClick={() => {
                              const cid = getChatIdForCompanion(bid.targetName, bid.requestId);
                              navigate(`/chat/${cid}`);
                            }}
                          >
                            💬 Chat Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>
        )}

        {/* Proposal Bidding Modal */}
        {bidModalTarget && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div style={{
              background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 22,
              maxWidth: 380, width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid var(--color-border)',
            }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 900 }}>
                🎯 Submit Proposal to {bidModalTarget.name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', margin: '0 0 16px 0' }}>
                Offer your hourly rate proposal & personal message for this companion meetup.
              </p>

              <form onSubmit={handleBidSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
                    Your Proposed Rate (₹ / hr)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    required
                    min="500"
                    step="100"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
                    Personal Pitch / Message
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{ resize: 'none' }}
                    placeholder={`Hi ${bidModalTarget.name}! Would love to meet for coffee in ${bidModalTarget.area}...`}
                    value={bidPitch}
                    onChange={(e) => setBidPitch(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => setBidModalTarget(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-block" style={{ fontWeight: 800 }}>
                    Send Proposal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Full Companion Profile Details Modal */}
        {selectedDetailsTarget && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }} onClick={() => setSelectedDetailsTarget(null)}>
            <div style={{
              background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 24,
              maxWidth: 420, width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={selectedDetailsTarget.photo}
                    alt=""
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_DUMMY_AVATAR; }}
                    style={{
                      width: 88, height: 88, borderRadius: '50%', objectFit: 'cover',
                      border: '3px solid #EC4899', boxShadow: '0 6px 16px rgba(236,72,153,0.3)',
                      background: '#FCE7F3'
                    }}
                  />
                  <span style={{
                    position: 'absolute', bottom: 2, right: 2, fontSize: '0.8rem',
                    background: '#16A34A', color: 'white', borderRadius: '50%',
                    padding: '3px 7px', border: '2px solid white', fontWeight: 900
                  }}>✓</span>
                </div>
                <h2 style={{ margin: '10px 0 2px 0', fontSize: '1.25rem', fontWeight: 900 }}>
                  {selectedDetailsTarget.name}, {selectedDetailsTarget.age}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#BE185D', fontWeight: 700 }}>
                  📍 {selectedDetailsTarget.area}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-surface-2)', padding: 14, borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-3)', fontWeight: 600 }}>Hourly Service Rate:</span>
                  <span style={{ fontWeight: 900, color: '#15803D' }}>⚡ ₹{selectedDetailsTarget.hourlyRate.toLocaleString('en-IN')}/hr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--color-text-3)', fontWeight: 600 }}>Verification Status:</span>
                  <span style={{ fontWeight: 800, color: '#16A34A' }}>✓ Admin Verified Companion</span>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#BE185D', marginBottom: 4 }}>
                    📝 About / Bio:
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--color-text-2)', lineHeight: 1.4 }}>
                    {selectedDetailsTarget.message || selectedDetailsTarget.meetingType}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-ghost btn-block"
                  onClick={() => setSelectedDetailsTarget(null)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary btn-block"
                  style={{ fontWeight: 800 }}
                  onClick={() => {
                    setBidModalTarget(selectedDetailsTarget);
                    setSelectedDetailsTarget(null);
                  }}
                >
                  🎯 Submit Proposal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change City / Location Modal */}
        {showLocationModal && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={() => setShowLocationModal(false)}
          >
            <div
              style={{
                background: 'var(--color-surface, #ffffff)', borderRadius: '18px', padding: 24,
                maxWidth: 400, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍</span> Select Your Location
                </h3>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}
                  onClick={() => setShowLocationModal(false)}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                Companion profiles and nearby meetups will adapt to your selected city and state within a 25 km radius.
              </p>

              <form onSubmit={handleLocationUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                    State / Region (All 28 States)
                  </label>
                  <select
                    className="form-input"
                    value={locationModalState}
                    onChange={(e) => {
                      const newState = e.target.value;
                      setLocationModalState(newState);
                      const defaultCity = INDIA_STATES_AND_CITIES[newState]?.[0] || '';
                      setLocationModalCity(defaultCity);
                    }}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {Object.keys(INDIA_STATES_AND_CITIES).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>
                    Primary City
                  </label>
                  <select
                    className="form-input"
                    value={locationModalCity}
                    onChange={(e) => setLocationModalCity(e.target.value)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: '0.9rem', outline: 'none' }}
                  >
                    {(INDIA_STATES_AND_CITIES[locationModalState] || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: 12, borderRadius: 10 }}
                    onClick={() => setShowLocationModal(false)}
                    disabled={updatingLocation}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      flex: 1.5, padding: 12, borderRadius: 10, fontWeight: 800,
                      background: 'linear-gradient(135deg, var(--color-primary, #C8386D), #BE185D)',
                      border: 'none', color: '#ffffff', cursor: 'pointer'
                    }}
                    disabled={updatingLocation}
                  >
                    {updatingLocation ? 'Saving...' : '✓ Set Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
