/**
 * Consultant role bootstrap: Postgres table **`consultant_email_allowlist`** (source of truth).
 * Manage rows via **`/api/platform/consultant-allowlist`** (platform admins) or SQL migrations.
 */

import { supabase } from './supabase.js';
import { logger } from './logger.js';

/**
 * True when the email should be treated as consultant on profile insert / promotion.
 */
export async function isConsultantEmailRegistered(emailNormalized: string): Promise<boolean> {
  const t = emailNormalized.trim().toLowerCase();
  if (!t) return false;

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
): Promise<{ ok: true } | { ok: false; conflict: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('consultant_email_allowlist').insert({ email_normalized: emailNormalized });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, conflict: true };
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
