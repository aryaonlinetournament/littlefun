import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { createFirebaseUser } from '../../services/firebase/firebaseAdmin';
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
      plans(name, display_name, chat_enabled, advanced_filters, priority_matching, max_discovery_profiles, max_requests)
    `)
    .eq('id', req.user!.id)
    .single();

  if (error || !user) throw new NotFoundError('User');

  res.json({ success: true, user });
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
  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  let query = supabase
    .from('users')
    .select('id, unique_id, email, phone, role, status, created_at, last_active_at, plans(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) query = query.or(`email.ilike.%${search}%,unique_id.ilike.%${search}%`);
  if (status) query = query.eq('status', status);
  if (role) query = query.eq('role', role);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ success: true, users: data, total: count, page: Number(page), limit: Number(limit) });
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
      // Rollback Firebase user
      await createFirebaseUser({ email: `deleted_${Date.now()}@invalid`, password: 'x', displayName: 'deleted' })
        .catch(() => {});
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
  validateBody(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED']) })),
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

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_CHANGED_USER_STATUS',
      entityType: 'user',
      entityId: req.params.id,
      oldValue: { status: current.status },
      newValue: { status: req.body.status },
      ipHash: hashIp(req.ip),
    });

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
