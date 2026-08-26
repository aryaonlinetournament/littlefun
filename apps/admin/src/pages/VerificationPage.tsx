import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type VerifItem = {
  id: string;
  submitted_at: string;
  // The column is stored as document_url in profile_verifications table
  document_url: string | null;
  selfie_url: string | null;       // alias if backend renames it
  id_document_url: string | null;
  rejection_reason: string | null;
  profiles: {
    display_name: string;
    user_id: string;
    profile_photos: { url: string; is_primary: boolean }[];
  } | null;
};

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<VerifItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['verification-queue'],
    queryFn: () => adminApi.verificationQueue() as Promise<{ verifications: VerifItem[]; total: number }>,
    refetchInterval: 30_000,
  });

  const items: VerifItem[] = (data as { verifications: VerifItem[] })?.verifications ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      setSelected(null);
      setMode(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectVerification(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
      setSelected(null);
      setMode(null);
      setRejectReason('');
    },
  });

  // Helper: get the selfie URL regardless of which column name the backend uses
  const getSelfieUrl = (item: VerifItem): string | null =>
    item.selfie_url ?? item.document_url ?? null;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Verification Queue</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Click the selfie image to zoom, then approve or reject
          </div>
        </div>
        <span className="badge badge-warning">{items.length} pending</span>
      </div>

      <div className="admin-page-content">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <div className="empty-title">Queue is empty</div>
            <div className="empty-body">All verification requests have been reviewed.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {items.map((item: VerifItem) => {
              const profilePhoto = item.profiles?.profile_photos?.find((p) => p.is_primary)?.url
                ?? item.profiles?.profile_photos?.[0]?.url;
              const selfieUrl = getSelfieUrl(item);

              return (
                <div key={item.id} className="admin-table-wrap" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Header: avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {profilePhoto ? (
                        <img
                          src={profilePhoto}
                          alt=""
                          style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                        />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                          👤
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {item.profiles?.display_name ?? 'Unknown User'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                          📅 Submitted{' '}
                          {new Date(item.submitted_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Selfie preview — CLICK TO ZOOM + APPROVE */}
                    {selfieUrl ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={selfieUrl}
                          alt="Verification Selfie"
                          onClick={() => setLightbox(selfieUrl)}
                          style={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-md)',
                            border: '2px solid var(--border)',
                            cursor: 'zoom-in',
                            display: 'block',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLImageElement).style.transform = 'scale(1.02)';
                            (e.target as HTMLImageElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLImageElement).style.transform = 'scale(1)';
                            (e.target as HTMLImageElement).style.boxShadow = 'none';
                          }}
                        />
                        <div style={{
                          position: 'absolute', bottom: 8, right: 8,
                          background: 'rgba(0,0,0,0.55)', color: 'white',
                          fontSize: '0.68rem', padding: '3px 8px', borderRadius: 99,
                          pointerEvents: 'none',
                        }}>
                          🔍 Click to zoom
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', background: 'var(--surface-2)',
                        borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)',
                        color: 'var(--text-3)', gap: 6,
                      }}>
                        <span style={{ fontSize: '2rem' }}>📷</span>
                        <span style={{ fontSize: '0.78rem' }}>No selfie image found</span>
                      </div>
                    )}

                    {/* Quick approve directly on image click notice */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'center', marginTop: -4 }}>
                      Review the selfie carefully before approving
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => { setSelected(item); setMode('reject'); }}
                      >
                        ✕ Reject
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => { setSelected(item); setMode('approve'); }}
                        disabled={approveMutation.isPending}
                      >
                        ✓ Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox — click image to zoom full screen */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', padding: 24,
          }}
        >
          <img
            src={lightbox}
            alt="Selfie full view"
            style={{
              maxWidth: '100%', maxHeight: '100%',
              borderRadius: 12, boxShadow: '0 0 60px rgba(0,0,0,0.8)',
              objectFit: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'fixed', top: 20, right: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
              width: 40, height: 40, borderRadius: '50%', fontSize: '1.2rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Approve / Reject Confirmation Modal */}
      {selected && mode && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setMode(null); setRejectReason(''); }}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {mode === 'approve' ? '✅ Approve Verification' : '❌ Reject Verification'}
            </div>
            <div className="modal-sub">{selected.profiles?.display_name}</div>

            {/* Show selfie thumbnail in modal too */}
            {getSelfieUrl(selected) && (
              <img
                src={getSelfieUrl(selected)!}
                alt="Selfie"
                onClick={() => setLightbox(getSelfieUrl(selected)!)}
                style={{
                  width: '100%', height: 180, objectFit: 'cover',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  marginBottom: 12, cursor: 'zoom-in',
                }}
              />
            )}

            {mode === 'reject' && (
              <div className="form-group">
                <label className="form-label">Rejection Reason * (shown to customer)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ resize: 'none' }}
                  placeholder="e.g. Selfie is blurry or face is not clearly visible. Please retake in good lighting."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                  Min 5 characters required
                </div>
              </div>
            )}

            {mode === 'approve' && (
              <div style={{
                padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: '0.85rem', color: '#065F46', fontWeight: 600 }}>
                  ✅ This will:
                </div>
                <ul style={{ fontSize: '0.82rem', color: '#047857', margin: '8px 0 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
                  <li>Set profile <strong>verification_status → APPROVED</strong></li>
                  <li>Send a push notification to the customer</li>
                  <li>Customer becomes discoverable immediately</li>
                </ul>
              </div>
            )}

            {(approveMutation.isError || rejectMutation.isError) && (
              <div style={{ padding: '8px 12px', background: '#FEE2E2', color: '#991B1B', borderRadius: 8, marginBottom: 12, fontSize: '0.82rem' }}>
                ⚠️ {((approveMutation.error || rejectMutation.error) as Error)?.message ?? 'Action failed'}
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => { setSelected(null); setMode(null); setRejectReason(''); }}
              >
                Cancel
              </button>
              {mode === 'approve' ? (
                <button
                  className="btn btn-success"
                  onClick={() => approveMutation.mutate(selected.id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? 'Approving…' : '✅ Confirm Approval'}
                </button>
              ) : (
                <button
                  className="btn btn-danger"
                  onClick={() => rejectMutation.mutate({ id: selected.id, reason: rejectReason })}
                  disabled={rejectMutation.isPending || rejectReason.trim().length < 5}
                >
                  {rejectMutation.isPending ? 'Rejecting…' : '✕ Confirm Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
