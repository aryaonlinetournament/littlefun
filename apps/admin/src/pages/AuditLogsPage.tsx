import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type LogEntry = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_hash: string | null;
  created_at: string;
  users: { email: string; unique_id: string } | null;
};

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action, entity, page],
    queryFn: () => adminApi.auditLogs({ action, entity, page, limit: 100 }) as Promise<{ logs: LogEntry[]; total: number }>,
  });

  const logs: LogEntry[] = (data as { logs: LogEntry[] })?.logs ?? [];
  const total: number = (data as { total: number })?.total ?? 0;

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Audit Logs</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{total} entries</span>
      </div>

      <div className="admin-page-content">
        <div className="filters-bar">
          <input className="filter-input" placeholder="Filter by action…" value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }} style={{ flex: 1, maxWidth: 280 }} />
          <input className="filter-input" placeholder="Entity type…" value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }} style={{ maxWidth: 160 }} />
        </div>

        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Entity ID</th>
                    <th>IP Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: LogEntry) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        <div>{log.users?.email ?? 'System'}</div>
                        {log.users?.unique_id && <div style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>{log.users.unique_id}</div>}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.75rem', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{log.entity_type ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.entity_id ?? '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                        {log.ip_hash ? log.ip_hash.slice(0, 12) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > 100 && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                  <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-3)' }}>Page {page}</span>
                  <button className="btn btn-ghost btn-sm" disabled={logs.length < 100} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
