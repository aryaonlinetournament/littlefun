import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../lib/api';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';

type Notification = {
  id: string;
  type: 'REQUEST_RECEIVED' | 'PROPOSAL_RECEIVED' | 'PROPOSAL_ACCEPTED' | 'REQUEST_ACCEPTED' | 'NEW_MESSAGE' | string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  metadata?: {
    amount?: number;
    companionName?: string;
    activityType?: string;
    location?: string;
    proposalId?: string;
    requestId?: string;
  };
};

const TYPE_ICON: Record<string, string> = {
  REQUEST_RECEIVED: '📩',
  PROPOSAL_RECEIVED: '🎯',
  PROPOSAL_ACCEPTED: '🎉',
  REQUEST_ACCEPTED: '✅',
  REQUEST_REJECTED: '❌',
  NEW_MESSAGE: '💬',
  PROFILE_VERIFIED: '✔️',
  ACCOUNT_WARNING: '⚠️',
  MEETING_REMINDER: '🗓️',
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-prop-1',
    type: 'PROPOSAL_RECEIVED',
    title: '🎯 New Bidding Proposal Received',
    body: 'Priya Sharma placed a bid proposal of ₹2,500/hr for Coffee Date in Connaught Place, Delhi.',
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    metadata: {
      amount: 2500,
      companionName: 'Priya Sharma',
      activityType: 'Coffee Date ☕',
      location: 'Connaught Place, Delhi',
      proposalId: 'prop-101',
    },
  },
  {
    id: 'n-req-1',
    type: 'REQUEST_RECEIVED',
    title: '📩 Meetup Request Received',
    body: 'Meera Nair sent you a connection request for Concert Night in Bandra West, Mumbai.',
    read_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    metadata: {
      companionName: 'Meera Nair',
      activityType: 'Concert Night 🎵',
      location: 'Bandra West, Mumbai',
      requestId: 'req-202',
    },
  },
  {
    id: 'n-prop-2',
    type: 'PROPOSAL_ACCEPTED',
    title: '🎉 Proposal Accepted!',
    body: 'Your proposal for Weekend Trip with Ananya Patel was accepted. Start chatting now.',
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    metadata: {
      companionName: 'Ananya Patel',
      activityType: 'Weekend Trip ✈️',
    },
  },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<'ALL' | 'REQUESTS' | 'PROPOSALS'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list() as Promise<{ notifications: Notification[]; unreadCount: number }>,
  });

  const apiNotifications: Notification[] = (data as { notifications: Notification[] })?.notifications ?? [];
  const notificationsList = apiNotifications.length > 0 ? apiNotifications : INITIAL_NOTIFICATIONS;

  const unreadCount = notificationsList.filter((n) => !n.read_at).length;

  const filteredNotifications = notificationsList.filter((n) => {
    if (filterTab === 'REQUESTS') return n.type.includes('REQUEST');
    if (filterTab === 'PROPOSALS') return n.type.includes('PROPOSAL');
    return true;
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleAction = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="page">
      <Header />

      <div className="page-content" style={{ paddingBottom: 'calc(var(--bottom-nav-height) + 16px)' }}>
        {/* Header Title & Mark All Read */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.4rem' }}>Notifications</h1>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', marginTop: 2 }}>
              Manage requests, companion proposals, and updates.
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}
              onClick={() => readAllMutation.mutate()}
            >
              Mark all read ({unreadCount})
            </button>
          )}
        </div>

        {/* Category Filters: All, Requests, Proposals */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'ALL', label: '⚡ All' },
            { id: 'REQUESTS', label: '📩 Requests' },
            { id: 'PROPOSALS', label: '🎯 Proposals' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`btn btn-sm ${filterTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 99, padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => setFilterTab(tab.id as 'ALL' | 'REQUESTS' | 'PROPOSALS')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="app-loading" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: '3rem' }}>
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications found</div>
            <div className="empty-state-body">No items in this category right now.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredNotifications.map((notif: Notification) => {
              const isUnread = !notif.read_at;

              return (
                <div
                  key={notif.id}
                  className="glass-card"
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-lg)',
                    border: isUnread ? '1.5px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                    background: isUnread ? 'rgba(255, 240, 245, 0.7)' : 'var(--color-surface)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                      flexShrink: 0, border: '1px solid var(--color-border)'
                    }}>
                      {TYPE_ICON[notif.type] ?? '🔔'}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                          {notif.title}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {new Date(notif.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-2)', marginTop: 4, lineHeight: 1.4 }}>
                        {notif.body}
                      </div>

                      {/* Request & Proposal Action Buttons */}
                      {notif.type === 'PROPOSAL_RECEIVED' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            className="btn btn-primary btn-xs"
                            style={{ borderRadius: 99, padding: '6px 12px' }}
                            onClick={() => handleAction(`✅ Proposal from ${notif.metadata?.companionName ?? 'Companion'} Accepted!`)}
                          >
                            Accept Proposal (₹{notif.metadata?.amount?.toLocaleString('en-IN') ?? 2500})
                          </button>
                          <a href="/requests" className="btn btn-outline btn-xs" style={{ borderRadius: 99, padding: '6px 12px' }}>
                            View Proposal
                          </a>
                        </div>
                      )}

                      {notif.type === 'REQUEST_RECEIVED' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            className="btn btn-primary btn-xs"
                            style={{ borderRadius: 99, padding: '6px 12px' }}
                            onClick={() => handleAction(`✅ Request from ${notif.metadata?.companionName ?? 'Companion'} Accepted!`)}
                          >
                            Accept Request
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ borderRadius: 99, padding: '6px 12px', color: 'var(--color-error)' }}
                            onClick={() => handleAction('Request Declined')}
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {(notif.type === 'PROPOSAL_ACCEPTED' || notif.type === 'REQUEST_ACCEPTED') && (
                        <div style={{ marginTop: 10 }}>
                          <a href="/chat" className="btn btn-primary btn-xs" style={{ borderRadius: 99, padding: '6px 14px' }}>
                            💬 Open Chat Now
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#16A34A', color: 'white', padding: '10px 20px', borderRadius: 99,
          fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 4px 14px rgba(22,163,74,0.4)',
          zIndex: 400, whiteSpace: 'nowrap',
        }}>
          {toastMessage}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

