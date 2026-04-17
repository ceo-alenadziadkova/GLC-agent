import type { SiteProfileDebug } from '../classification/site-profile-runner.js';
import { SNAPSHOT_CLASSIFICATION_TRANSPARENCY_MATCHED_SIGNALS_MAX } from '../config/snapshot-runtime.js';
import { snapshotPayloadToAccessApiFields } from '../snapshot-access-state.js';
import type {
  SnapshotCachePayload,
  SnapshotClassificationTransparency,
} from '../types.js';
import { toApiScanCoverage } from './snapshot-scan-coverage-api.mapper.js';
import { toApiSiteProfile } from './snapshot-site-profile-api.mapper.js';

export function classificationTransparencyFromDebug(
  debug: SiteProfileDebug,
): SnapshotClassificationTransparency {
  const scoreTopTwo = debug.scoreTopTwoSiteTypes;
  const second = scoreTopTwo[1];
  const runnerUpType = second && second[0] !== 'unknown' ? second[0] : null;
  const runnerUpCount = second && second[0] !== 'unknown' ? second[1] : null;
  return {
    matched_signals: debug.matchedSignals.slice(
      0,
      SNAPSHOT_CLASSIFICATION_TRANSPARENCY_MATCHED_SIGNALS_MAX,
    ),
    runner_up_site_type: runnerUpType,
    runner_up_match_count: runnerUpCount,
    tie_ambiguous: debug.tieAmbiguous,
    score_top_two: scoreTopTwo,
  };
}

/** Shape stored under `audit_domains.raw_data.snapshot_deterministic` (and used by GET /api/snapshot merge). */
export function snapshotPayloadToDeterministicApiRecord(p: SnapshotCachePayload): Record<string, unknown> {
  return {
    site_profile: toApiSiteProfile(p.site_profile),
    overall_score: p.audit.overallScore,
    category_scores: p.audit.categoryScores,
    scan_basis: p.audit.scanBasis,
    ...(p.audit.scanBasisCode ? { scan_basis_code: p.audit.scanBasisCode } : {}),
    signals_found: p.audit.signalsFound,
    scan_confidence_band: p.audit.scanConfidenceBand,
    classification_confidence_band: p.site_profile.classificationConfidenceBand,
    ...(typeof p.audit.rulesCatalogVersion === 'number' ? { audit_rules_version: p.audit.rulesCatalogVersion } : {}),
    ...(p.scan_coverage ? { scan_coverage: toApiScanCoverage(p.scan_coverage) } : {}),
    ...(p.scanned_at ? { scanned_at: p.scanned_at } : {}),
    ...(p.limitations && p.limitations.length > 0 ? { limitations: p.limitations } : {}),
    ...(p.classification_version !== undefined ? { classification_version: p.classification_version } : {}),
    ...(p.fetch_strategy_version ? { fetch_strategy_version: p.fetch_strategy_version } : {}),
    ...(p.snapshot_engine_version ? { snapshot_engine_version: p.snapshot_engine_version } : {}),
    ...(p.classification_transparency
      ? { classification_transparency: p.classification_transparency }
      : {}),
    ...(p.homepage_snippet ? { homepage_snippet: p.homepage_snippet } : {}),
    ...(p.tech_stack_tentative && p.tech_stack_tentative.length > 0
      ? { tech_stack_tentative: p.tech_stack_tentative }
      : {}),
    ...(p.ai_visibility ? { ai_visibility: p.ai_visibility } : {}),
    ...snapshotPayloadToAccessApiFields({
      scanBasisCode: p.audit.scanBasisCode,
      limitations: p.limitations,
      scanCoverage: p.scan_coverage
        ? {
            pagesFetched: p.scan_coverage.pagesFetched,
            robotsHomeDisallowed: p.scan_coverage.robotsHomeDisallowed,
          }
        : undefined,
    }),
  };
}
