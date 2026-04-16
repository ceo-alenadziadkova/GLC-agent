import { FACT_CHECKER_THRESHOLDS } from '../../../../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../../types/audit.js';
import type { FactCorrection } from '../../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkTech(
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
): void {
  const perfData = collected['performance'];
  if (!perfData) return;

  const headers = perfData.headers as {
    compression: { enabled: boolean };
    caching: { has_cache_policy: boolean };
    https_available?: boolean;
  } | undefined;

  const pageWeights = perfData.page_weights as {
    avg_load_time_ms: number;
    lazy_load_coverage: number;
  } | undefined;

  const techCopy = factCheckerCopy().tech;

  if (headers) {
    if (!headers.compression.enabled && result.score >= T.tech.flagMinScore) {
      corrections.push({
        field: 'score',
        issue: techCopy.noCompressionIssue,
        raw_evidence: techCopy.noCompressionRawEvidence,
        action: 'flag',
      });
    }

    if (!headers.caching.has_cache_policy && result.score >= T.tech.flagMinScore) {
      corrections.push({
        field: 'score',
        issue: techCopy.noCacheIssue,
        raw_evidence: techCopy.noCacheRawEvidence,
        action: 'flag',
      });
    }

    if (headers.https_available === false) {
      if (result.score >= T.tech.flagMinScore) {
        corrections.push({
          field: 'score',
          issue: techCopy.noHttpsIssue,
          raw_evidence: techCopy.noHttpsRawEvidence,
          action: 'flag',
        });
      }
    }
  }

  if (pageWeights) {
    if (pageWeights.avg_load_time_ms > T.tech.maxAvgLoadTimeMs && result.score >= T.tech.flagMinScore) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(techCopy.slowAverageLoadIssueTemplate, {
          ms: pageWeights.avg_load_time_ms,
        }),
        raw_evidence: interpolateFactCheckerMessage(techCopy.slowAverageLoadRawEvidenceTemplate, {
          ms: pageWeights.avg_load_time_ms,
        }),
        action: 'flag',
      });
    }

    if (pageWeights.lazy_load_coverage < T.tech.minLazyLoadCoveragePercent && result.score >= T.tech.flagMinScore) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(techCopy.lowLazyLoadCoverageIssueTemplate, {
          pct: pageWeights.lazy_load_coverage,
        }),
        raw_evidence: interpolateFactCheckerMessage(techCopy.lowLazyLoadCoverageRawEvidenceTemplate, {
          pct: pageWeights.lazy_load_coverage,
        }),
        action: 'flag',
      });
    }
  }
}

