import { auth } from './firebase';
import { supabase } from './supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ── Token cache ──────────────────────────────────────────────────────
// Keyed by Firebase user UID so switching accounts never bleeds tokens
let cachedUid: string | null = null;
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    cachedUid = null;
    cachedToken = null;
    tokenExpiresAt = 0;
    return null;
  }

  // If user changed, force clear cache immediately
  if (cachedUid !== user.uid) {
    cachedUid = user.uid;
    cachedToken = null;
    tokenExpiresAt = 0;
  }

  // Return cached token if still valid for current user
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  // Refresh token — force=false so Firebase uses its internal cache when possible
  try {
    cachedToken = await user.getIdToken(false);
    tokenExpiresAt = Date.now() + TOKEN_CACHE_TTL_MS;
    return cachedToken;
  } catch (err) {
    console.error('Failed to retrieve Firebase ID token:', err);
    return null;
  }
}

/** Call this on signOut or auth state change to clear the token and request cache */
export function clearTokenCache(): void {
  cachedUid = null;
  cachedToken = null;
  tokenExpiresAt = 0;
  inflightRequests.clear();
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
  me: async () => {
    try {
      return await apiFetch('/api/users/me', { timeoutMs: 25000 });
    } catch (apiErr) {
      console.warn('Backend /api/users/me fallback to Supabase:', apiErr);
      const user = auth.currentUser;
      if (user) {
        let { data: dbUser } = await supabase
          .from('users')
          .select(`
            id, firebase_uid, email, phone, role, status, unique_id, plan_id, created_at, last_active_at,
            profiles(id, display_name, verification_status, discovery_status, profile_completion, age, gender, interests, bio)
          `)
          .eq('firebase_uid', user.uid)
          .maybeSingle();

        // Resilient fallback by email if firebase_uid is not yet bound
        if (!dbUser && user.email) {
          const { data: dbUserByEmail } = await supabase
            .from('users')
            .select(`
              id, firebase_uid, email, phone, role, status, unique_id, plan_id, created_at, last_active_at,
              profiles(id, display_name, verification_status, discovery_status, profile_completion, age, gender, interests, bio)
            `)
            .ilike('email', user.email.trim())
            .maybeSingle();

          if (dbUserByEmail) {
            dbUser = dbUserByEmail;
            supabase.from('users').update({ firebase_uid: user.uid }).eq('id', dbUserByEmail.id).then();
          }
        }

        if (dbUser) {
          const rawProfiles = (dbUser as Record<string, unknown>).profiles;
          const profileObj = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles;
          return {
            success: true,
            user: {
              ...dbUser,
              profiles: profileObj || null,
            },
          };
        }
      }
      throw apiErr;
    }
  },
  registerDeviceToken: (token: string, platform: string) =>
    apiFetch('/api/users/device-token', { method: 'POST', body: JSON.stringify({ token, platform }) }),
};

