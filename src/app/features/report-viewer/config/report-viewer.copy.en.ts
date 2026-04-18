import workspacePackaging from '../../../data/marketing-workspace-packaging.en.json';
import { REPORT_VIEWER_CONSTANTS } from './report-viewer.constants';

const reportCopy = workspacePackaging.report;

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
} as const;
