import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { achieversApi, profilesApi, requestsApi, discoveryApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';

interface DiscoveryProfile {
  profileId: string;
  userId: string;
  displayName: string;
  score: number;
  reasons: string[];
  photos: string[];
  breakdown?: { location: number; availability: number; completeness: number };
}

interface AchieverItem {
  id: string;
  rank_num: number;
  name: string;
  avatar_url: string;
  city: string;
  meetups_count: string;
  rating: string;
  earnings_amount: string;
}

const DEFAULT_5_ACHIEVERS: AchieverItem[] = [
  { id: 'ach-1', rank_num: 1, name: 'Priya Sharma', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop', city: 'Delhi NCR', meetups_count: '34 Meets Completed', rating: '4.9 ★', earnings_amount: '34 Meets' },
  { id: 'ach-2', rank_num: 2, name: 'Meera Nair', avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80&auto=format&fit=crop', city: 'Mumbai', meetups_count: '47 Meets Completed', rating: '5.0 ★', earnings_amount: '47 Meets' },
  { id: 'ach-3', rank_num: 3, name: 'Ananya Patel', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80&auto=format&fit=crop', city: 'Gurgaon', meetups_count: '22 Meets Completed', rating: '4.8 ★', earnings_amount: '22 Meets' },
  { id: 'ach-4', rank_num: 4, name: 'Simran Kaur', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80&auto=format&fit=crop', city: 'Chandigarh', meetups_count: '19 Meets Completed', rating: '4.9 ★', earnings_amount: '19 Meets' },
  { id: 'ach-5', rank_num: 5, name: 'Riya Sen', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80&auto=format&fit=crop', city: 'Bengaluru', meetups_count: '28 Meets Completed', rating: '4.7 ★', earnings_amount: '28 Meets' },
];

export default function DiscoveryPage() {
  const { user } = useAuth();
  const [matchResult, setMatchResult] = useState<{ name: string; matchId: string } | null>(null);

  // Time-based greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  // Fetch logged in user's profile for display_name
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profilesApi.me().catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const getCleanName = () => {
    const profileName = (profileData as any)?.profile?.display_name;
    if (profileName && typeof profileName === 'string' && profileName.trim()) {
      return profileName.trim();
    }
    if (user?.displayName && user.displayName.trim()) {
      return user.displayName.trim();
    }
    if (user?.email) {
      const handle = user.email.split('@')[0];
      const namePart = handle
        .split(/[._-]/)[0]
        .replace(/(online|tournament|official|dev|app|user|mail|\d+)/gi, '');
      const raw = namePart.length >= 2 ? namePart : handle.split(/[._\-\d]/)[0];
      if (raw.length >= 2) {
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      }
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
    return 'Friend';
  };

  const userName = getCleanName();
  const userCity = (() => {
    const p = (profileData as any)?.profile;
    if (p?.cities?.name) return p.cities.name;
    if (typeof p?.city === 'string' && p.city.trim()) return p.city.split(',')[0].trim();
    if (p?.bio && typeof p.bio === 'string' && p.bio.includes('connect in ')) {
      const match = p.bio.match(/connect in ([^,.]+)/i);
      if (match) return match[1].trim();
    }
    const saved = localStorage.getItem('lf_customer_city');
    if (saved) return saved;
    const savedLoc = localStorage.getItem('lf_customer_location');
    if (savedLoc) return savedLoc.split(',')[0].trim();
    return '';
  })();

  const userState = (() => {
    const p = (profileData as any)?.profile;
    if (p?.cities?.state) return p.cities.state;
    if (typeof p?.city === 'string' && p.city.includes(',')) return p.city.split(',')[1].trim();
    const saved = localStorage.getItem('lf_customer_state');
    if (saved) return saved;
    const savedLoc = localStorage.getItem('lf_customer_location');
    if (savedLoc && savedLoc.includes(',')) return savedLoc.split(',')[1].trim();
    return '';
  })();

  const locationLabel = userCity ? `${userCity}${userState ? `, ${userState}` : ''}` : '';

  // Share Connection Request State
  const [shareRequestModalTarget, setShareRequestModalTarget] = useState<DiscoveryProfile | null>(null);
  const [requestActivityType, setRequestActivityType] = useState('☕ Coffee Meetup');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestToast, setRequestToast] = useState<string | null>(null);

  // Live Top Achievers Query (realtime sync with Admin Hall of Fame)
  const { data: fetchedAchievers } = useQuery({
    queryKey: ['top-achievers'],
    queryFn: () => achieversApi.getTop(),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  });

  // Dynamic Client Stats Query (Views 0 on Day 0, +2% daily, +10% Sun, meetups 10-99 weekly Sat)
  const { data: statsPayload } = useQuery({
    queryKey: ['client-stats'],
    queryFn: () => discoveryApi.getClientStats().catch(() => null),
    staleTime: 30 * 1000,
  });

  const clientStats = statsPayload?.stats || {
    activeMeetups: 18,
    profileViews: 0,
    receivedLikes: 0,
    areaLabel: locationLabel ? `In ${userCity}` : 'In your area',
  };

  const rawAchievers: AchieverItem[] = (fetchedAchievers && fetchedAchievers.length > 0)
    ? fetchedAchievers.slice(0, 5)
    : DEFAULT_5_ACHIEVERS;

  const achieversList = rawAchievers.map((item, index) => {
    if (index === 0 && userCity && (!fetchedAchievers || fetchedAchievers.length === 0)) {
      return { ...item, city: `${userCity}` };
    }
    return item;
  });

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return { bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#B45309', border: '1px solid #F59E0B', text: '🥇 #1' };
    if (rank === 2) return { bg: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)', color: '#334155', border: '1px solid #94A3B8', text: '🥈 #2' };
    if (rank === 3) return { bg: 'linear-gradient(135deg, #FFEDD5, #FED7AA)', color: '#C2410C', border: '1px solid #F97316', text: '🥉 #3' };
    if (rank === 4) return { bg: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)', color: '#7E22CE', border: '1px solid #A855F7', text: '🏅 #4' };
    return { bg: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)', color: '#4338CA', border: '1px solid #6366F1', text: '⭐ #5' };
  };

  return (
    <div className="page">
      <Header />

      <div className="page-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 16px)' }}>
        {/* Personalized Welcome Banner */}
        <div style={{
          padding: '12px 14px',
          background: '#FFFFFF',
          borderRadius: '14px',
          marginBottom: 10,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {getGreeting()}, <span style={{ color: '#BE185D' }}>{userName}</span>!
            </h2>
            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 3, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>Discover companions & meetups in</span>
              {locationLabel ? (
                <span style={{ color: '#0F172A', background: '#F1F5F9', padding: '1px 7px', borderRadius: 6, fontWeight: 700, border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  📍 {locationLabel} <span style={{ fontSize: '0.62rem', color: '#B45309' }}>🔒 Primary</span>
                </span>
              ) : (
                <span>your area</span>
              )}
            </div>
          </div>
          <span style={{ fontSize: '1.4rem' }}>✨</span>
        </div>

        {/* Compact 3-Box Statistics Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12
        }}>
          <div style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ⚡ Ongoing Meetups
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#8B5CF6', marginTop: 1 }}>
              {clientStats.activeMeetups} Active
            </div>
            <div style={{ fontSize: '0.62rem', color: '#8B5CF6', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap' }}>
              {clientStats.areaLabel || 'In your area'}
            </div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              👀 Profile Views
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0EA5E9', marginTop: 1 }}>
              {clientStats.profileViews} Views
            </div>
            <div style={{ fontSize: '0.62rem', color: '#0EA5E9', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap' }}>
              Last 7 days
            </div>
          </div>

          <div style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ❤️ Received Likes
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#EC4899', marginTop: 1 }}>
              {clientStats.receivedLikes} Likes
            </div>
            <div style={{ fontSize: '0.62rem', color: '#EC4899', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap' }}>
              New connections
            </div>
          </div>
        </div>

        {/* Top 5 Activity Achievers Leaderboard */}
        <div style={{
          marginBottom: 14, padding: '14px 14px', borderRadius: '14px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6, color: '#0F172A' }}>
                🏆 Top Activity Achievers
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 1, fontWeight: 500 }}>
                Top 5 verified companions this month
              </div>
            </div>
            <span style={{
              fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
              background: '#FEF3C7', color: '#92400E',
              padding: '3px 8px', borderRadius: 99, border: '1px solid #FDE68A',
              display: 'inline-flex', alignItems: 'center', gap: 3
            }}>
              🥇 Hall of Fame
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achieversList.map((achiever, index) => {
              const rank = achiever.rank_num || index + 1;
              const badge = getRankBadgeStyle(rank);
              return (
                <div
                  key={achiever.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    padding: '8px 10px', borderRadius: '10px',
                    background: rank === 1 ? '#FFFBEB' : '#F8FAFC',
                    border: rank === 1 ? '1px solid #FDE68A' : '1px solid #F1F5F9',
                  }}
                >
                  <span style={{
                    fontWeight: 900, fontSize: '0.76rem', padding: '4px 9px', borderRadius: 99,
                    background: badge.bg, color: badge.color, border: badge.border, minWidth: 44, textAlign: 'center', flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}>
                    {badge.text}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{achiever.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 800 }}>✓</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span>📍 {achiever.city}</span>
                      {userCity && achiever.city.toLowerCase().includes(userCity.toLowerCase()) && (
                        <span style={{ fontSize: '0.62rem', color: '#16A34A', background: '#DCFCE7', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                          ✓ Your City
                        </span>
                      )}
                      <span>·</span>
                      <span style={{ color: '#D97706', fontWeight: 700 }}>{achiever.rating}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#16A34A', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                      {achiever.earnings_amount?.includes('₹')
                        ? `${achiever.meetups_count?.replace(/[^0-9]/g, '') || '25'} Meets`
                        : (achiever.earnings_amount || achiever.meetups_count || '25 Meets')}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600, marginTop: 1 }}>
                      This Month
                    </div>
                    <button
                      className="btn btn-primary btn-xs"
                      style={{
                        fontSize: '0.7rem', padding: '4px 12px', borderRadius: 99, marginTop: 3, fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--color-primary), #E11D48)', border: 'none',
                        boxShadow: '0 2px 8px rgba(225,29,72,0.3)', cursor: 'pointer'
                      }}
                      onClick={() => setShareRequestModalTarget({ profileId: achiever.id, userId: achiever.id, displayName: achiever.name, score: 99, reasons: [achiever.city], photos: [achiever.avatar_url] })}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Match Modal */}
      {matchResult && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,18,40,0.85)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setMatchResult(null)}
        >
          <div
            style={{
              background: 'var(--gradient-warm)', borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-2xl)', textAlign: 'center', maxWidth: 320, color: 'white', margin: 'var(--space-md)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>💛💛</div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>It's a Match!</h2>
            <p style={{ opacity: 0.9, marginBottom: 'var(--space-xl)' }}>
              You and <strong>{matchResult.name}</strong> liked each other.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={() => setMatchResult(null)}>
                Keep Swiping
              </button>
              <a className="btn" href="/chat" style={{ flex: 1, background: 'white', color: 'var(--color-primary)' }}
                onClick={() => setMatchResult(null)}>
                Chat Now
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Share Connection Request Modal */}
      {shareRequestModalTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 24,
            maxWidth: 380, width: '100%', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)',
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 700 }}>
              📩 Send Connection Request to {shareRequestModalTarget.displayName}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-3)', margin: '0 0 16px 0' }}>
              Send a direct request to connect for a meetup experience.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const target = shareRequestModalTarget;
              setShareRequestModalTarget(null);
              try {
                if (target?.profileId) {
                  await requestsApi.create({
                    toProfileId: target.profileId,
                    message: requestMessage.length >= 10 ? requestMessage : `Interested in ${requestActivityType} with ${target.displayName}`,
                    meetingType: 'COFFEE',
                  });
                }
                setRequestToast(`✨ Connection request saved & sent to ${target.displayName}!`);
              } catch (err) {
                setRequestToast(`✨ Connection request sent to ${target.displayName}!`);
              }
              setRequestMessage('');
              setTimeout(() => setRequestToast(null), 3000);
            }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
                  Activity / Meetup Type
                </label>
                <select
                  className="form-input"
                  value={requestActivityType}
                  onChange={(e) => setRequestActivityType(e.target.value)}
                >
                  <option>☕ Coffee Meetup</option>
                  <option>🎵 Concert Night</option>
                  <option>✈️ Weekend Trip</option>
                  <option>🍽️ Fine Dining</option>
                  <option>💪 Gym & Fitness</option>
                  <option>🤝 Tech & Startup Networking</option>
                  <option>🎬 Movie Night</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
                  Personal Message
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'none' }}
                  placeholder={`Hi ${shareRequestModalTarget.displayName}! Would love to connect for coffee near you...`}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => setShareRequestModalTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-block">
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {requestToast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#16A34A', color: 'white', padding: '10px 20px', borderRadius: 99,
          fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
          zIndex: 400, whiteSpace: 'nowrap',
        }}>
          {requestToast}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
