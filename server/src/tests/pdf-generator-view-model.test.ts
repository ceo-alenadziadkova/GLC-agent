import { describe, expect, it } from 'vitest';

import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  REPORT_PROFILER_ONEPAGER_TOP_ISSUES_MAX,
  REPORT_PROFILER_ONEPAGER_TOP_QUICK_WINS_MAX,
  REPORT_PROFILER_OWNER_TOP_ISSUES_MAX,
  REPORT_PROFILER_OWNER_TOP_RECS_MAX,
} from '../config/report-profiler-limits.js';
import {
  filterDomainsForPdf,
  selectOnepagerTopIssues,
  selectOnepagerTopQuickWins,
  selectOwnerTopIssues,
  selectOwnerTopRecs,
  type DomainRow,
} from '../services/pdf-generator/lib/view-model.js';

function issue(sev: string, title: string): NonNullable<DomainRow['issues']>[number] {
  return {
    id: title,
    severity: sev,
    title,
    description: '',
    impact: '',
  };
}

function domain(
  key: string,
  opts: {
    issues?: NonNullable<DomainRow['issues']>;
    quick_wins?: NonNullable<DomainRow['quick_wins']>;
    recommendations?: NonNullable<DomainRow['recommendations']>;
    status?: string;
  } = {},
): DomainRow {
  return {
    domain_key: key,
    score: 3,
    label: null,
    summary: null,
    strengths: null,
    weaknesses: null,
    issues: opts.issues ?? null,
    quick_wins: opts.quick_wins ?? null,
    recommendations: opts.recommendations ?? null,
    status: opts.status ?? 'completed',
    phase_number: 1,
  };
}

describe('pdf-generator view-model', () => {
  it('uses the same numeric caps as SYSTEM_DEFAULTS.reportProfiler', () => {
    const P = SYSTEM_DEFAULTS.reportProfiler;
    expect(REPORT_PROFILER_ONEPAGER_TOP_ISSUES_MAX).toBe(P.onepagerTopIssuesMax);
    expect(REPORT_PROFILER_ONEPAGER_TOP_QUICK_WINS_MAX).toBe(P.onepagerTopQuickWinsMax);
    expect(REPORT_PROFILER_OWNER_TOP_ISSUES_MAX).toBe(P.ownerTopIssuesMax);
    expect(REPORT_PROFILER_OWNER_TOP_RECS_MAX).toBe(P.ownerTopRecsMax);
  });

  it('filterDomainsForPdf keeps only completed rows', () => {
    const rows = [
      domain('tech_infrastructure', { status: 'completed' }),
      domain('seo_digital', { status: 'pending' }),
    ];
    const out = filterDomainsForPdf('full', rows);
    expect(out.map(d => d.domain_key)).toEqual(['tech_infrastructure']);
  });

  it('caps onepager issues and quick wins', () => {
    const manyIssues = Array.from({ length: 10 }, (_, i) => issue('high', `H${i}`));
    const manyQw = Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`,
      title: `Q${i}`,
      description: '',
    }));
    const rows = [domain('tech_infrastructure', { issues: manyIssues, quick_wins: manyQw })];
    expect(selectOnepagerTopIssues(rows)).toHaveLength(REPORT_PROFILER_ONEPAGER_TOP_ISSUES_MAX);
    expect(selectOnepagerTopQuickWins(rows)).toHaveLength(REPORT_PROFILER_ONEPAGER_TOP_QUICK_WINS_MAX);
  });

  it('caps owner issues and high-priority recs', () => {
    const issues = Array.from({ length: 12 }, (_, i) => issue('critical', `C${i}`));
    const recs = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i}`,
      title: `R${i}`,
      description: '',
      priority: 'high',
    }));
    const rows = [domain('tech_infrastructure', { issues, recommendations: recs })];
    expect(selectOwnerTopIssues(rows)).toHaveLength(REPORT_PROFILER_OWNER_TOP_ISSUES_MAX);
    expect(selectOwnerTopRecs(rows)).toHaveLength(REPORT_PROFILER_OWNER_TOP_RECS_MAX);
  });
});
