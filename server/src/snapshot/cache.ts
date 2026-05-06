import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { isLikelyTransientSupabaseError, sleepMs } from '../lib/supabase-rest-transient.js';
import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';
import type { SnapshotCachePayload } from './types.js';

/** Strip contact vectors before `snapshot_domain_cache` persist (ADR: minimize cached PII). Audit rows still use full payload from the runner. */
export function redactSnapshotPayloadForDomainCache(p: SnapshotCachePayload): SnapshotCachePayload {
  return {
    ...p,
    /** Keep public footer/structured business lines; redact direct emails/phones only. */
    contact_info: {
      emails: [],
      phones: [],
      addresses: p.contact_info?.addresses?.length ? [...p.contact_info.addresses] : [],
    },
  };
}

const DEFAULT_TTL_H = SYSTEM_DEFAULTS.snapshotDomainCache.ttlHours;
const WRITE_RETRY_ATTEMPTS = SYSTEM_DEFAULTS.snapshotDomainCache.writeRetryMaxAttempts;
const WRITE_RETRY_BASE_MS = SYSTEM_DEFAULTS.snapshotDomainCache.writeRetryBaseDelayMs;
const WRITE_RETRY_JITTER_MS = SYSTEM_DEFAULTS.snapshotDomainCache.writeRetryJitterMs;

