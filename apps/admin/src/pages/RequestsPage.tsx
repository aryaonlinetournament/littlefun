import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type Request = {
  id: string;
  status: string;
  meeting_type: string;
  message: string;
  proposed_date_time: string | null;
  proposed_location: string | null;
  admin_note: string | null;
  created_at: string;
  requester: { email: string; unique_id: string } | null;
  profiles: { display_name: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'badge-info', PENDING_RESPONSE: 'badge-warning',
  ACCEPTED: 'badge-success', CONFIRMED: 'badge-success',
  COMPLETED: 'badge-neutral', REJECTED: 'badge-error', CANCELLED: 'badge-neutral',
};

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('SUBMITTED');
  const [selected, setSelected] = useState<Request | null>(null);
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-requests', status],
    queryFn: () => adminApi.requests({ status }) as Promise<{ requests: Request[]; total: number }>,
    refetchInterval: 20_000,
  });

  const requests: Request[] = (data as { requests: Request[] })?.requests ?? [];
  const total: number = (data as { total: number })?.total ?? 0;

  const actionMutation = useMutation({
    mutationFn: ({ id, act, note }: { id: string; act: 'accept' | 'reject'; note: string }) =>
      act === 'accept' ? adminApi.acceptRequest(id, note) : adminApi.rejectRequest(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      setSelected(null);
      setNote('');
      setAction(null);
    },
  });

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Meeting Requests</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{total} results</span>
      </div>

      <div className="admin-page-content">
        <div className="filters-bar">
          {['SUBMITTED', 'PENDING_RESPONSE', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'REJECTED'].map((s) => (
            <button key={s} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>

        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No {status.toLowerCase()} requests</div>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To Profile</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: Request) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{r.requester?.email}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{r.requester?.unique_id}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.profiles?.display_name ?? '—'}</td>
                    <td><span className="badge badge-neutral">{r.meeting_type}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                      {r.proposed_date_time ? new Date(r.proposed_date_time).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-neutral'}`}>{r.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-xs btn-outline" onClick={() => setSelected(r)}>Details</button>
                        {r.status === 'SUBMITTED' && (
                          <>
                            <button className="btn btn-xs btn-success"
                              onClick={() => { setSelected(r); setAction('accept'); }}>Accept</button>
                            <button className="btn btn-xs btn-ghost" style={{ color: 'var(--error)' }}
                              onClick={() => { setSelected(r); setAction('reject'); }}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details / Action Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAction(null); setNote(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{action ? (action === 'accept' ? '✅ Accept Request' : '❌ Reject Request') : 'Request Details'}</div>
            <div className="modal-sub">From {selected.requester?.email} → {selected.profiles?.display_name}</div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: 14, fontSize: '0.85rem' }}>
              <div style={{ marginBottom: 6 }}><strong>Type:</strong> {selected.meeting_type}</div>
              {selected.proposed_date_time && <div style={{ marginBottom: 6 }}><strong>Date:</strong> {new Date(selected.proposed_date_time).toLocaleString('en-IN')}</div>}
              {selected.proposed_location && <div style={{ marginBottom: 6 }}><strong>Location:</strong> {selected.proposed_location}</div>}
              <div style={{ marginBottom: 6 }}><strong>Message:</strong> {selected.message}</div>
              {selected.admin_note && <div style={{ color: 'var(--text-2)' }}><strong>Previous note:</strong> {selected.admin_note}</div>}
            </div>

            {action && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Note to customer {action === 'reject' ? '(required)' : '(optional)'}</label>
                  {action === 'reject' && (
                    <button
                      type="button"
                      className="btn btn-xs btn-outline"
                      onClick={() => setNote('Proposal rejected — Companion was fulfilled by another client request.')}
                    >
                      ⚡ Fulfilled by another user
                    </button>
                  )}
                </div>
                <textarea className="form-input" rows={3} style={{ resize: 'none' }}
                  placeholder={action === 'accept' ? 'Any details about the arrangement…' : 'Reason for rejection…'}
                  value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setSelected(null); setAction(null); setNote(''); }}>
                {action ? 'Cancel' : 'Close'}
              </button>
              {!action && selected.status === 'SUBMITTED' && (
                <>
                  <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => setAction('reject')}>Reject</button>
                  <button className="btn btn-success" onClick={() => setAction('accept')}>Accept</button>
                </>
              )}
              {action && (
                <button
                  className={`btn ${action === 'accept' ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => actionMutation.mutate({ id: selected.id, act: action, note })}
                  disabled={actionMutation.isPending || (action === 'reject' && !note)}>
                  {actionMutation.isPending ? 'Processing…' : action === 'accept' ? 'Confirm Accept' : 'Confirm Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
