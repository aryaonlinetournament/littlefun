import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';

export const paymentsRouter = Router();

// GET /api/payments/plans — Public plan listing
paymentsRouter.get('/plans', async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  res.json({ success: true, plans: data });
});

// GET /api/payments/my-subscription
paymentsRouter.get('/my-subscription', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plans(*)')
    .eq('user_id', req.user!.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  res.json({ success: true, subscription: data });
});

// GET /api/payments/history
paymentsRouter.get('/history', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('payments')
    .select('*, plans(name, display_name)')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  res.json({ success: true, payments: data });
});

// NOTE: Payment initiation and webhook handling will be implemented
// when the payment provider is finalized (Razorpay/Stripe/PhonePe).
// The endpoint skeleton is:
//
// POST /api/payments/initiate — Create order, return payment link
// POST /api/payments/webhook — Provider webhook, verify signature, activate subscription

paymentsRouter.post('/initiate', requireAuth, async (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Payment provider integration pending. Contact support to upgrade.',
    },
  });
});
