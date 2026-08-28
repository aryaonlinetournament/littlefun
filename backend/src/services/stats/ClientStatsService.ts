import { getSupabaseAdmin } from '../supabase/supabaseClient';

export interface ClientStats {
  activeMeetups: number;
  profileViews: number;
  receivedLikes: number;
  areaLabel: string;
  isFirstDay: boolean;
  daysActive: number;
  boostPct: number;
}

export class ClientStatsService {
  /**
   * Generates or retrieves the active weekly meetups count for an area.
   * Auto-generates a 2-digit number (10–99) that updates every Saturday.
   * Admin can override globally or per city in app_config.
   */
  static async getWeeklyActiveMeetups(cityId?: string | null): Promise<number> {
    const supabase = getSupabaseAdmin();

    try {
      // 1. Check for admin manual override in app_config
      const { data: configRow } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'weekly_meetups_override')
        .maybeSingle();

      const config = configRow?.value as {
        manual_override?: number | null;
        city_overrides?: Record<string, number>;
      } | undefined;

      if (cityId && config?.city_overrides?.[cityId] !== undefined) {
        return Number(config.city_overrides[cityId]);
      }

      if (config?.manual_override !== null && config?.manual_override !== undefined) {
        return Number(config.manual_override);
      }
    } catch (err) {
      console.warn('[ClientStatsService] Failed to read meetups config override:', err);
    }

    // 2. Automated Weekly Generation (Updates every Saturday, 10–99)
    return this.generateSaturdayWeeklyNumber(cityId);
  }

  /**
   * Deterministically generates a 2-digit number (10 to 99) for the current week starting on Saturday.
   */
  static generateSaturdayWeeklyNumber(seedModifier?: string | null): number {
    const now = new Date();
    // Saturday is day 6 in JS (0=Sun, 1=Mon, ..., 6=Sat)
    // Find the timestamp of the most recent Saturday (or today if today is Saturday)
    const dayOfWeek = now.getUTCDay();
    const daysSinceSaturday = (dayOfWeek + 1) % 7;
    const lastSaturday = new Date(now);
    lastSaturday.setUTCDate(now.getUTCDate() - daysSinceSaturday);
    lastSaturday.setUTCHours(0, 0, 0, 0);

    const year = lastSaturday.getUTCFullYear();
    // Week number of the year anchored on Saturday
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const diffDays = Math.floor((lastSaturday.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7);

    // Simple pseudo-random hash using year + weekNumber + seedModifier
    const seedString = `LF-SAT-${year}-W${weekNumber}-${seedModifier || 'GLOBAL'}`;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = (hash * 31 + seedString.charCodeAt(i)) >>> 0;
    }

    // Map hash into range [10, 99]
    const numberInRange = 10 + (hash % 90);
    return numberInRange;
  }

  /**
   * Calculates client profile views and received likes:
   * - Day 0 (Brand new client): 0 Views, 0 Likes.
   * - Each active day: +2% (Mon-Sat), +10% on Sunday.
   * - Includes any Admin custom boost percentage or manual views override.
   */
  static async calculateClientStats(
    userId: string,
    userCreatedAt?: string,
    cityId?: string | null
  ): Promise<ClientStats> {
    const supabase = getSupabaseAdmin();

    const createdDate = userCreatedAt ? new Date(userCreatedAt) : new Date();
    const now = new Date();

    // Difference in calendar days
    const diffMs = now.getTime() - createdDate.getTime();
    const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Check for admin user boost
    let boostPct = 0;
    let manualViews: number | null = null;
    let manualLikes: number | null = null;

    try {
      const { data: boostRow } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'user_stats_boosts')
        .maybeSingle();

      const boosts = (boostRow?.value || {}) as Record<string, {
        boost_pct?: number;
        manual_views?: number;
        manual_likes?: number;
      }>;

      if (boosts[userId]) {
        boostPct = boosts[userId].boost_pct || 0;
        manualViews = boosts[userId].manual_views ?? null;
        manualLikes = boosts[userId].manual_likes ?? null;
      }
    } catch (e) {
      console.warn('[ClientStatsService] Error loading user stats boosts:', e);
    }

    let calculatedViews = 0;
    let calculatedLikes = 0;

    if (manualViews !== null) {
      calculatedViews = manualViews;
    } else if (daysElapsed === 0) {
      // Day 0: brand new customer starts with 0 views
      calculatedViews = 0;
    } else {
      // Base initial views starting on Day 1
      let currentViews = 5;

      for (let day = 1; day <= daysElapsed; day++) {
        const simulatedDate = new Date(createdDate.getTime() + day * 24 * 60 * 60 * 1000);
        const dayOfWeek = simulatedDate.getUTCDay(); // 0 is Sunday

        if (dayOfWeek === 0) {
          // Sunday: +10%
          currentViews = Math.round(currentViews * 1.10) + 1;
        } else {
          // Mon-Sat: +2% (minimum +1 view per day)
          const growth = Math.max(1, Math.round(currentViews * 0.02));
          currentViews += growth;
        }
      }

      // Apply Admin Custom Boost Percentage if configured
      if (boostPct > 0) {
        currentViews = Math.round(currentViews * (1 + boostPct / 100));
      }

      calculatedViews = currentViews;
    }

    if (manualLikes !== null) {
      calculatedLikes = manualLikes;
    } else if (daysElapsed === 0) {
      calculatedLikes = 0;
    } else {
      // Natural organic likes ratio (~15% to 20% of views)
      calculatedLikes = Math.max(0, Math.floor(calculatedViews * 0.16));
    }

    const activeMeetups = await this.getWeeklyActiveMeetups(cityId);

    return {
      activeMeetups,
      profileViews: calculatedViews,
      receivedLikes: calculatedLikes,
      areaLabel: 'In your area',
      isFirstDay: daysElapsed === 0,
      daysActive: daysElapsed,
      boostPct,
    };
  }
}
