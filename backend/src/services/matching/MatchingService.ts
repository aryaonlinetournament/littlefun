import { getSupabaseAdmin } from '../supabase/supabaseClient';
import { AuthenticatedUser } from '../../middleware/auth';

interface MatchWeights {
  location: number;
  availability: number;
  requirement: number;
  preferences: number;
  completeness: number;
  recentActivity: number;
}

interface MatchCandidate {
  profileId: string;
  userId: string;
  displayName: string;
  cityId: string | null;
  areaId: string | null;
  latitude: number | null;
  longitude: number | null;
  profileCompletion: number;
  verificationStatus: string;
  updatedAt: string;
  interests: string[];
}

interface MatchResult {
  profileId: string;
  userId: string;
  displayName: string;
  score: number;
  breakdown: {
    location: number;
    availability: number;
    requirement: number;
    preferences: number;
    completeness: number;
    recentActivity: number;
  };
  reasons: string[];
}

interface RequirementContext {
  cityId?: string;
  areaId?: string;
  requestedDate?: string;
  startTime?: string;
  endTime?: string;
  requirementType?: string;
}

/**
 * MatchingService — server-side scoring engine.
 * Weights are loaded from app_config (admin-configurable).
 * Clients NEVER submit their own match scores.
 */
export class MatchingService {
  private static weightsCache: { weights: MatchWeights; cachedAt: number } | null = null;
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute

  static async getWeights(): Promise<MatchWeights> {
    if (
      MatchingService.weightsCache &&
      Date.now() - MatchingService.weightsCache.cachedAt < MatchingService.CACHE_TTL_MS
    ) {
      return MatchingService.weightsCache.weights;
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'matching_weights')
      .single();

    const weights: MatchWeights = data?.value ?? {
      location: 0.25,
      availability: 0.20,
      requirement: 0.20,
      preferences: 0.15,
      completeness: 0.10,
      recentActivity: 0.10,
    };

    MatchingService.weightsCache = { weights, cachedAt: Date.now() };
    return weights;
  }

  /**
   * Calculate compatibility score for a single candidate (0–100).
   */
  static async calculateScore(
    user: AuthenticatedUser,
    candidate: MatchCandidate,
    requirement?: RequirementContext,
    _userPreferences?: Record<string, unknown>
  ): Promise<MatchResult> {
    const weights = await MatchingService.getWeights();
    const reasons: string[] = [];
    const breakdown = {
      location: 0,
      availability: 0,
      requirement: 0,
      preferences: 0,
      completeness: 0,
      recentActivity: 0,
    };

    // ── Location score (25%) ─────────────────────────────────────
    const supabase = getSupabaseAdmin();
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('city_id, area_id')
      .eq('user_id', user.id)
      .single();

    if (userProfile?.city_id && candidate.cityId === userProfile.city_id) {
      breakdown.location = 100;
      reasons.push('Same city');
      if (candidate.areaId && candidate.areaId === userProfile.area_id) {
        reasons.push('Same area');
      }
    } else if (candidate.cityId) {
      breakdown.location = 30;
    }

    // ── Profile completeness score (10%) ─────────────────────────
    breakdown.completeness = candidate.profileCompletion;
    if (candidate.profileCompletion === 100) reasons.push('Complete profile');

    // ── Recent activity score (10%) ──────────────────────────────
    const lastActive = new Date(candidate.updatedAt).getTime();
    const hoursAgo = (Date.now() - lastActive) / (1000 * 60 * 60);
    if (hoursAgo < 1) {
      breakdown.recentActivity = 100;
      reasons.push('Active now');
    } else if (hoursAgo < 24) {
      breakdown.recentActivity = 80;
      reasons.push('Active today');
    } else if (hoursAgo < 72) {
      breakdown.recentActivity = 50;
      reasons.push('Active recently');
    } else if (hoursAgo < 168) {
      breakdown.recentActivity = 25;
    } else {
      breakdown.recentActivity = 0;
    }

    // ── Availability score (20%) ──────────────────────────────────
    if (requirement?.requestedDate) {
      const { data: avail } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', candidate.userId)
        .eq('status', 'AVAILABLE');

      if (avail && avail.length > 0) {
        const reqDate = new Date(requirement.requestedDate);
        const dayName = reqDate.toLocaleDateString('en-US', { weekday: 'long' });

        const isAvailable = avail.some(
          (a: { day_of_week?: string; specific_date?: string }) =>
            a.day_of_week === dayName ||
            (a.specific_date && a.specific_date === requirement.requestedDate)
        );

        if (isAvailable) {
          breakdown.availability = 100;
          reasons.push('Available at requested time');
        } else {
          breakdown.availability = 30;
        }
      }
    } else {
      breakdown.availability = 60; // No specific time requirement — neutral
    }

    // ── Requirement compatibility (20%) ──────────────────────────
    if (requirement?.requirementType && candidate.interests.length > 0) {
      const typeMap: Record<string, string[]> = {
        DINNER: ['dining', 'food', 'cooking', 'restaurants'],
        COFFEE: ['coffee', 'cafe', 'conversations'],
        OUTING: ['outdoors', 'travel', 'adventure', 'sightseeing'],
        EVENT: ['events', 'concerts', 'social', 'parties'],
        TRAVEL: ['travel', 'adventure', 'exploring'],
      };
      const relevantInterests = typeMap[requirement.requirementType] || [];
      const matches = candidate.interests.filter((i) =>
        relevantInterests.some((r) => i.toLowerCase().includes(r))
      ).length;

      if (matches > 0) {
        breakdown.requirement = Math.min(100, matches * 35);
        reasons.push(`Suitable for ${requirement.requirementType.toLowerCase()}`);
      } else {
        breakdown.requirement = 40; // Neutral
      }
    } else {
      breakdown.requirement = 50;
    }

    // ── Preference compatibility (15%) ───────────────────────────
    breakdown.preferences = 70; // Default — expand with actual preference matching

    // ── Verified boost ───────────────────────────────────────────
    if (candidate.verificationStatus === 'APPROVED') {
      reasons.push('Verified profile');
    }

    // ── Weighted total ───────────────────────────────────────────
    const total = Math.round(
      breakdown.location * weights.location +
      breakdown.availability * weights.availability +
      breakdown.requirement * weights.requirement +
      breakdown.preferences * weights.preferences +
      breakdown.completeness * weights.completeness +
      breakdown.recentActivity * weights.recentActivity
    );

    return {
      profileId: candidate.profileId,
      userId: candidate.userId,
      displayName: candidate.displayName,
      score: Math.min(100, total),
      breakdown,
      reasons,
    };
  }

