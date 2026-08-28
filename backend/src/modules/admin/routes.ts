import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { AuditService, hashIp } from '../../services/AuditService';
import { NotificationService } from '../../services/notifications/NotificationService';

export const adminRouter = Router();

// All admin routes require authentication + admin role
adminRouter.use(requireAuth, requireAdmin);

// ── GET /api/admin/dashboard ──────────────────────────────────────
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: totalProfiles },
    { count: visibleProfiles },
    { count: pendingRequests },
    { count: totalRequests },
    { count: pendingReports },
    { count: newUsersToday },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'ADMIN'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE').eq('role', 'CUSTOMER'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('discovery_status', 'VISIBLE'),
    supabase.from('meeting_requests').select('*', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    supabase.from('meeting_requests').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
  ]);

  res.json({
    success: true,
    dashboard: {
      users: { total: totalUsers, active: activeUsers, newToday: newUsersToday },
      profiles: { total: totalProfiles, visible: visibleProfiles },
      requests: { pending: pendingRequests, total: totalRequests },
      moderation: { pendingReports },
    },
  });
});

// ── GET /api/admin/audit-logs ─────────────────────────────────────
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { page = 1, limit = 100, action, entity } = req.query;
  const from = (Number(page) - 1) * Number(limit);

  let query = supabase
    .from('audit_logs')
    .select('*, users(email, unique_id)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + Number(limit) - 1);

  if (action) query = query.ilike('action', `%${action}%`);
  if (entity) query = query.eq('entity_type', entity);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ success: true, logs: data, total: count });
});

// ── GET/POST /api/admin/config ─────────────────────────────────────
adminRouter.get('/config', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('app_config').select('*').order('key');
  if (error) throw error;
  res.json({ success: true, config: data });
});

adminRouter.patch(
  '/config/:key',
  requireSuperAdmin,
  validateBody(z.object({ value: z.unknown() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', req.params.key)
      .single();

    const { data, error } = await supabase
      .from('app_config')
      .update({ value: req.body.value, updated_by: req.user!.id, updated_at: new Date().toISOString() })
      .eq('key', req.params.key)
      .select()
      .single();

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_UPDATED_CONFIG',
      entityType: 'app_config',
      oldValue: { [req.params.key]: current?.value },
      newValue: { [req.params.key]: req.body.value },
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, config: data });
  }
);

// ── POST /api/admin/cities ────────────────────────────────────────
adminRouter.post(
  '/cities',
  validateBody(z.object({ name: z.string().min(2), state: z.string().optional(), maxProfiles: z.number().optional() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('cities')
      .insert({ name: req.body.name, state: req.body.state ?? null, max_profiles: req.body.maxProfiles ?? 1000 })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, city: data });
  }
);

// ── POST /api/admin/areas ─────────────────────────────────────────
adminRouter.post(
  '/areas',
  validateBody(z.object({ cityId: z.string().uuid(), name: z.string().min(2) })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('areas')
      .insert({ city_id: req.body.cityId, name: req.body.name })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, area: data });
  }
);

// ── GET /api/admin/verification-queue ─────────────────────────────
adminRouter.get('/verification-queue', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  // 1. Fetch from profile_verifications table
  const { data: verifsData, error: verifsErr } = await supabase
    .from('profile_verifications')
    .select(`
      id, profile_id, document_type, document_url, selfie_url, id_document_url,
      status, submitted_at, rejection_reason,
      profiles(
        id, display_name, user_id, age, gender, interests, bio, city_id,
        users(id, unique_id, email, phone, status, role),
        profile_photos(url, is_primary)
      )
    `)
    .eq('status', 'PENDING')
    .order('submitted_at', { ascending: false });

  if (verifsErr) throw verifsErr;

  const verifications: any[] = (verifsData ?? []).map((v: Record<string, unknown>) => ({
    ...v,
    selfie_url: (v.selfie_url ?? v.document_url) as string | null,
  }));

  const trackedProfileIds = new Set(verifications.map((v) => v.profile_id).filter(Boolean));

  // 2. Fetch any pending clients/users that do not have an active verification row yet
  const { data: pendingUsers } = await supabase
    .from('users')
    .select(`
      id, unique_id, email, phone, status, role, created_at,
      profiles(
        id, display_name, user_id, age, gender, interests, bio, city_id, verification_status,
        profile_photos(url, is_primary)
      )
    `)
    .eq('status', 'PENDING')
    .neq('role', 'SUPER_ADMIN')
    .neq('role', 'ADMIN');

  if (pendingUsers) {
    for (const u of pendingUsers) {
      const p = (Array.isArray(u.profiles) ? u.profiles[0] : u.profiles) as any;
      if (p && !trackedProfileIds.has(p.id)) {
        trackedProfileIds.add(p.id);
        const primaryPhoto = p.profile_photos?.find((ph: any) => ph.is_primary)?.url || p.profile_photos?.[0]?.url || null;
        verifications.push({
          id: p.id,
          profile_id: p.id,
          document_type: 'SELFIE',
          document_url: primaryPhoto,
          selfie_url: primaryPhoto,
          id_document_url: null,
          status: 'PENDING',
          submitted_at: u.created_at || new Date().toISOString(),
          rejection_reason: null,
          profiles: {
            id: p.id,
            display_name: p.display_name || 'Client Application',
            user_id: u.id,
            age: p.age,
            gender: p.gender,
            interests: p.interests,
            bio: p.bio,
            city_id: p.city_id,
            users: {
              id: u.id,
              unique_id: u.unique_id,
              email: u.email,
              phone: u.phone,
              status: u.status,
              role: u.role,
            },
            profile_photos: p.profile_photos || [],
          },
        });
      }
    }
  }

  res.json({ success: true, verifications, total: verifications.length });
});

