import { SCORE_LABELS, displayDomainLabel } from '@glc/intake-core';
import { REPORT_PROFILER_CONFIG } from '../../config.js';
import type {
  AuditRow,
  DomainRow,
  MarkdownReportCoverage,
  ReconRow,
  StrategyRow,
} from '../../types.js';

function addDivider(lines: string[]): void {
  lines.push(REPORT_PROFILER_CONFIG.markdown.sectionDivider);
  lines.push('');
}

export function addHeader(lines: string[], title: string, audit: AuditRow, recon: ReconRow | null): void {
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Date:** ${new Date(audit.created_at).toLocaleDateString('en-GB')}`);
  lines.push(`**URL:** ${audit.company_url}`);
  if (recon?.industry ?? audit.industry) lines.push(`**Industry:** ${recon?.industry ?? audit.industry}`);
  if (recon?.location) lines.push(`**Location:** ${recon.location}`);
  lines.push('');
  addDivider(lines);
}

export function addExecutiveSummary(lines: string[], strategy: StrategyRow | null): void {
  if (!strategy?.executive_summary) return;
  lines.push(REPORT_PROFILER_CONFIG.markdown.sections.executiveSummary);
  lines.push('');
  lines.push(strategy.executive_summary);
  lines.push('');
  addDivider(lines);
}

export function addCoverage(lines: string[], coverage: MarkdownReportCoverage): void {
  lines.push(REPORT_PROFILER_CONFIG.markdown.sections.coverage);
  lines.push('');
  lines.push(`- Covered domains: ${coverage.covered_domains.join(', ') || 'none'}`);
  lines.push(`- Not analyzed: ${coverage.not_covered_domains.join(', ') || 'none'}`);
  lines.push(`- Coverage ratio: ${(coverage.coverage_ratio * 100).toFixed(0)}%`);
  if (coverage.coverage_adjusted_score !== null) {
    lines.push(`- Coverage-adjusted score: ${coverage.coverage_adjusted_score}/5`);
  }
  lines.push(`- Comparability note: ${coverage.comparability_note}`);
  lines.push('');
  addDivider(lines);
}

export function addScorecard(lines: string[], domains: DomainRow[], overallScore: number | null): void {
  if (overallScore) {
    lines.push(`## Overall Score: ${overallScore}/5 — ${SCORE_LABELS[Math.round(overallScore)] ?? ''}`);
    lines.push('');
  }
  lines.push(REPORT_PROFILER_CONFIG.markdown.sections.scorecard);
  lines.push('');
  lines.push('| Domain | Score | Status |');
  lines.push('|--------|-------|--------|');
  for (const domain of domains) {
    if (domain.score) {
      lines.push(
        `| ${displayDomainLabel(domain.domain_key)} | ${domain.score}/5 | ${domain.label ?? SCORE_LABELS[domain.score] ?? ''} |`,
      );
    }
  }
  lines.push('');
  addDivider(lines);
}

export function addDomainSections(
  lines: string[],
  domains: DomainRow[],
  options: { showIssues: boolean; showRecs: boolean; showQuickWins: boolean; showConfidence: boolean },
): void {
  for (const domain of domains) {
    if (domain.status !== 'completed') continue;

    lines.push(`## ${displayDomainLabel(domain.domain_key)}`);
    lines.push('');

    if (domain.summary) {
      lines.push(domain.summary);
      lines.push('');
    }

    const strengths = domain.strengths ?? [];
    if (strengths.length > 0) {
      lines.push(REPORT_PROFILER_CONFIG.markdown.sections.strengths);
      for (const strength of strengths) lines.push(`- ${strength}`);
      lines.push('');
    }

    const weaknesses = domain.weaknesses ?? [];
    if (weaknesses.length > 0) {
      lines.push(REPORT_PROFILER_CONFIG.markdown.sections.weaknesses);
      for (const weakness of weaknesses) lines.push(`- ${weakness}`);
      lines.push('');
    }

    if (options.showIssues && (domain.issues ?? []).length > 0) {
      lines.push(REPORT_PROFILER_CONFIG.markdown.sections.issues);
      for (const issue of domain.issues ?? []) {
        const confidenceTag =
          options.showConfidence && issue.confidence ? ` [conf:${issue.confidence}]` : '';
        lines.push(
          `- **[${issue.severity.toUpperCase()}]**${confidenceTag} ${issue.title}: ${issue.description}`,
        );
      }
      lines.push('');
    }

    if (options.showQuickWins && (domain.quick_wins ?? []).length > 0) {
      lines.push(REPORT_PROFILER_CONFIG.markdown.sections.quickWins);
      for (const quickWin of domain.quick_wins ?? []) {
        lines.push(
          `- **${quickWin.title}**${quickWin.timeframe ? ` (${quickWin.timeframe})` : ''}: ${quickWin.description}`,
        );
      }
      lines.push('');
    }

    if (options.showRecs && (domain.recommendations ?? []).length > 0) {
      lines.push(REPORT_PROFILER_CONFIG.markdown.sections.recommendations);
      for (const recommendation of domain.recommendations ?? []) {
        const metadata = [
          recommendation.priority && `priority: ${recommendation.priority}`,
          recommendation.estimated_cost && `cost: ${recommendation.estimated_cost}`,
          recommendation.estimated_time && `time: ${recommendation.estimated_time}`,
        ]
          .filter(Boolean)
          .join(' · ');
        lines.push(
          `- **${recommendation.title}**${metadata ? ` [${metadata}]` : ''} — ${recommendation.description}`,
        );
      }
      lines.push('');
    }

    addDivider(lines);
  }
}

export function addRoadmap(lines: string[], strategy: StrategyRow | null): void {
  if (!strategy) return;
  const quickWins = strategy.quick_wins ?? [];
  const mediumTerm = strategy.medium_term ?? [];
  const strategic = strategy.strategic ?? [];
  if (quickWins.length === 0 && mediumTerm.length === 0 && strategic.length === 0) return;

  lines.push(REPORT_PROFILER_CONFIG.markdown.sections.strategicRoadmap);
  lines.push('');

  if (quickWins.length > 0) {
    lines.push(REPORT_PROFILER_CONFIG.markdown.roadmapLabels.quickWins);
    for (const item of quickWins) lines.push(`- ${item.title}: ${item.description}`);
    lines.push('');
  }
  if (mediumTerm.length > 0) {
    lines.push(REPORT_PROFILER_CONFIG.markdown.roadmapLabels.mediumTerm);
    for (const item of mediumTerm) lines.push(`- ${item.title}: ${item.description}`);
    lines.push('');
  }
  if (strategic.length > 0) {
    lines.push(REPORT_PROFILER_CONFIG.markdown.roadmapLabels.strategic);
    for (const item of strategic) lines.push(`- ${item.title}: ${item.description}`);
    lines.push('');
  }
  addDivider(lines);
}
