export type ReportSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ReportPriority = 'high' | 'medium' | 'low';
export type ReportEffort = 'low' | 'medium' | 'high';
export type ReportImpact = 'high' | 'medium' | 'low';
export type ReportDomainStatus =
  | 'excellent'
  | 'good'
  | 'moderate'
  | 'needs-improvement'
  | 'critical';

type SemanticTone = {
  label: string;
  badgeClassName: string;
  textClassName: string;
  iconClassName: string;
};

const SEVERITY_TONES: Record<ReportSeverity, SemanticTone> = {
  critical: {
    label: 'Critical',
    badgeClassName: 'bg-[var(--score-1-bg)] text-[var(--score-1)]',
    textClassName: 'text-[var(--score-1)]',
    iconClassName: 'text-[var(--score-1)]',
  },
  high: {
    label: 'High',
    badgeClassName: 'bg-[var(--score-2-bg)] text-[var(--score-2)]',
    textClassName: 'text-[var(--score-2)]',
    iconClassName: 'text-[var(--score-2)]',
  },
  medium: {
    label: 'Medium',
    badgeClassName: 'bg-[var(--score-3-bg)] text-[var(--score-3)]',
    textClassName: 'text-[var(--score-3)]',
    iconClassName: 'text-[var(--score-3)]',
  },
  low: {
    label: 'Low',
    badgeClassName: 'bg-[var(--surface)] text-[var(--text-secondary)]',
    textClassName: 'text-[var(--text-secondary)]',
    iconClassName: 'text-[var(--text-tertiary)]',
  },
};

const PRIORITY_TONES: Record<ReportPriority, SemanticTone> = {
  high: {
    label: 'High Priority',
    badgeClassName: 'bg-[var(--score-1-bg)] text-[var(--score-1)]',
    textClassName: 'text-[var(--score-1)]',
    iconClassName: 'text-[var(--score-1)]',
  },
  medium: {
    label: 'Medium Priority',
    badgeClassName: 'bg-[var(--score-3-bg)] text-[var(--score-3)]',
    textClassName: 'text-[var(--score-3)]',
    iconClassName: 'text-[var(--score-3)]',
  },
  low: {
    label: 'Low Priority',
    badgeClassName: 'bg-[var(--surface)] text-[var(--text-secondary)]',
    textClassName: 'text-[var(--text-secondary)]',
    iconClassName: 'text-[var(--text-tertiary)]',
  },
};

const EFFORT_TONES: Record<ReportEffort, SemanticTone> = {
  low: {
    label: 'Low Effort',
    badgeClassName: 'bg-[var(--score-5-bg)] text-[var(--score-5)]',
    textClassName: 'text-[var(--score-5)]',
    iconClassName: 'text-[var(--score-5)]',
  },
  medium: {
    label: 'Medium Effort',
    badgeClassName: 'bg-[var(--score-3-bg)] text-[var(--score-3)]',
    textClassName: 'text-[var(--score-3)]',
    iconClassName: 'text-[var(--score-3)]',
  },
  high: {
    label: 'High Effort',
    badgeClassName: 'bg-[var(--score-1-bg)] text-[var(--score-1)]',
    textClassName: 'text-[var(--score-1)]',
    iconClassName: 'text-[var(--score-1)]',
  },
};

const IMPACT_TONES: Record<ReportImpact, SemanticTone> = {
  high: {
    label: 'High impact',
    badgeClassName: 'bg-[var(--score-5-bg)] text-[var(--score-5)]',
    textClassName: 'text-[var(--score-5)]',
    iconClassName: 'text-[var(--score-5)]',
  },
  medium: {
    label: 'Medium impact',
    badgeClassName: 'bg-[var(--score-3-bg)] text-[var(--score-3)]',
    textClassName: 'text-[var(--score-3)]',
    iconClassName: 'text-[var(--score-3)]',
  },
  low: {
    label: 'Low impact',
    badgeClassName: 'bg-[var(--surface)] text-[var(--text-secondary)]',
    textClassName: 'text-[var(--text-secondary)]',
    iconClassName: 'text-[var(--text-secondary)]',
  },
};

const DOMAIN_STATUS_TONES: Record<ReportDomainStatus, SemanticTone> = {
  excellent: {
    label: 'Excellent',
    badgeClassName: 'bg-[var(--score-5-bg)] text-[var(--score-5)]',
    textClassName: 'text-[var(--score-5)]',
    iconClassName: 'text-[var(--score-5)]',
  },
  good: {
    label: 'Good',
    badgeClassName: 'bg-[var(--score-4-bg)] text-[var(--score-4)]',
    textClassName: 'text-[var(--score-4)]',
    iconClassName: 'text-[var(--score-4)]',
  },
  moderate: {
    label: 'Moderate',
    badgeClassName: 'bg-[var(--score-3-bg)] text-[var(--score-3)]',
    textClassName: 'text-[var(--score-3)]',
    iconClassName: 'text-[var(--score-3)]',
  },
  'needs-improvement': {
    label: 'Needs Improvement',
    badgeClassName: 'bg-[var(--score-2-bg)] text-[var(--score-2)]',
    textClassName: 'text-[var(--score-2)]',
    iconClassName: 'text-[var(--score-2)]',
  },
  critical: {
    label: 'Critical',
    badgeClassName: 'bg-[var(--score-1-bg)] text-[var(--score-1)]',
    textClassName: 'text-[var(--score-1)]',
    iconClassName: 'text-[var(--score-1)]',
  },
};

export function getSeverityTone(value: ReportSeverity): SemanticTone {
  return SEVERITY_TONES[value];
}

export function getPriorityTone(value: ReportPriority): SemanticTone {
  return PRIORITY_TONES[value];
}

export function getEffortTone(value: ReportEffort): SemanticTone {
  return EFFORT_TONES[value];
}

export function getImpactTone(value: ReportImpact): SemanticTone {
  return IMPACT_TONES[value];
}

export function getDomainStatusTone(value: ReportDomainStatus): SemanticTone {
  return DOMAIN_STATUS_TONES[value];
}

export function getScoreTone(score: number): SemanticTone {
  if (score >= 5) {
    return DOMAIN_STATUS_TONES.excellent;
  }
  if (score === 4) {
    return DOMAIN_STATUS_TONES.good;
  }
  if (score === 3) {
    return DOMAIN_STATUS_TONES.moderate;
  }
  if (score === 2) {
    return DOMAIN_STATUS_TONES['needs-improvement'];
  }
  return DOMAIN_STATUS_TONES.critical;
}
