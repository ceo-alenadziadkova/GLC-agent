/**
 * Consultant role bootstrap: **`consultant_email_allowlist`** (source of truth) + deprecated **`CONSULTANT_EMAILS`** env merge.
 *
 * Deprecation: do not add new reliance on **`CONSULTANT_EMAILS`**. Prefer the DB table and platform admin flows.
 * The env list remains a temporary bootstrap fallback until all environments migrate off it.
 */

import { supabase } from './supabase.js';
import { logger } from './logger.js';

/** @deprecated Use `consultant_email_allowlist` only for new deployments. */
function parseDeprecatedConsultantEmailsEnv(): Set<string> {
  return new Set(
    (process.env.CONSULTANT_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * True when the email should be treated as consultant on profile insert / promotion.
 * Checks deprecated **`CONSULTANT_EMAILS`** first (bootstrap), then **`consultant_email_allowlist`**.
 */
export async function isConsultantEmailRegistered(emailNormalized: string): Promise<boolean> {
  const t = emailNormalized.trim().toLowerCase();
  if (!t) return false;
  if (parseDeprecatedConsultantEmailsEnv().has(t)) return true;

  const { data, error } = await supabase
    .from('consultant_email_allowlist')
    .select('email_normalized')
    .eq('email_normalized', t)
    .maybeSingle();

  if (error) {
    logger.warn('consultant_allowlist.lookup_failed', { error: error.message });
    return false;
  }

  return Boolean(data?.email_normalized);
}

export function normalizeConsultantAllowlistEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t || !t.includes('@') || t.length < 3) return null;
  return t;
}

export async function listConsultantAllowlistEmails(): Promise<{ ok: true; emails: string[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('consultant_email_allowlist')
    .select('email_normalized')
    .order('email_normalized', { ascending: true });

  if (error) {
    logger.warn('consultant_allowlist.list_failed', { error: error.message });
    return { ok: false, error: error.message };
  }

  return { ok: true, emails: (data ?? []).map(r => r.email_normalized as string) };
}

export async function addConsultantAllowlistEmail(
  emailNormalized: string,
): Promise<{ ok: true } | { ok: false; error: string; conflict?: boolean }> {
  const { error } = await supabase.from('consultant_email_allowlist').insert({ email_normalized: emailNormalized });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Email already in allowlist', conflict: true };
    }
    logger.warn('consultant_allowlist.add_failed', { error: error.message });
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeConsultantAllowlistEmail(
  emailNormalized: string,
): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('consultant_email_allowlist')
    .delete()
    .eq('email_normalized', emailNormalized)
    .select('email_normalized');

  if (error) {
    logger.warn('consultant_allowlist.remove_failed', { error: error.message });
    return { ok: false, error: error.message };
  }

  return { ok: true, removed: (data?.length ?? 0) > 0 };
}
