import type { AuditIssue, QuickWin } from '../../types/audit.js';
import type { RuleResult, SiteProfile, SnapshotAuditResult, SnapshotFacts } from '../types.js';
import { ISSUE_MESSAGES, QUICK_WIN_MESSAGES } from '../messages.js';
import {
  auditRuleAppliesToSiteType,
  getAuditRules,
  getAuditRulesCatalogVersion,
} from './parse-audit-rules.js';
import { runEvaluator } from './evaluators.js';
import { deriveScanBasisCode } from '../scan-basis-code.js';

const CATEGORY_KEYS = [
  'ux_clarity',
  'conversion_readiness',
  'ai_readiness',
  'technical_basics',
] as const;

function aggregate(ruleResults: RuleResult[]): {
  categoryScores: Record<string, number>;
  overallScore: number;
} {
  const totals: Record<string, { earned: number; max: number }> = {};
  for (const k of CATEGORY_KEYS) {
    totals[k] = { earned: 0, max: 0 };
  }
  for (const r of ruleResults) {
    const t = totals[r.category];
    if (!t) continue;
    t.earned += r.score;
    t.max += r.maxScore;
  }
  const categoryScores: Record<string, number> = {};
  let earnedAll = 0;
  let maxAll = 0;
  for (const k of CATEGORY_KEYS) {
    const t = totals[k]!;
    maxAll += t.max;
    earnedAll += t.earned;
    categoryScores[k] = t.max > 0 ? Math.round((t.earned / t.max) * 100) : 0;
  }
  const overallScore = maxAll > 0 ? Math.round((earnedAll / maxAll) * 100) : 0;
  return { categoryScores, overallScore };
}

const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function pickTopIssues(results: RuleResult[], limit: number): RuleResult[] {
  const rules = getAuditRules();
  const byId = new Map(rules.map(r => [r.id, r]));
  return results
    .filter(r => r.issueKey && r.status !== 'pass')
    .map(r => {
      const row = byId.get(r.id);
      const sev = row?.severity ?? 'medium';
      return { r, priority: severityRank[sev]! * r.maxScore };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(x => x.r);
}

function pickTopQuickWins(fromIssues: RuleResult[], limit: number): RuleResult[] {
  return fromIssues.filter(r => r.quickWinKey).slice(0, limit);
}

function scanConfidence(facts: SnapshotFacts): SnapshotAuditResult['scanConfidenceBand'] {
  if (facts.contentQuality === 'low') return 'low';
  if (facts.contentQuality === 'medium') return 'medium';
  return 'high';
}

function signalsFound(facts: SnapshotFacts): string[] {
  const out: string[] = [];
  if (facts.schema.types.length) out.push('structured data (JSON-LD)');
  if (facts.siteText.ctaTexts.length) out.push('CTA buttons/links');
  if (facts.forms.present) out.push('form');
  if (facts.contact.phonePresent || facts.contact.emailPresent) out.push('contact links');
  if (facts.tech.platforms.length) out.push('tech stack hints');
  if (facts.siteText.title) out.push('metadata');
  if (facts.meta.viewportPresent) out.push('viewport meta');
  return out;
}

export type SnapshotScanMeta = {
  pagesFetched: number;
  maxPagesPlanned: number;
  playwrightUsed?: boolean;
};

function buildScanBasis(facts: SnapshotFacts, scanMeta?: SnapshotScanMeta): string {
  if (scanMeta && scanMeta.pagesFetched > 0) {
    return `Sample of ${scanMeta.pagesFetched} same-origin page(s) (up to ${scanMeta.maxPagesPlanned} allowed) plus link-path signals — HTML only, not a full crawl.`;
  }
  return 'homepage + visible site signals (free snapshot)';
}

/**
 * @param siteProfile When set, rules with `onlyForSiteTypes` / `skipForSiteTypes` in YAML are filtered.
 * @param scanMeta Optional fetch coverage summary for user-facing scan_basis text.
 */
export function runSnapshotAudit(
  facts: SnapshotFacts,
  siteProfile?: SiteProfile | undefined,
  scanMeta?: SnapshotScanMeta,
): {
  audit: SnapshotAuditResult;
  issues: AuditIssue[];
  quickWins: QuickWin[];
  ruleResults: RuleResult[];
} {
  const siteType = siteProfile?.siteType ?? 'unknown';
  const rules = getAuditRules().filter(r => auditRuleAppliesToSiteType(r, siteType));
  const ruleResults = rules.map(r => runEvaluator(facts, r));
  const { categoryScores, overallScore } = aggregate(ruleResults);

  const topIssueRules = pickTopIssues(ruleResults, 2);
  const topWinRules = pickTopQuickWins(topIssueRules, 2);

  const issues: AuditIssue[] = topIssueRules.map(r => ({
    id: `snapshot-${r.id}`,
    severity: (getAuditRules().find(x => x.id === r.id)?.severity ?? 'medium') as AuditIssue['severity'],
    title: ISSUE_MESSAGES[r.issueKey!] ?? r.issueKey!,
    description: ISSUE_MESSAGES[r.issueKey!] ?? '',
    impact: 'Snapshot heuristic based on homepage and a few linked pages.',
    confidence: facts.contentQuality === 'low' ? 'low' : 'medium',
    evidence_refs: r.evidence.slice(0, 5).map(finding => ({
      type: 'snapshot_rule',
      finding,
    })),
    data_source: 'auto_detected',
  }));

  const quickWins: QuickWin[] = topWinRules.map(r => ({
    id: `snapshot-qw-${r.id}`,
    title: QUICK_WIN_MESSAGES[r.quickWinKey!] ?? r.quickWinKey!,
    description: QUICK_WIN_MESSAGES[r.quickWinKey!] ?? '',
    effort: 'low',
    timeframe: '1–7 days',
  }));

  // Default 1 page when meta omitted (runSnapshotAudit is only used after a successful homepage extract).
  const pagesFetched = scanMeta?.pagesFetched ?? 1;
  const playwrightUsed = scanMeta?.playwrightUsed ?? false;
  const scanBasisCode = deriveScanBasisCode({
    cacheHit: false,
    pagesFetched,
    playwrightUsed,
    degraded: false,
  });

  const audit: SnapshotAuditResult = {
    overallScore,
    categoryScores,
    ruleResults,
    scanBasis: buildScanBasis(facts, scanMeta),
    signalsFound: signalsFound(facts),
    scanConfidenceBand: scanConfidence(facts),
    rulesCatalogVersion: getAuditRulesCatalogVersion(),
    scanBasisCode,
  };

  return { audit, issues, quickWins, ruleResults };
}

/** Map 0–100 overall to legacy 1–5 UX score for DB compatibility. */
export function overallToLegacyScore(overall: number): number {
  if (overall >= 81) return 5;
  if (overall >= 61) return 4;
  if (overall >= 41) return 3;
  if (overall >= 21) return 2;
  return 1;
}