// ── POST /api/admin/verification-queue/:id/approve ────────────────
adminRouter.post('/verification-queue/:id/approve', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const targetId = req.params.id;

  // 1. Try finding in profile_verifications
  const { data: verif } = await supabase
    .from('profile_verifications')
    .select('id, profile_id')
    .eq('id', targetId)
    .maybeSingle();

  let profileId = verif?.profile_id;

  if (verif) {
    await supabase
      .from('profile_verifications')
      .update({ status: 'APPROVED', reviewed_by: req.user!.id, reviewed_at: new Date().toISOString() })
      .eq('id', targetId);
  } else {
    // If targetId is profile_id
    profileId = targetId;
    await supabase
      .from('profile_verifications')
      .update({ status: 'APPROVED', reviewed_by: req.user!.id, reviewed_at: new Date().toISOString() })
      .eq('profile_id', profileId);
  }

  if (profileId) {
    await supabase
      .from('profiles')
      .update({ verification_status: 'APPROVED', discovery_status: 'VISIBLE' })
      .eq('id', profileId);

    // Activate user in users table
    const { data: profile } = await supabase.from('profiles').select('user_id').eq('id', profileId).single();
    if (profile?.user_id) {
      await supabase.from('users').update({ status: 'ACTIVE' }).eq('id', profile.user_id);
      const { NotificationService } = await import('../../services/notifications/NotificationService');
      await NotificationService.profileVerified(profile.user_id).catch(() => {});
    }
  }

  await AuditService.adminAction({
    actor: req.user!,
    action: 'ADMIN_APPROVED_VERIFICATION',
    entityType: 'profile_verification',
    entityId: targetId,
    newValue: { status: 'APPROVED', profileId },
    ipHash: hashIp(req.ip),
  });

  res.json({ success: true, message: 'Verification approved and user account activated.' });
});

// ── POST /api/admin/verification-queue/:id/reject ─────────────────
adminRouter.post(
  '/verification-queue/:id/reject',
  validateBody(z.object({ reason: z.string().min(3) })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const targetId = req.params.id;

    const { data: verif } = await supabase
      .from('profile_verifications')
      .select('id, profile_id')
      .eq('id', targetId)
      .maybeSingle();

    const profileId = verif?.profile_id || targetId;

    if (verif) {
      await supabase
        .from('profile_verifications')
        .update({
          status: 'REJECTED',
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: req.body.reason,
        })
        .eq('id', targetId);
    }

    if (profileId) {
      await supabase
        .from('profiles')
        .update({ verification_status: 'UNVERIFIED' })
        .eq('id', profileId);

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', profileId)
        .single();

      if (profile?.user_id) {
        await NotificationService.send({
          userId: profile.user_id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: '⚠️ Verification Status Update',
          body: req.body.reason,
          data: { type: 'VERIFICATION_REJECTED' },
        }).catch(() => {});
      }
    }

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_REJECTED_VERIFICATION',
      entityType: 'profile_verification',
      entityId: targetId,
      newValue: { reason: req.body.reason, profileId },
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, message: 'Verification rejected.' });
  }
);