  /**
   * Find and rank eligible candidates for a user.
   */
  static async findCandidates(
    user: AuthenticatedUser,
    options: {
      limit?: number;
      offset?: number;
      cityId?: string;
      requirement?: RequirementContext;
    } = {}
  ): Promise<MatchResult[]> {
    const supabase = getSupabaseAdmin();
    const limit = options.limit ?? 25;

    // ── Eligibility pipeline ─────────────────────────────────────
    let query = supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        display_name,
        city_id,
        area_id,
        latitude,
        longitude,
        profile_completion,
        verification_status,
        updated_at,
        interests,
        users!inner(status)
      `)
      .eq('discovery_status', 'VISIBLE')
      .neq('user_id', user.id) // Exclude self
      .eq('users.status', 'ACTIVE') // Active users only
      .gte('profile_completion', 50); // Min completion for discovery

    // Location filter
    if (options.cityId) {
      query = query.eq('city_id', options.cityId);
    }

    // Exclude blocked users
    const { data: blockedIds } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);

    if (blockedIds && blockedIds.length > 0) {
      query = query.not(
        'user_id',
        'in',
        `(${blockedIds.map((b: { blocked_id: string }) => b.blocked_id).join(',')})`
      );
    }

    // Exclude already passed
    const { data: passedIds } = await supabase
      .from('passes')
      .select('to_user_id')
      .eq('from_user_id', user.id);

    if (passedIds && passedIds.length > 0) {
      query = query.not(
        'user_id',
        'in',
        `(${passedIds.map((p: { to_user_id: string }) => p.to_user_id).join(',')})`
      );
    }

    const { data: candidates, error } = await query
      .order('updated_at', { ascending: false })
      .limit(limit * 3); // Fetch extra to allow for scoring/sorting

    if (error || !candidates) return [];

    // ── Score each candidate ─────────────────────────────────────
    const scored = await Promise.all(
      candidates.map((c: {
        id: string;
        user_id: string;
        display_name: string;
        city_id: string | null;
        area_id: string | null;
        latitude: number | null;
        longitude: number | null;
        profile_completion: number;
        verification_status: string;
        updated_at: string;
        interests: string[];
      }) =>
        MatchingService.calculateScore(
          user,
          {
            profileId: c.id,
            userId: c.user_id,
            displayName: c.display_name,
            cityId: c.city_id,
            areaId: c.area_id,
            latitude: c.latitude,
            longitude: c.longitude,
            profileCompletion: c.profile_completion,
            verificationStatus: c.verification_status,
            updatedAt: c.updated_at,
            interests: c.interests || [],
          },
          options.requirement
        )
      )
    );

    // Sort by score descending, return top N
    return scored.sort((a: MatchResult, b: MatchResult) => b.score - a.score).slice(0, limit);
  }
}
