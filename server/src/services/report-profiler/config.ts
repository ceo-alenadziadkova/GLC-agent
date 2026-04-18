export const REPORT_PROFILER_CONFIG = {
  markdown: {
    sectionDivider: '---',
    sections: {
      coverage: '## Coverage',
      executiveSummary: '## Executive Summary',
      scorecard: '### Domain Scorecard',
      strengths: '### Strengths',
      weaknesses: '### Areas for Improvement',
      issues: '### Issues',
      quickWins: '### Quick Wins',
      recommendations: '### Recommendations',
      strategicRoadmap: '## Strategic Roadmap',
      topIssues: '## Top Issues',
      recommendedActions: '## Recommended Actions',
      scorecardCompact: '## Scorecard',
    },
    roadmapLabels: {
      quickWins: '### Quick Wins (<= 1 week)',
      mediumTerm: '### Medium Term (~1 month)',
      strategic: '### Strategic (1-3 months)',
    },
    coverageComparability: {
      partial:
        'Partial audit: do not compare this overall score directly with complete ({count}-domain) audits.',
      complete: 'Complete coverage: overall score is comparable to other complete audits.',
    },
  },
  csv: {
    headers: [
      'Title',
      'Domain',
      'Type',
      'Priority',
      'Severity',
      'Effort',
      'Est. Cost',
      'Est. Time',
      'Impact',
    ],
    rowType: {
      issue: 'Issue',
      recommendation: 'Recommendation',
      quickWin: 'Quick Win',
      strategyQuickWin: 'Quick Win',
      strategyMediumTerm: 'Medium Term',
      strategyStrategic: 'Strategic',
      strategyDomain: 'Strategy',
    },
  },
} as const;
