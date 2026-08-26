import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { AuditService, hashIp } from '../../services/AuditService';
import { NotFoundError } from '../../middleware/errorHandler';

export const moderationRouter = Router();

// ── POST /api/reports ─────────────────────────────────────────────
moderationRouter.post(
  '/',
  requireAuth,
  validateBody(z.object({
    targetType: z.enum(['USER', 'PROFILE', 'MESSAGE', 'CONVERSATION']),
    targetId: z.string().uuid(),
    targetUserId: z.string().uuid().optional(),
    reason: z.string().min(5).max(200),
    description: z.string().max(1000).optional(),
  })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    await supabase.from('reports').insert({
      reporter_id: req.user!.id,
      target_type: req.body.targetType,
      target_id: req.body.targetId,
      target_user_id: req.body.targetUserId ?? null,
      reason: req.body.reason,
      description: req.body.description ?? null,
    });

    res.status(201).json({ success: true, message: 'Report submitted. Our team will review it.' });
  }
);

// ── POST /api/reports/block ───────────────────────────────────────
moderationRouter.post(
  '/block',
  requireAuth,
  validateBody(z.object({ blockedUserId: z.string().uuid() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('blocks')
      .upsert(
        { blocker_id: req.user!.id, blocked_id: req.body.blockedUserId },
        { onConflict: 'blocker_id,blocked_id' }
      );

    // Also unmatch if matched
    await supabase
      .from('matches')
      .update({ status: 'BLOCKED' })
      .or(
        `and(user_a_id.eq.${req.user!.id},user_b_id.eq.${req.body.blockedUserId}),` +
        `and(user_a_id.eq.${req.body.blockedUserId},user_b_id.eq.${req.user!.id})`
      );

    res.json({ success: true, message: 'User blocked.' });
  }
);

// ── DELETE /api/reports/block/:userId ────────────────────────────
moderationRouter.delete('/block/:userId', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', req.user!.id)
    .eq('blocked_id', req.params.userId);

  res.json({ success: true, message: 'User unblocked.' });
});

// ── GET /api/reports/blocks ───────────────────────────────────────
moderationRouter.get('/blocks', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, profiles!blocks_blocked_id_fkey(display_name)')
    .eq('blocker_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ success: true, blocks: data });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════

// GET /api/reports (admin queue)
moderationRouter.get('/queue', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { status = 'PENDING', page = 1, limit = 50 } = req.query;
  const from = (Number(page) - 1) * Number(limit);

  const { data, error, count } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:users!reports_reporter_id_fkey(email, unique_id),
      target_user:users!reports_target_user_id_fkey(email, unique_id, status)
    `, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(from, from + Number(limit) - 1);

  if (error) throw error;
  res.json({ success: true, reports: data, total: count });
});

// PATCH /api/reports/:id (admin resolve)
moderationRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateBody(z.object({
    status: z.enum(['RESOLVED', 'DISMISSED']),
    note: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data: report } = await supabase
      .from('reports')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (!report) throw new NotFoundError('Report');

    const { data, error } = await supabase
      .from('reports')
      .update({
        status: req.body.status,
        reviewed_by: req.user!.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: `ADMIN_REPORT_${req.body.status}`,
      entityType: 'report',
      entityId: req.params.id,
      note: req.body.note,
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, report: data });
  }
);
