import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type User = {
  id: string;
  email: string;
  phone?: string | null;
  name?: string | null;
  unique_id: string;
  role: string;
  status: string;
  created_at: string;
  plan_name: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-success', SUSPENDED: 'badge-warning', BANNED: 'badge-error',
  PENDING: 'badge-info', DELETED: 'badge-neutral',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', temporaryPassword: '', role: 'CUSTOMER', planName: 'FREE', city: '' });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; uniqueId: string; password?: string } | null>(null);

  // Reset Password Modal State
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessCreds, setResetSuccessCreds] = useState<{ email: string; uniqueId: string; password: string } | null>(null);

  // Edit User Modal State
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', planName: 'FREE' });

  // Boost Views Modal State
  const [boostUser, setBoostUser] = useState<User | null>(null);
  const [boostPct, setBoostPct] = useState<string>('0');
  const [manualViews, setManualViews] = useState<string>('');
  const [manualLikes, setManualLikes] = useState<string>('');
  const [boostMsg, setBoostMsg] = useState<string>('');

  const boostMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { boostPct?: number; manualViews?: number | null; manualLikes?: number | null } }) =>
      adminApi.setUserBoost(userId, data),
    onSuccess: () => {
      setBoostMsg('✅ Views & stats boost saved successfully!');
      setTimeout(() => {
        setBoostMsg('');
        setBoostUser(null);
      }, 1500);
    },
    onError: (err: any) => {
      setBoostMsg(`❌ Failed to save: ${err.message || 'Error'}`);
    },
  });

  const handleOpenBoost = async (u: User) => {
    setBoostUser(u);
    setBoostMsg('');
    setBoostPct('0');
    setManualViews('');
    setManualLikes('');
    try {
      const res = await adminApi.getUserBoost(u.id);
      if (res.success && res.boost) {
        setBoostPct(String(res.boost.boost_pct || 0));
        setManualViews(res.boost.manual_views !== null && res.boost.manual_views !== undefined ? String(res.boost.manual_views) : '');
        setManualLikes(res.boost.manual_likes !== null && res.boost.manual_likes !== undefined ? String(res.boost.manual_likes) : '');
      }
    } catch {
      // default
    }
  };

  const handleSaveBoost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boostUser) return;
    const pct = parseFloat(boostPct) || 0;
    const views = manualViews.trim() !== '' ? parseInt(manualViews.trim(), 10) : null;
    const likes = manualLikes.trim() !== '' ? parseInt(manualLikes.trim(), 10) : null;
    boostMutation.mutate({
      userId: boostUser.id,
      data: { boostPct: pct, manualViews: views, manualLikes: likes },
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', role, status, search],
    queryFn: () => adminApi.users({ role, status, search }) as Promise<{ users: User[]; total: number }>,
  });

  const users: User[] = (data as { users: User[] })?.users ?? [];
  const total: number = (data as { total: number })?.total ?? 0;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.setUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newUser) =>
      adminApi.createCustomer(data) as Promise<{
        credentials?: { email: string; uniqueId: string; temporaryPassword?: string };
        user: { email: string; unique_id: string };
      }>,
    onSuccess: (result, variables) => {
      setCreatedCreds({
        email: result.credentials?.email || result.user.email,
        uniqueId: result.credentials?.uniqueId || result.user.unique_id,
        password: result.credentials?.temporaryPassword || variables.temporaryPassword || 'Auto-generated',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUser({ name: '', email: '', phone: '', temporaryPassword: '', role: 'CUSTOMER', planName: 'FREE', city: '' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword?: string }) =>
      adminApi.resetUserPassword(userId, newPassword) as Promise<{
        credentials: { email: string; uniqueId: string; password: string };
      }>,
    onSuccess: (result) => {
      setResetSuccessCreds(result.credentials);
      setNewPassword('');
    },
  });

  const editUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: typeof editForm }) =>
      adminApi.updateUserDetails(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
  });


  const registrationUrl = 'https://littlefunwithpartner.web.app/register';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users &amp; Clients</h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2 }}>
            Manage client accounts, verification states, and invitation links
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowShareModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🔗 Share Client Registration Link
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            ➕ Create User Manually
          </button>
        </div>
      </div>

      <div className="admin-page-content">
        {/* Filters */}
        <div className="filters-bar">
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            placeholder="Search email or unique ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="PROVIDER">Provider</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending Verification</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)', alignSelf: 'center', marginLeft: 'auto' }}>
            {total} user{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No users found</div>
              <div className="empty-body">Try changing your search or filters.</div>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: User) => (
                  <tr key={u.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                        {u.unique_id || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.email}</div>
                      {u.name && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>👤 {u.name}</div>
                      )}
                    </td>
                    <td>
                      {u.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          <a
                            href={`tel:${u.phone}`}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: 'var(--text-1)',
                              textDecoration: 'none',
                            }}
                            title="Call user"
                          >
                            📞 {u.phone}
                          </a>
                          <a
                            href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Chat on WhatsApp"
                            style={{
                              textDecoration: 'none',
                              fontSize: '0.95rem',
                              lineHeight: 1,
                              display: 'inline-flex',
                            }}
                          >
                            💬
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td><span className="badge badge-neutral">{u.role}</span></td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[u.status] ?? 'badge-neutral'}`}>
                        {u.status === 'PENDING' ? '⏳ PENDING REVIEW' : u.status}
                      </span>
                    </td>
                    <td>{u.plan_name || 'FREE'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {u.status === 'PENDING' && (
                          <button
                            className="btn btn-xs btn-success"
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'ACTIVE' })}
                            title="Verify and activate user account immediately"
                          >
                            ✓ Activate
                          </button>
                        )}
                        {u.status === 'ACTIVE' ? (
                          <button className="btn btn-xs btn-ghost" style={{ color: 'var(--warning)' }}
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'SUSPENDED' })}>
                            Suspend
                          </button>
                        ) : u.status === 'SUSPENDED' ? (
                          <button className="btn btn-xs btn-ghost" style={{ color: 'var(--success)' }}
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'ACTIVE' })}>
                            Reactivate
                          </button>
                        ) : null}
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword('');
                            setResetSuccessCreds(null);
                          }}
                          title="Reset customer password & copy credentials"
                          style={{ color: '#D97706', borderColor: '#FDE68A' }}
                        >
                          🔑 Pwd
                        </button>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            setEditUser(u);
                            setEditForm({
                              name: u.name || '',
                              phone: u.phone || '',
                              email: u.email,
                              planName: u.plan_name || 'FREE',
                            });
                          }}
                          title="Edit customer details"
                          style={{ color: '#4F46E5', borderColor: '#C7D2FE' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={() => handleOpenBoost(u)}
                          title="Set custom views % boost or manual view count"
                          style={{ color: '#0284C7', borderColor: '#BAE6FD' }}
                        >
                          🚀 Boost
                        </button>
                        {u.status !== 'BANNED' && (
                          <button className="btn btn-xs btn-ghost" style={{ color: 'var(--error)' }}
                            onClick={() => { if (confirm(`Ban ${u.email}?`)) statusMutation.mutate({ id: u.id, status: 'BANNED' }); }}>
                            Ban
                          </button>
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

      {/* Share Registration Link Modal */}
      {showShareModal && (
        <div className="modal-backdrop" onClick={() => setShowShareModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">🔗 Share Client Registration Link</div>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Share this dedicated onboarding link with prospective clients. When they sign up, they will provide their name, email, preferences, and selfie verification.
              </p>

              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <input
                  type="text"
                  readOnly
                  value={registrationUrl}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-1)',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCopyLink}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '0.8rem',
                color: 'var(--text-2)',
                lineHeight: 1.4,
              }}>
                ℹ️ <strong>Admin Gate Enabled:</strong> Newly registered clients will be placed in <code>PENDING</code> status with an assigned ID (e.g. <code>#LF-1002</code>) until an admin reviews and approves them in the <strong>Verification Queue</strong>.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join LittleFun VIP Portal: ${registrationUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                >
                  💬 Share on WhatsApp
                </a>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowShareModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create New User</div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            {createdCreds ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 4 }}>VIP Customer Created!</div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: 16 }}>
                  Account is active and ready for customer sign-in:
                </p>

                <div style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  marginBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Client ID:</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{createdCreds.uniqueId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Email:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{createdCreds.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Password:</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--success)' }}>{createdCreds.password || 'LF@VIP123'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const text = `LittleFun VIP Account Credentials\nWebsite: https://littlefunwithpartner.web.app/login\nClient ID: ${createdCreds.uniqueId}\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.password || 'LF@VIP123'}`;
                      navigator.clipboard.writeText(text);
                      alert('Credentials copied to clipboard!');
                    }}
                  >
                    📋 Copy Credentials
                  </button>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hello! Your LittleFun VIP Account is ready.\n\n🌐 Login URL: https://littlefunwithpartner.web.app/login\n🆔 Member ID: ${createdCreds.uniqueId}\n✉️ Email: ${createdCreds.email}\n🔑 Password: ${createdCreds.password || 'LF@VIP123'}\n\nPlease sign in to view your profile and connections!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    💬 Share on WhatsApp
                  </a>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setCreatedCreds(null); }}>
                    Done / Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newUser); }}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="client@example.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number (Optional)</label>
                    <input className="form-input" type="tel" value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temporary Password (Optional)</label>
                    <input className="form-input" value={newUser.temporaryPassword}
                      onChange={(e) => setNewUser({ ...newUser, temporaryPassword: e.target.value })} placeholder="Auto-generated if blank" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="CUSTOMER">Customer</option>
                      <option value="PROVIDER">Provider</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Plan</label>
                    <select className="form-select" value={newUser.planName}
                      onChange={(e) => setNewUser({ ...newUser, planName: e.target.value })}>
                      <option value="FREE">FREE</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                      <option value="PREMIUM">PREMIUM</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Boost Profile Views & Stats Modal */}
      {boostUser && (
        <div className="modal-backdrop" onClick={() => setBoostUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🚀 <span>Boost Profile Views &amp; Stats</span>
              </div>
              <button className="modal-close" onClick={() => setBoostUser(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveBoost}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#F0FDF4', padding: '10px 14px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>Target Client:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#15803D' }}>{boostUser.email}</div>
                  <div style={{ fontSize: '0.76rem', color: '#4B5563', fontFamily: 'monospace' }}>ID: {boostUser.unique_id}</div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Extra View Growth Boost (%)
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    max="1000"
                    placeholder="e.g. 20, 50, 100"
                    value={boostPct}
                    onChange={(e) => setBoostPct(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Standard is +2% daily &amp; +10% Sunday. This adds extra multiplier % on top.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Manual Override: Exact Profile Views (Optional)
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="Leave blank for automatic daily calculation"
                    value={manualViews}
                    onChange={(e) => setManualViews(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    If entered, exact number will be displayed on client discovery.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Manual Override: Exact Received Likes (Optional)
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="Leave blank for automatic ratio"
                    value={manualLikes}
                    onChange={(e) => setManualLikes(e.target.value)}
                  />
                </div>

                {boostMsg && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {boostMsg}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setBoostUser(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={boostMutation.isPending}
                  style={{ background: '#0284C7', borderColor: '#0284C7' }}
                >
                  {boostMutation.isPending ? 'Saving...' : 'Save Boost Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <div className="modal-backdrop" onClick={() => { setResetUser(null); setResetSuccessCreds(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div className="modal-title">🔑 Reset Customer Password</div>
              <button className="modal-close" onClick={() => { setResetUser(null); setResetSuccessCreds(null); }}>✕</button>
            </div>

            {resetSuccessCreds ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: 6 }}>Password Updated!</div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: 16 }}>
                  Customer can now login with this new password immediately:
                </p>

                <div style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  textAlign: 'left',
                  marginBottom: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Client ID:</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{resetSuccessCreds.uniqueId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>Email:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{resetSuccessCreds.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-3)' }}>New Password:</span>
                    <strong style={{ fontFamily: 'monospace', color: 'var(--success)' }}>{resetSuccessCreds.password}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const text = `LittleFun VIP Login Credentials\nWebsite: https://littlefunwithpartner.web.app/login\nClient ID: ${resetSuccessCreds.uniqueId}\nEmail: ${resetSuccessCreds.email}\nPassword: ${resetSuccessCreds.password}`;
                      navigator.clipboard.writeText(text);
                      alert('New credentials copied to clipboard!');
                    }}
                  >
                    📋 Copy Info
                  </button>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hello! Your LittleFun VIP password has been updated.\n\n🌐 Login URL: https://littlefunwithpartner.web.app/login\n🆔 Member ID: ${resetSuccessCreds.uniqueId}\n✉️ Email: ${resetSuccessCreds.email}\n🔑 New Password: ${resetSuccessCreds.password}\n\nPlease sign in with your new password.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    💬 Share on WhatsApp
                  </a>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setResetUser(null); setResetSuccessCreds(null); }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({ userId: resetUser.id, newPassword: newPassword.trim() || undefined });
              }}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Customer:</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{resetUser.email}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontFamily: 'monospace' }}>{resetUser.unique_id}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Leave blank to auto-generate a strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>
                      If blank, an instant VIP password like <code>LF@Abc123</code> will be generated.
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setResetUser(null)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? 'Updating…' : '🔑 Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div className="modal-title">✏️ Edit Customer Details</div>
              <button className="modal-close" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              editUserMutation.mutate({ userId: editUser.id, data: editForm });
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>
                    {editUser.unique_id}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{editUser.email}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name / Display Name</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subscription Plan</label>
                  <select
                    className="form-select"
                    value={editForm.planName}
                    onChange={(e) => setEditForm({ ...editForm, planName: e.target.value })}
                  >
                    <option value="FREE">FREE</option>
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editUserMutation.isPending}
                >
                  {editUserMutation.isPending ? 'Saving…' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
