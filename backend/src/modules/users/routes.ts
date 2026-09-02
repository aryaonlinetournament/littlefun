import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, invalidateUserCache } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { createFirebaseUser, updateFirebaseUserPassword, getFirebaseAdmin } from '../../services/firebase/firebaseAdmin';
import { AuditService, hashIp } from '../../services/AuditService';
import { NotFoundError } from '../../middleware/errorHandler';

export const usersRouter = Router();

// ── GET /api/users/me ────────────────────────────────────────────
usersRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id, firebase_uid, email, phone, role, status, unique_id, plan_id, created_at, last_active_at,
      plans(name, display_name, chat_enabled, advanced_filters, priority_matching, max_discovery_profiles, max_requests),
      profiles(id, display_name, verification_status, discovery_status, profile_completion, age, gender, interests, bio)
    `)
    .eq('id', req.user!.id)
    .single();

  if (error || !user) throw new NotFoundError('User');

  const rawProfiles = (user as Record<string, unknown>).profiles;
  const profileObj = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles;

  res.json({ success: true, user: { ...user, profiles: profileObj || null } });
});

// ── PATCH /api/users/me ──────────────────────────────────────────
const updateMeSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

usersRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateMeSchema),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  }
);

// ── POST /api/users/device-token ─────────────────────────────────
usersRouter.post(
  '/device-token',
  requireAuth,
  validateBody(z.object({ token: z.string().min(1), platform: z.enum(['web', 'ios', 'android']).optional() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    await supabase.from('device_tokens').upsert(
      { user_id: req.user!.id, token: req.body.token, platform: req.body.platform ?? 'web' },
      { onConflict: 'user_id,token' }
    );
    res.json({ success: true });
  }
);

// ═══════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/users (admin)
usersRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { page = 1, limit = 50, search, status, role } = req.query;
  // Clamp limit: prevent DB dump attacks (limit=99999)
  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.min(Math.max(1, Number(limit)), 100);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // Sanitize search: remove SQL wildcard abuse chars
  const safeSearch = typeof search === 'string'
    ? search.replace(/[%_\\]/g, (c) => `\\${c}`).slice(0, 100)
    : undefined;

  let query = supabase
    .from('users')
    .select('id, unique_id, email, phone, role, status, created_at, last_active_at, plans(name), profiles(display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (safeSearch) query = query.or(`email.ilike.%${safeSearch}%,unique_id.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
  if (status) query = query.eq('status', status);
  if (role) query = query.eq('role', role);

  const { data, error, count } = await query;
  if (error) throw error;

  const formattedUsers = (data || []).map((u: any) => ({
    ...u,
    plan_name: u.plans?.name || 'FREE',
    name: Array.isArray(u.profiles) ? u.profiles[0]?.display_name : u.profiles?.display_name,
  }));

  res.json({ success: true, users: formattedUsers, total: count, page: safePage, limit: safeLimit });
});

// POST /api/users/admin/create — Admin creates a customer account
const createClientSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  planName: z.enum(['FREE', 'BASIC', 'PRO', 'PREMIUM']).default('FREE'),
  temporaryPassword: z.string().min(8).optional(),
});

usersRouter.post(
  '/admin/create',
  requireAuth,
  requireAdmin,
  validateBody(createClientSchema),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { name, email, phone, planName } = req.body;

    // Generate temp password if not provided
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const tempPassword =
      req.body.temporaryPassword ||
      'LF@' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    // 1. Create Firebase user
    const firebaseUser = await createFirebaseUser({
      email,
      password: tempPassword,
      displayName: name,
      phoneNumber: phone ? `+91${phone}` : undefined,
    });

    // 2. Get plan ID
    const { data: plan } = await supabase.from('plans').select('id').eq('name', planName).single();

    // 3. Create Supabase user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        firebase_uid: firebaseUser.uid,
        email,
        phone,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        plan_id: plan?.id ?? null,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete the Firebase user we just created so it doesn't become an orphan
      try {
        const firebaseAdmin = getFirebaseAdmin();
        await firebaseAdmin.auth().deleteUser(firebaseUser.uid);
      } catch (rollbackErr) {
        console.error('[Admin] Firebase rollback failed — orphan UID:', firebaseUser.uid, rollbackErr);
      }
      throw userError;
    }

    // 4. Create profile stub
    await supabase.from('profiles').insert({
      user_id: newUser.id,
      display_name: name,
      profile_completion: 10,
      must_change_password: true,
    });

    // 5. Audit log
    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_CREATED_CUSTOMER',
      entityType: 'user',
      entityId: newUser.id,
      newValue: { email, name, planName },
      ipHash: hashIp(req.ip),
    });

    res.status(201).json({
      success: true,
      message: 'Customer account created.',
      credentials: {
        uniqueId: newUser.unique_id,
        email,
        temporaryPassword: tempPassword,
        planName,
      },
      user: { id: newUser.id, unique_id: newUser.unique_id, email, role: newUser.role },
    });
  }
);

