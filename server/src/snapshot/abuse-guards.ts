/**
 * In-process abuse controls for public free snapshot (ADR-FREE-SNAPSHOT-SCANNER).
 * Optional shared cooldown via `snapshot_domain_cooldown` when `SNAPSHOT_SHARED_ABUSE_STORE=1`.
 */

import { PIPELINE_EVENT_ERROR_CODES } from '../config/pipeline-event-error-codes.js';
import { freeSnapshotCapacityUserMessage } from '../config/pipeline-orchestrator-copy.js';
import { getSnapshotFetchBudgetMs } from '../config/snapshot-fetch-budget.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';

const SA = SYSTEM_DEFAULTS.snapshotAbuse;

let concurrentSnapshotFetches = 0;
const maxConcurrent = SA.maxConcurrent;

const domainFreshCooldownMs = SA.domainFreshCooldownMs;

function freshLeaseTtlSeconds(): number {
  const fetchMs = getSnapshotFetchBudgetMs();
  const fetchSec = Number.isFinite(fetchMs) ? Math.max(1, fetchMs / 1000) : 10;
  return Math.max(300, Math.ceil(fetchSec * 5));
}

function isLeaseRpcOrTableMissing(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const c = err.code ?? '';
  const m = (err.message ?? '').toLowerCase();
  if (c === '42883') return true;
  if (m.includes('function') && m.includes('does not exist')) return true;
  if (c === '42P01' || (m.includes('relation') && m.includes('does not exist'))) return true;
  return false;
}

/** Last time a completed fresh scan wrote to domain cache for this host (registrable hostname, lowercase). */
const lastFreshFetchByHost = new Map<string, number>();

function useSharedAbuseStore(): boolean {
  return SA.useSharedAbuseStore;
}

function normHost(host: string): string {
  return host.trim().toLowerCase();
}

