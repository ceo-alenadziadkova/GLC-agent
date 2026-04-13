/**
 * Client portal audit list card — status labels and hints (static front config).
 */

export const PORTAL_AUDIT_CARD_COPY = {
  statuses: {
    created: {
      label: 'Brief & setup',
      hint:
        'Complete the intake brief on the next screen, then start your audit when you are ready.',
    },
    recon: {
      label: 'Scanning your site',
      hint: 'We are collecting public information about your website.',
    },
    auto: {
      label: 'Analysis running',
      hint: 'Automated phases are in progress. Open the audit to follow the pipeline.',
    },
    analytic: {
      label: 'Analysis running',
      hint: 'Automated phases are in progress. Open the audit to follow the pipeline.',
    },
    review: {
      label: 'Review pause',
      hint: 'Waiting at a review step before the run continues.',
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
      hint: 'This audit was stopped and can be resumed only with a new pipeline start.',
    },
    defaultUnknownHint: 'Open this audit for details.',
  },
  fallbackTitle: 'Your audit',
  updatedPrefix: 'Updated',
} as const;
