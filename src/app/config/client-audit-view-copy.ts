export const CLIENT_AUDIT_VIEW_COPY = {
  brief: {
    title: 'Pre-Audit Brief',
    changeLayout: 'Change layout',
    requiredAnsweredSuffix: 'required answered',
    defaultLayoutPrefix: 'Set your default brief layout anytime in',
    settingsLink: 'Settings',
    defaultLayoutSuffix: '. Per-audit layout below overrides that default.',
    readinessPrefix: 'Audit readiness:',
    requiredLabel: 'required',
    helpTailoringPrefix: 'These answers help the GLC team tailor the audit. Fill',
    helpTailoringSuffix: 'questions before the audit starts.',
    improveQualityPrefix: 'Want to improve audit quality? Answer',
    improveQualitySuffix: 'more recommended question(s).',
    saving: 'Saving...',
    saved: 'Saved!',
    save: 'Save Brief',
  },
  shell: {
    fallbackTitle: 'Your audit',
    backToPortal: 'Back to Portal',
    runAuditTitle: 'Run the audit',
    runAuditBody:
      'When required brief fields are complete, you can start the pipeline. Some phases may pause for a review step before continuing; you can follow progress here in the portal.',
    starting: 'Starting...',
    startAudit: 'Start audit',
  },
  help: {
    title: 'Request help with the brief',
    body:
      'Optional. You can request help to clarify questions or improve wording. This does not block starting the audit whenever you are ready.',
    placeholder: 'Add context (optional)',
    success: 'We notified the team. You can still edit the brief or start the audit.',
    sending: 'Sending…',
    send: 'Send help request',
  },
  snapshot: {
    subtitleLimitedSample:
      'Your quick scan is saved. robots.txt blocked the homepage, but we sampled other allowed pages — see the note below. Starter, Pro, or Complete can still use your brief and anything you add.',
    subtitleLimitedFetch:
      'Your quick scan is saved, but we could not read the live site automatically (robots policy or a fetch issue). Details are below — Starter, Pro, or Complete can still proceed from your brief and materials you add.',
    subtitleSaved:
      'Your quick scan is saved here — same results as on the snapshot page. Continue below when you want a full Starter, Pro, or Complete audit.',
    subtitleDefault: 'Complete your brief, then start the audit when you are ready',
    limitedTitle: 'Quick scan saved — automatic read was limited',
    normalTitle: 'Quick scan in your account',
    limitedBodyPrefix:
      'Results are kept here after sign-up, but our crawler could not download public HTML for the URL you entered (often robots.txt). Scores below are placeholders. You can',
    rerunLink: 'run another free check',
    limitedBodySuffix:
      'with a different allowed URL, or continue to Starter / Pro / Complete and add context in the brief.',
    normalBody:
      'The same preview you saw on the free snapshot page, now saved after registration — it will not disappear when you close the tab. This is still an automated quick read, not the scored multi-phase GLC audit you get after the intake brief.',
    missingMirror:
      'We could not load full snapshot fields for this audit. You can still continue with Starter, Pro, or Complete below.',
    continuePackage: 'Continue with a package',
    selectedPackageHint: 'Selected package applies to coverage and pipeline phases for this upgrade.',
    limitedContinueHint:
      'This scan did not retrieve page HTML, so there is little to pre-fill from the quick check. You can still continue — the brief matters most — or use',
    startFreshStrong: 'Start fresh',
    limitedContinueHintSuffix: 'if you prefer empty recon placeholders.',
    continueLimited: 'Continue with limited scan data',
    continueDetected: 'Continue with detected details',
    prefillEditSuffix: 'You can edit every field before the run.',
    startFresh: 'Start fresh (site URL only)',
    startFreshBodyPrefix:
      'Clears our quick-scan recon data and brief answers derived from it, and resets placeholders for a',
    startFreshBodyMiddle: 'audit. Quick scan scores are not carried into the new run.',
  },
  links: {
    viewReport: 'View your report',
    reportFinished: 'Your audit run has finished',
    viewStrategyLab: 'Open Strategy Lab',
    strategyReady: 'Roadmap is ready for review',
    pipelineStatus: 'Pipeline status',
    pipelineReview: 'Review phases and logs',
    pipelineFollow: 'Follow live progress',
    pipelineGateHint:
      'Complete the required intake brief fields and save. After the brief allows starting your run, Pipeline appears here and in the sidebar so you can follow phases and logs.',
  },
  page: {
    title: 'Portal',
    missingId: 'Missing id.',
  },
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
  productModeHelp: {
    starter: {
      label: 'Starter',
      summary: 'Recon plus one selected domain for a focused first pass.',
      detail:
        'Fastest option when you need a single-priority diagnosis first. Strategy phase is disabled.',
    },
    pro: {
      label: 'Pro',
      summary: 'Recon plus 2-3 selected domains with balanced depth.',
      detail:
        'Best fit for teams with several priorities. Strategy can be included based on execution plan.',
    },
    complete: {
      label: 'Complete',
      summary: 'Complete six-domain audit plus final strategy synthesis.',
      detail:
        'Maximum coverage across Tech, Security, SEO, UX, Marketing, and Automation with full comparability.',
    },
  },
} as const;

export const CLIENT_AUDIT_VIEW_DEFAULT_UPGRADE_COVERAGE_PACKAGE = 'pro' as const;
