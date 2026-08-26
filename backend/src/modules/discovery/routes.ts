import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validateQuery } from '../../middleware/validation';
import { MatchingService } from '../../services/matching/MatchingService';
import { EntitlementService } from '../../services/EntitlementService';
import { getSupabaseAdmin } from '../../services/supabase/supabaseClient';

export const discoveryRouter = Router();

const discoveryQuerySchema = z.object({
  city_id: z.string().uuid().optional(),
  area_id: z.string().uuid().optional(),
  requirement_id: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(25),
});

/**
 * GET /api/discovery
 * Returns eligibility-filtered, scored, ranked profiles for the authenticated user.
 * Score is always computed server-side.
 */
discoveryRouter.get(
  '/',
  requireAuth,
  validateQuery(discoveryQuerySchema),
  async (req: Request, res: Response) => {
    const user = req.user!;
    const { city_id, requirement_id } = req.query as unknown as z.infer<typeof discoveryQuerySchema>;

    // Check profile completion
    const supabase = getSupabaseAdmin();
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('profile_completion, city_id')
      .eq('user_id', user.id)
      .single();

    const { data: config } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'discovery_min_completion_pct')
      .single();

    const minCompletion = Number(config?.value ?? 50);

    if (!myProfile || myProfile.profile_completion < minCompletion) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PROFILE_INCOMPLETE',
          message: `Complete at least ${minCompletion}% of your profile to start discovering.`,
          completionRequired: minCompletion,
          currentCompletion: myProfile?.profile_completion ?? 0,
        },
      });
      return;
    }

    // Get plan limits
    const discoveryLimit = await EntitlementService.getDiscoveryLimit(user);

    // Fetch requirement context if provided
    let requirementContext;
    if (requirement_id) {
      const { data: req_ } = await supabase
        .from('requirements')
        .select('city_id, area_id, requested_date, start_time, end_time, requirement_type')
        .eq('id', requirement_id)
        .eq('user_id', user.id)
        .single();

      if (req_) {
        requirementContext = {
          cityId: req_.city_id,
          areaId: req_.area_id,
          requestedDate: req_.requested_date,
          startTime: req_.start_time,
          endTime: req_.end_time,
          requirementType: req_.requirement_type,
        };
      }
    }

    // Run matching engine
    const results = await MatchingService.findCandidates(user, {
      limit: Math.min(discoveryLimit, 25),
      cityId: city_id ?? myProfile.city_id ?? undefined,
      requirement: requirementContext,
    });

    // Enrich with photos (batch query)
    const profileIds = results.map((r) => r.profileId);
    const { data: photos } = await supabase
      .from('profile_photos')
      .select('profile_id, url, is_primary')
      .in('profile_id', profileIds)
      .eq('moderated', true);

    const photoMap = new Map<string, string[]>();
    (photos || []).forEach((p: { profile_id: string; url: string; is_primary: boolean }) => {
      const arr = photoMap.get(p.profile_id) || [];
      if (p.is_primary) arr.unshift(p.url);
      else arr.push(p.url);
      photoMap.set(p.profile_id, arr);
    });

    const enriched = results.map((r) => ({
      ...r,
      photos: photoMap.get(r.profileId) || [],
    }));

    res.json({
      success: true,
      profiles: enriched,
      total: enriched.length,
      planLimit: discoveryLimit,
    });
  }
);

/**
 * GET /api/discovery/cities — Available cities for filter UI
 */
discoveryRouter.get('/cities', requireAuth, async (_req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, state, areas(id, name)')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  res.json({ success: true, cities: data });
});