// -- GET /api/admin/analytics/overview ----------------------------
adminRouter.get('/analytics/overview', async (_req, res) => {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: newUsers30d },
    { count: newUsers7d },
    { count: totalProfiles },
    { count: totalRequests },
    { count: acceptedRequests },
    { count: totalMatches },
    { count: totalConversations },
    { data: topCitiesRaw },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'ADMIN'),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo).neq('role', 'ADMIN'),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).neq('role', 'ADMIN'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('meeting_requests').select('*', { count: 'exact', head: true }),
    supabase.from('meeting_requests').select('*', { count: 'exact', head: true }).eq('status', 'ACCEPTED'),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('city_id').not('city_id', 'is', null).limit(1000),
  ]);

  const cityCounts: Record<string, number> = {};
  (topCitiesRaw ?? []).forEach((p: { city_id: string | null }) => {
    if (p.city_id) cityCounts[p.city_id] = (cityCounts[p.city_id] || 0) + 1;
  });
  const topCities = Object.entries(cityCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([cityId, count]) => ({ cityId, count }));

  const conversionRate = totalRequests && totalRequests > 0
    ? Math.round(((acceptedRequests ?? 0) / totalRequests) * 100)
    : 0;

  res.json({
    success: true,
    overview: { totalUsers, newUsers30d, newUsers7d, totalProfiles, totalRequests, acceptedRequests, conversionRate, totalMatches, totalConversations, topCities },
  });
});

// -- GET /api/admin/analytics/growth ------------------------------
adminRouter.get('/analytics/growth', async (req, res) => {
  const supabase = getSupabaseAdmin();
  const days = Math.min(Number(req.query.days ?? 14), 90);
  const results = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = d.toISOString();
    const end = new Date(d.getTime() + 86400000).toISOString();
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const [{ count: users }, { count: requests }, { count: matches }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end).neq('role', 'ADMIN'),
      supabase.from('meeting_requests').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end),
      supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', start).lt('created_at', end),
    ]);

    results.push({ date: label, newUsers: users ?? 0, newRequests: requests ?? 0, newMatches: matches ?? 0 });
  }

  res.json({ success: true, growth: results });
});

// -- POST /api/admin/broadcast -------------------------------------
const broadcastSchema = z.object({
  title: z.string().min(2).max(100),
  body: z.string().min(2).max(500),
  target: z.enum(['ALL', 'ACTIVE', 'CUSTOMER', 'PROVIDER']).default('ALL'),
  type: z.enum(['PUSH', 'IN_APP', 'BOTH']).default('BOTH'),
});

adminRouter.post('/broadcast', requireSuperAdmin, validateBody(broadcastSchema), async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { title, body, target, type } = req.body;

  let query = supabase.from('users').select('id').neq('role', 'ADMIN').eq('status', 'ACTIVE');
  if (target === 'CUSTOMER') query = query.eq('role', 'CUSTOMER');
  if (target === 'PROVIDER') query = query.eq('role', 'PROVIDER');

  const { data: users, error } = await query.limit(5000);
  if (error) throw error;

  const userIds = (users ?? []).map((u) => u.id);
  let sent = 0;

  if (type === 'IN_APP' || type === 'BOTH') {
    const rows = userIds.map((userId) => ({
      user_id: userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title,
      body,
      data: { type: 'BROADCAST', adminId: req.user!.id },
    }));
    if (rows.length > 0) await supabase.from('notifications').insert(rows);
    sent = userIds.length;
  }

  if (type === 'PUSH' || type === 'BOTH') {
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map((userId) =>
          NotificationService.send({ userId, type: 'SYSTEM_ANNOUNCEMENT' as any, title, body, data: { type: 'BROADCAST' } })
        )
      );
    }
    sent = userIds.length;
  }

  void supabase.from('broadcast_logs').insert({ admin_id: req.user!.id, title, body, target, type, sent_count: sent });

  await AuditService.adminAction({
    actor: req.user!,
    action: 'ADMIN_BROADCAST_NOTIFICATION',
    entityType: 'notification',
    newValue: { title, body, target, type, sentTo: sent },
    ipHash: hashIp(req.ip),
  });

  res.json({ success: true, message: `Broadcast sent to ${sent} users.`, sentCount: sent });
});

// -- GET /api/admin/broadcast/history -----------------------------
adminRouter.get('/broadcast/history', async (_req, res): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('broadcast_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) { res.json({ success: true, broadcasts: [] }); return; }
  res.json({ success: true, broadcasts: data ?? [] });
});