function isCooldownTableMissing(err: { code?: string; message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase();
  const c = err?.code ?? '';
  return c === '42P01' || (m.includes('relation') && m.includes('does not exist'));
}

function memoryCooldownActive(host: string): boolean {
  if (domainFreshCooldownMs <= 0) return false;
  const h = normHost(host);
  if (!h) return false;
  const t = lastFreshFetchByHost.get(h);
  if (t === undefined) return false;
  return Date.now() - t < domainFreshCooldownMs;
}

export class SnapshotAtCapacityError extends Error {
  readonly code = PIPELINE_EVENT_ERROR_CODES.SNAPSHOT_AT_CAPACITY;

  constructor() {
    super(freeSnapshotCapacityUserMessage());
    this.name = 'SnapshotAtCapacityError';
  }
}

/** Call after a successful fresh scan that populated cache (cache miss path). */
export async function noteSnapshotFreshFetchCompleted(host: string): Promise<void> {
  const h = normHost(host);
  if (!h) return;
  lastFreshFetchByHost.set(h, Date.now());
  if (!useSharedAbuseStore()) return;
  try {
    const { error } = await supabase
      .from('snapshot_domain_cooldown')
      .upsert({ host: h, last_fresh_scan_at: new Date().toISOString() }, { onConflict: 'host' });
    if (error) {
      if (isCooldownTableMissing(error)) {
        logger.warn('snapshot.shared_cooldown_table_missing', {
          component: 'snapshot',
          hint: 'apply migration 021_snapshot_domain_cooldown.sql',
        });
        return;
      }
      logger.warn('snapshot.shared_cooldown_upsert_failed', { component: 'snapshot', error: error.message });
    }
  } catch (e) {
    logger.warn('snapshot.shared_cooldown_upsert_exception', {
      component: 'snapshot',
      error: (e as Error).message,
    });
  }
}

/**
 * True if this host must not start another fresh fetch yet (in-memory and optionally shared DB).
 * Prefer this in HTTP handlers; falls back to memory-only when shared store is off or DB errors.
 */
export async function isSnapshotDomainFreshCooldownActiveAsync(host: string): Promise<boolean> {
  if (domainFreshCooldownMs <= 0) return false;
  const h = normHost(host);
  if (!h) return false;

  if (memoryCooldownActive(host)) return true;
  if (!useSharedAbuseStore()) return false;

  try {
    const { data, error } = await supabase
      .from('snapshot_domain_cooldown')
      .select('last_fresh_scan_at')
      .eq('host', h)
      .maybeSingle();

    if (error) {
      if (!isCooldownTableMissing(error)) {
        logger.warn('snapshot.shared_cooldown_select_failed', { component: 'snapshot', error: error.message });
      }
      return false;
    }
    if (!data?.last_fresh_scan_at) return false;
    const t = new Date(data.last_fresh_scan_at as string).getTime();
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < domainFreshCooldownMs;
  } catch {
    return false;
  }
}

/** Synchronous check (in-process map only). Used by tests / legacy callers. */
export function isSnapshotDomainFreshCooldownActive(host: string): boolean {
  return memoryCooldownActive(host);
}

export async function getSnapshotDomainFreshCooldownRetryAfterSecondsAsync(host: string): Promise<number> {
  if (domainFreshCooldownMs <= 0) return 0;
  const h = normHost(host);
  if (!h) return 0;

  const remainingMs: number[] = [];
  const mem = lastFreshFetchByHost.get(h);
  if (mem !== undefined) {
    const left = domainFreshCooldownMs - (Date.now() - mem);
    if (left > 0) remainingMs.push(left);
  }

  if (useSharedAbuseStore()) {
    try {
      const { data, error } = await supabase
        .from('snapshot_domain_cooldown')
        .select('last_fresh_scan_at')
        .eq('host', h)
        .maybeSingle();
      if (!error && data?.last_fresh_scan_at) {
        const t = new Date(data.last_fresh_scan_at as string).getTime();
        if (Number.isFinite(t)) {
          const left = domainFreshCooldownMs - (Date.now() - t);
          if (left > 0) remainingMs.push(left);
        }
      }
    } catch {
      /* ignore */
    }
  }

  const best = remainingMs.length > 0 ? Math.max(...remainingMs) : 0;
  return best > 0 ? Math.ceil(best / 1000) : 0;
}

export function getSnapshotDomainFreshCooldownRetryAfterSeconds(host: string): number {
  if (domainFreshCooldownMs <= 0) return 0;
  const h = normHost(host);
  const t = lastFreshFetchByHost.get(h);
  if (t === undefined) return 0;
  const leftMs = domainFreshCooldownMs - (Date.now() - t);
  return leftMs > 0 ? Math.ceil(leftMs / 1000) : 0;
}

export function tryAcquireSnapshotConcurrency(): boolean {
  if (concurrentSnapshotFetches >= maxConcurrent) return false;
  concurrentSnapshotFetches += 1;
  return true;
}

export function releaseSnapshotConcurrency(): void {
  concurrentSnapshotFetches = Math.max(0, concurrentSnapshotFetches - 1);
}

export type SnapshotFreshConcurrencyTicket = {
  acquired: boolean;
  /** Populated when a shared DB lease was issued; release via RPC */
  leaseId: string | null;
};

/**
 * Limit parallel **fresh** snapshot fetches (cache miss path). When `SNAPSHOT_SHARED_ABUSE_STORE` is set,
 * uses `snapshot_fresh_lease` + RPC so the cap applies across Railway instances.
 */
export async function acquireSnapshotFreshConcurrency(): Promise<SnapshotFreshConcurrencyTicket> {
  if (!useSharedAbuseStore()) {
    return {
      acquired: tryAcquireSnapshotConcurrency(),
      leaseId: null,
    };
  }

  try {
    const { data, error } = await supabase.rpc('snapshot_try_acquire_fresh_lease', {
      p_max: maxConcurrent,
      p_ttl_seconds: freshLeaseTtlSeconds(),
    });

    if (error) {
      if (isLeaseRpcOrTableMissing(error)) {
        logger.warn('snapshot.shared_lease_unavailable', {
          component: 'snapshot',
          error: error.message,
          hint: 'apply migration 022_snapshot_fresh_lease.sql',
        });
        return {
          acquired: tryAcquireSnapshotConcurrency(),
          leaseId: null,
        };
      }
      logger.warn('snapshot.shared_lease_acquire_failed', { component: 'snapshot', error: error.message });
      return {
        acquired: tryAcquireSnapshotConcurrency(),
        leaseId: null,
      };
    }

    if (data === null || data === undefined) {
      return { acquired: false, leaseId: null };
    }

    const leaseId = typeof data === 'string' ? data : String(data);
    return { acquired: true, leaseId };
  } catch (e) {
    logger.warn('snapshot.shared_lease_acquire_exception', {
      component: 'snapshot',
      error: (e as Error).message,
    });
    return {
      acquired: tryAcquireSnapshotConcurrency(),
      leaseId: null,
    };
  }
}

export async function releaseSnapshotFreshConcurrency(leaseId: string | null): Promise<void> {
  if (leaseId) {
    try {
      const { error } = await supabase.rpc('snapshot_release_fresh_lease', { p_lease_id: leaseId });
      if (error) {
        logger.warn('snapshot.shared_lease_release_failed', { component: 'snapshot', error: error.message });
      }
    } catch (e) {
      logger.warn('snapshot.shared_lease_release_exception', {
        component: 'snapshot',
        error: (e as Error).message,
      });
    }
    return;
  }
  releaseSnapshotConcurrency();
}

export function getSnapshotFreshConcurrencyConfig(): {
  maxConcurrent: number;
  sharedAbuseStore: boolean;
  freshLeaseTtlSeconds: number;
} {
  return {
    maxConcurrent,
    sharedAbuseStore: useSharedAbuseStore(),
    freshLeaseTtlSeconds: freshLeaseTtlSeconds(),
  };
}

/** Tests only: reset in-memory state. */
export function resetSnapshotAbuseGuardsForTests(): void {
  concurrentSnapshotFetches = 0;
  lastFreshFetchByHost.clear();
}
