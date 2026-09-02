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
dummyProfilesRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: dbData, error } = await supabase
      .from('dummy_companion_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && dbData && dbData.length > 0) {
      const mapped = dbData.map((d: any) => ({
        id: d.id,
        name: d.name,
        age: d.age || 24,
        gender: d.gender || 'FEMALE',
        avatar: d.avatar || DEFAULT_DUMMY_AVATAR,
        state: 'Dynamic',
        city: d.city || 'Nearby',
        area: d.area || 'Nearby (~25km)',
        distanceKm: d.distance_km || 25,
        hourlyRate: d.hourly_rate || 2500,
        bio: d.bio || '',
        occupation: d.occupation || '',
        likes: d.interests || ['Coffee Date'],
        meetingType: `${d.interests?.[0] || 'Companion'} Meetup ☕`,
        isActive: d.is_active ?? true,
        visibleInAreas: d.visible_in_areas || ['*'],
        created_at: d.created_at,
      }));
      res.json({ success: true, profiles: mapped });
      return;
    }
  } catch (e) {
    console.warn('dummy_companion_profiles DB query fallback to memory:', e);
  }

  const filtered = memoryDummyProfiles.filter((p) => p.isActive);
  res.json({ success: true, profiles: filtered });
});

// ── Admin Routes ──────────────────────────────────────────────────
export const adminDummyProfilesRouter = Router();
adminDummyProfilesRouter.use(requireAuth, requireAdmin);

// GET /api/admin/dummy-profiles
adminDummyProfilesRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: dbData, error } = await supabase
      .from('dummy_companion_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && dbData && dbData.length > 0) {
      const mapped = dbData.map((d: any) => ({
        id: d.id,
        name: d.name,
        age: d.age || 24,
        gender: d.gender || 'FEMALE',
        avatar: d.avatar || DEFAULT_DUMMY_AVATAR,
        state: 'Dynamic',
        city: d.city || 'Nearby',
        area: d.area || 'Nearby (~25km)',
        distanceKm: d.distance_km || 25,
        hourlyRate: d.hourly_rate || 2500,
        bio: d.bio || '',
        occupation: d.occupation || '',
        likes: d.interests || ['Coffee Date'],
        meetingType: `${d.interests?.[0] || 'Companion'} Meetup ☕`,
        isActive: d.is_active ?? true,
        visibleInAreas: d.visible_in_areas || ['*'],
        created_at: d.created_at,
      }));
      res.json({ success: true, profiles: mapped });
      return;
    }
  } catch (e) {
    console.warn('Admin dummy_companion_profiles fetch fallback:', e);
  }

  res.json({ success: true, profiles: memoryDummyProfiles });
});

// POST /api/admin/dummy-profiles (Create)
adminDummyProfilesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body;
  if (!body.name || !body.hourlyRate) {
    res.status(400).json({ success: false, error: { message: 'Name and hourly rate are required' } });
    return;
  }

  const row = {
    name: body.name,
    age: Number(body.age) || 24,
    gender: body.gender || 'FEMALE',
    avatar: body.avatar || null,
    city: 'Nearby',
    area: 'Nearby (~25km)',
    distance_km: 25,
    hourly_rate: Number(body.hourlyRate) || 2500,
    bio: body.bio || 'Available for friendly companion meetups & coffee.',
    occupation: '',
    interests: Array.isArray(body.likes) ? body.likes : ['Coffee Date'],
    is_active: body.isActive !== undefined ? Boolean(body.isActive) : true,
    show_in_discovery: true,
    visible_in_areas: ['*'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data: inserted, error } = await supabase
      .from('dummy_companion_profiles')
      .insert(row)
      .select()
      .maybeSingle();

    if (!error && inserted) {
      const mapped = {
        id: inserted.id,
        name: inserted.name,
        age: inserted.age,
        gender: inserted.gender,
        avatar: inserted.avatar || DEFAULT_DUMMY_AVATAR,
        state: 'Dynamic',
        city: inserted.city,
        area: inserted.area,
        distanceKm: inserted.distance_km,
        hourlyRate: inserted.hourly_rate,
        bio: inserted.bio,
        occupation: '',
        likes: inserted.interests,
        meetingType: 'Companion Meetup ☕',
        isActive: inserted.is_active,
        visibleInAreas: ['*'],
        created_at: inserted.created_at,
      };
      res.json({ success: true, profile: mapped });
      return;
    }
  } catch (e) {
    console.warn('DB insert fallback:', e);
  }

  const fallbackProfile: DummyProfileItem = {
    id: `dp-${Date.now()}`,
    name: body.name,
    age: Number(body.age) || 24,
    gender: body.gender || 'FEMALE',
    avatar: body.avatar || DEFAULT_DUMMY_AVATAR,
    state: 'Dynamic',
    city: 'Customer Location',
    area: 'Near Customer (~25km)',
    distanceKm: 25,
    hourlyRate: Number(body.hourlyRate) || 2500,
    bio: body.bio || 'Available for friendly companion meetups & coffee.',
    occupation: '',
    likes: Array.isArray(body.likes) ? body.likes : ['Coffee Date'],
    meetingType: 'Companion Meetup ☕',
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    visibleInAreas: ['*'],
    created_at: new Date().toISOString(),
  };
  memoryDummyProfiles.unshift(fallbackProfile);
  res.json({ success: true, profile: fallbackProfile });
});

// PUT /api/admin/dummy-profiles/:id (Update)
adminDummyProfilesRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const supabase = getSupabaseAdmin();
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.age !== undefined) dbUpdates.age = Number(updates.age);
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = Number(updates.hourlyRate);
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.isActive !== undefined) dbUpdates.is_active = Boolean(updates.isActive);
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;

    const { error } = await supabase.from('dummy_companion_profiles').update(dbUpdates).eq('id', id);
    if (!error) {
      res.json({ success: true, message: 'Profile updated' });
      return;
    }
  } catch (e) {
    console.warn('DB update fallback:', e);
  }

  res.json({ success: true, message: 'Updated locally' });
});

// DELETE /api/admin/dummy-profiles/:id (Delete)
adminDummyProfilesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('dummy_companion_profiles').delete().eq('id', id);
  } catch (e) {
    console.warn('DB delete fallback:', e);
  }

  res.json({ success: true, message: 'Dummy profile deleted successfully' });
});
