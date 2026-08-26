import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type ConfigEntry = { key: string; value: unknown; description?: string; updated_at?: string };

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: () => adminApi.getConfig() as Promise<{ config: ConfigEntry[] }>,
  });

  const config: ConfigEntry[] = (data as { config: ConfigEntry[] })?.config ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.updateConfig(key, value),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['app-config'] }); setEditing(null); },
  });

  const parseValue = (raw: string) => {
    try { return JSON.parse(raw); } catch { return raw; }
  };

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">App Configuration</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{config.length} settings</span>
      </div>

      <div className="admin-page-content">
        <div className="alert alert-warning">
          ⚠️ Changes take effect immediately and affect all users. Only Super Admins can modify settings.
        </div>

        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {config.map((entry: ConfigEntry) => (
                  <tr key={entry.key}>
                    <td>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4 }}>
                        {entry.key}
                      </code>
                    </td>
                    <td>
                      {editing === entry.key ? (
                        <input className="form-input" style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                          value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') updateMutation.mutate({ key: entry.key, value: parseValue(editValue) }); if (e.key === 'Escape') setEditing(null); }} />
                      ) : (
                        <code style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {JSON.stringify(entry.value)}
                        </code>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{entry.description ?? '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      {entry.updated_at ? new Date(entry.updated_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      {editing === entry.key ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-xs btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                          <button className="btn btn-xs btn-primary"
                            onClick={() => updateMutation.mutate({ key: entry.key, value: parseValue(editValue) })}
                            disabled={updateMutation.isPending}>Save</button>
                        </div>
                      ) : (
                        <button className="btn btn-xs btn-outline"
                          onClick={() => { setEditing(entry.key); setEditValue(JSON.stringify(entry.value)); }}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
