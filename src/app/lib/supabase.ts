import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (import.meta.env.PROD) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in production builds');
  }
} else if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. in .env.local). Vitest stubs them in src/test/setup.ts.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