// -- CRUD /api/admin/banners ---------------------------------------
const bannerSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().optional(),
  image_url: z.string().optional(),
  cta_text: z.string().optional(),
  cta_link: z.string().optional(),
  bg_color: z.string().optional(),
  priority: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

adminRouter.get('/banners', async (_req, res): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('app_banners').select('*').order('priority', { ascending: true });
  if (error) { res.json({ success: true, banners: [] }); return; }
  res.json({ success: true, banners: data ?? [] });
});

adminRouter.post('/banners', requireSuperAdmin, validateBody(bannerSchema), async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('app_banners').insert(req.body).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, banner: data });
});

adminRouter.patch('/banners/:id', requireSuperAdmin, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('app_banners').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json({ success: true, banner: data });
});

adminRouter.delete('/banners/:id', requireSuperAdmin, async (req, res) => {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('app_banners').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true, message: 'Banner deleted.' });
});

// ── GET /api/admin/meetups-config ─────────────────────────────────
adminRouter.get('/meetups-config', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { ClientStatsService } = await import('../../services/stats/ClientStatsService');

  const autoSaturdayCount = ClientStatsService.generateSaturdayWeeklyNumber();

  const { data: configRow } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'weekly_meetups_override')
    .maybeSingle();

  const config = (configRow?.value || {}) as {
    manual_override?: number | null;
    city_overrides?: Record<string, number>;
  };

  const effectiveCount = await ClientStatsService.getWeeklyActiveMeetups();

  res.json({
    success: true,
    autoSaturdayCount,
    manualOverride: config.manual_override ?? null,
    cityOverrides: config.city_overrides ?? {},
    effectiveCount,
  });
});

// ── POST /api/admin/meetups-config ────────────────────────────────
adminRouter.post(
  '/meetups-config',
  validateBody(z.object({
    manualOverride: z.union([z.number().int().min(1).max(999), z.null()]),
    cityOverrides: z.record(z.string(), z.number().int()).optional(),
  })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { manualOverride, cityOverrides = {} } = req.body;

    const value = {
      manual_override: manualOverride,
      city_overrides: cityOverrides,
      updated_at: new Date().toISOString(),
      updated_by: req.user!.id,
    };

    const { error } = await supabase.from('app_config').upsert({
      key: 'weekly_meetups_override',
      value,
      description: 'Weekly ongoing meetups configuration (auto Saturday 10-99 with manual override)',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_UPDATED_MEETUPS_CONFIG',
      entityType: 'app_config',
      newValue: value,
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, message: 'Ongoing meetups configuration saved.', config: value });
  }
);

// ── GET /api/admin/users/:id/boost ────────────────────────────────
adminRouter.get('/users/:id/boost', async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: boostRow } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'user_stats_boosts')
    .maybeSingle();

  const boosts = (boostRow?.value || {}) as Record<string, {
    boost_pct?: number;
    manual_views?: number;
    manual_likes?: number;
  }>;

  const userBoost = boosts[req.params.id] || { boost_pct: 0, manual_views: null, manual_likes: null };

  res.json({
    success: true,
    userId: req.params.id,
    boost: userBoost,
  });
});

// ── POST /api/admin/users/:id/boost ───────────────────────────────
adminRouter.post(
  '/users/:id/boost',
  validateBody(z.object({
    boostPct: z.number().min(0).max(1000).optional(),
    manualViews: z.union([z.number().int().min(0), z.null()]).optional(),
    manualLikes: z.union([z.number().int().min(0), z.null()]).optional(),
  })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const targetUserId = req.params.id;
    const { boostPct = 0, manualViews = null, manualLikes = null } = req.body;

    const { data: boostRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'user_stats_boosts')
      .maybeSingle();

    const boosts = (boostRow?.value || {}) as Record<string, {
      boost_pct?: number;
      manual_views?: number;
      manual_likes?: number;
    }>;

    boosts[targetUserId] = {
      boost_pct: boostPct,
      manual_views: manualViews,
      manual_likes: manualLikes,
    };

    const { error } = await supabase.from('app_config').upsert({
      key: 'user_stats_boosts',
      value: boosts,
      description: 'Admin custom profile view boost % and manual stats overrides per client',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_BOOSTED_USER_STATS',
      entityType: 'user',
      entityId: targetUserId,
      newValue: boosts[targetUserId],
      ipHash: hashIp(req.ip),
    });

    res.json({
      success: true,
      message: 'Client stats boost saved successfully.',
      boost: boosts[targetUserId],
    });
  }
);