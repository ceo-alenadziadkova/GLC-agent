import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../../../config/fact-checker-copy.js';
import type { DomainResult } from '../../../types/audit.js';
import type { FactCorrection } from '../types.js';

const T = FACT_CHECKER_THRESHOLDS;

export function checkScoreConsistency(result: DomainResult, corrections: FactCorrection[]): void {
  const cCopy = factCheckerCopy().consistency;

  // Score 5 should not have critical issues
  if (result.score === T.consistency.maxScore && result.issues.some(i => i.severity === 'critical')) {
    corrections.push({
      field: 'score',
      issue: cCopy.criticalWithMaxScoreIssue,
      raw_evidence: interpolateFactCheckerMessage(cCopy.criticalWithMaxScoreRawEvidenceTemplate, {
        titles: result.issues.filter(i => i.severity === 'critical').map(i => i.title).join(', '),
      }),
      action: 'flag',
    });
  }

  // Score 1 should have at least one critical issue
  if (result.score === T.consistency.minScore && !result.issues.some(i => i.severity === 'critical' || i.severity === 'high')) {
    corrections.push({
      field: 'score',
      issue: cCopy.minScoreNoSevereIssue,
      raw_evidence: interpolateFactCheckerMessage(cCopy.minScoreNoSevereRawEvidenceTemplate, {
        max_severity: result.issues[0]?.severity ?? 'none',
      }),
      action: 'flag',
    });
  }

  // Strengths/weaknesses balance
  if (result.score >= T.consistency.highScoreFlagMin && result.weaknesses.length > result.strengths.length * T.consistency.strengthsToWeaknessesRatio) {
    corrections.push({
      field: 'score',
      issue: cCopy.weaknessesBalanceIssue,
      raw_evidence: interpolateFactCheckerMessage(cCopy.weaknessesBalanceRawEvidenceTemplate, {
        strengths: result.strengths.length,
        weaknesses: result.weaknesses.length,
      }),
      action: 'flag',
    });
  }
}

