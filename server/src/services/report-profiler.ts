/**
 * ReportProfiler — Sprint 17
 *
 * Generates report content filtered by profile.
 * Each profile targets a different audience and includes only the relevant sections.
 *
 * Profiles:
 *   full       — all sections (default consultant view)
 *   owner      — exec summary + scorecard + roadmap + costs, no technical deep-dives
 *   tech       — domains 1-2 (tech + security) with code-level detail, minimal marketing
 *   marketing  — domains 3-5 (SEO + UX + marketing) with competitor detail
 *   onepager   — executive summary + scorecard + top 3 issues + top 3 quick wins, fits one page
 */

import { SCORE_LABELS, type DomainKey } from '../types/audit.js';

export type ReportProfile = 'full' | 'owner' | 'tech' | 'marketing' | 'onepager';

export const REPORT_PROFILES: ReportProfile[] = ['full', 'owner', 'tech', 'marketing', 'onepager'];

export const PROFILE_LABELS: Record<ReportProfile, string> = {
  full:      'Full Report',
  owner:     'Owner Summary',
  tech:      'Technical Deep-Dive',
  marketing: 'Marketing & Growth',
  onepager:  'One-Pager',
};

export const PROFILE_DESCRIPTIONS: Record<ReportProfile, string> = {
  full:      'Complete audit with all 6 domains — for the consulting team',
  owner:     'Executive summary, scorecard, roadmap, and costs — for the business owner',
  tech:      'Tech infrastructure and security with technical detail — for the dev team',
  marketing: 'SEO, UX, and marketing analysis — for the marketing team',
  onepager:  'Summary + scorecard + top findings — fits one printed page',
};

// Which domain keys are included per profile
const PROFILE_DOMAINS: Record<ReportProfile, DomainKey[] | 'all'> = {
  full:      'all',
  owner:     'all',
  tech:      ['tech_infrastructure', 'security_compliance'],
  marketing: ['seo_digital', 'ux_conversion', 'marketing_utp'],
  onepager:  'all',
};

interface AuditRow {
  company_url: string;
  created_at: string;
  overall_score: number | null;
  industry?: string | null;
}

interface ReconRow {
  company_name?: string | null;
  industry?: string | null;
  location?: string | null;
}

interface DomainRow {
  domain_key: string;
  score: number | null;
  label: string | null;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  issues: Array<{ id: string; severity: string; title: string; description: string; impact: string; confidence?: string }> | null;
  quick_wins: Array<{ id: string; title: string; description: string; effort?: string; timeframe?: string }> | null;
  recommendations: Array<{ id: string; title: string; description: string; priority: string; estimated_cost?: string; estimated_time?: string; impact?: string }> | null;
  status: string;
  phase_number: number;
}

interface StrategyRow {
  executive_summary?: string | null;
  overall_score?: number | null;
  quick_wins?: Array<{ id: string; title: string; description: string; effort?: string; impact?: string }> | null;
  medium_term?: Array<{ id: string; title: string; description: string; effort?: string; impact?: string }> | null;
  strategic?: Array<{ id: string; title: string; description: string; effort?: string; impact?: string }> | null;
  scorecard?: Array<{ domain_key: string; label: string; score: number; weight: number; weighted_score: number }> | null;
}

export interface ReportInput {
  audit: AuditRow;
  recon: ReconRow | null;
  domains: DomainRow[];
  strategy: StrategyRow | null;
}

export interface MarkdownReport {
  profile: ReportProfile;
  profile_label: string;
  company: string;
  generated_at: string;
  markdown: string;
}

export class ReportProfiler {
  generate(input: ReportInput, profile: ReportProfile = 'full'): MarkdownReport {
    const { audit, recon, domains, strategy } = input;
    const company = recon?.company_name ?? audit.company_url;
    const generated_at = new Date().toISOString();

    const allowedDomains = PROFILE_DOMAINS[profile];
    const filteredDomains = allowedDomains === 'all'
      ? domains
      : domains.filter(d => (allowedDomains as string[]).includes(d.domain_key));

    let markdown: string;
    switch (profile) {
      case 'onepager':  markdown = this.buildOnepager(input, filteredDomains, company); break;
      case 'owner':     markdown = this.buildOwner(input, company); break;
      case 'tech':      markdown = this.buildDomainFocused(input, filteredDomains, company, 'Technical Deep-Dive'); break;
      case 'marketing': markdown = this.buildDomainFocused(input, filteredDomains, company, 'Marketing & Growth Report'); break;
      default:          markdown = this.buildFull(input, domains, company); break;
    }

    return { profile, profile_label: PROFILE_LABELS[profile], company, generated_at, markdown };
  }

