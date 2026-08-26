import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { verifyFirebaseToken } from '../../services/firebase/firebaseAdmin';
import { BadRequestError } from '../../middleware/errorHandler';

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Called after successful Firebase Auth sign-in.
 * Creates Supabase user + profile stubs if they don't exist.
 * Idempotent — safe to call on every sign-in.
 */
authRouter.post('/register', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const user = req.user!;

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, profile_completion')
    .eq('user_id', user.id)
    .single();

  if (existingProfile) {
    res.json({
      success: true,
      isNewUser: false,
      profile: existingProfile,
      userId: user.id,
      uniqueId: (await supabase.from('users').select('unique_id').eq('id', user.id).single()).data?.unique_id,
    });
    return;
  }

  // Create stub profile
  const displayName = user.email?.split('@')[0] ?? 'User';
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      display_name: displayName,
      profile_completion: 10,
    })
    .select()
    .single();

  if (error) throw error;

  // Create default user preferences
  await supabase.from('user_preferences').insert({ user_id: user.id });

  // Auto-promote super admin email
  if (user.email === 'aryaonlinetournament@gmail.com') {
    await supabase.from('users').update({ role: 'SUPER_ADMIN', status: 'ACTIVE' }).eq('id', user.id);
  } else if (user.status === 'PENDING') {
    await supabase.from('users').update({ status: 'ACTIVE' }).eq('id', user.id);
  }

  const { data: userData } = await supabase.from('users').select('unique_id').eq('id', user.id).single();

  res.status(201).json({
    success: true,
    isNewUser: true,
    profile,
    userId: user.id,
    uniqueId: userData?.unique_id,
  });
});

/**
 * POST /api/auth/verify-token
 * Utility endpoint to verify a Firebase token is valid (for debugging).
 */
authRouter.post(
  '/verify-token',
  validateBody(z.object({ idToken: z.string() })),
  async (req: Request, res: Response) => {
    try {
      const decoded = await verifyFirebaseToken(req.body.idToken);
      res.json({ success: true, uid: decoded.uid, email: decoded.email });
    } catch {
      throw new BadRequestError('Invalid or expired token.');
    }
  }
);
