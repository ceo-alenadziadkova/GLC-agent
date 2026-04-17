import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '../config/supabase-service-env.js';

const url = getSupabaseUrl();
const key = getSupabaseServiceRoleKey();
if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
}

// Service-role client for server-side operations (bypasses RLS).
// Route handlers must filter by user_id / client_id explicitly.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
