import type { DomainResult, FreeSnapshotPreview } from '../../types/audit.js';
import type { SnapshotCachePayload } from '../types.js';
import { getAuditRules } from '../audit/parse-audit-rules.js';
import { ISSUE_MESSAGES, QUICK_WIN_MESSAGES } from '../messages.js';
import { overallToLegacyScore } from '../audit/run-audit.js';
import { SNAPSHOT_EXTRACTION_LIMITS, SNAPSHOT_PREVIEW_LIMITS } from '../config/snapshot-runtime.js';

export function buildSnapshotSummary(p: SnapshotCachePayload): string {
  if (p.degraded) {
    const cov = p.scan_coverage;
    const pages = typeof cov?.pagesFetched === 'number' ? cov.pagesFetched : 0;
    if (cov?.robotsHomeDisallowed === true && pages < 1) {
      return 'No snapshot score — 0 pages sampled (homepage blocked by crawl policy). A full audit can use your brief or approved access.';
    }
    const first = p.limitations?.[0] ?? 'Pages could not be loaded.';
    return `No automated GLC snapshot score — ${first}`;
  }
  const parts = [
    `Snapshot score ${p.audit.overallScore}/100 (${p.audit.scanConfidenceBand} confidence scan).`,
    p.site_profile.shortLabel ? `Profile: ${p.site_profile.shortLabel}.` : '',
  ];
  return parts.join(' ').trim();
}

export function mapIssuesForDomain(p: SnapshotCachePayload): DomainResult['issues'] {
  if (p.degraded && p.limitations?.length) {
    return [
      {
        id: 'snapshot-degraded',
        severity: 'medium',
        title: 'Snapshot could not sample this website',
        description: p.limitations.join(' '),
        impact: 'Automated read was blocked or failed before scoring.',
        confidence: 'high',
        evidence_refs: p.limitations.map(finding => ({ type: 'snapshot_limitation', finding })),
        data_source: 'auto_detected',
      },
    ];
  }
  const catalog = getAuditRules();
  const byId = new Map(catalog.map(r => [r.id, r]));
  const rules = p.audit.ruleResults.filter(r => r.issueKey && r.status !== 'pass');
  const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const top = [...rules]
    .map(r => ({
      r,
      pri: severityRank[byId.get(r.id)?.severity ?? 'medium'] * r.maxScore,
    }))
    .sort((a, b) => b.pri - a.pri)
    .slice(0, SNAPSHOT_PREVIEW_LIMITS.issuesMax)
    .map(x => x.r);
  if (top.length === 0) return [];
  return top.map(r => ({
    id: `snapshot-${r.id}`,
    severity: (byId.get(r.id)?.severity ?? 'medium') as import('../../types/audit.js').AuditIssue['severity'],
    title: ISSUE_MESSAGES[r.issueKey!] ?? r.issueKey!,
    description: ISSUE_MESSAGES[r.issueKey!] ?? '',
    impact: 'Snapshot heuristic based on homepage and a few linked pages.',
    confidence: 'medium' as const,
    evidence_refs: r.evidence.slice(0, SNAPSHOT_EXTRACTION_LIMITS.evidenceRefsMax).map(finding => ({ type: 'snapshot_rule', finding })),
    data_source: 'auto_detected' as const,
  }));
}

export function mapQuickWinsForDomain(p: SnapshotCachePayload): DomainResult['quick_wins'] {
  if (p.degraded) {
    return [
      {
        id: 'snapshot-qw-degraded',
        title: 'Fix robots.txt or availability',
        description:
          'Allow good-faith crawlers to read the homepage, or retry when the site responds reliably — then run the free check again.',
        effort: 'low' as const,
        timeframe: 'Same day',
      },
    ];
  }
  const issues = mapIssuesForDomain(p);
  return issues.slice(0, SNAPSHOT_PREVIEW_LIMITS.quickWinsMax).map(iss => {
    const id = iss.id.replace('snapshot-', '');
    return {
      id: `snapshot-qw-${id}`,
      title: QUICK_WIN_MESSAGES[id] ?? 'Improve the highlighted area.',
      description: QUICK_WIN_MESSAGES[id] ?? '',
      effort: 'low' as const,
      timeframe: '1–7 days',
    };
  });
}

export function syntheticDomainResult(
  legacyScore: number,
  summary: string,
  issues: DomainResult['issues'],
  quickWins: DomainResult['quick_wins'],
): DomainResult {
  const label =
    legacyScore >= 4 ? 'Good' : legacyScore >= 3 ? 'Moderate' : legacyScore >= 2 ? 'Needs Work' : 'Critical';
  return {
    score: legacyScore,
    label,
    summary: summary.length >= 50 ? summary : `${summary} Free snapshot is based on quick heuristics only.`,
    strengths: [
      'Deterministic scan completed without LLM cost.',
      'Findings tie to observable homepage signals.',
    ],
    weaknesses: ['Only a few pages were sampled; deep crawl and expert review are not included.'],
    issues: issues.length > 0
      ? issues
      : [{
          id: 'snapshot-placeholder-issue',
          severity: 'low',
          title: 'No major snapshot flags on the sampled pages.',
          description: 'Heuristic checks did not surface top issues; a full audit may still find improvements.',
          impact: 'Informational',
          confidence: 'low',
          evidence_refs: [{ type: 'snapshot_rule', finding: 'all MVP rules passed or partial' }],
          data_source: 'auto_detected',
        }],
    quick_wins: quickWins.length > 0
      ? quickWins
      : [{
          id: 'snapshot-placeholder-qw',
          title: 'Run a full audit for deeper UX, SEO, and tech review.',
          description: 'The free snapshot uses a small rule set on limited pages.',
          effort: 'low',
          timeframe: 'When you are ready to prioritise roadmap work',
        }],
    recommendations: [{
      id: 'snapshot-rec-1',
      title: 'Upgrade to a full GLC audit',
      description: 'Covers all domains, more pages, and expert-quality synthesis.',
      priority: 'high' as const,
      estimated_cost: 'See pricing',
      estimated_time: 'Varies',
      impact: 'High',
    }],
    unknown_items: ['Full funnel, performance lab data, and security depth are out of scope for free snapshot.'],
    confidence_distribution: { high: 0, medium: 1, low: 1 },
  };
}

export function derivePublicUxFieldsFromSnapshotPayload(p: SnapshotCachePayload): {
  ux_score: number;
  ux_label: string;
  ux_summary: string;
  issues: FreeSnapshotPreview['issues'];
  quick_wins: FreeSnapshotPreview['quick_wins'];
} {
  const domainRes = syntheticDomainResult(
    overallToLegacyScore(p.audit.overallScore),
    buildSnapshotSummary(p),
    mapIssuesForDomain(p),
    mapQuickWinsForDomain(p),
  );
  return {
    ux_score: domainRes.score,
    ux_label: domainRes.label,
    ux_summary: domainRes.summary,
    issues: domainRes.issues.slice(0, SNAPSHOT_PREVIEW_LIMITS.issuesMax) as FreeSnapshotPreview['issues'],
    quick_wins: domainRes.quick_wins.slice(0, SNAPSHOT_PREVIEW_LIMITS.quickWinsMax) as FreeSnapshotPreview['quick_wins'],
  };
}
