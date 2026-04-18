import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';
import type { SnapshotCachePayload } from './types.js';

/** Strip contact vectors before `snapshot_domain_cache` persist (ADR: minimize cached PII). Audit rows still use full payload from the runner. */
export function redactSnapshotPayloadForDomainCache(p: SnapshotCachePayload): SnapshotCachePayload {
  return {
    ...p,
    contact_info: { emails: [], phones: [], addresses: [] },
  };
}

const DEFAULT_TTL_H = SYSTEM_DEFAULTS.snapshotDomainCache.ttlHours;

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
  const { data, error } = await supabase
    .from('snapshot_domain_cache')
    .select('payload, expires_at')
    .eq('host', host)
    .maybeSingle();

  if (error) {
    if (isCacheSchemaMissing(error)) {
      logger.warn('snapshot.cache_table_missing', { component: 'snapshot', hint: 'apply migration 020_snapshot_domain_cache.sql' });
      return null;
    }
    return null;
  }
  if (!data?.payload) return null;
  const exp = new Date(data.expires_at as string).getTime();
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const payload = data.payload as SnapshotCachePayload;
  if (payload?.version !== 1) return null;
  return payload;
}

export async function writeSnapshotCache(host: string, payload: SnapshotCachePayload): Promise<void> {
  if (!host) return;
  const ttlH = Number.isFinite(DEFAULT_TTL_H) && DEFAULT_TTL_H > 0 ? DEFAULT_TTL_H : 48;
  const expiresAt = new Date(Date.now() + ttlH * 3600 * 1000).toISOString();
  const { error } = await supabase.from('snapshot_domain_cache').upsert(
    { host, payload, expires_at: expiresAt },
    { onConflict: 'host' },
  );
  if (error && isCacheSchemaMissing(error)) {
    logger.warn('snapshot.cache_write_skipped', { component: 'snapshot', hint: 'apply migration 020_snapshot_domain_cache.sql' });
  }
}

/** Operator/maintenance: remove cached snapshot payload for a registrable host (normalized like `normalizeSnapshotHost`). */
export async function deleteSnapshotDomainCache(host: string): Promise<boolean> {
  const h = normalizeSnapshotHost(`https://${host.replace(/^https?:\/\//i, '')}`);
  if (!h) return false;
  const { error } = await supabase.from('snapshot_domain_cache').delete().eq('host', h);
  if (error) {
    if (isCacheSchemaMissing(error)) {
      logger.warn('snapshot.cache_delete_skipped', { component: 'snapshot', hint: 'apply migration 020_snapshot_domain_cache.sql' });
      return false;
    }
    logger.warn('snapshot.cache_delete_failed', { component: 'snapshot', host: h, error: error.message });
    return false;
  }
  return true;
}
