import { getSupabaseAdmin } from './supabase/supabaseClient';
import { AuthenticatedUser } from '../middleware/auth';

interface Plan {
  id: string;
  name: string;
  max_discovery_profiles: number;
  max_requests: number;
  max_likes_per_day: number;
  chat_enabled: boolean;
  advanced_filters: boolean;
  priority_matching: boolean;
}

/**
 * EntitlementService — single source of truth for plan-gated features.
 * Never scattered `if (plan === 'PRO')` checks. All business rules here.
 */
export class EntitlementService {
  private static planCache = new Map<string, { plan: Plan; cachedAt: number }>();
  private static CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  static async getPlan(planId: string | null): Promise<Plan | null> {
    if (!planId) return null;

    const cached = EntitlementService.planCache.get(planId);
    if (cached && Date.now() - cached.cachedAt < EntitlementService.CACHE_TTL_MS) {
      return cached.plan;
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (data) {
      EntitlementService.planCache.set(planId, { plan: data, cachedAt: Date.now() });
    }
    return data;
  }

  static async getFreePlan(): Promise<Plan | null> {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('name', 'FREE')
      .single();
    return data;
  }

  static async canSendMessage(user: AuthenticatedUser): Promise<boolean> {
    if (!user.plan_id) {
      const free = await EntitlementService.getFreePlan();
      return free?.chat_enabled ?? false;
    }
    const plan = await EntitlementService.getPlan(user.plan_id);
    return plan?.chat_enabled ?? false;
  }

  static async canCreateRequirement(_user: AuthenticatedUser): Promise<boolean> {
    // Any user with an active subscription can create requirements
    // FREE plan gets 1 requirement
    return true;
  }

  static async canUseAdvancedFilters(user: AuthenticatedUser): Promise<boolean> {
    if (!user.plan_id) return false;
    const plan = await EntitlementService.getPlan(user.plan_id);
    return plan?.advanced_filters ?? false;
  }

  static async canViewPriorityProfiles(user: AuthenticatedUser): Promise<boolean> {
    if (!user.plan_id) return false;
    const plan = await EntitlementService.getPlan(user.plan_id);
    return plan?.priority_matching ?? false;
  }

  static async getDiscoveryLimit(user: AuthenticatedUser): Promise<number> {
    if (!user.plan_id) {
      const free = await EntitlementService.getFreePlan();
      return free?.max_discovery_profiles ?? 10;
    }
    const plan = await EntitlementService.getPlan(user.plan_id);
    return plan?.max_discovery_profiles ?? 10;
  }

  static async getMaxRequests(user: AuthenticatedUser): Promise<number> {
    if (!user.plan_id) {
      const free = await EntitlementService.getFreePlan();
      return free?.max_requests ?? 1;
    }
    const plan = await EntitlementService.getPlan(user.plan_id);
    return plan?.max_requests ?? 1;
  }

  static async getMaxLikesPerDay(user: AuthenticatedUser): Promise<number> {
    if (!user.plan_id) {
      const free = await EntitlementService.getFreePlan();
      return free?.max_likes_per_day ?? 10;
    }
    const plan = await EntitlementService.getPlan(user.plan_id);
    return plan?.max_likes_per_day ?? 10;
  }

  static async canCreateRequest(user: AuthenticatedUser): Promise<{ allowed: boolean; reason?: string }> {
    const supabase = getSupabaseAdmin();
    const maxRequests = await EntitlementService.getMaxRequests(user);

    // Count active requests this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('meeting_requests')
      .select('*', { count: 'exact', head: true })
      .eq('from_user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())
      .in('status', ['SUBMITTED', 'PENDING_RESPONSE', 'ACCEPTED', 'CONFIRMED']);

    if ((count ?? 0) >= maxRequests) {
      return {
        allowed: false,
        reason: `Your plan allows ${maxRequests} active request(s). Upgrade to create more.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check today's like count against plan limit.
   */
  static async canLike(user: AuthenticatedUser): Promise<{ allowed: boolean; remaining: number }> {
    const supabase = getSupabaseAdmin();
    const maxLikes = await EntitlementService.getMaxLikesPerDay(user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('from_user_id', user.id)
      .gte('created_at', today.toISOString());

    const used = count ?? 0;
    const remaining = Math.max(0, maxLikes - used);

    return { allowed: remaining > 0, remaining };
  }
}
