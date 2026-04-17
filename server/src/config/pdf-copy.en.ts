/**
 * User-facing English strings for PDF export (@react-pdf/renderer).
 */

export const PDF_COPY_EN = {
  brandName: 'GLC Audit Platform',
  documentTitlePrefix: 'GLC Audit —',
  metaAuthor: 'GLC Audit Platform',
  cover: {
    dateLabel: 'DATE',
    industryLabel: 'INDUSTRY',
    overallScoreLabel: 'OVERALL SCORE',
  },
  scorecard: {
    sectionTitle: 'Domain Scorecard',
    overallScoreSub: (domainCount: number) =>
      `Overall score · ${domainCount} domain${domainCount !== 1 ? 's' : ''}`,
    colDomain: 'DOMAIN',
    colScore: 'SCORE',
    colStatus: 'STATUS',
    scoreOutOfSuffix: '/5',
  },
  domain: {
    strengths: 'Strengths',
    areasForImprovement: 'Areas for Improvement',
    issues: 'Issues',
    quickWins: 'Quick Wins',
    recommendations: 'Recommendations',
    recCostTime: (cost: string, time: string) => ` · Cost: ${cost} / Time: ${time}`,
    ownerRecCostTime: (cost: string, time: string) => `Cost: ${cost} · Time: ${time}`,
  },
  onepager: {
    summary: 'Summary',
    topIssues: 'Top Issues',
    quickWins: 'Quick Wins',
  },
  owner: {
    executiveSummary: 'Executive Summary',
    priorityIssues: 'Priority Issues',
    recommendedActions: 'Recommended Actions',
  },
  full: {
    executiveSummary: 'Executive Summary',
  },
  roadmap: {
    sectionTitle: 'Strategic Roadmap',
    phaseQuickWins: 'Quick Wins (up to 1 week)',
    phaseMediumTerm: 'Medium Term (~1 month)',
    phaseStrategic: 'Strategic (1–3 months)',
  },
  placeholders: {
    emDash: '—',
  },
} as const;
