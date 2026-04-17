/**
 * Pure selection rules for PDF export.
 *
 * PDF includes only domains with `status === 'completed'`. The markdown `ReportProfiler`
 * filters by profile but not by completion status — an intentional product difference
 * (printed PDF should not show in-progress domain shells).
 */

import { REPORT_PROFILE_DOMAINS, type ReportProfile } from '@glc/intake-core';

import {
  REPORT_PROFILER_ONEPAGER_TOP_ISSUES_MAX,
  REPORT_PROFILER_ONEPAGER_TOP_QUICK_WINS_MAX,
  REPORT_PROFILER_OWNER_TOP_ISSUES_MAX,
  REPORT_PROFILER_OWNER_TOP_RECS_MAX,
} from '../../../config/report-profiler-limits.js';
import type { ReportInput } from '../../report-profiler.js';

export type DomainRow = ReportInput['domains'][0];

type DomainIssue = NonNullable<DomainRow['issues']>[number];

export function filterDomainsForPdf(profile: ReportProfile, domains: DomainRow[]): DomainRow[] {
  const allowed = REPORT_PROFILE_DOMAINS[profile];
  const byProfile =
    allowed === 'all'
      ? domains
      : domains.filter(d => (allowed as string[]).includes(d.domain_key));
  return byProfile.filter(d => d.status === 'completed');
}

export function selectOnepagerTopIssues(domains: DomainRow[]): DomainIssue[] {
  return domains
    .flatMap(d => d.issues ?? [])
    .filter(i => i.severity === 'critical' || i.severity === 'high')
    .slice(0, REPORT_PROFILER_ONEPAGER_TOP_ISSUES_MAX);
}

export function selectOnepagerTopQuickWins(domains: DomainRow[]): NonNullable<DomainRow['quick_wins']> {
  return domains.flatMap(d => d.quick_wins ?? []).slice(0, REPORT_PROFILER_ONEPAGER_TOP_QUICK_WINS_MAX);
}

export type OwnerIssueRow = DomainIssue & { domainKey: string };

export function selectOwnerTopIssues(domains: DomainRow[]): OwnerIssueRow[] {
  return domains
    .flatMap(d => (d.issues ?? []).map(i => ({ ...i, domainKey: d.domain_key })))
    .filter(i => i.severity === 'critical' || i.severity === 'high')
    .slice(0, REPORT_PROFILER_OWNER_TOP_ISSUES_MAX);
}

export type OwnerRecRow = NonNullable<DomainRow['recommendations']>[number] & { domainKey: string };

export function selectOwnerTopRecs(domains: DomainRow[]): OwnerRecRow[] {
  return domains
    .flatMap(d =>
      (d.recommendations ?? [])
        .filter(r => r.priority === 'high')
        .map(r => ({ ...r, domainKey: d.domain_key })),
    )
    .slice(0, REPORT_PROFILER_OWNER_TOP_RECS_MAX);
}
