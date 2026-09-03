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

  // Auto-promote ONLY super admin email
  if (user.email?.toLowerCase().trim() === 'aryaonlinetournament@gmail.com') {
    await supabase.from('users').update({ role: 'SUPER_ADMIN', status: 'ACTIVE' }).eq('id', user.id);
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
 * POST /api/auth/register-client
 * Complete client registration with personal details and photo verification.
 * Sets account status to PENDING until approved by admin.
 */
const registerClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().min(18, 'Must be at least 18 years old').max(100),
  gender: z.string().optional(),
  interestedIn: z.string().optional(),
  city: z.string().optional(),
  cityId: z.string().uuid().optional(),
  interests: z.array(z.string()).optional(),
  phone: z.string().optional(),
  selfieUrl: z.string().optional(),
  bio: z.string().optional(),
});

authRouter.post('/register-client', requireAuth, validateBody(registerClientSchema), async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const user = req.user!;
  const { name, age, gender, interestedIn, cityId, city, interests = [], phone, selfieUrl, bio } = req.body;

  // 1. Ensure user is in PENDING state (unless super admin) and save phone
  const userUpdates: Record<string, any> = {};
  if (phone && typeof phone === 'string' && phone.trim().length > 0) {
    userUpdates.phone = phone.trim().replace(/[^0-9+]/g, '');
  }
  if (user.role !== 'SUPER_ADMIN') {
    userUpdates.status = 'PENDING';
  }
  if (Object.keys(userUpdates).length > 0) {
    await supabase.from('users').update(userUpdates).eq('id', user.id);
  }

  // 2. Resolve city and compute date_of_birth from age
  let resolvedCityId = cityId || null;
  if (!resolvedCityId && city && typeof city === 'string' && city.trim().length > 0) {
    const cityName = city.split(',')[0].trim();
    const stateName = city.split(',')[1]?.trim() || null;
    try {
      const { data: existingCity } = await supabase
        .from('cities')
        .select('id')
        .ilike('name', cityName)
        .maybeSingle();

      if (existingCity) {
        resolvedCityId = existingCity.id;
      } else {
        const { data: newCity } = await supabase
          .from('cities')
          .insert({ name: cityName, state: stateName, is_active: true })
          .select('id')
          .maybeSingle();
        if (newCity) resolvedCityId = newCity.id;
      }
    } catch (cityErr) {
      console.warn('City resolution error:', cityErr);
    }
  }

  let dateOfBirth: string | null = null;
  if (age && Number(age) >= 18) {
    const birthYear = new Date().getFullYear() - Number(age);
    dateOfBirth = `${birthYear}-01-15`;
  }

  // 3. Check or create/update profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let profileId = existingProfile?.id;

  const profileData = {
    display_name: name,
    age: Number(age) || null,
    date_of_birth: dateOfBirth,
    gender: gender || null,
    interests: interests,
    bio: bio || (city ? `Excited to connect in ${city}.` : `Looking to connect with ${interestedIn || 'people'}.`),
    city_id: resolvedCityId,
    verification_status: 'PENDING',
    discovery_status: 'HIDDEN',
    profile_completion: 75,
  };

  if (profileId) {
    await supabase.from('profiles').update(profileData).eq('id', profileId);
  } else {
    const { data: newProfile, error: profileErr } = await supabase.from('profiles').insert({
      user_id: user.id,
      ...profileData,
    }).select('id').single();

    if (profileErr) throw profileErr;
    profileId = newProfile.id;
  }

  // 3. Process and upload verification photo to storage if base64
  let photoUrl = selfieUrl || 'VERIFIED_ON_DEVICE';
  if (selfieUrl && selfieUrl.startsWith('data:image')) {
    try {
      const base64Data = selfieUrl.split(',')[1];
      const mimeType = selfieUrl.substring(selfieUrl.indexOf(':') + 1, selfieUrl.indexOf(';')) || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = `${profileId}/selfie_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, buffer, { contentType: mimeType, upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
        photoUrl = publicUrl;
      }
    } catch (e) {
      console.warn('Storage upload fallback during registration:', e);
    }
  }

  // 4. Insert verification record safely
  try {
    await supabase.from('profile_verifications').insert({
      profile_id: profileId,
      verification_type: 'SELFIE',
      status: 'PENDING',
      document_path: photoUrl,
      submitted_at: new Date().toISOString(),
    });
  } catch (vErr) {
    console.warn('profile_verifications insert safe fallback:', vErr);
  }

  // 5. Save photo to profile_photos safely
  try {
    await supabase.from('profile_photos').insert({
      profile_id: profileId,
      storage_path: photoUrl,
      url: photoUrl,
      is_primary: true,
      sort_order: 0,
    });
  } catch (pErr) {
    console.warn('profile_photos insert safe fallback:', pErr);
  }

  // 6. Ensure preferences record exists
  await supabase.from('user_preferences').upsert({
    user_id: user.id,
    interested_in_gender: interestedIn || null,
  }, { onConflict: 'user_id' });

  // 6. Fetch updated user unique ID
  const { data: freshUser } = await supabase
    .from('users')
    .select('id, unique_id, status, email')
    .eq('id', user.id)
    .single();

  res.status(201).json({
    success: true,
    message: 'Client registration submitted. Awaiting admin verification.',
    uniqueId: freshUser?.unique_id,
    userId: user.id,
    status: 'PENDING',
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
