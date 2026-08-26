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
