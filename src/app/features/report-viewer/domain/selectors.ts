import {
  REPORT_PROFILE_DESCRIPTIONS,
  REPORT_PROFILE_DOMAINS,
  REPORT_PROFILE_LABELS,
  REPORT_PROFILES,
  type ReportProfile,
} from '@glc/intake-core';
import { DOMAIN_KEYS, DOMAIN_LABELS, type AuditState } from '../../../data/auditTypes';
import { formatAuditWebsiteDisplay } from '../../../data/no-public-website';
import type {
  ReportCoverageViewModel,
  ReportDomainViewModel,
  ReportPageViewModel,
  ReportProfileUiOption,
} from './types';

function createAllDomains(audit: AuditState): ReportDomainViewModel[] {
  return DOMAIN_KEYS.map((key) => ({
    key,
    label: DOMAIN_LABELS[key],
    data: audit.domains[key],
    score: audit.domains[key]?.score ?? 0,
  }));
}

function getCoverage(audit: AuditState, visibleDomainEntries: ReportDomainViewModel[]): ReportCoverageViewModel {
  const backendCoverage = audit.report_coverage;
  const coveredDomains = (backendCoverage?.covered_domains ?? []).filter(
    (key): key is (typeof DOMAIN_KEYS)[number] =>
      DOMAIN_KEYS.includes(key as (typeof DOMAIN_KEYS)[number]),
  );
  const missingDomains =
    backendCoverage?.not_covered_domains?.filter(
      (key): key is (typeof DOMAIN_KEYS)[number] =>
        DOMAIN_KEYS.includes(key as (typeof DOMAIN_KEYS)[number]),
    ) ?? DOMAIN_KEYS.filter((key) => !coveredDomains.includes(key));
  const coverageRatio = backendCoverage?.coverage_ratio ?? 0;
  const coverageAdjustedScore = backendCoverage?.coverage_adjusted_score ?? null;
  const plannedDomains =
    coveredDomains.length > 0
      ? coveredDomains
      : visibleDomainEntries.map((domain) => domain.key);

  return {
    plannedDomains,
    coveredDomains,
    missingDomains,
    coverageRatio,
    coverageAdjustedScore,
  };
}

export function getReportPageViewModel(audit: AuditState, profile: ReportProfile): ReportPageViewModel {
  const allDomains = createAllDomains(audit);
  const domainFilter = REPORT_PROFILE_DOMAINS[profile];
  const profileDomains =
    domainFilter === 'all'
      ? allDomains
      : allDomains.filter((domain) => (domainFilter as string[]).includes(domain.key));

  const allDomainEntries = allDomains.filter((domain) => domain.data && domain.data.score !== null);
  const averageScore =
    allDomainEntries.length > 0
      ? allDomainEntries.reduce((score, domain) => score + domain.score, 0) / allDomainEntries.length
      : 0;

  const visibleDomainEntries = profileDomains.filter((domain) => domain.data && domain.data.score !== null);
  const coverage = getCoverage(audit, visibleDomainEntries);

  const allIssues = profileDomains.flatMap((domain) => domain.data?.issues ?? []);
  const criticalIssues = allIssues.filter(
    (issue) => issue.severity === 'critical' || issue.severity === 'high',
  );
  const allStrengths = profileDomains.flatMap((domain) =>
    (domain.data?.strengths ?? []).map((text) => ({ domain: domain.label, text })),
  );
  const allQuickWins = profileDomains.flatMap((domain) => domain.data?.quick_wins ?? []);

  const followUpQuestions = Array.isArray(audit.brief?.post_audit_questions)
    ? audit.brief.post_audit_questions
    : [];
  const answeredFollowUps = followUpQuestions.filter(
    (question) => question && typeof question === 'object' && (question as { answered?: boolean }).answered,
  ).length;

  const companyName =
    audit.meta.company_name ||
    formatAuditWebsiteDisplay(audit.meta.company_url, audit.meta.no_public_website) ||
    audit.meta.company_url;

  return {
    companyName,
    profileDomains,
    allDomains,
    averageScore,
    visibleDomainEntries,
    coverage,
    allIssues,
    criticalIssues,
    allStrengths,
    allQuickWins,
    followUpQuestions,
    answeredFollowUps,
    executiveSummary: audit.strategy?.executive_summary || null,
  };
}

export function getReportProfileOptions(
  iconsByProfile: Record<ReportProfile, ReportProfileUiOption['icon']>,
): ReportProfileUiOption[] {
  return REPORT_PROFILES.map((id) => ({
    id,
    label: REPORT_PROFILE_LABELS[id],
    icon: iconsByProfile[id],
    description: REPORT_PROFILE_DESCRIPTIONS[id],
  }));
}
