import { DOMAIN_KEYS, type DomainKey } from '../../types/audit.js';

export interface AuditReportCoverageView {
  covered_domains: DomainKey[];
  not_covered_domains: DomainKey[];
  coverage_ratio: number;
  coverage_adjusted_score: number | null;
  comparability_note: string;
}

type AuditCoverageInput = {
  overall_score: number | null;
  execution_plan?: {
    selected_domains?: string[];
  } | null;
};

type DomainRowCoverageInput = {
  domain_key: string;
  status: string | null;
};

function isDomainKey(value: string): value is DomainKey {
  return DOMAIN_KEYS.includes(value as DomainKey);
}

export function buildAuditReportCoverage(
  audit: AuditCoverageInput,
  domains: DomainRowCoverageInput[],
): AuditReportCoverageView {
  const completed: DomainKey[] = domains
    .filter((domain) => domain.status === 'completed' && isDomainKey(domain.domain_key))
    .map((domain) => domain.domain_key as DomainKey);
  const selected = Array.isArray(audit.execution_plan?.selected_domains)
    ? audit.execution_plan?.selected_domains.filter(isDomainKey)
    : [];

  const coveredDomains =
    selected.length > 0 ? selected.filter((domain) => completed.includes(domain)) : completed;
  const coveredSet = new Set(coveredDomains);
  const notCoveredDomains = DOMAIN_KEYS.filter((domain) => !coveredSet.has(domain));
  const coverageRatio = coveredDomains.length / DOMAIN_KEYS.length;
  const coverageAdjustedScore =
    typeof audit.overall_score === 'number'
      ? Number((audit.overall_score * coverageRatio).toFixed(2))
      : null;

  return {
    covered_domains: coveredDomains,
    not_covered_domains: notCoveredDomains,
    coverage_ratio: coverageRatio,
    coverage_adjusted_score: coverageAdjustedScore,
    comparability_note:
      coveredDomains.length < DOMAIN_KEYS.length
        ? `Partial audit: do not compare this overall score directly with complete (${DOMAIN_KEYS.length}-domain) audits.`
        : 'Complete coverage: overall score is comparable to other complete audits.',
  };
}
