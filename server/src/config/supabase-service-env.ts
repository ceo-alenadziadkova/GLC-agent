/**
 * Supabase service-role URL and key (infrastructure ENV).
 * Centralises reads for REST fallback paths and `services/supabase.ts` client bootstrap.
 */

import { SUPABASE_REST_V1_SUFFIX } from './pipeline-error-fallback.js';

export interface SupabaseServiceRestConfig {
  supabaseUrl: string;
  serviceKey: string;
  /** `${SUPABASE_URL}/rest/v1` */
  restBase: string;
}

export function getSupabaseUrl(): string | undefined {
  const u = process.env.SUPABASE_URL?.trim();
  return u || undefined;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const k = process.env.SUPABASE_SERVICE_KEY?.trim();
  return k || undefined;
}

/** When both URL and service key are set (e.g. pipeline error REST fallback). */
export function getSupabaseServiceRestConfig(): SupabaseServiceRestConfig | null {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!supabaseUrl || !serviceKey) return null;
  return {
    supabaseUrl,
    serviceKey,
    restBase: `${supabaseUrl}${SUPABASE_REST_V1_SUFFIX}`,
  };
}
