import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { EntitlementService } from '../../services/EntitlementService';
import { NotificationService } from '../../services/notifications/NotificationService';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler';

export const matchesRouter = Router();

// ── POST /api/matches/like ───────────────────────────────────────
matchesRouter.post(
  '/like',
  requireAuth,
  validateBody(z.object({ toUserId: z.string().uuid() })),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { toUserId } = req.body;

    if (toUserId === user.id) throw new BadRequestError('Cannot like yourself.');

    // Check daily like limit
    const { allowed, remaining } = await EntitlementService.canLike(user);
    if (!allowed) {
      res.status(429).json({
        success: false,
        error: {
          code: 'LIKE_LIMIT_REACHED',
          message: 'Daily like limit reached. Upgrade your plan for more likes.',
        },
      });
      return;
    }

    const supabase = getSupabaseAdmin();

    // Record the like (upsert to avoid duplicates)
    const { error: likeError } = await supabase
      .from('likes')
      .upsert({ from_user_id: user.id, to_user_id: toUserId }, { onConflict: 'from_user_id,to_user_id' });

    if (likeError) throw likeError;

    // Remove any existing pass
    await supabase
      .from('passes')
      .delete()
      .eq('from_user_id', user.id)
      .eq('to_user_id', toUserId);

    // Check if mutual match was created (by the DB trigger)
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${toUserId}),and(user_a_id.eq.${toUserId},user_b_id.eq.${user.id})`)
      .single();

    let isMatch = false;

    if (match) {
      isMatch = true;

      // Create conversation if not exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('match_id', match.id)
        .maybeSingle();

      if (!existingConv) {
        const { data: conv } = await supabase
          .from('conversations')
          .insert({ match_id: match.id })
          .select()
          .single();

        if (conv) {
          await supabase.from('conversation_members').insert([
            { conversation_id: conv.id, user_id: user.id },
            { conversation_id: conv.id, user_id: toUserId },
          ]);
        }
      }

      // Get names for notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const { data: theirProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', toUserId)
        .single();

      // Notify both parties
      await NotificationService.sendBulk([
        {
          userId: user.id,
          type: 'NEW_MATCH',
          title: "It's a Match! 🎉",
          body: `You and ${theirProfile?.display_name ?? 'someone'} liked each other.`,
          data: { matchId: match.id, type: 'NEW_MATCH' },
        },
        {
          userId: toUserId,
          type: 'NEW_MATCH',
          title: "It's a Match! 🎉",
          body: `You and ${myProfile?.display_name ?? 'someone'} liked each other.`,
          data: { matchId: match.id, type: 'NEW_MATCH' },
        },
      ]);
    }

    res.json({
      success: true,
      isMatch,
      matchId: match?.id ?? null,
      likesRemaining: remaining - 1,
    });
  }
);

// ── POST /api/matches/pass ───────────────────────────────────────
matchesRouter.post(
  '/pass',
  requireAuth,
  validateBody(z.object({ toUserId: z.string().uuid() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    await supabase.from('passes').upsert(
      { from_user_id: req.user!.id, to_user_id: req.body.toUserId },
      { onConflict: 'from_user_id,to_user_id' }
    );
    res.json({ success: true });
  }
);

// ── GET /api/matches — List user's matches ───────────────────────
matchesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, status, created_at,
      user_a:profiles!matches_user_a_id_fkey(id, display_name, profile_photos(url, is_primary)),
      user_b:profiles!matches_user_b_id_fkey(id, display_name, profile_photos(url, is_primary)),
      conversations(id, messages(content, created_at, sender_id))
    `)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Normalize: always return "other" user from caller's perspective
  const matches = (data || []).map((m: Record<string, unknown>) => {
    const isA = (m.user_a as { id: string })?.id === userId;
    const other = isA ? m.user_b : m.user_a;
    return { ...m, otherUser: other, user_a: undefined, user_b: undefined };
  });

  res.json({ success: true, matches });
});

// ── DELETE /api/matches/:id — Unmatch ───────────────────────────
matchesRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;

  const { data: match } = await supabase
    .from('matches')
    .select('id, user_a_id, user_b_id')
    .eq('id', req.params.id)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) throw new NotFoundError('Match');

  await supabase.from('matches').update({ status: 'UNMATCHED' }).eq('id', req.params.id);

  res.json({ success: true, message: 'Unmatched.' });
});
