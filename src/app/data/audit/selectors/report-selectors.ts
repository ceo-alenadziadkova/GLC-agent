import type { AuditDomain } from '../contracts/report-types';

export function selectCriticalIssueCount(domains: AuditDomain[]): number {
  return domains
    .flatMap((domain) => domain.issues)
    .filter((issue) => issue.severity === 'critical' || issue.severity === 'high').length;
}

export function selectQuickWins(domains: AuditDomain[]): AuditDomain['quickWins'][number][] {
  return domains.flatMap((domain) => domain.quickWins);
}

export function selectAverageScore(domains: AuditDomain[]): number {
  if (domains.length === 0) return 0;
  const total = domains.reduce((sum, domain) => sum + domain.score, 0);
  return total / domains.length;
}
