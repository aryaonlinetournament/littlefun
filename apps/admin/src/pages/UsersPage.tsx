import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';

type User = {
  id: string;
  email: string;
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
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'CUSTOMER', planName: 'FREE', cityId: '' });
  const [createdCreds, setCreatedCreds] = useState<{ email: string; uniqueId: string } | null>(null);

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
    mutationFn: (data: typeof newUser) => adminApi.createCustomer(data) as Promise<{ user: { email: string; unique_id: string } }>,
    onSuccess: (result) => {
      setCreatedCreds({ email: result.user.email, uniqueId: result.user.unique_id });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUser({ email: '', password: '', role: 'CUSTOMER', planName: 'FREE', cityId: '' });
    },
  });

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Users</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>➕ Create User</button>
      </div>

      <div className="admin-page-content">
        {/* Filters */}
        <div className="filters-bar">
          <input className="filter-input" placeholder="Search email, unique ID…" value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 320 }} />
          <select className="filter-input" value={role} onChange={(e) => setRole(e.target.value)} style={{ minWidth: 'auto' }}>
            <option value="">All Roles</option>
            {['CUSTOMER', 'PROVIDER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'OPERATIONS', 'SUPER_ADMIN'].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select className="filter-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 'auto' }}>
            <option value="">All Statuses</option>
            {['ACTIVE', 'PENDING', 'SUSPENDED', 'BANNED', 'DELETED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{total} users</span>
        </div>

        <div className="admin-table-wrap">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No users found</div>
              <div className="empty-body">Try adjusting your filters</div>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Unique ID</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: User) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.email}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-3)' }}>{u.unique_id}</td>
                    <td><span className="badge badge-neutral">{u.role}</span></td>
                    <td>{u.plan_name ? <span className="badge badge-info">{u.plan_name}</span> : <span className="badge badge-neutral">FREE</span>}</td>
                    <td><span className={`badge ${STATUS_BADGE[u.status] ?? 'badge-neutral'}`}>{u.status}</span></td>
                    <td style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {u.status === 'ACTIVE' ? (
                          <button className="btn btn-xs btn-ghost" style={{ color: 'var(--warning)' }}
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'SUSPENDED' })}>
                            Suspend
                          </button>
                        ) : u.status === 'SUSPENDED' ? (
                          <button className="btn btn-xs btn-success"
                            onClick={() => statusMutation.mutate({ id: u.id, status: 'ACTIVE' })}>
                            Reinstate
                          </button>
                        ) : null}
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

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Create New User</div>
            <div className="modal-sub">The user can sign in immediately with these credentials.</div>

            {createdCreds ? (
              <>
                <div className="alert alert-success">✅ User created successfully!</div>
                <div className="creds-box">
                  <div><span className="creds-key">Email: </span><span className="creds-val">{createdCreds.email}</span></div>
                  <div><span className="creds-key">Unique ID: </span><span className="creds-val">{createdCreds.uniqueId}</span></div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => { setCreatedCreds(null); setShowCreate(false); }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="customer@email.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input className="form-input" type="text" value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 8 characters" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-input" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                      {['CUSTOMER', 'PROVIDER', 'MODERATOR', 'SUPPORT', 'OPERATIONS'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plan</label>
                    <select className="form-input" value={newUser.planName} onChange={(e) => setNewUser({ ...newUser, planName: e.target.value })}>
                      {['FREE', 'BASIC', 'PRO', 'PREMIUM'].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => createMutation.mutate(newUser)}
                    disabled={createMutation.isPending || !newUser.email || !newUser.password}>
                    {createMutation.isPending ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
