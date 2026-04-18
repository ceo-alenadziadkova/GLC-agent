import { createHash } from 'node:crypto';
import { logger } from '../../services/logger.js';
import { recordSnapshotRunMetrics } from '../snapshot-metrics.js';
import type { SnapshotCachePayload } from '../types.js';

export function snapshotDomainFingerprint(host: string | null): string | null {
  if (!host) return null;
  return createHash('sha256').update(host.toLowerCase()).digest('hex').slice(0, 16);
}

/** Structured line for metrics / dashboards (ADR observability). No raw URL — only registrable-host fingerprint. */
export function logSnapshotRunComplete(args: {
  auditId: string;
  host: string | null;
  startedAt: number;
  outcome: 'cache_hit' | 'fresh_completed' | 'degraded';
  payload: SnapshotCachePayload;
}): void {
  const durationMs = Date.now() - args.startedAt;
  const { audit, site_profile: siteProfile, scan_coverage: scanCoverage, degraded } = args.payload;
  logger.info('snapshot.run_complete', {
    component: 'snapshot',
    audit_id: args.auditId,
    domain_fp: snapshotDomainFingerprint(args.host),
    duration_ms: durationMs,
    outcome: args.outcome,
    cache_hit: args.outcome === 'cache_hit',
    degraded: degraded === true,
    scan_basis_code: audit.scanBasisCode ?? null,
    overall_score: audit.overallScore,
    pages_fetched: scanCoverage?.pagesFetched ?? null,
    playwright_used: scanCoverage?.playwrightUsed ?? null,
    home_fetch_failure: scanCoverage?.homeFetchFailure ?? null,
    site_type: siteProfile.siteType,
    classification_band: siteProfile.classificationConfidenceBand,
    scan_confidence_band: audit.scanConfidenceBand,
    audit_rules_version: audit.rulesCatalogVersion ?? null,
  });
  recordSnapshotRunMetrics({
    outcome: args.outcome,
    duration_ms: durationMs,
    cache_hit: args.outcome === 'cache_hit',
    playwright_used: scanCoverage?.playwrightUsed === true,
    home_fetch_failure: scanCoverage?.homeFetchFailure ?? null,
    rule_results: audit.ruleResults,
  });
}
