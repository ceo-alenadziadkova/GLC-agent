/**
 * English copy for quality gate flags (`ConsistencyChecker`) and pipeline_events summary lines.
 */

export function qualityGateFailedDomainMessage(domainKey: string): string {
  return `${domainKey} could not be analysed — pipeline continued without it. Verify the cause before approving.`;
}

export function qualityGateScoreHighWithCriticalMessage(domainKey: string, score: number): string {
  return `${domainKey} scored ${score}/5 (Good/Excellent) but contains a critical-severity issue. Score may be over-optimistic.`;
}

export function qualityGateScoreLowWithoutCriticalHighMessage(domainKey: string, score: number): string {
  return `${domainKey} scored ${score}/5 but has no critical or high severity issues — score may be too conservative.`;
}

export function qualityGateLowConfidenceMajorityMessage(input: {
  domainKey: string;
  lowCount: number;
  issueCount: number;
  lowRatio: number;
}): string {
  const pct = Math.round(input.lowRatio * 100);
  return `${input.domainKey}: ${input.lowCount} of ${input.issueCount} findings (${pct}%) have low confidence. Review carefully before proceeding.`;
}

export function qualityGateExcessiveDataGapsMessage(domainKey: string, unknownCount: number): string {
  return `${domainKey}: ${unknownCount} areas could not be assessed — consider collecting additional data before the analytic phases.`;
}

export function qualityGateLowConfidenceCriticalMessage(
  domainKey: string,
  count: number,
  firstTitle: string,
): string {
  return `${domainKey}: ${count} critical finding(s) with low confidence — "${firstTitle}". Verify these before including in the report.`;
}

export function qualityGateEventMessagePassed(): string {
  return 'Quality gate passed — no warnings found';
}

export function qualityGateEventMessageWarnings(warningCount: number): string {
  return `Quality gate: ${warningCount} warning(s) require attention`;
}
