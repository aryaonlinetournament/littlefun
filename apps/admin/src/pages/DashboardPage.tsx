import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';

type DashData = {
  dashboard: {
    users: { total: number; active: number; newToday: number; banned: number; deleted: number };
    profiles: { total: number; visible: number };
    requests: { pending: number; total: number };
    moderation: { pendingReports: number };
  };
};

type Overview = {
  totalMatches: number;
  totalConversations: number;
  newUsers7d: number;
  conversionRate: number;
};

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery<DashData>({
    queryKey: ['dashboard'],
    queryFn: () => adminApi.dashboard() as Promise<DashData>,
    refetchInterval: 15_000,       // 15s — show new logins & activity in real-time
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const { data: overviewData } = useQuery<{ overview: Overview }>({
    queryKey: ['analytics-overview'],
    queryFn: () => adminApi.analyticsOverview() as Promise<{ overview: Overview }>,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const d = data?.dashboard;
  const ov = overviewData?.overview;

  const stats = d ? [
    { label: 'Total Customers', value: d.users.total, sub: `${d.users.active} active`, icon: '👥', color: 'var(--primary)' },
    { label: 'New Today', value: d.users.newToday, sub: `+${ov?.newUsers7d ?? '…'} this week`, icon: '🆕', color: '#8B5CF6' },
    { label: 'Banned Accounts', value: d.users.banned, sub: 'fully locked out', icon: '🚫', alert: d.users.banned > 0, color: d.users.banned > 0 ? 'var(--error)' : '#EF4444' },
    { label: 'Deleted Accounts', value: d.users.deleted, sub: 'data wiped', icon: '🗑️', color: '#6B7280' },
    { label: 'Visible Profiles', value: d.profiles.visible, sub: `of ${d.profiles.total} total`, icon: '🪪', color: '#10B981' },
    { label: 'Pending Requests', value: d.requests.pending, sub: `${d.requests.total} total`, icon: '📋', alert: d.requests.pending > 0, color: d.requests.pending > 0 ? 'var(--warning)' : '#F59E0B' },
    { label: 'Pending Reports', value: d.moderation.pendingReports, sub: 'awaiting review', icon: '🛡️', alert: d.moderation.pendingReports > 0, color: d.moderation.pendingReports > 0 ? 'var(--error)' : '#EF4444' },
    { label: 'Matches Made', value: ov?.totalMatches ?? '—', sub: 'total connections', icon: '💛', color: '#EC4899' },
    { label: 'Conversations', value: ov?.totalConversations ?? '—', sub: 'chat threads', icon: '💬', color: '#06B6D4' },
    { label: 'Conversion Rate', value: ov ? `${ov.conversionRate}%` : '—', sub: 'requests accepted', icon: '🎯', color: '#10B981' },
  ] : [];

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600,
            background: 'rgba(16,185,129,0.08)', padding: '2px 10px',
            borderRadius: 99, border: '1px solid rgba(16,185,129,0.25)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
            Live · auto-refresh 15s
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>&#x21BB; Refresh</button>
        </div>
      </div>

      <div className="admin-page-content">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <>
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {stats.map((s) => (
                <div key={s.label} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ fontSize: '1.7rem', color: s.alert ? s.color : undefined }}>{s.value}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions + System Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
              <div className="admin-table-wrap" style={{ padding: '20px 24px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link to="/requests" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    📋 Review Pending Requests ({d?.requests.pending ?? 0})
                  </Link>
                  <Link to="/verification" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    ✅ Verification Queue
                  </Link>
                  <Link to="/moderation" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    🛡️ Moderation Queue ({d?.moderation.pendingReports ?? 0})
                  </Link>
                  <Link to="/analytics" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    📈 View Analytics
                  </Link>
                  <Link to="/broadcast" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    📣 Send Broadcast Notification
                  </Link>
                  <Link to="/banners" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                    🎨 Manage App Banners
                  </Link>
                  <Link to="/users" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
                    ➕ Create New Customer
                  </Link>
                </div>
              </div>

              <div className="admin-table-wrap" style={{ padding: '20px 24px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>System Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Firebase Auth', status: 'operational' },
                    { label: 'Supabase DB', status: 'operational' },
                    { label: 'Push Notifications', status: 'operational' },
                    { label: 'Discovery Engine', status: 'operational' },
                    { label: 'Broadcast Service', status: 'operational' },
                    { label: 'Banner System', status: 'operational' },
                  ].map((s) => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem' }}>{s.label}</span>
                      <span className="badge badge-success">● {s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

