import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ── Token cache ──────────────────────────────────────────────────────
// Firebase tokens are valid for 1 hour. Caching for 5 minutes avoids
// calling getIdToken() on every single API request.
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  // Refresh token — force=false so Firebase uses its own cache when possible
  cachedToken = await user.getIdToken(false);
  tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
  return cachedToken;
}

/** Call this on signOut to clear the token cache */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ── In-flight request deduplication ────────────────────────────────
// Prevents the same GET request from firing twice simultaneously
// (e.g. two components calling discoveryApi.getFeed() at the same time)
const inflightRequests = new Map<string, Promise<unknown>>();

interface ApiOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
  deduplicate?: boolean; // only for GET requests
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { requiresAuth = true, timeoutMs = 15_000, deduplicate = true, headers = {}, ...rest } = options;

  // Deduplication key — only deduplicate GET requests
  const isGet = !rest.method || rest.method === 'GET';
  const dedupeKey = isGet && deduplicate ? `${path}` : null;

  if (dedupeKey && inflightRequests.has(dedupeKey)) {
    return inflightRequests.get(dedupeKey) as Promise<T>;
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Abort controller for timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const fetchPromise: Promise<T> = fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    signal: controller.signal,
  })
    .then(async (response) => {
      clearTimeout(timer);
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data?.error?.message ?? 'Request failed') as Error & {
          code: string;
          statusCode: number;
          fields?: Record<string, string>;
        };
        error.code = data?.error?.code ?? 'UNKNOWN_ERROR';
        error.statusCode = response.status;
        error.fields = data?.error?.fields;
        throw error;
      }
      return data as T;
    })
    .catch((err) => {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s. Please check your connection.`);
      }
      throw err;
    })
    .finally(() => {
      if (dedupeKey) inflightRequests.delete(dedupeKey);
    });

  if (dedupeKey) {
    inflightRequests.set(dedupeKey, fetchPromise as Promise<unknown>);
  }

  return fetchPromise;
}

export interface ClientRegisterPayload {
  name: string;
  age?: number;
  gender?: string;
  interestedIn?: string;
  cityId?: string;
  city?: string;
  interests?: string[];
  phone?: string;
  selfieUrl: string;
  bio?: string;
}

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  register: () => apiFetch<{ isNewUser: boolean; uniqueId: string }>('/api/auth/register', { method: 'POST' }),
  registerClient: (payload: ClientRegisterPayload) =>
    apiFetch<{ success: boolean; uniqueId: string; userId: string; status: string }>('/api/auth/register-client', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ── Users ─────────────────────────────────────────────────────────
export const usersApi = {
  me: () => apiFetch('/api/users/me'),
  registerDeviceToken: (token: string, platform: string) =>
    apiFetch('/api/users/device-token', { method: 'POST', body: JSON.stringify({ token, platform }) }),
};

// ── Profiles ──────────────────────────────────────────────────────
export const profilesApi = {
  me: () => apiFetch('/api/profiles/me'),
  update: (data: Record<string, unknown>) =>
    apiFetch('/api/profiles/me', { method: 'PUT', body: JSON.stringify(data) }),
  getById: (id: string) => apiFetch(`/api/profiles/${id}`),
  uploadPhoto: async (file: File): Promise<{ photo: { id: string; url: string; is_primary: boolean }; completion: number }> => {
    const token = await auth.currentUser?.getIdToken();
    const formData = new FormData();
    formData.append('photo', file);
    const response = await fetch(`${BASE_URL}/api/profiles/photos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? 'Upload failed');
    return data;
  },
  deletePhoto: (photoId: string) => apiFetch(`/api/profiles/photos/${photoId}`, { method: 'DELETE' }),
  submitSelfieVerification: async (blob: Blob): Promise<{ success: boolean; status: string; message: string }> => {
    const token = await auth.currentUser?.getIdToken();
    const formData = new FormData();
    formData.append('selfie', blob, 'selfie.jpg');
    try {
      const response = await fetch(`${BASE_URL}/api/profiles/verify-selfie`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? 'Verification submission failed');
      return data;
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('Unable to connect to backend server at ' + BASE_URL + '. Please ensure backend is running.');
      }
      throw err;
    }
  },
};

