import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';

export const dummyProfilesRouter = Router();

export interface DummyProfileItem {
  id: string;
  name: string;
  age: number;
  gender: string;
  avatar: string;
  state: string;
  city: string;
  area: string;
  distanceKm: number;
  hourlyRate: number;
  bio: string;
  occupation: string;
  likes: string[];
  meetingType: string;
  isActive: boolean;
  visibleInAreas: string[];
  created_at?: string;
}

const DEFAULT_DUMMY_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%23EC4899'/><circle cx='50' cy='38' r='20' fill='%23FFFFFF'/><path d='M20 85 c0-20 15-30 30-30 s30 10 30 30' fill='%23FFFFFF'/></svg>";

// Initial 4 default dummy profiles in memory
let memoryDummyProfiles: DummyProfileItem[] = [
  {
    id: 'dp-1',
    name: 'Priya Sharma',
    age: 24,
    gender: 'FEMALE',
    avatar: DEFAULT_DUMMY_AVATAR,
    state: 'Delhi NCR',
    city: 'Delhi',
    area: 'Connaught Place',
    distanceKm: 25,
    hourlyRate: 2500,
    bio: 'Coffee walks, art galleries & tech networking in CP / South Delhi.',
    occupation: 'UI/UX Designer',
    likes: ['Coffee Date', 'Tech Talks', 'Art Galleries'],
    meetingType: 'Coffee Date & Tech Talks ☕',
    isActive: true,
    visibleInAreas: ['Connaught Place', 'Hauz Khas', 'Saket'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'dp-2',
    name: 'Meera Nair',
    age: 26,
    gender: 'FEMALE',
    avatar: DEFAULT_DUMMY_AVATAR,
    state: 'Maharashtra',
    city: 'Mumbai',
    area: 'Bandra West',
    distanceKm: 32,
    hourlyRate: 3500,
    bio: 'Foodie, concert lover, and spontaneous city explorer.',
    occupation: 'Marketing Manager',
    likes: ['Concerts', 'Fine Dining', 'City Walks'],
    meetingType: 'Concert & Fine Dining 🎵',
    isActive: true,
    visibleInAreas: ['Bandra West', 'Juhu', 'Lower Parel'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'dp-3',
    name: 'Ananya Patel',
    age: 23,
    gender: 'FEMALE',
    avatar: DEFAULT_DUMMY_AVATAR,
    state: 'Haryana',
    city: 'Gurgaon',
    area: 'DLF Cyber City',
    distanceKm: 45,
    hourlyRate: 2800,
    bio: 'Yoga instructor & tech enthusiast. Love weekend coffee dates.',
    occupation: 'Yoga Instructor',
    likes: ['Yoga', 'Weekend Trips', 'Fitness'],
    meetingType: 'Fitness & Travel ✈️',
    isActive: true,
    visibleInAreas: ['DLF Cyber City', 'Golf Course Road'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'dp-4',
    name: 'Riya Kapoor',
    age: 25,
    gender: 'FEMALE',
    avatar: DEFAULT_DUMMY_AVATAR,
    state: 'Karnataka',
    city: 'Bangalore',
    area: 'Koramangala',
    distanceKm: 28,
    hourlyRate: 3000,
    bio: 'Exploring fine dining spots and shopping in Koramangala.',
    occupation: 'Fashion Stylist',
    likes: ['Shopping', 'Fine Dining', 'Movies'],
    meetingType: 'Shopping & Dinner 🍽️',
    isActive: true,
    visibleInAreas: ['Koramangala', 'Indiranagar'],
    created_at: new Date().toISOString(),
  },
];

// ── GET /api/dummy-profiles (Public Customer Endpoint) ────────────
dummyProfilesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const { state } = req.query;

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('dummy_profiles').select('*').eq('is_active', true);
    if (state && state !== 'ALL') {
      query = query.ilike('state', `%${state}%`);
    }
    const { data: dbData, error } = await query;
    if (!error && dbData && dbData.length > 0) {
      res.json({ success: true, profiles: dbData });
      return;
    }
  } catch (e) {
    console.warn('dummy_profiles DB query fallback to memory:', e);
  }

  let filtered = memoryDummyProfiles.filter((p) => p.isActive);
  if (state && state !== 'ALL') {
    const searchState = String(state).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.state.toLowerCase().includes(searchState) ||
        p.city.toLowerCase().includes(searchState) ||
        p.area.toLowerCase().includes(searchState)
    );
  }

  res.json({ success: true, profiles: filtered });
});

// ── Admin Routes ──────────────────────────────────────────────────
export const adminDummyProfilesRouter = Router();
adminDummyProfilesRouter.use(requireAuth, requireAdmin);

// GET /api/admin/dummy-profiles
adminDummyProfilesRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: dbData, error } = await supabase.from('dummy_profiles').select('*').order('created_at', { ascending: false });
    if (!error && dbData && dbData.length > 0) {
      res.json({ success: true, profiles: dbData });
      return;
    }
  } catch (e) {
    console.warn('Admin dummy_profiles fetch fallback:', e);
  }

  res.json({ success: true, profiles: memoryDummyProfiles });
});

// POST /api/admin/dummy-profiles (Create)
adminDummyProfilesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body;
  if (!body.name || !body.city || !body.hourlyRate) {
    res.status(400).json({ success: false, error: { message: 'Name, city, and hourly rate are required' } });
    return;
  }

  const newProfile: DummyProfileItem = {
    id: `dp-${Date.now()}`,
    name: body.name,
    age: Number(body.age) || 24,
    gender: body.gender || 'FEMALE',
    avatar: body.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80&auto=format&fit=crop',
    state: body.state || 'Delhi NCR',
    city: body.city || 'Delhi',
    area: body.area || 'Connaught Place',
    distanceKm: Number(body.distanceKm) || 25,
    hourlyRate: Number(body.hourlyRate) || 2500,
    bio: body.bio || '',
    occupation: body.occupation || 'Software Engineer',
    likes: Array.isArray(body.likes) ? body.likes : ['Coffee Date'],
    meetingType: body.meetingType || `${body.area || body.city} Meetup ☕`,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    visibleInAreas: [body.area || body.city],
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase.from('dummy_profiles').insert(newProfile).select().maybeSingle();
    if (!error && inserted) {
      memoryDummyProfiles.unshift(inserted as DummyProfileItem);
      res.json({ success: true, profile: inserted });
      return;
    }
  } catch (e) {
    console.warn('DB insert fallback:', e);
  }

  memoryDummyProfiles.unshift(newProfile);
  res.json({ success: true, profile: newProfile });
});

// PUT /api/admin/dummy-profiles/:id (Update)
adminDummyProfilesRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  let updated: DummyProfileItem | null = null;
  memoryDummyProfiles = memoryDummyProfiles.map((p) => {
    if (p.id === id) {
      updated = { ...p, ...updates };
      return updated!;
    }
    return p;
  });

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('dummy_profiles').update(updates).eq('id', id);
  } catch (e) {
    console.warn('DB update fallback:', e);
  }

  res.json({ success: true, profile: updated });
});

// DELETE /api/admin/dummy-profiles/:id (Delete)
adminDummyProfilesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  memoryDummyProfiles = memoryDummyProfiles.filter((p) => p.id !== id);

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('dummy_profiles').delete().eq('id', id);
  } catch (e) {
    console.warn('DB delete fallback:', e);
  }

  res.json({ success: true, message: 'Dummy profile deleted' });
});
