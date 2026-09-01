import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../config/env';

// Service role client — bypasses RLS, for server-side use ONLY
let supabaseAdmin: SupabaseClient;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'littlefun-v2-backend',
        },
        // Fetch with a 10 second timeout per query
        fetch: (url, options) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          return fetch(url, { ...options, signal: controller.signal }).finally(() =>
            clearTimeout(timer)
          );
        },
      },
    });
    console.log('✅  Supabase Admin client initialized');
  }
  return supabaseAdmin;
}

// Typed query helper with error handling
export async function supabaseQuery<T>(
  operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>
): Promise<T> {
  const client = getSupabaseAdmin();
  const { data, error } = await operation(client);
  if (error) {
    throw error;
  }
  if (data === null) {
    throw new Error('No data returned from Supabase');
  }
  return data;
}

/**
 * Retry a Supabase operation with exponential backoff.
 * Use for non-idempotent operations where transient errors may occur.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 200 }: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}
