/**
 * English consultant-facing strings for Decision Layer outcomes (static copy layer).
 */

export function formatDecisionFeasibilityRefineReasoning(p: {
  feasibilityScore: string;
  threshold: number;
  phaseId: string;
  riskCodesJoined: string;
}): string {
  return (
    `Feasibility score ${p.feasibilityScore} ≤ ${p.threshold} for delivery-risk domain '${p.phaseId}'. ` +
    `Risks: ${p.riskCodesJoined}.`
  );
}

export function formatDecisionAcceptReasoning(p: { overall: number; hallucinationPct: string }): string {
  return `Confidence ${p.overall}/100. Hallucination fraction ${p.hallucinationPct}% — within threshold.`;
}

export function formatDecisionAcceptWithWarningsReasoning(p: { overall: number; issuesJoined: string }): string {
  return `Confidence ${p.overall}/100. Issues: ${p.issuesJoined}.`;
}

export function formatDecisionWarningDataGaps(count: number): string {
  return `${count} data gap(s)`;
}

export function formatDecisionWarningFixable(count: number, codesJoined: string): string {
  return `${count} fixable issue(s): ${codesJoined}`;
}

export const DECISION_WARNING_HUMAN_ATTENTION_FLAGGED = 'human attention flagged' as const;

export function formatDecisionRefineLowConfidence(overall: number): string {
  return `low confidence (${overall}/100)`;
}

export function formatDecisionRefineStructuralErrors(codesJoined: string): string {
  return `structural errors: ${codesJoined}`;
}

export function formatDecisionRefineHallucinationCount(count: number): string {
  return `hallucination count: ${count}`;
}

export function formatDecisionRefineSummary(refineReasonsJoined: string): string {
  return `Refine recommended — ${refineReasonsJoined}.`;
}
