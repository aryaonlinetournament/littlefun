import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type VerifItem = {
  id: string;
  submitted_at: string;
  document_url: string | null;
  selfie_url: string | null;
  id_document_url: string | null;
  rejection_reason: string | null;
  profiles: {
    id: string;
    display_name: string;
    user_id: string;
    age?: number;
    gender?: string;
    interests?: string[];
    bio?: string;
    city_id?: string;
    users?: {
      id: string;
      unique_id: string | null;
      email: string | null;
      phone: string | null;
      status: string;
      role: string;
    } | null;
    profile_photos?: { url: string; is_primary: boolean }[];
  } | null;
};

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<VerifItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['verification-queue'],
    queryFn: () => adminApi.verificationQueue() as Promise<{ verifications: VerifItem[]; total: number }>,
    refetchInterval: 15_000,
  });

  const items: VerifItem[] = (data as { verifications: VerifItem[] })?.verifications ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelected(null);
      setMode(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectVerification(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelected(null);
      setMode(null);
      setRejectReason('');
    },
  });

  const getSelfieUrl = (item: VerifItem): string | null =>
    item.selfie_url ?? item.document_url ?? null;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Client Verification Queue</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Review submitted selfies &amp; client profiles to verify identity and unlock VIP portal access
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            {isFetching ? 'Refreshing…' : '🔄 Refresh Queue'}
          </button>
          <span className="badge badge-warning" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
            {items.length} pending review
          </span>
        </div>
      </div>

      <div className="admin-page-content">
        {isError ? (
          <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8, margin: 20, color: '#f87171' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '1rem' }}>⚠️ Failed to load verification queue</div>
            <div style={{ fontSize: '0.88rem', marginBottom: 14 }}>{(error as Error)?.message || 'An unexpected error occurred while fetching the queue.'}</div>
            <button className="btn btn-sm btn-primary" onClick={() => refetch()}>Retry Loading</button>
          </div>
        ) : (isLoading && !data) ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">Verification queue is clear</div>
            <div className="empty-body">All submitted client verification applications have been reviewed.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
            {items.map((item: VerifItem) => {
              const selfieUrl = getSelfieUrl(item);
              const userObj = item.profiles?.users;
              const profile = item.profiles;

              return (
                <div key={item.id} className="admin-table-wrap" style={{ overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Header: Name, Unique ID & timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-1)' }}>
                            {profile?.display_name ?? 'Client'}
                          </span>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--surface-2)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}>
                            {userObj?.unique_id || 'ID Pending'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 3 }}>
                          ✉️ {userObj?.email || 'No email provided'}
                        </div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                        ⏳ Pending
                      </span>
                    </div>

                    {/* Selfie Image Card with Click to Zoom */}
                    {selfieUrl ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={selfieUrl}
                          alt="Verification Selfie"
                          onClick={() => setLightbox(selfieUrl)}
                          style={{
                            width: '100%',
                            height: 220,
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-md)',
                            border: '2px solid var(--border)',
                            cursor: 'zoom-in',
                            display: 'block',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                        />
                        <div style={{
                          position: 'absolute', bottom: 10, right: 10,
                          background: 'rgba(0,0,0,0.65)', color: 'white',
                          fontSize: '0.7rem', padding: '4px 10px', borderRadius: 99,
                          pointerEvents: 'none',
                          backdropFilter: 'blur(4px)',
                        }}>
                          🔍 Click to view full image
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', background: 'var(--surface-2)',
                        borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)',
                        color: 'var(--text-3)', gap: 6,
                      }}>
                        <span style={{ fontSize: '2rem' }}>📷</span>
                        <span style={{ fontSize: '0.8rem' }}>No selfie image uploaded</span>
                      </div>
                    )}

                    {/* Profile Metadata: Age, Gender, Interests */}
                    <div style={{
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      fontSize: '0.82rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-3)' }}>Age &amp; Gender:</span>
                        <span style={{ fontWeight: 600 }}>
                          {profile?.age ? `${profile.age} yrs` : 'Not specified'} • {profile?.gender || 'N/A'}
                        </span>
                      </div>
                      {profile?.interests && profile.interests.length > 0 && (
                        <div>
                          <div style={{ color: 'var(--text-3)', marginBottom: 4 }}>Interests:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {profile.interests.map((t, idx) => (
                              <span key={idx} style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                              }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {profile?.bio && (
                        <div style={{ color: 'var(--text-2)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                          "{profile.bio}"
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                        Submitted on {new Date(item.submitted_at).toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => { setSelected(item); setMode('reject'); }}
                        disabled={rejectMutation.isPending || approveMutation.isPending}
                      >
                        ✕ Reject
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        style={{ flex: 2, fontWeight: 700 }}
                        onClick={() => { setSelected(item); setMode('approve'); }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        ✓ Verify &amp; Activate Client
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: 20,
          }}
        >
          <img
            src={lightbox}
            alt="Enlarged verification preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }}
          />
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {mode === 'approve' && selected && (
        <div className="modal-backdrop" onClick={() => { setMode(null); setSelected(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">✓ Approve &amp; Activate Client</div>
              <button className="modal-close" onClick={() => { setMode(null); setSelected(null); }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Are you sure you want to approve <strong>{selected.profiles?.display_name}</strong> ({selected.profiles?.users?.unique_id || 'Client'})?
              </p>
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: 'var(--text-2)',
                lineHeight: 1.4,
              }}>
                ✅ This will change their status to <strong>ACTIVE</strong>, mark their profile as verified, and immediately grant them access to the LittleFun portal.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setMode(null); setSelected(null); }}>Cancel</button>
              <button
                className="btn btn-success"
                onClick={() => approveMutation.mutate(selected.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Activating…' : 'Yes, Approve & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {mode === 'reject' && selected && (
        <div className="modal-backdrop" onClick={() => { setMode(null); setSelected(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">✕ Reject Verification</div>
              <button className="modal-close" onClick={() => { setMode(null); setSelected(null); }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>
                Please provide a reason for rejecting <strong>{selected.profiles?.display_name}</strong>'s verification:
              </p>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. Blurry selfie photo, mismatch with profile details, or under-age application."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setMode(null); setSelected(null); }}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason || 'Verification photo did not meet quality/identity guidelines.' })}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
