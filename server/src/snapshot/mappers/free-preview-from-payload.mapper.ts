import type { FreeSnapshotPreview } from '../../types/audit.js';
import { legacyUxLabelForScore } from '../../config/snapshot-ux-legacy-labels.js';
import { overallToLegacyScore } from '../audit/run-audit.js';
import { SNAPSHOT_PREVIEW_LIMITS } from '../config/snapshot-runtime.js';
import {
  buildSnapshotSummary,
  mapIssuesForDomain,
  mapQuickWinsForDomain,
  syntheticDomainResult,
} from '../domain/snapshot-domain-result.js';
import type { SnapshotCachePayload } from '../types.js';
import { toApiScanCoverage } from './snapshot-scan-coverage-api.mapper.js';

export function buildPreviewFromPayload(
  auditId: string,
  token: string,
  companyUrl: string,
  p: SnapshotCachePayload,
  opts?: { fromDomainCache?: boolean },
): FreeSnapshotPreview {
  const fromDomainCache = opts?.fromDomainCache === true;
  const legacy = overallToLegacyScore(p.audit.overallScore);
  const label = legacyUxLabelForScore(legacy);

  const issues = mapIssuesForDomain(p).slice(0, SNAPSHOT_PREVIEW_LIMITS.issuesMax);
  const quickWins = mapQuickWinsForDomain(p).slice(0, SNAPSHOT_PREVIEW_LIMITS.quickWinsMax);

  const scanBasisCode = fromDomainCache ? 'cache_hit' : p.audit.scanBasisCode;

  return {
    audit_id: auditId,
    snapshot_token: token,
    status: 'completed',
    company_url: companyUrl,
    company_name: p.company_name,
    tech_stack: p.tech_stack,
    location: p.location,
    ux_score: legacy,
    ux_label: label,
    ux_summary: buildSnapshotSummary(p),
    issues:
      issues.length > 0
        ? issues
        : syntheticDomainResult(legacy, buildSnapshotSummary(p), [], []).issues.slice(
            0,
            SNAPSHOT_PREVIEW_LIMITS.issuesMax,
          ),
    quick_wins:
      quickWins.length > 0
        ? quickWins
        : syntheticDomainResult(legacy, buildSnapshotSummary(p), [], []).quick_wins.slice(
            0,
            SNAPSHOT_PREVIEW_LIMITS.quickWinsMax,
          ),
    overall_score: p.audit.overallScore,
    category_scores: p.audit.categoryScores as FreeSnapshotPreview['category_scores'],
    scan_basis: p.audit.scanBasis,
    signals_found: p.audit.signalsFound,
    scan_confidence_band: p.audit.scanConfidenceBand,
    site_profile: p.site_profile,
    classification_confidence_band: p.site_profile.classificationConfidenceBand,
    ...(typeof p.audit.rulesCatalogVersion === 'number'
      ? { audit_rules_version: p.audit.rulesCatalogVersion }
      : {}),
    ...(p.scan_coverage ? { scan_coverage: toApiScanCoverage(p.scan_coverage) } : {}),
    ...(scanBasisCode ? { scan_basis_code: scanBasisCode } : {}),
    cache_hit: fromDomainCache,
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
  };
}
