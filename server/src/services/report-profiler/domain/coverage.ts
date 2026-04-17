import { DOMAIN_KEYS } from '../../../types/audit.js';
import { REPORT_PROFILER_CONFIG } from '../config.js';
import type { MarkdownReportCoverage, ReportInput } from '../types.js';

const REPORT_DOMAIN_KEYS = [...DOMAIN_KEYS] as readonly string[];
const REPORT_DOMAIN_COUNT = REPORT_DOMAIN_KEYS.length;

export function buildCoverage(input: ReportInput): MarkdownReportCoverage {
  const selected = input.audit.execution_plan?.selected_domains;
  const completed = input.domains
    .filter((domain) => domain.status === 'completed')
    .map((domain) => domain.domain_key);
  const covered =
    Array.isArray(selected) && selected.length > 0
      ? selected.filter((domain) => completed.includes(domain))
      : completed;

  const coveredSet = new Set(covered);
  const notCovered = REPORT_DOMAIN_KEYS.filter((domain) => !coveredSet.has(domain));
  const coverageRatio = covered.length / REPORT_DOMAIN_COUNT;
  const comparabilityNote =
    covered.length < REPORT_DOMAIN_COUNT
      ? REPORT_PROFILER_CONFIG.markdown.coverageComparability.partial.replace(
          '{count}',
          String(REPORT_DOMAIN_COUNT),
        )
      : REPORT_PROFILER_CONFIG.markdown.coverageComparability.complete;

  return {
    covered_domains: covered,
    not_covered_domains: notCovered,
    coverage_ratio: coverageRatio,
    coverage_adjusted_score:
      typeof input.audit.overall_score === 'number'
        ? Number((input.audit.overall_score * coverageRatio).toFixed(2))
        : null,
    comparability_note: comparabilityNote,
  };
}

export function getReportDomainCount(): number {
  return REPORT_DOMAIN_COUNT;
}
