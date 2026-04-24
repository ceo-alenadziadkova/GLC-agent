/**
 * Client portal audit list card — status labels and hints (static front config).
 */

export const PORTAL_AUDIT_CARD_COPY = {
  statuses: {
    created: {
      label: 'Brief & setup',
      hint:
        'Complete the business brief on the next screen, then start your audit when you are ready.',
    },
    recon: {
      label: 'Scanning your site',
      hint: 'We are gathering public information about your website.',
    },
    auto: {
      label: 'Analysis running',
      hint: 'Automated analysis is in progress. Open the audit to follow status.',
    },
    analytic: {
      label: 'Analysis running',
      hint: 'Automated analysis is in progress. Open the audit to follow status.',
    },
    review: {
      label: 'Review pause',
      hint: 'Paused for a short review before the run continues.',
    },
    completed: {
      label: 'Completed',
      hint: 'Your report and deliverables are ready to view.',
    },
    completedSnapshot: {
      label: 'Completed',
      hint:
        'Quick scan saved in your account — same view as the snapshot page. A full Pro or Complete audit is a separate programme; open the audit to continue.',
    },
    failed: {
      label: 'Needs attention',
      hint: 'The run stopped unexpectedly. Your GLC contact can help.',
    },
    cancelled: {
      label: 'Cancelled',
      hint: 'This audit was stopped. Your GLC contact can reopen it if needed; otherwise start a new audit.',
    },
    defaultUnknownHint: 'Open this audit for details.',
  },
  fallbackTitle: 'Your audit',
  updatedPrefix: 'Updated',
} as const;