  // ─── CSV Action Plan ────────────────────────────────────────────────────────

  generateCsv(input: ReportInput): string {
    const { domains } = input;
    const rows: string[] = [];

    rows.push(['Title', 'Domain', 'Type', 'Priority', 'Severity', 'Effort', 'Est. Cost', 'Est. Time', 'Impact'].join(','));

    for (const domain of domains) {
      const domainLabel = formatDomainName(domain.domain_key);

      // Issues → action items
      for (const issue of domain.issues ?? []) {
        rows.push([
          csvCell(issue.title),
          csvCell(domainLabel),
          'Issue',
          csvCell(severityToPriority(issue.severity)),
          csvCell(issue.severity),
          '',
          '',
          '',
          csvCell(issue.impact ?? ''),
        ].join(','));
      }

      // Recommendations
      for (const rec of domain.recommendations ?? []) {
        rows.push([
          csvCell(rec.title),
          csvCell(domainLabel),
          'Recommendation',
          csvCell(rec.priority),
          '',
          '',
          csvCell(rec.estimated_cost ?? ''),
          csvCell(rec.estimated_time ?? ''),
          csvCell(rec.impact ?? ''),
        ].join(','));
      }

      // Quick wins
      for (const qw of domain.quick_wins ?? []) {
        rows.push([
          csvCell(qw.title),
          csvCell(domainLabel),
          'Quick Win',
          'high',
          '',
          csvCell(qw.effort ?? 'low'),
          '',
          csvCell(qw.timeframe ?? ''),
          '',
        ].join(','));
      }
    }

    // Strategy roadmap items
    if (input.strategy) {
      for (const item of input.strategy.quick_wins ?? []) {
        rows.push([csvCell(item.title), 'Strategy', 'Quick Win', 'high', '', csvCell(item.effort ?? ''), '', '', csvCell(item.impact ?? '')].join(','));
      }
      for (const item of input.strategy.medium_term ?? []) {
        rows.push([csvCell(item.title), 'Strategy', 'Medium Term', 'medium', '', csvCell(item.effort ?? ''), '', '', csvCell(item.impact ?? '')].join(','));
      }
      for (const item of input.strategy.strategic ?? []) {
        rows.push([csvCell(item.title), 'Strategy', 'Strategic', 'low', '', csvCell(item.effort ?? ''), '', '', csvCell(item.impact ?? '')].join(','));
      }
    }

    return rows.join('\n');
  }

  // ─── Profile builders ───────────────────────────────────────────────────────

  private buildFull(input: ReportInput, domains: DomainRow[], company: string): string {
    const { audit, recon, strategy } = input;
    const lines: string[] = [];

    this.addHeader(lines, `IT Audit Report: ${company}`, audit, recon);
    this.addExecutiveSummary(lines, strategy);
    this.addScorecard(lines, domains, audit.overall_score);
    this.addDomainSections(lines, domains, { showIssues: true, showRecs: true, showQuickWins: true, showConfidence: true });
    this.addRoadmap(lines, strategy);
    this.addFooter(lines);

    return lines.join('\n');
  }