// ── Top Achievers ──────────────────────────────────────────────────
export const achieversApi = {
  getTop: async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/achievers`);
      const data = await res.json();
      if (data.success && data.achievers) return data.achievers;
    } catch (e) {
      console.warn('Failed to fetch achievers:', e);
    }
    return null;
  },
};

// ── Discovery ─────────────────────────────────────────────────────
export const discoveryApi = {
  getFeed: (params?: { city_id?: string; requirement_id?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch(`/api/discovery${qs}`);
  },
  getCities: () => apiFetch('/api/discovery/cities', { requiresAuth: false }),
  getClientStats: () => apiFetch<{
    success: boolean;
    stats: {
      activeMeetups: number;
      profileViews: number;
      receivedLikes: number;
      areaLabel: string;
      isFirstDay: boolean;
      daysActive: number;
      boostPct: number;
    };
  }>('/api/discovery/client-stats'),
};

// ── Matches ───────────────────────────────────────────────────────
export const matchesApi = {
  list: () => apiFetch('/api/matches'),
  like: (toUserId: string) => apiFetch('/api/matches/like', { method: 'POST', body: JSON.stringify({ toUserId }) }),
  pass: (toUserId: string) => apiFetch('/api/matches/pass', { method: 'POST', body: JSON.stringify({ toUserId }) }),
  unmatch: (matchId: string) => apiFetch(`/api/matches/${matchId}`, { method: 'DELETE' }),
};

// ── Chat ──────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => apiFetch('/api/conversations'),
  getMessages: (convId: string, before?: string) => {
    const qs = before ? `?before=${before}` : '';
    return apiFetch(`/api/conversations/${convId}/messages${qs}`);
  },
  sendMessage: (convId: string, content: string, type = 'TEXT', attachment_url?: string) =>
    apiFetch(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, message_type: type, attachment_url }),
    }),
  createConversation: (otherUserId: string) =>
    apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify({ otherUserId }) }),
  deleteMessage: (convId: string, msgId: string) =>
    apiFetch(`/api/conversations/${convId}/messages/${msgId}`, { method: 'DELETE' }),
  uploadAttachment: async (convId: string, file: File): Promise<{ url: string }> => {
    const token = await auth.currentUser?.getIdToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/api/conversations/${convId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? 'Upload failed');
    return data;
  },
};

// ── Requests ──────────────────────────────────────────────────────
export const requestsApi = {
  myRequests: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return apiFetch(`/api/requests/my${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) => apiFetch(`/api/requests/${id}/cancel`, { method: 'POST' }),
};

// ── Requirements ──────────────────────────────────────────────────
export const requirementsApi = {
  list: () => apiFetch('/api/requirements'),
  create: (data: Record<string, unknown>) =>
    apiFetch('/api/requirements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/requirements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/api/requirements/${id}`, { method: 'DELETE' }),
};

// ── Notifications ─────────────────────────────────────────────────
export const notificationsApi = {
  list: () => apiFetch('/api/notifications'),
  readAll: () => apiFetch('/api/notifications/read-all', { method: 'POST' }),
  markRead: (id: string) => apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
};

// ── Moderation ────────────────────────────────────────────────────
export const moderationApi = {
  report: (data: Record<string, unknown>) =>
    apiFetch('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
  block: (userId: string) =>
    apiFetch('/api/reports/block', { method: 'POST', body: JSON.stringify({ blockedUserId: userId }) }),
  unblock: (userId: string) => apiFetch(`/api/reports/block/${userId}`, { method: 'DELETE' }),
  getBlocks: () => apiFetch('/api/reports/blocks'),
};

// ── Plans ─────────────────────────────────────────────────────────
export const paymentsApi = {
  plans: () => apiFetch('/api/payments/plans', { requiresAuth: false }),
  mySubscription: () => apiFetch('/api/payments/my-subscription'),
};

// ── Dummy Profiles ───────────────────────────────────────────────
export const dummyProfilesApi = {
  getProfiles: (state?: string) => {
    const qs = state && state !== 'ALL' ? `?state=${encodeURIComponent(state)}` : '';
    return apiFetch(`/api/dummy-profiles${qs}`, { requiresAuth: false });
  },
};

export default apiFetch;
