import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type BroadcastLog = {
  id: string;
  title: string;
  body: string;
  target: string;
  type: string;
  sent_count: number;
  created_at: string;
};

const TARGET_OPTIONS = [
  { value: 'ALL', label: 'All Users', desc: 'Everyone (active + inactive)' },
  { value: 'ACTIVE', label: 'Active Users', desc: 'Only active-status users' },
  { value: 'CUSTOMER', label: 'Customers Only', desc: 'Role = CUSTOMER' },
  { value: 'PROVIDER', label: 'Providers Only', desc: 'Role = PROVIDER' },
];

const TYPE_OPTIONS = [
  { value: 'BOTH', label: '📲 Push + In-App', desc: 'Send FCM push & in-app notification' },
  { value: 'IN_APP', label: '🔔 In-App Only', desc: 'Shows in notification bell only' },
  { value: 'PUSH', label: '📳 Push Only', desc: 'FCM push to device, no DB record' },
];

export default function BroadcastPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('ACTIVE');
  const [type, setType] = useState('BOTH');
  const [showPreview, setShowPreview] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: historyData } = useQuery<{ broadcasts: BroadcastLog[] }>({
    queryKey: ['broadcast-history'],
    queryFn: () => adminApi.broadcastHistory() as Promise<{ broadcasts: BroadcastLog[] }>,
  });
  const history = historyData?.broadcasts ?? [];

  const sendMutation = useMutation({
    mutationFn: () => adminApi.broadcast({ title, body, target, type }) as Promise<{ message: string; sentCount: number }>,
    onSuccess: (res) => {
      setSuccessMsg(res.message);
      setTitle('');
      setBody('');
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: ['broadcast-history'] });
      setTimeout(() => setSuccessMsg(null), 5000);
    },
  });

  const canSend = title.trim().length >= 2 && body.trim().length >= 2;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Broadcast Notifications</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Send push + in-app notifications to users. Requires SUPER_ADMIN role.
          </div>
        </div>
      </div>

      <div className="admin-page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Composer */}
          <div className="admin-table-wrap" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>📣 Compose Broadcast</h3>

            {successMsg && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {successMsg}</div>
            )}
            {sendMutation.isError && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                ❌ {(sendMutation.error as Error)?.message ?? 'Failed to send broadcast'}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notification Title *</label>
              <input
                className="form-input"
                placeholder="e.g. 🎉 New Feature Alert!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{title.length}/100</div>
            </div>

            <div className="form-group">
              <label className="form-label">Message Body *</label>
              <textarea
                className="form-input"
                rows={4}
                style={{ resize: 'vertical', minHeight: 100 }}
                placeholder="e.g. We've launched a new way to discover companions near you. Check it out now!"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>{body.length}/500</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {TARGET_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${target === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                        background: target === opt.value ? 'var(--primary-bg)' : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input type="radio" name="target" value={opt.value} checked={target === opt.value} onChange={() => setTarget(opt.value)} style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Type</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${type === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                        background: type === opt.value ? 'var(--primary-bg)' : 'var(--surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input type="radio" name="type" value={opt.value} checked={type === opt.value} onChange={() => setType(opt.value)} style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn btn-ghost"
                disabled={!canSend}
                onClick={() => setShowPreview(true)}
              >
                👁️ Preview
              </button>
              <button
                className="btn btn-primary"
                disabled={!canSend || sendMutation.isPending}
                onClick={() => sendMutation.mutate()}
                style={{ flex: 1 }}
              >
                {sendMutation.isPending ? '📤 Sending…' : '📣 Send Broadcast'}
              </button>
            </div>
          </div>

          {/* Preview + History sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Phone Preview */}
            {showPreview && (
              <div className="admin-table-wrap" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>📱 Notification Preview</h4>
                <div style={{
                  background: '#1A1228',
                  borderRadius: 16,
                  padding: '16px',
                  color: 'white',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>💛</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>LittleFun</div>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>now</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>{title || 'Notification Title'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{body || 'Your message will appear here...'}</div>
                </div>
                <div style={{ marginTop: 10, fontSize: '0.73rem', color: 'var(--text-3)', textAlign: 'center' }}>
                  Target: <strong>{TARGET_OPTIONS.find((o) => o.value === target)?.label}</strong> · {TYPE_OPTIONS.find((o) => o.value === type)?.label}
                </div>
              </div>
            )}

            {/* History */}
            <div className="admin-table-wrap" style={{ padding: '20px', flex: 1 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>📜 Recent Broadcasts</h4>
              {history.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No broadcasts yet</div>
                  <div className="empty-body">Sent notifications will appear here</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {history.slice(0, 10).map((b) => (
                    <div
                      key={b.id}
                      style={{
                        padding: '12px',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--primary)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 2 }}>{b.title}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.3 }}>
                        {b.body.length > 60 ? b.body.slice(0, 60) + '…' : b.body}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-info">{b.target}</span>
                        <span className="badge badge-neutral">{b.type}</span>
                        <span className="badge badge-success">✓ {b.sent_count ?? 0} sent</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', alignSelf: 'center', marginLeft: 'auto' }}>
                          {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
