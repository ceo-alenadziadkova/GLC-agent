export const CLIENT_AUDIT_VIEW_COPY = {
  upgrade: {
    prefillTitle: 'We pre-fill your brief and recon notes from this quick scan:',
    prefillItems: {
      techStack:
        'Tech stack — tools we detected (CMS, analytics, tags, frameworks) for technical recon and phase context.',
      siteProfile:
        'Site profile — short label, industry guess, primary offer, audience (B2B/B2C), and conversion pattern from public pages.',
      homepageCopy:
        'Homepage copy — title, meta description, or first substantive paragraph we captured.',
      businessActivityDraft:
        'Business activity draft — paragraph for your primary goal field, combining profile + scan summary when available.',
      scoreHint:
        'Snapshot score hint — overall /100 from the scan stored in recon prefills (the full audit is re-scored from scratch).',
      analytics:
        'Analytics — when GA / GTM / gtag signals are present we mark analytics in the brief.',
    },
    packageContextByCoverage: {
      starter:
        'Starter uses this context for recon plus one selected domain. Strategy is disabled by default.',
      pro:
        'Pro uses this context for recon plus selected 2-3 domains; strategy inclusion depends on the execution plan.',
      complete:
        'Complete uses this context across all six analysis domains and the strategy phase after your brief meets start gates.',
    },
  },
} as const;

export const CLIENT_AUDIT_VIEW_DEFAULT_UPGRADE_COVERAGE_PACKAGE = 'pro' as const;
