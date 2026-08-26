import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler';

export const requirementsRouter = Router();

const requirementSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().max(500).optional(),
  requirement_type: z.enum(['OUTING', 'DINNER', 'COFFEE', 'EVENT', 'TRAVEL', 'COMPANIONSHIP', 'OTHER']).default('OTHER'),
  city_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// GET /api/requirements
requirementsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('requirements')
    .select('*, cities(name), areas(name)')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ success: true, requirements: data });
});

// POST /api/requirements
requirementsRouter.post(
  '/',
  requireAuth,
  validateBody(requirementSchema),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('requirements')
      .insert({ ...req.body, user_id: req.user!.id, status: 'OPEN' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, requirement: data });
  }
);

// PATCH /api/requirements/:id
requirementsRouter.patch(
  '/:id',
  requireAuth,
  validateBody(requirementSchema.partial()),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('requirements')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) throw new NotFoundError('Requirement');
    if (existing.user_id !== req.user!.id) throw new ForbiddenError();

    const { data, error } = await supabase
      .from('requirements')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, requirement: data });
  }
);

// DELETE /api/requirements/:id
requirementsRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('requirements')
    .select('id, user_id, status')
    .eq('id', req.params.id)
    .single();

  if (!existing) throw new NotFoundError('Requirement');
  if (existing.user_id !== req.user!.id) throw new ForbiddenError();

  await supabase.from('requirements').update({ status: 'CANCELLED' }).eq('id', req.params.id);
  res.json({ success: true });
});
