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
    profileAnalysis: 'Profile Analysis',
    coverage: 'Coverage',
    scorecard: 'Domain Scorecard',
    keyStrengths: 'Key Strengths',
    criticalIssues: 'Critical Issues',
    quickWins: 'Quick Wins',
    overall: 'Overall',
    followUp: 'Follow-up',
    executionLog: 'Execution Log',
    quickNavigation: 'Quick navigation',
    analysisEssentials: 'Analysis essentials',
    analysisOptionalTools: 'Optional tools',
  },
  contentViewTabs: {
    summary: 'Summary',
    analysis: 'Analysis',
  },
  summaryView: {
    hint: 'This section is global for the audit. Switch to Analysis to review profile-specific insights and actions.',
    openAnalysis: 'Open Analysis',
  },
  analysisView: {
    tablistLabel: 'Report content views',
    nextStepLabel: 'Start here',
    showPlanningDetails: 'Show roadmap details',
    hidePlanningDetails: 'Hide roadmap details',
    planningDigest: 'Start with Timeline setup. Use roadmap details when you need implementation context.',
    planningDigestPortalHint: 'Advanced roadmap diagnostics are available in the consultant workspace.',
    collapseEssentials: 'Show essentials',
    expandAll: 'Show all sections',
    profileUnavailable: 'Profiles are unavailable right now. Try again in a moment.',
    fullReportModeHint: 'Full Report mode is active. All domains and findings are shown in a single view.',
    executionLogUnavailable: 'Execution log is available for admin users in notification settings.',
  },
  status: {
    generating: 'Generating...',
  },
  buttons: {
    actionPlanCsv: 'Action Plan CSV',
    exportPdf: 'Export PDF',
    viewStrategyLab: 'View Strategy Lab',
    viewTimeline: 'Open Plan',
    actionPlanCsvTitle: 'Download Action Plan as CSV',
    exportPdfTitle: 'Download branded A4 PDF report',
    retry: 'Retry',
    backToWorkspace: 'Back to workspace',
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
    estimatedTimeLabel: `Estimated: ~${REPORT_VIEWER_CONSTANTS.followUp.estimatedMinutes} min`,
    progressTemplate: "You've answered {answered} of {total} follow-up questions.",
    noQuestionsYet: 'No follow-up questions yet. Review findings above and continue in Timeline when ready.',
    listLabel: 'Follow-up questions',
    answeredStatus: 'Answered',
    pendingStatus: 'Pending',
    questionUnavailableLabel: 'Question text is unavailable for this follow-up item.',
  },
  errors: {
    exportPdfFailed: 'PDF export failed. Retry in a moment or contact support if it keeps failing.',
    exportCsvFailed: 'CSV export failed. Retry in a moment or contact support if it keeps failing.',
  },
  collapsible: {
    expandLabel: 'Expand section',
    collapseLabel: 'Collapse section',
  },
  findings: {
    noDataYet: 'No data yet',
    criticalIssuesSuffix: 'critical issues',
    quickWinsSuffix: 'quick wins',
  },
  orchestration: {
    sectionTitle: 'Execution roadmap',
    sectionHint:
      'Cross-domain execution order from the orchestration pack. Timeline is the primary surface; Strategy Lab remains a deep-dive detail layer.',
    dependencyTitle: 'Key dependency links',
    dependencyHint: 'Upstream work blocks downstream milestones.',
    versionLabel: 'Roadmap version',
    openStrategyLab: 'Open Strategy Lab deep dive',
  },
  roadmapCockpit: {
    sectionTitle: 'What happens next',
    sectionHint:
      'Open Plan (Board, Roadmap, or Table) to confirm scope, delivery state, and schedule against the saved pack.',
    diagnosisLabel: 'Primary focus',
    diagnosisFallback:
      'Review domain scores and findings below, then open Plan to sequence execution across teams.',
    ctaManifest: 'Open Plan setup',
    ctaTimeline: 'Open Plan',
    ctaMarkNextStepOnTimeline: 'Open Plan priorities',
    ctaCompare: 'Open roadmap comparison',
    ctaScorecard: 'Open domain scorecard',
    latestPlanChangeLabel: 'Latest plan change',
    latestPlanChangeFallback: 'No revision diff yet',
    changedNodesLabel: 'Changed initiatives',
    changedDependenciesLabel: 'Changed dependencies',
    changedCriticalPathLabel: 'Critical path',
    changedCriticalPathYes: 'changed',
    changedCriticalPathNo: 'unchanged',
    provenanceLabel: 'Provenance',
    baselineLabel: 'Baseline',
    deepLabel: 'Deep',
    qualityFallbackLabel: 'Limited precision (strategy fallback)',
    qualityFallbackHint: 'Data gaps detected. Re-run director slices to improve roadmap confidence.',
    noPackCallout:
      'No execution roadmap pack yet. After the audit completes, confirm your manifest in Strategy Lab, then build the pack to populate Plan.',
  },
} as const;
