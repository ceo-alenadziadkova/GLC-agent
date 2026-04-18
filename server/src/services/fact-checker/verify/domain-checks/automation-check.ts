import { FACT_CHECKER_THRESHOLDS } from '../../../../config/fact-checker-thresholds.js';
import {
  ROI_TIMELINE_PATTERN,
  SOURCE_CUE_PATTERN,
  TIME_SAVING_PATTERN,
  TOOL_CAPABILITY_PATTERN,
} from '../../../../config/fact-checker/automation-claim-patterns.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../../types/audit.js';
import type { FactCorrection } from '../../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkAutomation(
  result: DomainResult,
  _collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
): void {
  if (result.score < T.automation.flagMinScore) return;

  const aCopy = factCheckerCopy().automation;
  const statements = [
    ...result.issues.map(i => i.description),
    ...result.recommendations.map(r => `${r.description} ${r.impact}`),
  ];

  const timeSavingClaim = statements.find(s => TIME_SAVING_PATTERN.test(s) && !SOURCE_CUE_PATTERN.test(s));
  if (timeSavingClaim) {
    corrections.push({
      field: 'score',
      issue: aCopy.timeSavingIssue,
      raw_evidence: interpolateFactCheckerMessage(aCopy.timeSavingRawEvidenceTemplate, {
        statement: timeSavingClaim,
      }),
      action: 'flag',
    });
  }

  const toolCapabilityClaim = statements.find(s => TOOL_CAPABILITY_PATTERN.test(s) && !SOURCE_CUE_PATTERN.test(s));
  if (toolCapabilityClaim) {
    corrections.push({
      field: 'score',
      issue: aCopy.toolCapabilityIssue,
      raw_evidence: interpolateFactCheckerMessage(aCopy.toolCapabilityRawEvidenceTemplate, {
        statement: toolCapabilityClaim,
      }),
      action: 'flag',
    });
  }

  const roiTimelineClaim = statements.find(s => {
    const m = s.match(ROI_TIMELINE_PATTERN);
    if (!m) return false;
    const months = Number(m[2]);
    return Number.isFinite(months) && months <= T.automation.maxQuickRoiMonths && !SOURCE_CUE_PATTERN.test(s);
  });
  if (roiTimelineClaim) {
    const months = Number(roiTimelineClaim.match(ROI_TIMELINE_PATTERN)?.[2] ?? 0);
    corrections.push({
      field: 'score',
      issue: interpolateFactCheckerMessage(aCopy.roiTimelineIssueTemplate, {
        months,
      }),
      raw_evidence: interpolateFactCheckerMessage(aCopy.roiTimelineRawEvidenceTemplate, {
        statement: roiTimelineClaim,
      }),
      action: 'flag',
    });
  }
}

