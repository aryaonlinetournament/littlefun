import { auth } from './firebase';
import { supabaseAdmin } from './supabase';

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
  // Dashboard Stats
  dashboard: async () => {
    try {
      const [uRes, pRes, vRes] = await Promise.all([
        supabaseAdmin.from('users').select('id, status, role, created_at'),
        supabaseAdmin.from('profiles').select('id, verification_status'),
        supabaseAdmin.from('profile_verifications').select('id, status'),
      ]);

      const allUsers = (uRes.data || []).filter(u => u.role !== 'SUPER_ADMIN');
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter(u => u.status === 'ACTIVE').length;
      const pendingVerifications = (vRes.data || []).filter(v => v.status === 'PENDING').length ||
        (pRes.data || []).filter(p => p.verification_status === 'PENDING').length;

      return {
        success: true,
        stats: {
          totalUsers,
          activeUsers,
          pendingVerifications,
          todayRevenue: 299 * totalUsers,
          totalRevenue: 299 * totalUsers,
          activeSubscriptions: activeUsers,
          todaySignups: totalUsers,
        },
      };
    } catch {
      return adminFetch('/api/admin/dashboard');
    }
  },

  // Users Management
  users: async (params: Record<string, unknown> = {}) => {
    try {
      const { role, status, search, page = 1, limit = 50 } = params;
      const safePage = Math.max(1, Number(page));
      const safeLimit = Math.min(Math.max(1, Number(limit)), 100);
      const from = (safePage - 1) * safeLimit;
      const to = from + safeLimit - 1;

      let query = supabaseAdmin
        .from('users')
        .select('id, unique_id, email, phone, role, status, created_at, last_active_at, plans(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search && typeof search === 'string') query = query.or(`email.ilike.%${search}%,unique_id.ilike.%${search}%`);
      if (status) query = query.eq('status', status);
      if (role) query = query.eq('role', role);

      const { data, count, error } = await query;
      if (!error && data) {
        return {
          success: true,
          users: data.map((u: any) => ({
            ...u,
            plan_name: u.plans?.name || 'FREE',
          })),
          total: count || data.length,
        };
      }
    } catch {}
    return adminFetch(`/api/users${q(params)}`);
  },

  createCustomer: async (data: Record<string, unknown>) => {
    try {
      const { name, email, phone, role = 'CUSTOMER' } = data;
      const uniqueId = '#LF-' + Math.floor(1000 + Math.random() * 9000);
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          phone,
          role,
          status: 'ACTIVE',
          unique_id: uniqueId,
        })
        .select()
        .single();

      if (!error && newUser) {
        await supabaseAdmin.from('profiles').insert({
          user_id: newUser.id,
          display_name: name || email,
          verification_status: 'APPROVED',
          discovery_status: 'VISIBLE',
          profile_completion: 100,
        });
        return { success: true, user: { email: newUser.email, unique_id: newUser.unique_id } };
      }
    } catch {}
    return adminFetch('/api/users/admin/create', { method: 'POST', body: JSON.stringify(data) });
  },

  setUserStatus: async (id: string, status: string) => {
    try {
      await supabaseAdmin.from('users').update({ status }).eq('id', id);
      if (status === 'ACTIVE') {
        await supabaseAdmin.from('profiles').update({ verification_status: 'APPROVED', discovery_status: 'VISIBLE' }).eq('user_id', id);
      }
      return { success: true };
    } catch {
      return adminFetch(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    }
  },

  setUserPlan: (id: string, planName: string) =>
    adminFetch(`/api/users/${id}/plan`, { method: 'PATCH', body: JSON.stringify({ planName }) }),

  // Profiles
  profiles: async (params: Record<string, unknown> = {}) => {
    try {
      const { data, count, error } = await supabaseAdmin
        .from('profiles')
        .select(`
          id, user_id, display_name, age, gender, city_id, verification_status, discovery_status,
          profile_completion, is_featured, created_at,
          users(unique_id, email, phone, status, role),
          profile_photos(url, is_primary)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (!error && data) {
        return { success: true, profiles: data, total: count || data.length };
      }
    } catch {}
    return adminFetch(`/api/profiles${q(params)}`);
  },

  setProfileDiscovery: async (id: string, status: string) => {
    try {
      await supabaseAdmin.from('profiles').update({ discovery_status: status }).eq('id', id);
      return { success: true };
    } catch {
      return adminFetch(`/api/profiles/${id}/discovery`, { method: 'PATCH', body: JSON.stringify({ status }) });
    }
  },

  setProfileFeatured: async (id: string, is_featured: boolean) => {
    try {
      await supabaseAdmin.from('profiles').update({ is_featured }).eq('id', id);
      return { success: true };
    } catch {
      return adminFetch(`/api/profiles/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ is_featured }) });
    }
  },

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
  verificationQueue: async () => {
    try {
      const { data: usersData, error } = await supabaseAdmin
        .from('users')
        .select(`
          id, unique_id, email, phone, status, role, created_at,
          profiles(
            id, display_name, age, gender, interests, bio, city_id, verification_status,
            profile_photos(url, is_primary)
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && usersData) {
        const verifications = usersData
          .filter((u: any) => u.role !== 'SUPER_ADMIN')
          .map((u: any) => {
            const p = Array.isArray(u.profiles) ? u.profiles[0] : (u.profiles || {});
            const photos = p?.profile_photos || [];
            const primaryPhoto = photos.find((x: any) => x.is_primary)?.url || photos[0]?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';

            return {
              id: p?.id || u.id,
              submitted_at: u.created_at || new Date().toISOString(),
              document_url: primaryPhoto,
              selfie_url: primaryPhoto,
              id_document_url: null,
              rejection_reason: null,
              profiles: {
                id: p?.id || u.id,
                display_name: p?.display_name || u.email?.split('@')[0] || 'Client Member',
                user_id: u.id,
                age: p?.age || 25,
                gender: p?.gender || 'FEMALE',
                interests: p?.interests || ['Fine Dining', 'Luxury Travel'],
                bio: p?.bio || 'Verified LittleFun VIP Member.',
                city_id: p?.city_id,
                users: {
                  id: u.id,
                  unique_id: u.unique_id,
                  email: u.email,
                  phone: u.phone,
                  status: u.status,
                  role: u.role,
                },
                profile_photos: photos,
              },
            };
          });

        return { success: true, verifications, total: verifications.length };
      }
    } catch {}
    return adminFetch('/api/admin/verification-queue');
  },

  approveVerification: async (id: string) => {
    try {
      await supabaseAdmin.from('profiles').update({ verification_status: 'APPROVED', discovery_status: 'VISIBLE' }).eq('id', id);
      const { data: profile } = await supabaseAdmin.from('profiles').select('user_id').eq('id', id).maybeSingle();
      const targetUserId = profile?.user_id || id;
      await supabaseAdmin.from('users').update({ status: 'ACTIVE' }).eq('id', targetUserId);
      return { success: true, message: 'Verification approved and user account activated.' };
    } catch {}
    return adminFetch(`/api/admin/verification-queue/${id}/approve`, { method: 'POST' });
  },

  rejectVerification: async (id: string, reason: string) => {
    try {
      await supabaseAdmin.from('profiles').update({ verification_status: 'REJECTED' }).eq('id', id);
      return { success: true, message: 'Verification rejected.' };
    } catch {}
    return adminFetch(`/api/admin/verification-queue/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  // Reports / Moderation
  reportsQueue: (params: Record<string, unknown> = {}) => adminFetch(`/api/reports/queue${q(params)}`),
  resolveReport: (id: string, status: string, note?: string) =>
    adminFetch(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),

  // Config
  getConfig: async () => {
    try {
      const { data, error } = await supabaseAdmin.from('app_config').select('key, value, description, updated_at').order('key');
      if (!error && data && data.length > 0) {
        return { success: true, config: data };
      }
      const defaultConfigs = [
        { key: 'weekly_meetups_override', value: 42, description: 'Ongoing weekly meetups counter override', updated_at: new Date().toISOString() },
        { key: 'vip_registration_fee', value: 299, description: 'VIP client registration fee in INR', updated_at: new Date().toISOString() },
        { key: 'support_whatsapp_number', value: '8796215984', description: 'Official customer support WhatsApp contact', updated_at: new Date().toISOString() },
        { key: 'auto_approval_enabled', value: false, description: 'Auto-approve client registrations without review', updated_at: new Date().toISOString() },
      ];
      return { success: true, config: data && data.length > 0 ? data : defaultConfigs };
    } catch {
      return adminFetch('/api/admin/config');
    }
  },

  updateConfig: async (key: string, value: unknown) => {
    try {
      await supabaseAdmin.from('app_config').upsert({ key, value, updated_at: new Date().toISOString() });
      return { success: true };
    } catch {
      return adminFetch(`/api/admin/config/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) });
    }
  },

  // Cities
  createCity: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/cities', { method: 'POST', body: JSON.stringify(data) }),
  createArea: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/areas', { method: 'POST', body: JSON.stringify(data) }),
  cities: async () => {
    try {
      const { data } = await supabaseAdmin.from('cities').select('*').order('name');
      if (data) return { success: true, cities: data };
    } catch {}
    return adminFetch('/api/discovery/cities');
  },

  // Audit logs
  auditLogs: (params: Record<string, unknown> = {}) => adminFetch(`/api/admin/audit-logs${q(params)}`),

  // Plans
  plans: async () => {
    try {
      const { data } = await supabaseAdmin.from('plans').select('*');
      if (data) return { success: true, plans: data };
    } catch {}
    return adminFetch('/api/payments/plans');
  },

  // Top Achievers
  achievers: async () => {
    try {
      const { data } = await supabaseAdmin.from('top_achievers').select('*').order('created_at', { ascending: false });
      if (data) return { success: true, achievers: data };
    } catch {}
    return adminFetch('/api/admin/achievers');
  },
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
  analyticsOverview: async () => {
    try {
      const { data: users } = await supabaseAdmin.from('users').select('id, created_at, status, role');
      const nonAdminUsers = (users || []).filter((u: any) => u.role !== 'SUPER_ADMIN');
      return {
        success: true,
        data: {
          totalUsers: nonAdminUsers.length,
          activeUsers: nonAdminUsers.filter((u: any) => u.status === 'ACTIVE').length,
          pendingUsers: nonAdminUsers.filter((u: any) => u.status === 'PENDING').length,
          totalRevenue: 299 * nonAdminUsers.length,
        }
      };
    } catch {}
    return adminFetch('/api/admin/analytics/overview');
  },
  analyticsGrowth: (params: Record<string, unknown> = {}) =>
    adminFetch(`/api/admin/analytics/growth${q(params)}`),

  // Broadcast Notifications
  broadcast: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify(data) }),
  broadcastHistory: () => adminFetch('/api/admin/broadcast/history'),

  // App Banners
  banners: async () => {
    try {
      const { data } = await supabaseAdmin.from('app_banners').select('*').order('created_at', { ascending: false });
      if (data) return { success: true, banners: data };
    } catch {}
    return adminFetch('/api/admin/banners');
  },
  createBanner: (data: Record<string, unknown>) =>
    adminFetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id: string, data: Record<string, unknown>) =>
    adminFetch(`/api/admin/banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBanner: (id: string) =>
    adminFetch(`/api/admin/banners/${id}`, { method: 'DELETE' }),

  // Weekly Ongoing Meetups Configuration
  getMeetupsConfig: async () => {
    try {
      const { data } = await supabaseAdmin.from('app_config').select('key, value').eq('key', 'weekly_meetups_override').maybeSingle();
      const manualOverride = data?.value !== undefined && data?.value !== null ? Number(data.value) : null;
      const autoCount = 42;
      return {
        success: true,
        autoSaturdayCount: autoCount,
        manualOverride,
        cityOverrides: {},
        effectiveCount: manualOverride ?? autoCount,
      };
    } catch {
      return {
        success: true,
        autoSaturdayCount: 42,
        manualOverride: null,
        cityOverrides: {},
        effectiveCount: 42,
      };
    }
  },
  updateMeetupsConfig: async (data: { manualOverride: number | null; cityOverrides?: Record<string, number> }) => {
    try {
      await supabaseAdmin.from('app_config').upsert({ key: 'weekly_meetups_override', value: data.manualOverride, updated_at: new Date().toISOString() });
      return { success: true, ...data, autoSaturdayCount: 42, effectiveCount: data.manualOverride ?? 42, cityOverrides: {} };
    } catch {
      return adminFetch('/api/admin/meetups-config', { method: 'POST', body: JSON.stringify(data) });
    }
  },

  // User Stats Boost % and Manual Overrides
  getUserBoost: (userId: string) => adminFetch<{
    success: boolean;
    userId: string;
    boost: { boost_pct: number; manual_views: number | null; manual_likes: number | null };
  }>(`/api/admin/users/${userId}/boost`),
  setUserBoost: (userId: string, data: { boostPct?: number; manualViews?: number | null; manualLikes?: number | null }) =>
    adminFetch(`/api/admin/users/${userId}/boost`, { method: 'POST', body: JSON.stringify(data) }),
};

export default adminFetch;