  private buildOwner(input: ReportInput, company: string): string {
    const { audit, recon, domains, strategy } = input;
    const lines: string[] = [];

    this.addHeader(lines, `Business Audit Summary: ${company}`, audit, recon);
    this.addExecutiveSummary(lines, strategy);
    this.addScorecard(lines, domains, audit.overall_score);

    // Top 5 issues only (critical/high) — no technical detail
    const topIssues = domains.flatMap(d =>
      (d.issues ?? []).map(i => ({ ...i, domain: d.domain_key }))
    ).filter(i => i.severity === 'critical' || i.severity === 'high').slice(0, 5);

    if (topIssues.length > 0) {
      lines.push('## Priority Issues');
      lines.push('');
      for (const issue of topIssues) {
        lines.push(`### ${issue.title}`);
        lines.push(`**Domain:** ${formatDomainName(issue.domain)} · **Severity:** ${issue.severity.toUpperCase()}`);
        lines.push('');
        lines.push(issue.impact ?? '');
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    // Recommendations with cost/time (owner cares about ROI)
    const recs = domains.flatMap(d =>
      (d.recommendations ?? []).filter(r => r.priority === 'high').map(r => ({
        ...r, domain: d.domain_key,
      }))
    ).slice(0, 8);

    if (recs.length > 0) {
      lines.push('## Recommended Actions');
      lines.push('');
      for (const rec of recs) {
        lines.push(`- **${rec.title}** (${formatDomainName(rec.domain)})`);
        if (rec.estimated_cost || rec.estimated_time) {
          lines.push(`  Est. cost: ${rec.estimated_cost ?? '—'} · Time: ${rec.estimated_time ?? '—'}`);
        }
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    this.addRoadmap(lines, strategy);
    this.addFooter(lines);

    return lines.join('\n');
  }

  private buildDomainFocused(input: ReportInput, domains: DomainRow[], company: string, title: string): string {
    const { audit, recon } = input;
    const lines: string[] = [];

    this.addHeader(lines, `${title}: ${company}`, audit, recon);
    this.addScorecard(lines, domains, null);
    this.addDomainSections(lines, domains, { showIssues: true, showRecs: true, showQuickWins: true, showConfidence: false });
    this.addFooter(lines);

    return lines.join('\n');
  }

  private buildOnepager(input: ReportInput, domains: DomainRow[], company: string): string {
    const { audit, recon, strategy } = input;
    const lines: string[] = [];

    lines.push(`# Audit Summary: ${company}`);
    lines.push('');
    lines.push(`**Date:** ${new Date(audit.created_at).toLocaleDateString('en-GB')} · **URL:** ${audit.company_url}`);
    if (recon?.industry) lines.push(`**Industry:** ${recon.industry}`);
    if (audit.overall_score) {
      lines.push(`**Overall Score:** ${audit.overall_score}/5 — ${SCORE_LABELS[Math.round(audit.overall_score)] ?? ''}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    if (strategy?.executive_summary) {
      lines.push(strategy.executive_summary);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Scorecard — compact
    lines.push('## Scorecard');
    lines.push('');
    lines.push('| Domain | Score |');
    lines.push('|--------|-------|');
    for (const d of domains) {
      if (d.score) lines.push(`| ${formatDomainName(d.domain_key)} | ${d.score}/5 |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Top 3 issues
    const topIssues = domains.flatMap(d => d.issues ?? [])
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .slice(0, 3);
    if (topIssues.length > 0) {
      lines.push('## Top Issues');
      lines.push('');
      for (const i of topIssues) {
        lines.push(`- **[${i.severity.toUpperCase()}]** ${i.title}`);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Top 3 quick wins
    const topQw = domains.flatMap(d => d.quick_wins ?? []).slice(0, 3);
    if (topQw.length > 0) {
      lines.push('## Quick Wins');
      lines.push('');
      for (const qw of topQw) {
        lines.push(`- **${qw.title}**${qw.timeframe ? ` (${qw.timeframe})` : ''}`);
      }
      lines.push('');
    }

    this.addFooter(lines);
    return lines.join('\n');
  }

  // ─── Shared section builders ────────────────────────────────────────────────

  private addHeader(lines: string[], title: string, audit: AuditRow, recon: ReconRow | null): void {
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`**Date:** ${new Date(audit.created_at).toLocaleDateString('en-GB')}`);
    lines.push(`**URL:** ${audit.company_url}`);
    if (recon?.industry ?? audit.industry) lines.push(`**Industry:** ${recon?.industry ?? audit.industry}`);
    if (recon?.location) lines.push(`**Location:** ${recon.location}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  private addExecutiveSummary(lines: string[], strategy: StrategyRow | null): void {
    if (!strategy?.executive_summary) return;
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(strategy.executive_summary);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  private addScorecard(lines: string[], domains: DomainRow[], overallScore: number | null): void {
    if (overallScore) {
      lines.push(`## Overall Score: ${overallScore}/5 — ${SCORE_LABELS[Math.round(overallScore)] ?? ''}`);
      lines.push('');
    }
    lines.push('### Domain Scorecard');
    lines.push('');
    lines.push('| Domain | Score | Status |');
    lines.push('|--------|-------|--------|');
    for (const d of domains) {
      if (d.score) {
        lines.push(`| ${formatDomainName(d.domain_key)} | ${d.score}/5 | ${d.label ?? SCORE_LABELS[d.score] ?? ''} |`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  private addDomainSections(
    lines: string[],
    domains: DomainRow[],
    opts: { showIssues: boolean; showRecs: boolean; showQuickWins: boolean; showConfidence: boolean },
  ): void {
    for (const d of domains) {
      if (d.status !== 'completed') continue;

      lines.push(`## ${formatDomainName(d.domain_key)}`);
      lines.push('');

      if (d.summary) { lines.push(d.summary); lines.push(''); }

      const strengths = (d.strengths ?? []) as string[];
      if (strengths.length > 0) {
        lines.push('### Strengths');
        for (const s of strengths) lines.push(`- ${s}`);
        lines.push('');
      }

      const weaknesses = (d.weaknesses ?? []) as string[];
      if (weaknesses.length > 0) {
        lines.push('### Areas for Improvement');
        for (const w of weaknesses) lines.push(`- ${w}`);
        lines.push('');
      }

      if (opts.showIssues && (d.issues ?? []).length > 0) {
        lines.push('### Issues');
        for (const issue of d.issues ?? []) {
          const confTag = opts.showConfidence && issue.confidence ? ` [conf:${issue.confidence}]` : '';
          lines.push(`- **[${issue.severity.toUpperCase()}]**${confTag} ${issue.title}: ${issue.description}`);
        }
        lines.push('');
      }

      if (opts.showQuickWins && (d.quick_wins ?? []).length > 0) {
        lines.push('### Quick Wins');
        for (const qw of d.quick_wins ?? []) {
          lines.push(`- **${qw.title}**${qw.timeframe ? ` (${qw.timeframe})` : ''}: ${qw.description}`);
        }
        lines.push('');
      }

      if (opts.showRecs && (d.recommendations ?? []).length > 0) {
        lines.push('### Recommendations');
        for (const rec of d.recommendations ?? []) {
          const meta = [rec.priority && `priority: ${rec.priority}`, rec.estimated_cost && `cost: ${rec.estimated_cost}`, rec.estimated_time && `time: ${rec.estimated_time}`].filter(Boolean).join(' · ');
          lines.push(`- **${rec.title}**${meta ? ` [${meta}]` : ''} — ${rec.description}`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }
  }

  private addRoadmap(lines: string[], strategy: StrategyRow | null): void {
    if (!strategy) return;
    const qw = strategy.quick_wins ?? [];
    const mt = strategy.medium_term ?? [];
    const st = strategy.strategic ?? [];
    if (qw.length === 0 && mt.length === 0 && st.length === 0) return;

    lines.push('## Strategic Roadmap');
    lines.push('');
    if (qw.length > 0) {
      lines.push('### Quick Wins (≤ 1 week)');
      for (const item of qw) lines.push(`- ${item.title}: ${item.description}`);
      lines.push('');
    }
    if (mt.length > 0) {
      lines.push('### Medium Term (~1 month)');
      for (const item of mt) lines.push(`- ${item.title}: ${item.description}`);
      lines.push('');
    }
    if (st.length > 0) {
      lines.push('### Strategic (1–3 months)');
      for (const item of st) lines.push(`- ${item.title}: ${item.description}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  private addFooter(lines: string[]): void {
    lines.push('*Generated by GLC Audit Platform — glctech.es*');
  }
}

export const reportProfiler = new ReportProfiler();

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDomainName(key: string): string {
  const names: Record<string, string> = {
    tech_infrastructure: 'Tech Infrastructure',
    security_compliance: 'Security & Compliance',
    seo_digital:         'SEO & Digital Presence',
    ux_conversion:       'UX & Conversion',
    marketing_utp:       'Marketing & Positioning',
    automation_processes: 'Automation & Processes',
  };
  return names[key] ?? key;
}

function csvCell(value: string): string {
  if (!value) return '';
  const escaped = value.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function severityToPriority(severity: string): string {
  if (severity === 'critical' || severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}
