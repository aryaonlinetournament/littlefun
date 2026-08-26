import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3001';

async function getToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      throw new Error(`Cannot connect to API server (${BASE_URL}). Ensure backend is running or update VITE_ADMIN_API_BASE_URL.`);
    }
    throw err;
  }

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data?.error?.message ?? 'Request failed') as Error & { code: string; statusCode: number };
    err.code = data?.error?.code ?? 'UNKNOWN';
    err.statusCode = res.status;
    throw err;
  }
  return data;
}

const q = (params: Record<string, unknown>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') s.set(k, String(v)); });
  return s.toString() ? `?${s.toString()}` : '';
};

export const adminApi = {
  // Dashboard
  dashboard: () => adminFetch('/api/admin/dashboard'),

  // Users
  users: (params: Record<string, unknown> = {}) => adminFetch(`/api/users${q(params)}`),
  createCustomer: (data: Record<string, unknown>) =>
    adminFetch('/api/users/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  setUserStatus: (id: string, status: string) =>
    adminFetch(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setUserPlan: (id: string, planName: string) =>
    adminFetch(`/api/users/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ planName }) }),

  // Profiles
  profiles: (params: Record<string, unknown> = {}) => adminFetch(`/api/profiles${q(params)}`),
  setProfileDiscovery: (id: string, status: string) =>
    adminFetch(`/api/profiles/${id}/discovery`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  setProfileFeatured: (id: string, is_featured: boolean) =>
    adminFetch(`/api/profiles/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ is_featured }) }),
  bulkUpdateProfiles: (ids: string[], action: string) =>
    adminFetch('/api/profiles/bulk-update', { method: 'POST', body: JSON.stringify({ ids, action }) }),

  // Requests
  requests: (params: Record<string, unknown> = {}) => adminFetch(`/api/requests${q(params)}`),
  acceptRequest: (id: string, note?: string) =>
    adminFetch(`/api/requests/${id}/accept`, { method: 'POST', body: JSON.stringify({ note }) }),
  rejectRequest: (id: string, note?: string) =>
    adminFetch(`/api/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  holdRequest: (id: string) => adminFetch(`/api/requests/${id}/hold`, { method: 'POST' }),

  // Verification queue
  verificationQueue: () => adminFetch('/api/admin/verification-queue'),
  approveVerification: (id: string) =>
    adminFetch(`/api/admin/verification-queue/${id}/approve`, { method: 'POST' }),
  rejectVerification: (id: string, reason: string) =>
    adminFetch(`/api/admin/verification-queue/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Reports / Moderation
  reportsQueue: (params: Record<string, unknown> = {}) => adminFetch(`/api/reports/queue${q(params)}`),
  resolveReport: (id: string, status: string, note?: string) =>
    adminFetch(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),

  // Config
  getConfig: () => adminFetch('/api/admin/config'),
  updateConfig: (key: string, value: unknown) =>
    adminFetch(`/api/admin/config/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) }),

  // Cities
  createCity: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/cities', { method: 'POST', body: JSON.stringify(data) }),
  createArea: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/areas', { method: 'POST', body: JSON.stringify(data) }),
  cities: () => adminFetch('/api/discovery/cities'),

  // Audit logs
  auditLogs: (params: Record<string, unknown> = {}) => adminFetch(`/api/admin/audit-logs${q(params)}`),

  // Plans
  plans: () => adminFetch('/api/payments/plans'),

  // Top Achievers
  achievers: () => adminFetch('/api/admin/achievers'),
  createAchiever: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/achievers', { method: 'POST', body: JSON.stringify(data) }),
  updateAchiever: (id: string, data: Record<string, unknown>) =>
    adminFetch(`/api/admin/achievers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAchiever: (id: string) =>
    adminFetch(`/api/admin/achievers/${id}`, { method: 'DELETE' }),

  // Dummy Profiles
  dummyProfiles: () => adminFetch('/api/admin/dummy-profiles'),
  createDummyProfile: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/dummy-profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateDummyProfile: (id: string, data: Record<string, unknown>) =>
    adminFetch(`/api/admin/dummy-profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDummyProfile: (id: string) =>
    adminFetch(`/api/admin/dummy-profiles/${id}`, { method: 'DELETE' }),

  // Analytics
  analyticsOverview: () => adminFetch('/api/admin/analytics/overview'),
  analyticsGrowth: (params: Record<string, unknown> = {}) =>
    adminFetch(`/api/admin/analytics/growth${q(params)}`),

  // Broadcast Notifications
  broadcast: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  broadcastHistory: () => adminFetch('/api/admin/broadcast/history'),

  // App Banners
  banners: () => adminFetch('/api/admin/banners'),
  createBanner: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id: string, data: Record<string, unknown>) =>
    adminFetch(`/api/admin/banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBanner: (id: string) =>
    adminFetch(`/api/admin/banners/${id}`, { method: 'DELETE' }),
};

export default adminFetch;
