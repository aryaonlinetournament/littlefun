import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type Report = {
  id: string;
  target_type: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: { email: string; unique_id: string } | null;
  target_user: { email: string; unique_id: string; status: string } | null;
};

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [qStatus, setQStatus] = useState('PENDING');
  const [selected, setSelected] = useState<Report | null>(null);
  const [note, setNote] = useState('');
  const [action, setAction] = useState<'RESOLVED' | 'DISMISSED' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports-queue', qStatus],
    queryFn: () => adminApi.reportsQueue({ status: qStatus }) as Promise<{ reports: Report[]; total: number }>,
    refetchInterval: 20_000,
  });

  const reports: Report[] = (data as { reports: Report[] })?.reports ?? [];
  const total: number = (data as { total: number })?.total ?? 0;

  const resolveMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      adminApi.resolveReport(id, status, note),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports-queue'] }); setSelected(null); setNote(''); setAction(null); },
  });

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Moderation</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{total} {qStatus.toLowerCase()}</span>
      </div>

      <div className="admin-page-content">
        <div className="filters-bar">
          {['PENDING', 'RESOLVED', 'DISMISSED'].map((s) => (
            <button key={s} className={`btn btn-sm ${qStatus === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setQStatus(s)}>{s}</button>
          ))}
        </div>

        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛡️</div>
              <div className="empty-title">No {qStatus.toLowerCase()} reports</div>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Target User</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r: Report) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.82rem' }}>
                      <div>{r.reporter?.email}</div>
                      <div style={{ color: 'var(--text-3)' }}>{r.reporter?.unique_id}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <div>{r.target_user?.email ?? '—'}</div>
                      {r.target_user?.status && (
                        <span className={`badge ${r.target_user.status === 'ACTIVE' ? 'badge-success' : 'badge-error'}`} style={{ marginTop: 2 }}>
                          {r.target_user.status}
                        </span>
                      )}
                    </td>
                    <td><span className="badge badge-neutral">{r.target_type}</span></td>
                    <td style={{ maxWidth: 180, fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600 }}>{r.reason}</div>
                      {r.description && <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{r.description.slice(0, 60)}…</div>}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'PENDING' ? 'badge-warning' : r.status === 'RESOLVED' ? 'badge-success' : 'badge-neutral'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-xs btn-success"
                            onClick={() => { setSelected(r); setAction('RESOLVED'); }}>Resolve</button>
                          <button className="btn btn-xs btn-ghost"
                            onClick={() => { setSelected(r); setAction('DISMISSED'); }}>Dismiss</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {selected && action && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAction(null); setNote(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{action === 'RESOLVED' ? '✅ Resolve Report' : '🚫 Dismiss Report'}</div>
            <div className="modal-sub">{selected.reason} — {selected.reporter?.email}</div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Internal note (optional)</label>
              <textarea className="form-input" rows={3} style={{ resize: 'none' }}
                placeholder="What action was taken?" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setSelected(null); setAction(null); setNote(''); }}>Cancel</button>
              <button className={`btn ${action === 'RESOLVED' ? 'btn-success' : 'btn-ghost'}`}
                onClick={() => resolveMutation.mutate({ id: selected.id, status: action, note })}
                disabled={resolveMutation.isPending}>
                {resolveMutation.isPending ? 'Saving…' : `Confirm ${action === 'RESOLVED' ? 'Resolve' : 'Dismiss'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
