export const STRATEGY_LAB_COPY = {
  tabLabels: {
    quick: 'Quick Wins',
    medium: 'Core Growth',
    strategic: 'Strategic',
  },
  appShell: {
    title: 'Strategy Lab',
    subtitle: 'Build a prioritised transformation roadmap',
    loadingSubtitle: 'Loading...',
    errorSubtitle: 'Error',
    unavailableSubtitle: 'Not available yet',
  },
  panel: {
    selectedSuffix: 'selected',
    generateRoadmap: 'Generate Roadmap',
    domainBenchmarksTitle: 'Domain benchmarks',
    domainBenchmarksHint:
      'Median confidence (p50) vs peer runs in the last 90 days. Uses your audit industry when set, otherwise the cross-industry pool.',
    emptyBenchmarksValue: '—',
    noInitiativesInCategory: 'No initiatives in this category',
    yourRoadmap: 'Your Roadmap',
    initiativesSelectedSuffix: 'initiatives selected',
    totalInitiatives: 'Total Initiatives',
    quickWins: 'Quick Wins',
    strategicItems: 'Strategic Items',
    effortMix: 'Effort Mix',
    selectedTitle: 'Selected',
    moreItemsSuffix: 'more items',
    viewReport: 'View Report',
  },
  messages: {
    auditNotFound: 'Audit not found',
    notGenerated: 'Strategy data not yet generated',
    completePipeline: 'Complete the pipeline to generate strategy',
  },
} as const;