// ── Profiles ──────────────────────────────────────────────────────
export const profilesApi = {
  me: async () => {
    try {
      return await apiFetch('/api/profiles/me', { timeoutMs: 25000 });
    } catch (apiErr) {
      console.warn('Backend /api/profiles/me fallback to Supabase:', apiErr);
      const user = auth.currentUser;
      if (user) {
        let { data: dbUser } = await supabase
          .from('users')
          .select('id, email, phone, unique_id, status, role')
          .eq('firebase_uid', user.uid)
          .maybeSingle();

        if (!dbUser && user.email) {
          const { data: dbUserByEmail } = await supabase
            .from('users')
            .select('id, email, phone, unique_id, status, role')
            .ilike('email', user.email.trim())
            .maybeSingle();
          if (dbUserByEmail) {
            dbUser = dbUserByEmail;
          }
        }

        if (dbUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              *,
              users(email, phone),
              profile_photos(id, url, is_primary, sort_order),
              cities(id, name, state),
              areas(id, name)
            `)
            .eq('user_id', dbUser.id)
            .maybeSingle();

          if (profile) {
            const userRec = (profile as Record<string, unknown>).users as { email?: string; phone?: string } | null;
            const userEmail = profile.email || userRec?.email || dbUser.email || user.email || '';
            const userPhone = profile.phone_number || userRec?.phone || dbUser.phone || user.phoneNumber || '';
            const displayName = profile.display_name || user.displayName || (userEmail ? userEmail.split('@')[0] : 'Member');

            return {
              success: true,
              profile: {
                ...profile,
                display_name: displayName,
                email: userEmail,
                phone_number: userPhone,
                unique_id: dbUser.unique_id,
              },
            };
          }
        }
      }
      throw apiErr;
    }
  },
  update: async (data: Record<string, unknown>) => {
    try {
      return await apiFetch('/api/profiles/me', { method: 'PUT', body: JSON.stringify(data) });
    } catch (apiErr) {
      const user = auth.currentUser;
      if (user) {
        let { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', user.uid)
          .maybeSingle();

        if (!dbUser && user.email) {
          const { data: dbUserByEmail } = await supabase
            .from('users')
            .select('id')
            .ilike('email', user.email.trim())
            .maybeSingle();
          if (dbUserByEmail) {
            dbUser = dbUserByEmail;
          }
        }

        if (dbUser) {
          const { email, phone_number, ...profilePayload } = data;
          if (email || phone_number) {
            await supabase.from('users').update({
              ...(email ? { email } : {}),
              ...(phone_number ? { phone: phone_number } : {}),
            }).eq('id', dbUser.id);
          }
          await supabase.from('profiles').update(profilePayload).eq('user_id', dbUser.id);
          return { success: true };
        }
      }
      throw apiErr;
    }
  },
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

// ── Top Achievers (Hall of Fame) ──────────────────────────────────
export const achieversApi = {
  getTop: async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'top_achievers')
        .maybeSingle();
      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        return (data.value as any[]).filter((a: any) => a.is_active !== false);
      }
    } catch (err) {
      console.warn('Failed to fetch achievers from app_config:', err);
    }
    try {
      const { data } = await supabase
        .from('top_achievers')
        .select('*')
        .eq('is_active', true)
        .order('rank_num', { ascending: true })
        .limit(5);
      if (data && data.length > 0) return data;
    } catch {}
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
  getCities: async () => {
    try {
      const { data } = await supabase.from('cities').select('*, areas(id, name)').eq('is_active', true).order('name');
      if (data && data.length > 0) return { success: true, cities: data };
    } catch {}
    return apiFetch('/api/discovery/cities', { requiresAuth: false });
  },
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
  myRequests: async (status?: string) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).maybeSingle();
        if (dbUser) {
          let query = supabase
            .from('meeting_requests')
            .select(`
              *,
              profiles:profiles!meeting_requests_to_profile_id_fkey(
                display_name, profile_photos(url, is_primary)
              )
            `)
            .eq('from_user_id', dbUser.id)
            .order('created_at', { ascending: false });
          if (status && status !== 'ALL') query = query.eq('status', status);
          const { data, error } = await query;
          if (!error && data) return { success: true, requests: data };
        }
      }
    } catch {}
    const qs = status ? `?status=${status}` : '';
    return apiFetch(`/api/requests/my${qs}`);
  },
  create: async (data: Record<string, unknown>) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const { data: dbUser } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).maybeSingle();
        if (dbUser) {
          const { data: inserted, error } = await supabase
            .from('meeting_requests')
            .insert({
              from_user_id: dbUser.id,
              to_profile_id: data.toProfileId,
              status: 'SUBMITTED',
              message: data.message || 'Interested in connecting',
              meeting_type: data.meetingType || 'COFFEE',
              proposed_location: data.proposedLocation || 'Flexible',
            })
            .select()
            .single();
          if (!error && inserted) return { success: true, request: inserted };
        }
      }
    } catch {}
    return apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(data) });
  },
  cancel: async (id: string) => {
    try {
      await supabase.from('meeting_requests').update({ status: 'CANCELLED' }).eq('id', id);
      return { success: true };
    } catch {}
    return apiFetch(`/api/requests/${id}/cancel`, { method: 'POST' });
  },
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

// ── Dummy Profiles (Companion Profiles) ──────────────────────────
export const dummyProfilesApi = {
  getProfiles: async () => {
    try {
      const { data, error } = await supabase
        .from('dummy_companion_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          age: d.age || 24,
          gender: d.gender || 'FEMALE',
          avatar: d.avatar || '',
          distanceKm: d.distance_km || 25,
          hourlyRate: d.hourly_rate || 2500,
          bio: d.bio || '',
          interests: d.interests || ['Coffee Date'],
          meetingType: `${d.interests?.[0] || 'Companion'} Meetup ☕`,
          isActive: d.is_active ?? true,
          created_at: d.created_at,
        }));
        return { success: true, profiles: mapped };
      }
    } catch (err) {
      console.warn('Customer dummyProfilesApi supabase error:', err);
    }
    return apiFetch('/api/dummy-profiles', { requiresAuth: false });
  },
};

export default apiFetch;
