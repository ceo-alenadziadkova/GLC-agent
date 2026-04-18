import { FACT_CHECKER_THRESHOLDS } from '../../../../config/fact-checker-thresholds.js';
import {
  MARKETING_COMPETITOR_RE,
  MARKETING_MARKET_SIZE_RE,
  MARKETING_NUMERIC_CLAIM_RE,
  MARKETING_ROI_RE,
  MARKETING_SOURCE_CUE_RE,
} from '../../../../config/fact-checker/marketing-claim-patterns.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../../types/audit.js';
import type { FactCorrection } from '../../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkMarketing(
  result: DomainResult,
  _collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
): void {
  if (result.score < T.marketing.flagMinScore) return;

  const mCopy = factCheckerCopy().marketing;
  const statements = [
    ...result.issues.map(i => i.description),
    ...result.recommendations.map(r => `${r.description} ${r.impact}`),
  ];

  const marketSizeClaim = statements.find(
    s => MARKETING_MARKET_SIZE_RE.test(s) && MARKETING_NUMERIC_CLAIM_RE.test(s) && !MARKETING_SOURCE_CUE_RE.test(s),
  );
  if (marketSizeClaim) {
    corrections.push({
      field: 'score',
      issue: mCopy.marketSizeClaimIssue,
      raw_evidence: interpolateFactCheckerMessage(mCopy.marketSizeClaimRawEvidenceTemplate, {
        statement: marketSizeClaim,
      }),
      action: 'flag',
    });
  }

  const competitorClaim = statements.find(
    s => MARKETING_COMPETITOR_RE.test(s) && MARKETING_NUMERIC_CLAIM_RE.test(s) && !MARKETING_SOURCE_CUE_RE.test(s),
  );
  if (competitorClaim) {
    corrections.push({
      field: 'score',
      issue: mCopy.competitorClaimIssue,
      raw_evidence: interpolateFactCheckerMessage(mCopy.competitorClaimRawEvidenceTemplate, {
        statement: competitorClaim,
      }),
      action: 'flag',
    });
  }

  const roiClaim = statements.find(s => MARKETING_ROI_RE.test(s) && MARKETING_NUMERIC_CLAIM_RE.test(s) && !MARKETING_SOURCE_CUE_RE.test(s));
  if (roiClaim) {
    corrections.push({
      field: 'score',
      issue: mCopy.roiFigureIssue,
      raw_evidence: interpolateFactCheckerMessage(mCopy.roiFigureRawEvidenceTemplate, {
        statement: roiClaim,
      }),
      action: 'flag',
    });
  }
}