// PATCH /api/users/:id/status — Admin suspend/ban/activate
usersRouter.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  validateBody(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED', 'PENDING']) })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase.from('users').select('status').eq('id', req.params.id).single();
    if (!current) throw new NotFoundError('User');

    const { data, error } = await supabase
      .from('users')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Synchronize profile verification and discovery status
    if (req.body.status === 'ACTIVE') {
      await supabase
        .from('profiles')
        .update({ verification_status: 'APPROVED', discovery_status: 'VISIBLE' })
        .eq('user_id', req.params.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', req.params.id)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profile_verifications')
          .update({ status: 'APPROVED', reviewed_by: req.user!.id, reviewed_at: new Date().toISOString() })
          .eq('profile_id', profile.id);
      }
    } else if (req.body.status === 'SUSPENDED' || req.body.status === 'BANNED') {
      await supabase
        .from('profiles')
        .update({ discovery_status: 'HIDDEN' })
        .eq('user_id', req.params.id);
    }

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_CHANGED_USER_STATUS',
      entityType: 'user',
      entityId: req.params.id,
      oldValue: { status: current.status },
      newValue: { status: req.body.status },
      ipHash: hashIp(req.ip),
    });

    if (data?.firebase_uid) {
      invalidateUserCache(data.firebase_uid);
    }

    res.json({ success: true, user: data });
  }
);

// PATCH /api/users/:id/plan — Admin update plan
usersRouter.patch(
  '/:id/plan',
  requireAuth,
  requireAdmin,
  validateBody(z.object({ planName: z.enum(['FREE', 'BASIC', 'PRO', 'PREMIUM']) })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data: plan } = await supabase.from('plans').select('id, name').eq('name', req.body.planName).single();
    if (!plan) throw new NotFoundError('Plan');

    await supabase.from('users').update({ plan_id: plan.id }).eq('id', req.params.id);

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_CHANGED_USER_PLAN',
      entityType: 'user',
      entityId: req.params.id,
      newValue: { planName: req.body.planName },
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, message: `Plan updated to ${req.body.planName}` });
  }
);

// POST /api/users/admin/reset-password — Admin reset user password
usersRouter.post(
  '/admin/reset-password',
  requireAuth,
  requireAdmin,
  validateBody(z.object({ userId: z.string().uuid(), newPassword: z.string().min(6).optional() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { userId, newPassword } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, unique_id, firebase_uid')
      .eq('id', userId)
      .single();

    if (error || !user) throw new NotFoundError('User');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const finalPassword =
      newPassword ||
      'LF@' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    // Update in Firebase Auth
    if (user.firebase_uid) {
      try {
        await updateFirebaseUserPassword(user.firebase_uid, finalPassword);
      } catch (fbErr) {
        console.warn('[Admin] Password update via Firebase SDK error, proceeding:', fbErr);
      }
    }

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_RESET_USER_PASSWORD',
      entityType: 'user',
      entityId: user.id,
      newValue: { email: user.email },
      ipHash: hashIp(req.ip),
    });

    res.json({
      success: true,
      credentials: {
        uniqueId: user.unique_id,
        email: user.email,
        password: finalPassword,
      },
    });
  }
);

// PATCH /api/users/admin/:id/details — Admin update user details
usersRouter.patch(
  '/admin/:id/details',
  requireAuth,
  requireAdmin,
  validateBody(
    z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      planName: z.enum(['FREE', 'BASIC', 'PRO', 'PREMIUM']).optional(),
    })
  ),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { name, phone, email, planName } = req.body;
    const userId = req.params.id;

    const userUpdates: Record<string, any> = {};
    if (phone !== undefined) userUpdates.phone = phone;
    if (email !== undefined) userUpdates.email = email;

    if (planName) {
      const { data: plan } = await supabase.from('plans').select('id').eq('name', planName).single();
      if (plan) userUpdates.plan_id = plan.id;
    }

    if (Object.keys(userUpdates).length > 0) {
      await supabase.from('users').update(userUpdates).eq('id', userId);
    }

    if (name) {
      await supabase.from('profiles').update({ display_name: name }).eq('user_id', userId);
    }

    const { data: updated } = await supabase
      .from('users')
      .select('id, unique_id, email, phone, role, status, plan_id, plans(name), profiles(display_name)')
      .eq('id', userId)
      .single();

    res.json({ success: true, user: updated });
  }
);

