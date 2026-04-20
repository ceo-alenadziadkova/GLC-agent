/**
 * Discovery Queue — consultant Mode C sessions list.
 */

export const DISCOVERY_QUEUE_COPY = {
  title: 'Discovery Queue',
  filters: {
    all: 'All',
    new: 'New',
    converted: 'Converted',
  },
  loadError: 'Failed to load discovery sessions',
  convertAlreadyConverted: 'This session was already converted to an audit.',
  convertGenericFailure: 'Failed to create audit — please try again.',
  deleteGenericFailure: 'Failed to delete session — please try again.',
  deleteDialogTitle: 'Delete discovery session?',
  deleteDialogDescription: 'This action removes the session permanently.',
  deleteDialogCancel: 'Cancel',
  deleteDialogConfirm: 'Delete',
  deleting: 'Deleting…',
  deleteSession: 'Delete',
  subtitleAwaiting: (n: number) => `Mode C submissions · ${n} awaiting conversion`,
  subtitleDefault: 'Mode C submissions from the public discovery questionnaire',
  copyLink: 'Copy discover link',
  copied: 'Copied!',
  refresh: 'Refresh',
  dismiss: 'Dismiss',
  loadingSessions: 'Loading sessions…',
  tryAgain: 'Try again',
  emptyAll:
    'No discovery sessions yet. Use "Copy discover link" in the header to share the questionnaire.',
  emptyFiltered: (filter: string) => `No ${filter} sessions.`,
  noFindingsRecorded: 'No findings recorded',
  maturity: {
    1: 'Early-stage',
    2: 'Developing',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Low priority',
  } as const,
  maturityLevelFallback: (level: number) => `Level ${level}`,
  converted: 'Converted',
  creating: 'Creating…',
  convertToAudit: 'Convert to audit',
  openAudit: 'Open audit',
  noContactInfo: 'No contact info provided',
  industryLabel: 'Industry',
  moreFindings: (n: number) => `+${n} more finding${n > 1 ? 's' : ''}`,
} as const;

/** Maturity level pill colors (static UI config). */
export const DISCOVERY_QUEUE_MATURITY_COLORS: Record<number, string> = {
  1: 'var(--score-1)',
  2: 'var(--score-2)',
  3: 'var(--score-3)',
  4: 'var(--glc-green)',
  5: 'var(--text-tertiary)',
};

export const DISCOVERY_QUEUE_MATURITY_COLOR_FALLBACK = 'var(--text-tertiary)' as const;
