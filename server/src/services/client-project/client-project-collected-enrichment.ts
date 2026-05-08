import { COLLECTOR_KEY_NEW_AUDIT_SITE_RECON } from '../../config/collector-keys.js';
import type { ClientProjectAuditEnrichmentV1 } from '../../types/audit/client-project-context.js';
import type { CollectedDataRow } from '../../repositories/audits/collected-data-for-audit.repository.js';

/** Subset of `LighthouseAuditSummary` safe to embed in the client project context. */
const LIGHTHOUSE_CONTEXT_KEYS = [
  'requested_url',
  'performance_score',
  'accessibility_score',
  'best_practices_score',
  'seo_score',
  'lcp',
  'cls',
  'fcp',
  'error',
  'enabled',
] as const;

function pickLighthouseSnapshot(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of LIGHTHOUSE_CONTEXT_KEYS) {
    if (k in o) {
      out[k] = o[k];
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function lighthouseSnapshotHasFatalError(snap: Record<string, unknown> | null): boolean {
  if (!snap) return true;
  const err = snap.error;
  return typeof err === 'string' && err.length > 0;
}

/**
 * Builds a small, stable `auditEnrichment.byKey` payload from `collected_data` rows
 * (Lighthouse: `performance` row, or `lighthouse_bootstrap` from new-audit early run).
 */
export function buildClientProjectEnrichmentFromCollectedData(
  rows: CollectedDataRow[],
): ClientProjectAuditEnrichmentV1 {
  const byKey: Record<string, unknown> = {};
  const performance = rows.find(r => r.collector_key === 'performance');
  const bootstrap = rows.find(r => r.collector_key === 'lighthouse_bootstrap');
  const fromPerf = pickLighthouseSnapshot(performance?.data?.lighthouse);
  const fromBoot = pickLighthouseSnapshot(bootstrap?.data?.lighthouse);
  let chosen: Record<string, unknown> | null = null;
  if (fromPerf && !lighthouseSnapshotHasFatalError(fromPerf)) {
    chosen = fromPerf;
  } else if (fromBoot && !lighthouseSnapshotHasFatalError(fromBoot)) {
    chosen = fromBoot;
  } else {
    chosen = fromPerf ?? fromBoot;
  }
  if (chosen) {
    byKey.performance_lighthouse = chosen;
  }

  const siteRecon = rows.find(r => r.collector_key === COLLECTOR_KEY_NEW_AUDIT_SITE_RECON);
  const siteSummary = siteRecon?.data?.summary;
  if (siteSummary && typeof siteSummary === 'object' && !Array.isArray(siteSummary)) {
    byKey.site_scrape = {
      status: 'ready',
      ...(siteSummary as Record<string, unknown>),
    };
  }

  if (rows.length > 0) {
    byKey.collector_keys_present = rows.map(r => r.collector_key);
  }
  return Object.keys(byKey).length > 0 ? { byKey } : {};
}

/**
 * Compact Lighthouse slice for the intake intelligence snapshot LLM (same family as
 * `performance_lighthouse` in `auditEnrichment`, without requiring full client-project context).
 */
export function getLighthouseSummaryForIntelligenceSnapshot(
  rows: CollectedDataRow[],
): Record<string, unknown> | null {
  const enr = buildClientProjectEnrichmentFromCollectedData(rows);
  const raw = enr.byKey?.performance_lighthouse;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}
