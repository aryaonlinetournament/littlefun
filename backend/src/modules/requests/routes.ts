import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { EntitlementService } from '../../services/EntitlementService';
import { NotificationService } from '../../services/notifications/NotificationService';
import { AuditService, hashIp } from '../../services/AuditService';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/errorHandler';

export const requestsRouter = Router();

// Valid status transitions — server enforced
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PENDING_RESPONSE', 'CANCELLED'],
  PENDING_RESPONSE: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'DISPUTED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: ['RESOLVED'],
};

// ── POST /api/requests ────────────────────────────────────────────
const createRequestSchema = z.object({
  toProfileId: z.string().uuid(),
  message: z.string().min(10).max(500),
  meetingType: z.enum(['OUTING', 'DINNER', 'COFFEE', 'EVENT', 'TRAVEL', 'COMPANIONSHIP', 'OTHER']).default('COFFEE'),
  proposedDateTime: z.string().datetime().optional(),
  proposedLocation: z.string().max(200).optional(),
  requirementId: z.string().uuid().optional(),
});

requestsRouter.post(
  '/',
  requireAuth,
  validateBody(createRequestSchema),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const supabase = getSupabaseAdmin();

    // Entitlement check
    const { allowed, reason } = await EntitlementService.canCreateRequest(user);
    if (!allowed) {
      res.status(403).json({ success: false, error: { code: 'REQUEST_LIMIT', message: reason } });
      return;
    }

    // Verify target profile exists and is discoverable
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, discovery_status')
      .eq('id', req.body.toProfileId)
      .single();

    if (!targetProfile || targetProfile.discovery_status !== 'VISIBLE') {
      throw new NotFoundError('Profile');
    }

    // Cannot request self
    if (targetProfile.user_id === user.id) throw new BadRequestError('Cannot send request to yourself.');

    // Create request
    const { data: request, error } = await supabase
      .from('meeting_requests')
      .insert({
        from_user_id: user.id,
        to_profile_id: req.body.toProfileId,
        status: 'SUBMITTED',
        message: req.body.message,
        meeting_type: req.body.meetingType,
        proposed_date_time: req.body.proposedDateTime ?? null,
        proposed_location: req.body.proposedLocation ?? 'Flexible',
        requirement_id: req.body.requirementId ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log event
    await supabase.from('meeting_request_events').insert({
      request_id: request.id,
      event_type: 'REQUEST_CREATED',
      new_status: 'SUBMITTED',
      performed_by: user.id,
    });

    // Notify target (profile owner or admin)
    await NotificationService.requestReceived(
      targetProfile.user_id,
      'Someone',
      request.id
    );

    res.status(201).json({ success: true, request });
  }
);

// ── GET /api/requests/my ─────────────────────────────────────────
requestsRouter.get('/my', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { status } = req.query;

  let query = supabase
    .from('meeting_requests')
    .select(`
      *,
      profiles!meeting_requests_to_profile_id_fkey(
        display_name, profile_photos(url, is_primary)
      ),
      meeting_request_events(event_type, old_status, new_status, created_at)
    `)
    .eq('from_user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  // Auto-mark notifications for resolved requests
  const resolved = (data || []).filter(
    (r: { status: string; client_notified: boolean }) =>
      ['ACCEPTED', 'REJECTED'].includes(r.status) && !r.client_notified
  );

  if (resolved.length > 0) {
    await supabase
      .from('meeting_requests')
      .update({ client_notified: true })
      .in('id', resolved.map((r: { id: string }) => r.id));
  }

  res.json({ success: true, requests: data, total: (data || []).length });
});

// ── GET /api/requests/:id ─────────────────────────────────────────
requestsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('meeting_requests')
    .select(`*, meeting_request_events(*)`)
    .eq('id', req.params.id)
    .eq('from_user_id', req.user!.id)
    .single();

  if (error || !data) throw new NotFoundError('Request');
  res.json({ success: true, request: data });
});

// ── POST /api/requests/:id/cancel ────────────────────────────────
requestsRouter.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: request } = await supabase
    .from('meeting_requests')
    .select('id, status, from_user_id')
    .eq('id', req.params.id)
    .single();

  if (!request) throw new NotFoundError('Request');
  if (request.from_user_id !== req.user!.id) throw new ForbiddenError();

  const allowed = VALID_TRANSITIONS[request.status]?.includes('CANCELLED');
  if (!allowed) throw new BadRequestError(`Cannot cancel a request in status: ${request.status}`);

  await supabase.from('meeting_requests').update({ status: 'CANCELLED' }).eq('id', req.params.id);

  await supabase.from('meeting_request_events').insert({
    request_id: req.params.id,
    event_type: 'REQUEST_CANCELLED',
    old_status: request.status,
    new_status: 'CANCELLED',
    performed_by: req.user!.id,
  });

  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// GET /api/requests — All requests (admin)
requestsRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { status, page = 1, limit = 50 } = req.query;
  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  let query = supabase
    .from('meeting_requests')
    .select(`
      *,
      users!meeting_requests_from_user_id_fkey(email, unique_id),
      profiles!meeting_requests_to_profile_id_fkey(display_name, city_id, profile_photos(url, is_primary))
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'ALL') query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw error;

  const pendingCount = await supabase
    .from('meeting_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'SUBMITTED');

  res.json({
    success: true,
    requests: data,
    total: count,
    pendingCount: pendingCount.count ?? 0,
  });
});

// POST /api/requests/:id/accept (admin)
requestsRouter.post('/:id/accept', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await adminResolveRequest(req, res, 'ACCEPTED', 'REQUEST_ACCEPTED');
});

// POST /api/requests/:id/reject (admin)
requestsRouter.post('/:id/reject', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await adminResolveRequest(req, res, 'REJECTED', 'REQUEST_REJECTED');
});

// POST /api/requests/:id/hold (admin)
requestsRouter.post('/:id/hold', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await adminResolveRequest(req, res, 'PENDING_RESPONSE', 'REQUEST_ON_HOLD');
});

async function adminResolveRequest(req: Request, res: Response, newStatus: string, eventType: string) {
  const supabase = getSupabaseAdmin();
  const { note } = req.body ?? {};

  const { data: request } = await supabase
    .from('meeting_requests')
    .select('id, status, from_user_id, to_profile_id')
    .eq('id', req.params.id)
    .single();

  if (!request) throw new NotFoundError('Request');

  await supabase
    .from('meeting_requests')
    .update({ status: newStatus, admin_note: note ?? null, assigned_admin_id: req.user!.id })
    .eq('id', req.params.id);

  await supabase.from('meeting_request_events').insert({
    request_id: req.params.id,
    event_type: eventType,
    old_status: request.status,
    new_status: newStatus,
    performed_by: req.user!.id,
    note: note ?? null,
  });

  // Notify the requester
  if (newStatus === 'ACCEPTED') {
    await NotificationService.requestAccepted(request.from_user_id, 'the profile', req.params.id);
  } else if (newStatus === 'REJECTED') {
    await NotificationService.requestRejected(request.from_user_id, req.params.id);
  }

  await AuditService.adminAction({
    actor: req.user!,
    action: `ADMIN_${eventType}`,
    entityType: 'meeting_request',
    entityId: req.params.id,
    oldValue: { status: request.status },
    newValue: { status: newStatus, note },
    ipHash: hashIp(req.ip),
  });

  res.json({ success: true, status: newStatus });
}
