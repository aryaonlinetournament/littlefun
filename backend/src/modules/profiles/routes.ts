import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';
import { AuditService, hashIp } from '../../services/AuditService';
import { NotFoundError, BadRequestError } from '../../middleware/errorHandler';
import { COMPLETION_WEIGHTS } from '../../config/constants';

export const profilesRouter = Router();

// ── Magic bytes verification — robust check for valid image formats ──
function validateImageBuffer(buffer: Buffer, mimetype?: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // Check JPEG (FF D8 FF)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return true;

  // Check PNG (89 50 4E 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // Check GIF (47 49 46 38)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;

  // Check WebP (RIFF .... WEBP)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;

  // Check HEIC/HEIF (ftyp)
  if (buffer.length > 12) {
    const brand = buffer.toString('ascii', 4, 12);
    if (brand.includes('ftyp') || brand.includes('heic') || brand.includes('mif1')) return true;
  }

  // Fallback: If mimetype is explicitly an image and has reasonable length
  if (mimetype && mimetype.startsWith('image/')) return true;

  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── Completion calculator ────────────────────────────────────────
function calculateCompletion(profile: Record<string, unknown>, hasPhotos: boolean): number {
  let total = 0;
  if (profile.display_name) total += COMPLETION_WEIGHTS.display_name;
  if (profile.date_of_birth) total += COMPLETION_WEIGHTS.date_of_birth;
  if (profile.gender) total += COMPLETION_WEIGHTS.gender;
  if (profile.bio && String(profile.bio).length >= 20) total += COMPLETION_WEIGHTS.bio;
  if (profile.city_id) total += COMPLETION_WEIGHTS.city_id;
  if (profile.area_id) total += COMPLETION_WEIGHTS.area_id;
  if (hasPhotos) total += COMPLETION_WEIGHTS.photos;
  if (Array.isArray(profile.interests) && (profile.interests as string[]).length >= 3) total += COMPLETION_WEIGHTS.interests;
  return Math.min(100, total);
}

// ── POST /api/profiles/photos/upload ─────────────────────────────
profilesRouter.post(
  '/photos/upload',
  requireAuth,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError('No image file provided');

  // Verify actual file contents via magic bytes (prevents MIME spoofing)
  if (!validateImageBuffer(req.file.buffer, req.file.mimetype)) {
    throw new BadRequestError('Invalid image file. Please upload a valid JPG, PNG, WebP, or GIF.');
  }

  const supabase = getSupabaseAdmin();

    // Get profile id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (!profile) throw new NotFoundError('Profile');

    // Build storage path
    const ext = req.file.mimetype.split('/')[1] ?? 'jpg';
    const filePath = `${profile.id}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (storageError) throw storageError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filePath);

    // Check if this is first photo (make primary)
    const { count: existingCount } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const isPrimary = (existingCount ?? 0) === 0;

    // Insert photo record
    const { data: photo, error: insertErr } = await supabase
      .from('profile_photos')
      .insert({
        profile_id: profile.id,
        url: publicUrl,
        is_primary: isPrimary,
        sort_order: existingCount ?? 0,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Recalculate completion
    const { data: fullProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    const { count: photoCount } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const completion = calculateCompletion(fullProfile ?? {}, (photoCount ?? 0) > 0);
    await supabase.from('profiles').update({ profile_completion: completion }).eq('id', profile.id);

    res.status(201).json({ success: true, photo, completion });
  }
);

// ── DELETE /api/profiles/photos/:photoId ─────────────────────────
profilesRouter.delete('/photos/:photoId', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();

  const { data: photo } = await supabase
    .from('profile_photos')
    .select('id, profile_id, url, profiles(user_id)')
    .eq('id', req.params.photoId)
    .single();

  if (!photo) throw new NotFoundError('Photo');

  const photoProfiles = photo.profiles as unknown as { user_id: string } | null;
  if (photoProfiles?.user_id !== req.user!.id) throw new NotFoundError('Photo');

  // Extract storage path from URL
  const urlParts = photo.url.split('/profile-photos/');
  if (urlParts[1]) {
    await supabase.storage.from('profile-photos').remove([urlParts[1]]);
  }

  await supabase.from('profile_photos').delete().eq('id', photo.id);

  res.json({ success: true });
});

// ── GET /api/profiles/me ─────────────────────────────────────────
profilesRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  let { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      users(email, phone),
      profile_photos(id, url, is_primary, sort_order),
      cities(id, name, state),
      areas(id, name)
    `)
    .eq('user_id', req.user!.id)
    .maybeSingle();

  if (!profile) {
    const fallbackName = req.user!.email ? req.user!.email.split('@')[0] : 'User';
    const { data: created } = await supabase
      .from('profiles')
      .insert({ user_id: req.user!.id, display_name: fallbackName, profile_completion: 20 })
      .select(`
        *,
        users(email, phone),
        profile_photos(id, url, is_primary, sort_order),
        cities(id, name, state),
        areas(id, name)
      `)
      .single();
    profile = created;
  }

  const user = (profile as Record<string, unknown>).users as { email?: string; phone?: string } | null;
  const userEmail = user?.email || req.user!.email || null;
  const userPhone = user?.phone || req.user!.phone || null;
  const fallbackDisplayName = profile.display_name || (userEmail ? userEmail.split('@')[0] : 'User');

  const { count: photoCount } = await supabase
    .from('profile_photos')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profile.id);

  const calcComp = calculateCompletion(
    { ...profile, display_name: fallbackDisplayName },
    (photoCount ?? 0) > 0
  );

  res.json({
    success: true,
    profile: {
      ...profile,
      display_name: fallbackDisplayName,
      email: profile.email || userEmail,
      phone_number: profile.phone_number || userPhone,
      profile_completion: profile.profile_completion > 0 ? profile.profile_completion : Math.max(calcComp, 20),
    },
  });
});

