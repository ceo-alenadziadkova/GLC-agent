import { displayDomainLabel } from '@glc/intake-core';
import { REPORT_PROFILER_CONFIG } from '../../config.js';
import { csvCell, severityToPriority } from '../../domain/csv-priority.js';
import type { ReportInput } from '../../types.js';

export function buildCsvActionPlan(input: ReportInput): string {
  const rows: string[] = [];

  rows.push(REPORT_PROFILER_CONFIG.csv.headers.join(','));

  for (const domain of input.domains) {
    const domainLabel = displayDomainLabel(domain.domain_key);

    for (const issue of domain.issues ?? []) {
      rows.push(
        [
          csvCell(issue.title),
          csvCell(domainLabel),
          REPORT_PROFILER_CONFIG.csv.rowType.issue,
          csvCell(severityToPriority(issue.severity)),
          csvCell(issue.severity),
          '',
          '',
          '',
          csvCell(issue.impact ?? ''),
        ].join(','),
      );
    }

    for (const recommendation of domain.recommendations ?? []) {
      rows.push(
        [
          csvCell(recommendation.title),
          csvCell(domainLabel),
          REPORT_PROFILER_CONFIG.csv.rowType.recommendation,
          csvCell(recommendation.priority),
          '',
          '',
          csvCell(recommendation.estimated_cost ?? ''),
          csvCell(recommendation.estimated_time ?? ''),
          csvCell(recommendation.impact ?? ''),
        ].join(','),
      );
    }

    for (const quickWin of domain.quick_wins ?? []) {
      rows.push(
        [
          csvCell(quickWin.title),
          csvCell(domainLabel),
          REPORT_PROFILER_CONFIG.csv.rowType.quickWin,
          'high',
          '',
          csvCell(quickWin.effort ?? 'low'),
          '',
          csvCell(quickWin.timeframe ?? ''),
          '',
        ].join(','),
      );
    }
  }

  if (input.strategy) {
    for (const item of input.strategy.quick_wins ?? []) {
      rows.push(
        [
          csvCell(item.title),
          REPORT_PROFILER_CONFIG.csv.rowType.strategyDomain,
          REPORT_PROFILER_CONFIG.csv.rowType.strategyQuickWin,
          'high',
          '',
          csvCell(item.effort ?? ''),
          '',
          '',
          csvCell(item.impact ?? ''),
        ].join(','),
      );
    }
    for (const item of input.strategy.medium_term ?? []) {
      rows.push(
        [
          csvCell(item.title),
          REPORT_PROFILER_CONFIG.csv.rowType.strategyDomain,
          REPORT_PROFILER_CONFIG.csv.rowType.strategyMediumTerm,
          'medium',
          '',
          csvCell(item.effort ?? ''),
          '',
          '',
          csvCell(item.impact ?? ''),
        ].join(','),
      );
    }
    for (const item of input.strategy.strategic ?? []) {
      rows.push(
        [
          csvCell(item.title),
          REPORT_PROFILER_CONFIG.csv.rowType.strategyDomain,
          REPORT_PROFILER_CONFIG.csv.rowType.strategyStrategic,
          'low',
          '',
          csvCell(item.effort ?? ''),
          '',
          '',
          csvCell(item.impact ?? ''),
        ].join(','),
      );
    }
  }

  return rows.join('\n');
}