export function normalizeSnapshotHost(companyUrl: string): string {
  try {
    const u = new URL(companyUrl);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function isCacheSchemaMissing(err: { message?: string; code?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase();
  const c = err?.code ?? '';
  return c === '42P01' || (m.includes('relation') && m.includes('does not exist'));
}

export async function readSnapshotCache(host: string): Promise<SnapshotCachePayload | null> {
  if (!host) return null;
  const maxAttempts =
    Number.isFinite(WRITE_RETRY_ATTEMPTS) && WRITE_RETRY_ATTEMPTS >= 1
      ? WRITE_RETRY_ATTEMPTS
      : 4;

  let lastError: { message?: string; code?: string } | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('snapshot_domain_cache')
      .select('payload, expires_at')
      .eq('host', host)
      .maybeSingle();

    lastError = error ?? null;
    if (!error) {
      if (!data?.payload) return null;
      const exp = new Date(data.expires_at as string).getTime();
      if (!Number.isFinite(exp) || Date.now() > exp) return null;
      const payload = data.payload as SnapshotCachePayload;
      if (payload?.version !== 1) return null;
      return payload;
    }

    if (isCacheSchemaMissing(error)) {
      logger.warn('snapshot.cache_table_missing', { component: 'snapshot', hint: 'apply migration 020_snapshot_domain_cache.sql' });
      return null;
    }

    const retryable = isLikelyTransientSupabaseError(error) && attempt < maxAttempts;
    if (retryable) {
      const base = Number.isFinite(WRITE_RETRY_BASE_MS) && WRITE_RETRY_BASE_MS >= 0 ? WRITE_RETRY_BASE_MS : 200;
      const jitter = Number.isFinite(WRITE_RETRY_JITTER_MS) && WRITE_RETRY_JITTER_MS >= 0 ? WRITE_RETRY_JITTER_MS : 120;
      const backoffMs = base * 2 ** (attempt - 1) + Math.floor(Math.random() * (jitter + 1));
      logger.warn('snapshot.cache_read_retry', {
        component: 'snapshot',
        host,
        attempt,
        maxAttempts,
        error: error.message,
        code: error.code,
      });
      await sleepMs(backoffMs);
      continue;
    }
    logger.warn('snapshot.cache_read_failed', {
      component: 'snapshot',
      host,
      error: error.message,
      code: error.code,
      attempts: attempt,
    });
    return null;
  }
  if (lastError) {
    logger.warn('snapshot.cache_read_failed', { component: 'snapshot', host, error: lastError.message });
  }
  return null;
}

export async function writeSnapshotCache(host: string, payload: SnapshotCachePayload): Promise<void> {
  if (!host) return;
  const ttlH = Number.isFinite(DEFAULT_TTL_H) && DEFAULT_TTL_H > 0 ? DEFAULT_TTL_H : 48;
  const expiresAt = new Date(Date.now() + ttlH * 3600 * 1000).toISOString();
  const maxAttempts =
    Number.isFinite(WRITE_RETRY_ATTEMPTS) && WRITE_RETRY_ATTEMPTS >= 1
      ? WRITE_RETRY_ATTEMPTS
      : 4;

  let lastError: { message?: string; code?: string } | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.from('snapshot_domain_cache').upsert(
      { host, payload, expires_at: expiresAt },
      { onConflict: 'host' },
    );
    lastError = error ?? null;
    if (!error) return;
    if (isCacheSchemaMissing(error)) {
      logger.warn('snapshot.cache_write_skipped', { component: 'snapshot', hint: 'apply migration 020_snapshot_domain_cache.sql' });
      return;
    }
    const retryable = isLikelyTransientSupabaseError(error) && attempt < maxAttempts;
    if (retryable) {
      const base = Number.isFinite(WRITE_RETRY_BASE_MS) && WRITE_RETRY_BASE_MS >= 0 ? WRITE_RETRY_BASE_MS : 200;
      const jitter = Number.isFinite(WRITE_RETRY_JITTER_MS) && WRITE_RETRY_JITTER_MS >= 0 ? WRITE_RETRY_JITTER_MS : 120;
      const backoffMs = base * 2 ** (attempt - 1) + Math.floor(Math.random() * (jitter + 1));
      logger.warn('snapshot.cache_write_retry', {
        component: 'snapshot',
        host,
        attempt,
        maxAttempts,
        error: error.message,
        code: error.code,
      });
      await sleepMs(backoffMs);
      continue;
    }
    logger.warn('snapshot.cache_write_failed', {
      component: 'snapshot',
      host,
      error: error.message,
      code: error.code,
      attempts: attempt,
    });
    return;
  }
  if (lastError) {
    logger.warn('snapshot.cache_write_failed', { component: 'snapshot', host, error: lastError.message });
  }
}

/** Operator/maintenance: remove cached snapshot payload for a registrable host (normalized like `normalizeSnapshotHost`). */
export async function deleteSnapshotDomainCache(host: string): Promise<boolean> {
  const h = normalizeSnapshotHost(`https://${host.replace(/^https?:\/\//i, '')}`);
  if (!h) return false;
  const maxAttempts =
    Number.isFinite(WRITE_RETRY_ATTEMPTS) && WRITE_RETRY_ATTEMPTS >= 1
      ? WRITE_RETRY_ATTEMPTS
      : 4;

  let lastError: { message?: string; code?: string } | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.from('snapshot_domain_cache').delete().eq('host', h);
    lastError = error ?? null;
    if (!error) return true;
    if (isCacheSchemaMissing(error)) {
      logger.warn('snapshot.cache_delete_skipped', { component: 'snapshot', hint: 'apply migration 020_snapshot_domain_cache.sql' });
      return false;
    }
    const retryable = isLikelyTransientSupabaseError(error) && attempt < maxAttempts;
    if (retryable) {
      const base = Number.isFinite(WRITE_RETRY_BASE_MS) && WRITE_RETRY_BASE_MS >= 0 ? WRITE_RETRY_BASE_MS : 200;
      const jitter = Number.isFinite(WRITE_RETRY_JITTER_MS) && WRITE_RETRY_JITTER_MS >= 0 ? WRITE_RETRY_JITTER_MS : 120;
      const backoffMs = base * 2 ** (attempt - 1) + Math.floor(Math.random() * (jitter + 1));
      logger.warn('snapshot.cache_delete_retry', {
        component: 'snapshot',
        host: h,
        attempt,
        maxAttempts,
        error: error.message,
        code: error.code,
      });
      await sleepMs(backoffMs);
      continue;
    }
    logger.warn('snapshot.cache_delete_failed', {
      component: 'snapshot',
      host: h,
      error: error.message,
      code: error.code,
      attempts: attempt,
    });
    return false;
  }
  if (lastError) {
    logger.warn('snapshot.cache_delete_failed', { component: 'snapshot', host: h, error: lastError.message });
  }
  return false;
}
