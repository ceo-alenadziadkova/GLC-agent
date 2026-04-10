import type { IntakePlanCoverageDomain } from '@glc/intake-core';
import { DOMAIN_LABELS, type DomainKey } from '../data/auditTypes';

/** Human labels for `IntakePlan.missingForReport` / `coverage.byDomain` keys. */
export function labelIntakeCoverageDomain(d: IntakePlanCoverageDomain): string {
  if (d === 'recon') return 'Business context';
  if (d === 'strategy') return 'Strategy';
  return DOMAIN_LABELS[d as DomainKey];
}

export function labelsForMissingReportDomains(domains: readonly IntakePlanCoverageDomain[]): string[] {
  return domains.map(labelIntakeCoverageDomain);
}
