import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type Overview = {
  totalUsers: number;
  newUsers30d: number;
  newUsers7d: number;
  totalProfiles: number;
  totalRequests: number;
  acceptedRequests: number;
  conversionRate: number;
  totalMatches: number;
  totalConversations: number;
  topCities: { cityId: string; count: number }[];
};

type GrowthPoint = {
  date: string;
  newUsers: number;
  newRequests: number;
  newMatches: number;
};

export default function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const [activeMetric, setActiveMetric] = useState<'newUsers' | 'newRequests' | 'newMatches'>('newUsers');

  const { data: overviewData, isLoading: overviewLoading } = useQuery<{ overview: Overview }>({
    queryKey: ['analytics-overview'],
    queryFn: () => adminApi.analyticsOverview() as Promise<{ overview: Overview }>,
    refetchInterval: 60_000,
  });

  const { data: growthData, isLoading: growthLoading } = useQuery<{ growth: GrowthPoint[] }>({
    queryKey: ['analytics-growth', days],
    queryFn: () => adminApi.analyticsGrowth({ days }) as Promise<{ growth: GrowthPoint[] }>,
  });

  const overview = overviewData?.overview;
  const growth = growthData?.growth ?? [];
  const maxVal = Math.max(...growth.map((g) => g[activeMetric]), 1);

  const metricColors = {
    newUsers: 'var(--primary)',
    newRequests: '#8B5CF6',
    newMatches: '#10B981',
  };

  const kpiCards = overview ? [
    { label: 'Total Users', value: overview.totalUsers.toLocaleString(), sub: `+${overview.newUsers7d} this week`, icon: '👥', color: 'var(--primary)' },
    { label: 'New (30d)', value: overview.newUsers30d.toLocaleString(), sub: 'new signups', icon: '🆕', color: '#8B5CF6' },
    { label: 'Total Profiles', value: overview.totalProfiles.toLocaleString(), sub: 'active profiles', icon: '🪪', color: '#10B981' },
    { label: 'Requests', value: overview.totalRequests.toLocaleString(), sub: `${overview.acceptedRequests} accepted`, icon: '📋', color: '#F59E0B' },
    { label: 'Conversion Rate', value: `${overview.conversionRate}%`, sub: 'requests accepted', icon: '🎯', color: '#EF4444' },
    { label: 'Matches Made', value: overview.totalMatches.toLocaleString(), sub: 'total connections', icon: '💛', color: '#EC4899' },
    { label: 'Conversations', value: overview.totalConversations.toLocaleString(), sub: 'chat threads', icon: '💬', color: '#06B6D4' },
  ] : [];

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Platform growth metrics and key performance indicators
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="admin-page-content">
        {/* KPI Cards */}
        {overviewLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {kpiCards.map((k) => (
              <div key={k.label} className="stat-card" style={{ borderTop: `3px solid ${k.color}` }}>
                <div className="stat-icon">{k.icon}</div>
                <div className="stat-label">{k.label}</div>
                <div className="stat-value" style={{ fontSize: '1.7rem', color: k.color }}>{k.value}</div>
                <div className="stat-sub">{k.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Growth Chart */}
        <div className="admin-table-wrap" style={{ padding: '24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Growth Chart — Last {days} Days</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['newUsers', 'newRequests', 'newMatches'] as const).map((m) => (
                <button
                  key={m}
                  className={`btn btn-xs ${activeMetric === m ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveMetric(m)}
                >
                  {m === 'newUsers' ? '👥 Users' : m === 'newRequests' ? '📋 Requests' : '💛 Matches'}
                </button>
              ))}
            </div>
          </div>

          {growthLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : growth.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, padding: '0 8px' }}>
              {growth.map((point) => {
                const val = point[activeMetric];
                const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                return (
                  <div
                    key={point.date}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                    title={`${point.date}: ${val}`}
                  >
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 700 }}>
                      {val > 0 ? val : ''}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(pct, 2)}%`,
                        background: metricColors[activeMetric],
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        transition: 'height 0.3s ease',
                        opacity: val === 0 ? 0.2 : 1,
                      }}
                    />
                    <div
                      style={{
                        fontSize: '0.6rem',
                        color: 'var(--text-3)',
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        height: 36,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {point.date}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Row: Top Cities + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Top Cities */}
          <div className="admin-table-wrap" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>🏙️ Top Cities by Profiles</h3>
            {overviewLoading ? (
              <div className="spinner" style={{ margin: '20px auto' }} />
            ) : (overview?.topCities ?? []).length === 0 ? (
              <div style={{ color: 'var(--text-3)', fontSize: '0.85rem', padding: '10px 0' }}>No city data yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {overview!.topCities.map((city, idx) => {
                  const maxCount = overview!.topCities[0]?.count ?? 1;
                  const pct = (city.count / maxCount) * 100;
                  return (
                    <div key={city.cityId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          #{idx + 1} City {city.cityId.slice(0, 8)}…
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{city.count} profiles</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: `hsl(${320 - idx * 30}, 70%, 55%)`,
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Request Funnel */}
          <div className="admin-table-wrap" style={{ padding: '20px 24px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>📋 Request Conversion Funnel</h3>
            {overviewLoading ? (
              <div className="spinner" style={{ margin: '20px auto' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total Requests', value: overview?.totalRequests ?? 0, color: '#8B5CF6', icon: '📋' },
                  { label: 'Accepted', value: overview?.acceptedRequests ?? 0, color: '#10B981', icon: '✅' },
                  { label: 'Matches Made', value: overview?.totalMatches ?? 0, color: 'var(--primary)', icon: '💛' },
                  { label: 'Conversations', value: overview?.totalConversations ?? 0, color: '#F59E0B', icon: '💬' },
                ].map((step, idx) => {
                  const base = overview?.totalRequests ?? 1;
                  const pct = base > 0 ? Math.round((step.value / base) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{step.icon} {step.label}</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{step.value.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(pct, 100)}%`,
                            background: step.color,
                            borderRadius: 99,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop: 8, padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Overall Conversion</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{overview?.conversionRate ?? 0}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Requests → Accepted</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
