export const STUDIO_GRAPH_COPY_EN = {
  rootLabel: 'Question bank (canon)',
  sectionLabel: (sectionKey: string) => `Section ${sectionKey}`,
  sectionCollapsedLabel: (sectionKey: string) => `Section ${sectionKey} (collapsed)`,
  defaultStepLabel: (stepIndex: number) => `Step ${stepIndex + 1}`,
  domainClusterLabel: (domainKeySpaced: string, count: number) =>
    `${domainKeySpaced} (${count})`,
  policyBadgeSyntheticRequired: 'synthetic required',
  policyBadgeRequiredAlways: 'policy required',
  policyBadgeRequiredIfVisible: 'required if visible',
  policyBadgeRequirednessNone: 'policy: none',
} as const;
