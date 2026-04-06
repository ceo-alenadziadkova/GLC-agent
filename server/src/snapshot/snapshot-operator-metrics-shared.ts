/**
 * Cross-instance snapshot operator fields (leases) for GET /api/snapshot/operator/metrics.
 */

import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';
import { getSnapshotFreshConcurrencyConfig } from './abuse-guards.js';

export async function getSnapshotSharedMetricsForOperator(): Promise<{
  shared_abuse_store: boolean;
  snapshot_max_concurrent: number;
  snapshot_fresh_lease_ttl_seconds: number;
  snapshot_fresh_leases_active: number | null;
}> {
  const cfg = getSnapshotFreshConcurrencyConfig();
  let snapshot_fresh_leases_active: number | null = null;

  if (cfg.sharedAbuseStore) {
    try {
      const nowIso = new Date().toISOString();
      const { count, error } = await supabase
        .from('snapshot_fresh_lease')
        .select('*', { count: 'exact', head: true })
        .gte('expires_at', nowIso);
      if (error) {
        logger.warn('snapshot.operator_lease_count_failed', { component: 'snapshot', error: error.message });
      } else {
        snapshot_fresh_leases_active = count ?? 0;
      }
    } catch (e) {
      logger.warn('snapshot.operator_lease_count_exception', {
        component: 'snapshot',
        error: (e as Error).message,
      });
    }
  }

  return {
    shared_abuse_store: cfg.sharedAbuseStore,
    snapshot_max_concurrent: cfg.maxConcurrent,
    snapshot_fresh_lease_ttl_seconds: cfg.freshLeaseTtlSeconds,
    snapshot_fresh_leases_active,
  };
}