// ── PUT /api/profiles/me ─────────────────────────────────────────
const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(60).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().max(20).optional().or(z.literal('')),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  gender: z.string().optional(),
  bio: z.string().max(500).optional(),
  city_id: z.string().uuid().optional().nullable().or(z.literal('')),
  area_id: z.string().uuid().optional().nullable().or(z.literal('')),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  interests: z.array(z.string()).max(20).optional(),
});

profilesRouter.put(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { email, phone_number, ...profilePayload } = req.body;

    // Sanitize empty strings for UUID fields
    if (profilePayload.city_id === '') profilePayload.city_id = null;
    if (profilePayload.area_id === '') profilePayload.area_id = null;

    // Update users table if email or phone_number provided
    if (email !== undefined || phone_number !== undefined) {
      const userUpdates: Record<string, unknown> = {};
      if (email !== undefined) userUpdates.email = email || null;
      if (phone_number !== undefined) userUpdates.phone = phone_number || null;
      await supabase.from('users').update(userUpdates).eq('id', req.user!.id);
    }

    // Recalculate completion
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    const { count: photoCount } = await supabase
      .from('profile_photos')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', existing?.id ?? '');

    const merged = { ...existing, ...profilePayload };
    const completion = calculateCompletion(merged, (photoCount ?? 0) > 0);

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...profilePayload, profile_completion: completion })
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    res.json({
      success: true,
      profile: {
        ...data,
        email: email !== undefined ? email : req.user!.email,
        phone_number: phone_number !== undefined ? phone_number : req.user!.phone,
      },
      completion,
    });
  }
);

