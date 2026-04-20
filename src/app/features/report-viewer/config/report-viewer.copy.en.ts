import workspacePackaging from '../../../data/marketing-workspace-packaging.en.json';
import { REPORT_VIEWER_CONSTANTS } from './report-viewer.constants';

const reportCopy = workspacePackaging.report;

/** Human-readable coverage line for the roadmap cockpit (numeric values injected by caller). */
export function formatRoadmapCockpitCoverageLine(inContract: number, totalDomains: number): string {
  return `This audit includes ${inContract} of ${totalDomains} capability domains in contract.`;
}

export const REPORT_VIEWER_COPY = {
  pageTitle: reportCopy.title,
  loadingSubtitle: reportCopy.loading_subtitle,
  errorSubtitle: reportCopy.error_subtitle,
  reportNotFound: reportCopy.not_found,
  pageSubtitlePrefix: reportCopy.subtitle,
  partialCoverageNote: reportCopy.partial_coverage_note,
  singleDomainNote: reportCopy.single_domain_note,
  followUpHeading: reportCopy.followup_heading,
  followUpHint: reportCopy.followup_hint,
  profileDescriptionFallback: '',
  sections: {
    executiveSummary: 'Executive Summary',
    coverage: 'Coverage',
    scorecard: 'Domain Scorecard',
    keyStrengths: 'Key Strengths',
    criticalIssues: 'Critical Issues',
    quickWins: 'Quick Wins',
    overall: 'Overall',
  },
  status: {
    generating: 'Generating...',
  },
  buttons: {
    actionPlanCsv: 'Action Plan CSV',
    exportPdf: 'Export PDF',
    viewStrategyLab: 'View Strategy Lab',
    actionPlanCsvTitle: 'Download Action Plan as CSV',
    exportPdfTitle: 'Download branded A4 PDF report',
  },
  coverage: {
    coveredPrefix: 'Covered:',
    notAnalyzedPrefix: 'Not analyzed:',
    coverageAdjustedPrefix: 'Coverage-adjusted score:',
    none: 'none',
    domainLabel: 'domains',
    launchMoreDomainsHint:
      'We keep your full intake context. You can launch additional domains at any time to expand coverage.',
  },
  followUp: {
    answerNowLabel: `Answer now (~${REPORT_VIEWER_CONSTANTS.followUp.estimatedMinutes} min)`,
    progressTemplate: "You've answered {answered} of {total} follow-up questions.",
  },
  findings: {
    noDataYet: 'No data yet',
    criticalIssuesSuffix: 'critical issues',
    quickWinsSuffix: 'quick wins',
  },
  orchestration: {
    sectionTitle: 'Execution roadmap',
    sectionHint:
      'Cross-domain execution order from the orchestration pack. Open Strategy Lab for the full manifest, lanes, and updates.',
    dependencyTitle: 'Key dependency links',
    dependencyHint: 'Upstream work blocks downstream milestones.',
    versionLabel: 'Roadmap version',
    openStrategyLab: 'Open Strategy Lab',
  },
  roadmapCockpit: {
    sectionTitle: 'What happens next',
    sectionHint:
      'Use Strategy Lab to lock a roadmap input manifest, then generate or refresh the cross-domain execution plan when your priorities change.',
    diagnosisLabel: 'Primary focus',
    diagnosisFallback:
      'Review domain scores and findings below. When you are ready to sequence work across teams, open Strategy Lab.',
    ctaManifest: 'Confirm roadmap manifest',
    ctaTimeline: 'View execution timeline',
    ctaScorecard: 'Domain scorecard',
    latestPlanChangeLabel: 'Latest plan change',
    latestPlanChangeFallback: 'No revision diff yet',
    changedNodesLabel: 'Changed initiatives',
    changedDependenciesLabel: 'Changed dependencies',
    changedCriticalPathLabel: 'Critical path',
    changedCriticalPathYes: 'changed',
    changedCriticalPathNo: 'unchanged',
    noPackCallout:
      'No execution roadmap pack yet. After the audit completes, confirm your manifest in Strategy Lab to generate the timeline.',
  },
} as const;
