import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { before, limit = 30 } = req.query;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (before) query = query.lt('created_at', before as string);

  const { data, error } = await query;
  if (error) throw error;

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user!.id)
    .is('read_at', null);

  res.json({ success: true, notifications: data, unreadCount: unreadCount ?? 0 });
});

// POST /api/notifications/read-all
notificationsRouter.post('/read-all', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', req.user!.id)
    .is('read_at', null);

  res.json({ success: true });
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user!.id);

  res.json({ success: true });
});