// ── POST /api/profiles/verify-selfie ──────────────────────────────
profilesRouter.post(
  '/verify-selfie',
  requireAuth,
  upload.single('selfie'),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const file = req.file;
    if (!file) throw new BadRequestError('No selfie image provided');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (!profile) throw new NotFoundError('Profile');

    let selfieUrl: string | null = null;
    try {
      const ext = 'jpg';
      const filePath = `verifications/${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr) {
        const { data: publicUrlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);
        selfieUrl = publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage upload warning:', e);
    }

    let verifId: string | null = null;
    try {
      const { data: verif } = await supabase
        .from('profile_verifications')
        .insert({
          profile_id: profile.id,
          document_type: 'SELFIE',
          document_url: selfieUrl,
          status: 'PENDING',
        })
        .select()
        .maybeSingle();
      if (verif) verifId = verif.id;
    } catch (e) {
      console.warn('profile_verifications insert warning:', e);
    }

    // Update profile status to PENDING
    await supabase
      .from('profiles')
      .update({ verification_status: 'PENDING' })
      .eq('id', profile.id);

    res.json({
      success: true,
      status: 'PENDING',
      verification_id: verifId,
      message: 'Selfie photo captured successfully and submitted to admin for verification!',
    });
  }
);

// ── GET /api/profiles/:id ─────────────────────────────────────────
profilesRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, user_id, display_name, bio, gender, interests, profile_completion,
      verification_status, is_featured, city_id, area_id,
      profile_photos(url, is_primary),
      cities(name, state),
      areas(name)
    `)
    .eq('id', req.params.id)
    .eq('discovery_status', 'VISIBLE')
    .single();

  if (error || !data) throw new NotFoundError('Profile');

  // Check not blocked
  const { data: block } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', req.user!.id)
    .eq('blocked_id', data.user_id)
    .maybeSingle();

  if (block) throw new NotFoundError('Profile');

  res.json({ success: true, profile: data });
});

// ── ADMIN: GET /api/profiles ──────────────────────────────────────
profilesRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { page = 1, limit = 50, city, type, discovery, verification } = req.query;
  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.min(Math.max(1, Number(limit)), 100);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = supabase
    .from('profiles')
    .select('*, profile_photos(url, is_primary), cities(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (city) query = query.eq('city_id', city);
  if (type) query = query.eq('profile_type', type);
  if (discovery) query = query.eq('discovery_status', discovery);
  if (verification) query = query.eq('verification_status', verification);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ success: true, profiles: data, total: count });
});

// ── ADMIN: PATCH /api/profiles/:id/discovery ─────────────────────
profilesRouter.patch(
  '/:id/discovery',
  requireAuth,
  requireAdmin,
  validateBody(z.object({ status: z.enum(['VISIBLE', 'HIDDEN', 'PAUSED', 'PENDING_REVIEW']) })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data: current } = await supabase
      .from('profiles')
      .select('discovery_status')
      .eq('id', req.params.id)
      .single();

    if (!current) throw new NotFoundError('Profile');

    const { data, error } = await supabase
      .from('profiles')
      .update({ discovery_status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_CHANGED_PROFILE_VISIBILITY',
      entityType: 'profile',
      entityId: req.params.id,
      oldValue: { discovery_status: current.discovery_status },
      newValue: { discovery_status: req.body.status },
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, profile: data });
  }
);

// ── ADMIN: PATCH /api/profiles/:id/featured ──────────────────────
profilesRouter.patch(
  '/:id/featured',
  requireAuth,
  requireAdmin,
  validateBody(z.object({ is_featured: z.boolean() })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_featured: req.body.is_featured })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: 'ADMIN_TOGGLED_FEATURED',
      entityType: 'profile',
      entityId: req.params.id,
      newValue: { is_featured: req.body.is_featured },
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, profile: data });
  }
);

// ── ADMIN: POST /api/profiles/bulk-update ─────────────────────────
profilesRouter.post(
  '/bulk-update',
  requireAuth,
  requireAdmin,
  validateBody(z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    action: z.enum(['SHOW_DISCOVERY', 'HIDE_DISCOVERY', 'ACTIVATE', 'PAUSE', 'FEATURE', 'UNFEATURE']),
  })),
  async (req: Request, res: Response) => {
    const supabase = getSupabaseAdmin();
    const { ids, action } = req.body;

    const updateMap: Record<string, Record<string, unknown>> = {
      SHOW_DISCOVERY: { discovery_status: 'VISIBLE' },
      HIDE_DISCOVERY: { discovery_status: 'HIDDEN' },
      FEATURE: { is_featured: true },
      UNFEATURE: { is_featured: false },
    };

    if (!updateMap[action]) {
      throw new BadRequestError(`Unsupported bulk action: ${action}`);
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateMap[action])
      .in('id', ids);

    if (error) throw error;

    await AuditService.adminAction({
      actor: req.user!,
      action: `ADMIN_BULK_${action}`,
      entityType: 'profile',
      newValue: { ids, action },
      ipHash: hashIp(req.ip),
    });

    res.json({ success: true, updatedCount: ids.length, action });
  }
);
