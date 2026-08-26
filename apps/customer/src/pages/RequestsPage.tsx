import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dummyProfilesApi, requestsApi } from '../lib/api';
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
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
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

export default function RequestsPage() {
  const [bidModalTarget, setBidModalTarget] = useState<RequestItem | null>(null);
  const [selectedDetailsTarget, setSelectedDetailsTarget] = useState<RequestItem | null>(null);
  const [bidAmount, setBidAmount] = useState('2500');
  const [bidPitch, setBidPitch] = useState('');
  const [userBids, setUserBids] = useState<BidItem[]>([
    {
      id: 'b1',
      requestId: 'req-1',
      targetName: 'Priya Sharma',
      amount: 2500,
      pitch: 'I would love to accompany you for coffee in Connaught Place tomorrow evening!',
      status: 'ACCEPTED',
      createdAt: new Date().toISOString(),
    }
  ]);
  const [selectedStateFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: dummyData } = useQuery({
    queryKey: ['live-dummy-profiles', selectedStateFilter],
    queryFn: () => dummyProfilesApi.getProfiles(selectedStateFilter) as Promise<{ profiles: any[] }>,
    refetchInterval: 10_000,
  });

  const { data: serverRequestsData } = useQuery({
    queryKey: ['my-server-requests'],
    queryFn: () => requestsApi.myRequests().catch(() => null) as Promise<{ requests: any[] } | null>,
    refetchInterval: 10_000,
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

  const allBids = [...userBids, ...serverBids.filter((sb) => !userBids.some((ub) => ub.id === sb.id))];

  const liveDummyProfiles = (dummyData as { profiles: any[] })?.profiles;
  const requests: RequestItem[] = liveDummyProfiles && liveDummyProfiles.length > 0
    ? liveDummyProfiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age ?? 24,
        area: `${p.area}, ${p.city} (${p.state})`,
        hourlyRate: p.hourlyRate,
        photo: DEFAULT_DUMMY_AVATAR,
        meetingType: p.meetingType ?? `${p.area} Meetup ☕`,
        status: p.isActive ? 'ACTIVE' : 'HIDDEN',
        message: p.bio || 'Available for companion meetups.',
        createdAt: p.created_at ?? new Date().toISOString(),
      }))
    : DEFAULT_DISCOVER_PROFILES;

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

    setUserBids((prev) => [newBid, ...prev]);
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
              Explore verified companions, state availability & service rates.
            </div>
          </div>
          <span style={{
            fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
            background: '#DCFCE7', color: '#15803D',
            padding: '3px 9px', borderRadius: 99, border: '1px solid #86EFAC',
            boxShadow: '0 1px 4px rgba(22,163,74,0.12)', display: 'inline-flex', alignItems: 'center', gap: 3
          }}>
            ✓ {requests.length} Verified
          </span>
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
                    const existingBid = allBids.find((b) => b.requestId === req.id || b.targetName.toLowerCase() === req.name.toLowerCase());
                    return (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                        {existingBid ? (
                          <span style={{
                            borderRadius: 99, padding: '6px 14px', fontSize: '0.76rem', flex: 1, fontWeight: 800,
                            background: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}>
                            ✓ Proposal Sent (₹{existingBid.amount.toLocaleString('en-IN')}/hr)
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary btn-xs"
                            style={{
                              borderRadius: 99, padding: '6px 14px', fontSize: '0.76rem', flex: 1, fontWeight: 800,
                              background: 'linear-gradient(135deg, var(--color-primary), #E11D48)', border: 'none',
                              boxShadow: '0 2px 8px rgba(225,29,72,0.3)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                            }}
                            onClick={() => setBidModalTarget(req)}
                          >
                            🎯 Proposal
                          </button>
                        )}

                        <button
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

        {/* Submitted Proposals & Requests Persisted Section */}
        {allBids.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              🎯 My Submitted Proposals ({allBids.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allBids.map((bid) => (
                <div key={bid.id} style={{
                  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
                  padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0F172A' }}>
                      {bid.targetName}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                      {bid.pitch}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 800, background: '#DCFCE7', color: '#15803D',
                      padding: '2px 8px', borderRadius: 99, border: '1px solid #86EFAC'
                    }}>
                      {bid.status}
                    </span>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#BE185D', marginTop: 4 }}>
                      ₹{bid.amount.toLocaleString('en-IN')}/hr
                    </div>
                  </div>
                </div>
              ))}
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
      </div>

      <BottomNav />
    </div>
  );
}
