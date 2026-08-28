import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type ConfigEntry = { key: string; value: unknown; description?: string; updated_at?: string };

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Weekly Meetups Config
  const [meetupOverrideInput, setMeetupOverrideInput] = useState<string>('');
  const [meetupSaveMsg, setMeetupSaveMsg] = useState<string>('');

  const { data: meetupsData } = useQuery({
    queryKey: ['admin-meetups-config'],
    queryFn: () => adminApi.getMeetupsConfig(),
  });

  const meetupsMutation = useMutation({
    mutationFn: (overrideVal: number | null) =>
      adminApi.updateMeetupsConfig({ manualOverride: overrideVal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-meetups-config'] });
      setMeetupSaveMsg('✅ Ongoing meetups setting updated successfully!');
      setTimeout(() => setMeetupSaveMsg(''), 3500);
    },
    onError: (err: any) => {
      setMeetupSaveMsg(`❌ Error: ${err.message || 'Failed to update'}`);
    },
  });

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

  const handleSaveMeetups = (e: React.FormEvent) => {
    e.preventDefault();
    const val = meetupOverrideInput.trim();
    if (val === '') {
      meetupsMutation.mutate(null);
    } else {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || num > 999) {
        setMeetupSaveMsg('❌ Please enter a valid number (e.g. 10 - 99)');
        return;
      }
      meetupsMutation.mutate(num);
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">App Configuration</h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{config.length} settings</span>
      </div>

      <div className="admin-page-content">
        {/* Weekly Meetups Control Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
          border: '1px solid var(--border)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚡ Weekly Ongoing Meetups Controller
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: '4px 0 0' }}>
                Auto-generates a 2-digit number (10–99) every Saturday for the Customer app. Admin can override anytime.
              </p>
            </div>
            <div style={{
              background: '#F3E8FF',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#7E22CE',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>Live Count:</span>
              <strong style={{ fontSize: '1.15rem' }}>{meetupsData?.effectiveCount ?? '...'} Active</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', background: '#FAF5FF', padding: 14, borderRadius: 10, border: '1px solid #E9D5FF' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase' }}>
                Saturday Auto-Generated Cycle:
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginTop: 2 }}>
                🔄 <strong>{meetupsData?.autoSaturdayCount ?? '--'} Meetups</strong> (Generated for current week)
              </div>
            </div>

            <form onSubmit={handleSaveMeetups} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <input
                  type="number"
                  placeholder={meetupsData?.manualOverride !== null && meetupsData?.manualOverride !== undefined ? String(meetupsData.manualOverride) : 'Override (10-99)'}
                  value={meetupOverrideInput}
                  onChange={(e) => setMeetupOverrideInput(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #D8B4FE',
                    fontSize: '0.88rem',
                    width: 140
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={meetupsMutation.isPending}
                style={{ background: '#7E22CE', borderColor: '#7E22CE' }}
              >
                {meetupsMutation.isPending ? 'Saving...' : 'Set Manual'}
              </button>
              {meetupsData?.manualOverride !== null && meetupsData?.manualOverride !== undefined && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => { setMeetupOverrideInput(''); meetupsMutation.mutate(null); }}
                >
                  Clear Override (Auto)
                </button>
              )}
            </form>
          </div>

          {meetupSaveMsg && (
            <div style={{ marginTop: 10, fontSize: '0.85rem', fontWeight: 600 }}>
              {meetupSaveMsg}
            </div>
          )}
        </div>

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
