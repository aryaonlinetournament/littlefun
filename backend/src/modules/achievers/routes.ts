import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';

export const achieversRouter = Router();

export interface TopAchiever {
  id: string;
  rank_num: number;
  name: string;
  avatar_url: string;
  city: string;
  meetups_count: string;
  rating: string;
  earnings_amount: string;
  is_active: boolean;
  created_at: string;
}

// In-memory initial 5 Top Achievers store
let memoryAchievers: TopAchiever[] = [
  {
    id: 'ach-1',
    rank_num: 1,
    name: 'Priya Sharma',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop',
    city: 'Delhi NCR',
    meetups_count: '34 Meets Completed',
    rating: '4.9 ★',
    earnings_amount: '34 Meets',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ach-2',
    rank_num: 2,
    name: 'Meera Nair',
    avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80&auto=format&fit=crop',
    city: 'Mumbai',
    meetups_count: '47 Meets Completed',
    rating: '5.0 ★',
    earnings_amount: '47 Meets',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ach-3',
    rank_num: 3,
    name: 'Ananya Patel',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80&auto=format&fit=crop',
    city: 'Gurgaon',
    meetups_count: '22 Meets Completed',
    rating: '4.8 ★',
    earnings_amount: '22 Meets',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ach-4',
    rank_num: 4,
    name: 'Simran Kaur',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80&auto=format&fit=crop',
    city: 'Chandigarh',
    meetups_count: '19 Meets Completed',
    rating: '4.9 ★',
    earnings_amount: '19 Meets',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ach-5',
    rank_num: 5,
    name: 'Riya Sen',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80&auto=format&fit=crop',
    city: 'Bengaluru',
    meetups_count: '28 Meets Completed',
    rating: '4.7 ★',
    earnings_amount: '28 Meets',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

// Helper to sort by rank
const getSortedAchievers = () => [...memoryAchievers].sort((a, b) => a.rank_num - b.rank_num);

// ── GET /api/achievers (Public) ──────────────────────────────────
achieversRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'top_achievers')
      .maybeSingle();

    if (configData?.value && Array.isArray(configData.value) && configData.value.length > 0) {
      res.json({ success: true, achievers: configData.value.filter((a: any) => a.is_active !== false) });
      return;
    }

    const { data: dbAchievers, error } = await supabase
      .from('top_achievers')
      .select('*')
      .eq('is_active', true)
      .order('rank_num', { ascending: true });

    if (!error && dbAchievers && dbAchievers.length > 0) {
      res.json({ success: true, achievers: dbAchievers });
      return;
    }
  } catch (e) {
    console.warn('top_achievers DB fetch fallback to memory:', e);
  }

  res.json({ success: true, achievers: getSortedAchievers().filter((a) => a.is_active) });
});

// ── GET /api/admin/achievers (Admin) ──────────────────────────────
export const adminAchieversRouter = Router();
adminAchieversRouter.use(requireAuth, requireAdmin);

adminAchieversRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'top_achievers')
      .maybeSingle();

    if (configData?.value && Array.isArray(configData.value) && configData.value.length > 0) {
      res.json({ success: true, achievers: configData.value });
      return;
    }

    const { data: dbAchievers, error } = await supabase
      .from('top_achievers')
      .select('*')
      .order('rank_num', { ascending: true });

    if (!error && dbAchievers) {
      res.json({ success: true, achievers: dbAchievers });
      return;
    }
  } catch (e) {
    console.warn('Admin top_achievers DB fetch fallback:', e);
  }

  res.json({ success: true, achievers: getSortedAchievers() });
});

// ── POST /api/admin/achievers (Create) ────────────────────────────
adminAchieversRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { name, avatar_url, city, meetups_count, rating, earnings_amount, rank_num } = req.body;

  if (!name || !city || !earnings_amount) {
    res.status(400).json({ success: false, error: { message: 'Name, city, and earnings amount are required' } });
    return;
  }

  const newAchiever: TopAchiever = {
    id: `ach-${Date.now()}`,
    rank_num: Number(rank_num) || memoryAchievers.length + 1,
    name,
    avatar_url: avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80&auto=format&fit=crop',
    city,
    meetups_count: meetups_count || '10 Meetups',
    rating: rating || '4.9 ★',
    earnings_amount,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data: configData } = await supabase.from('app_config').select('value').eq('key', 'top_achievers').maybeSingle();
    const currentList: any[] = Array.isArray(configData?.value) ? configData.value : [...memoryAchievers];
    const updatedList = [...currentList, newAchiever].sort((a, b) => (a.rank_num || 0) - (b.rank_num || 0));
    await supabase.from('app_config').upsert({
      key: 'top_achievers',
      value: updatedList,
      description: 'Hall of fame top activity achievers list',
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    memoryAchievers.unshift(newAchiever);
    res.json({ success: true, achiever: newAchiever });
    return;
  } catch (e) {
    console.warn('DB insert fallback:', e);
  }

  memoryAchievers.push(newAchiever);
  res.json({ success: true, achiever: newAchiever });
});

// ── PUT /api/admin/achievers/:id (Update) ──────────────────────────
adminAchieversRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  let updatedAchiever: TopAchiever | null = null;
  memoryAchievers = memoryAchievers.map((a) => {
    if (a.id === id) {
      const u: TopAchiever = { ...a, ...updates };
      updatedAchiever = u;
      return u;
    }
    return a;
  });

  try {
    const supabase = getSupabaseAdmin();
    const { data: configData } = await supabase.from('app_config').select('value').eq('key', 'top_achievers').maybeSingle();
    const currentList: any[] = Array.isArray(configData?.value) ? configData.value : [...memoryAchievers];
    const updatedList = currentList.map((a) => (a.id === id ? { ...a, ...updates } : a)).sort((a, b) => (a.rank_num || 0) - (b.rank_num || 0));
    await supabase.from('app_config').upsert({
      key: 'top_achievers',
      value: updatedList,
      description: 'Hall of fame top activity achievers list',
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    res.json({ success: true, achiever: updatedAchiever || { id, ...updates } });
    return;
  } catch (e) {
    console.warn('DB update fallback:', e);
  }

  res.json({ success: true, achiever: updatedAchiever });
});

// ── DELETE /api/admin/achievers/:id (Delete) ───────────────────────
adminAchieversRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  memoryAchievers = memoryAchievers.filter((a) => a.id !== id);

  try {
    const supabase = getSupabaseAdmin();
    const { data: configData } = await supabase.from('app_config').select('value').eq('key', 'top_achievers').maybeSingle();
    const currentList: any[] = Array.isArray(configData?.value) ? configData.value : [...memoryAchievers];
    const updatedList = currentList.filter((a) => a.id !== id);
    await supabase.from('app_config').upsert({
      key: 'top_achievers',
      value: updatedList,
      description: 'Hall of fame top activity achievers list',
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.warn('DB delete fallback:', e);
  }

  res.json({ success: true, message: 'Achiever deleted successfully' });
});
