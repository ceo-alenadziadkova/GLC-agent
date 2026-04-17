import type { AuditCoveragePackage, DomainKey } from '../../../data/auditTypes';
import { NEW_AUDIT_COVERAGE_PACKAGE_DEPTH } from '../../../config/new-audit-coverage-policy';
import type { NewAuditExecutionPlan } from '../newAuditExecution';

export function buildExecutionPlan(params: {
  coveragePackage: AuditCoveragePackage;
  selectedDomains: DomainKey[];
  recommendedDomains: DomainKey[];
}): NewAuditExecutionPlan {
  const depth = NEW_AUDIT_COVERAGE_PACKAGE_DEPTH[params.coveragePackage];
  return {
    selected_domains: params.selectedDomains,
    depth,
    source: 'user_selected',
    recommended_domains: params.recommendedDomains,
    coverage_package: params.coveragePackage,
    include_strategy: params.coveragePackage !== 'starter',
  };
}
