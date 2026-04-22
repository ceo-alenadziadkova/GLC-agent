export const CLIENT_AUDIT_VIEW_COPY = {
  brief: {
    title: 'Pre-Audit Brief',
    changeLayout: 'Change layout',
    requiredAnsweredSuffix: 'required answered',
    reviewAnsweredRequired: 'Show answered required questions',
    answeredTableQuestionCol: 'Question',
    answeredTableAnswerCol: 'Answer',
    answeredValueUnknown: 'Marked as unknown',
    answeredValueYes: 'Yes',
    answeredValueNo: 'No',
    answeredValueEmpty: '—',
    defaultLayoutPrefix: 'Set your preferred question layout anytime in',
    settingsLink: 'Settings',
    defaultLayoutSuffix: '. The layout you choose below applies only to this audit.',
    readinessPrefix: 'Progress:',
    requiredLabel: 'required',
    helpTailoringPrefix: 'These answers help specialists tailor your audit. Complete',
    helpTailoringSuffix: 'questions before the audit starts.',
    improveQualityPrefix: 'Want a stronger report? Answer',
    improveQualitySuffix: 'more recommended question(s).',
    saving: 'Saving...',
    saved: 'Saved!',
    save: 'Save brief',
  },
  shell: {
    fallbackTitle: 'Your audit',
    backToPortal: 'Back to Portal',
    runAuditTitle: 'Run the audit',
    runAuditBody:
      'When the required questions are complete, you can start your audit. It may pause briefly for a review step; you can follow status here in the portal.',
    starting: 'Starting...',
    startAudit: 'Start audit',
  },
  help: {
    title: 'Request help with the brief',
    body:
      'Optional. Ask for help to clarify a question or improve wording. This does not block starting the audit when you are ready.',
    placeholder: 'Add context (optional)',
    success: 'We notified the team. You can still edit the brief or start the audit.',
    sending: 'Sending…',
    send: 'Send help request',
  },
  snapshot: {
    subtitleLimitedSample:
      'Your quick scan is saved. Access rules blocked the homepage, but we sampled other allowed pages — see the note below. Starter, Pro, or Complete can still use your brief and anything you add.',
    subtitleLimitedFetch:
      'Your quick scan is saved, but we could not read the live site automatically (access rules or a connection issue). Details are below — you can still continue with Starter, Pro, or Complete using your brief and materials you add.',
    subtitleSaved:
      'Your quick scan is saved here — same results as on the snapshot page. Continue below when you want a full Starter, Pro, or Complete audit.',
    subtitleDefault: 'Complete your brief, then start the audit when you are ready',
    limitedTitle: 'Quick scan saved — automatic read was limited',
    normalTitle: 'Quick scan in your account',
    limitedBodyPrefix:
      'Results stay here after sign-up, but we could not download public HTML for the URL you entered (often blocked by site rules). Scores below are placeholders. You can',
    rerunLink: 'run another free check',
    limitedBodySuffix:
      'with a different allowed URL, or continue to Starter / Pro / Complete and add context in the brief.',
    normalBody:
      'The same preview you saw on the free snapshot page, now saved after registration — it will not disappear when you close the tab. This is still an automated quick read, not the full scored audit you get after you complete the business brief.',
    missingMirror:
      'We could not load full snapshot details for this audit. You can still continue with Starter, Pro, or Complete below.',
    continuePackage: 'Continue with a package',
    selectedPackageHint: 'Your selected package sets how much is analyzed in this upgrade.',
    limitedContinueHint:
      'This scan did not retrieve page text, so there is little to copy from the quick check. You can still continue — the brief matters most — or use',
    startFreshStrong: 'Start fresh',
    limitedContinueHintSuffix: 'if you prefer empty fields.',
    continueLimited: 'Continue with limited scan data',
    continueDetected: 'Continue with detected details',
    prefillEditSuffix: 'You can edit every field before the run.',
    startFresh: 'Start fresh (site URL only)',
    startFreshBodyPrefix:
      'Clears quick-scan notes and brief answers based on that scan, and resets placeholders for a',
    startFreshBodyMiddle: 'new audit. Quick scan scores are not carried into the new run.',
  },
  links: {
    viewTimeline: 'Open timeline',
    viewReport: 'View your report',
    reportFinished: 'Your audit run has finished',
    viewStrategyLab: 'Strategy details',
    viewRoadmapManifestWizard: 'Roadmap setup',
    viewRoadmapManifestWizardSubtitle: 'Confirm execution preferences and save a manifest snapshot',
    pipelineStatus: 'Run status',
    pipelineReview: 'Review progress and details',
    pipelineFollow: 'Follow live progress',
    pipelineGateHint:
      'Finish and save the required brief questions first. When your audit can start, status links appear here and in the sidebar.',
  },
  page: {
    title: 'Portal',
    missingId: 'Missing id.',
  },
  cockpit: {
    title: 'What you have now',
    subtitle: 'Coverage, headline diagnosis, and clear next steps.',
    diagnosisTitle: 'Headline diagnosis',
    noSummaryYet: 'Your consultant can add a short executive summary to this audit.',
    contextTitle: 'Operating context',
    stageLabel: 'Company stage',
    budgetLabel: 'Budget band',
    teamLabel: 'Team scale',
    openTimeline: 'Open timeline',
    openTimelineEmptyPackHint:
      'If the timeline is empty, your consultant may still be finalizing the plan. It updates when they publish the next version.',
    noPackCalloutTitle: 'Timeline updating',
    noPackCalloutBody:
      'The latest plan version is not shown here yet. Open the timeline for status, or read the full report while your consultant finishes the update.',
    timelineStaleCalloutTitle: 'Plan updated ahead of this timeline',
    roadmapVersionLabel: 'Plan version',
    roadmapDiffHint: 'Latest update',
    /** Short heading for human-readable vN→vN+1 summary (orchestration revision story). */
    revisionStoryTitle: 'What changed in your plan',
    revisionStoryHint: 'Summary of the last roadmap version bump. Your consultant can share more detail in Strategy Lab.',
    roadmapDiffNodesLabel: 'Initiatives changed',
    roadmapDiffDependenciesLabel: 'Dependencies changed',
    openFullReport: 'Full domain report',
    openLab: 'Strategy details',
    previewRoadmapInputs: 'Preview plan inputs',
    implementationDecisionTitle: 'Decide what to implement now',
    implementationDecisionBody:
      'Choose your implementation scope first, then prioritize initiatives. Each confirmed choice creates the next roadmap version.',
    implementationDecisionScopeCta: 'Choose scope and timeline setup',
    implementationDecisionPrioritiesCta: 'Choose initiative priorities',
    implementationDecisionReportCta: 'Review evidence before deciding',
    implementationDecisionNoWizardHint:
      'Scope selection is currently handled with your consultant. You can still prioritize initiatives in Strategy details.',
    topActionsSelectionTitle: 'Top actions for the next version',
    topActionsSelectionBody:
      'Select the initiatives you want to prioritize for the next roadmap iteration. You can review full details in Strategy Lab before confirming scope changes.',
    selectForNextRoadmapCta: 'Select for next roadmap version',
    openDetailsInLabCta: 'Open details in Lab',
    topActionsSelectionCountLabel: 'Selected actions',
    topActionsSelectCta: 'Select',
    topActionsSelectedCta: 'Selected',
    topActionsImpactLabel: 'Impact',
    topActionsEffortLabel: 'Effort',
    topActionsEtaLabel: 'ETA',
    topActionsWhyLabel: 'Why this',
    topActionsHowLabel: 'How to do it',
    topActionsWhenLabel: 'Target window',
    selectForNextRoadmapBusyCta: 'Applying selection...',
    selectionRequiresManifestHint:
      'Save or refresh roadmap inputs first so your selection can be applied to the next version.',
    selectionAppliedSuccessPrefix: 'Selection applied.',
    selectionAppliedSuccessSuffix: 'Open timeline to review the updated roadmap.',
    selectionAppliedError: 'Could not apply selected actions. Please try again.',
    adjustScopeTitle: 'Change scope or refresh the plan',
    adjustScopeBody:
      'Changing scope or refreshing the plan creates a new version. Use timeline setup to review changes and confirm the next version.',
  },
  upgrade: {
    prefillTitle: 'We copy useful details from your quick scan into your brief:',
    prefillItems: {
      techStack:
        'Tech stack — tools we detected (CMS, analytics, tags, frameworks) from public pages.',
      siteProfile:
        'Site profile — short label, industry guess, primary offer, audience (B2B/B2C), and conversion pattern from public pages.',
      homepageCopy:
        'Homepage text — title, meta description, or first substantive paragraph we captured.',
      businessActivityDraft:
        'Goals draft — suggested text for your primary goal field, combining profile and scan summary when available.',
      scoreHint:
        'Quick-scan score — overall /100 from the free check (the full audit is scored separately from scratch).',
      analytics:
        'Analytics — when GA / GTM / gtag signals are present we note that in the brief.',
    },
    packageContextByCoverage: {
      starter:
        'Starter uses this context for the initial site review plus one area you choose. Strategy synthesis is off by default.',
      pro:
        'Pro uses this context for the initial review plus two or three areas you choose; whether strategy is included depends on your package setup.',
      complete:
        'Complete uses this context across all six analysis areas and the final strategy section once your brief is complete enough to start.',
    },
  },
  productModeHelp: {
    starter: {
      label: 'Starter',
      summary: 'Initial site review plus one selected area for a focused first pass.',
      detail:
        'Fastest option when you need a single-priority diagnosis first. Strategy synthesis is not included.',
    },
    pro: {
      label: 'Pro',
      summary: 'Initial review plus 2–3 selected areas with balanced depth.',
      detail:
        'Best fit when you have several priorities. Strategy may be included depending on your package.',
    },
    complete: {
      label: 'Complete',
      summary: 'Full six-area audit plus final strategy synthesis.',
      detail:
        'Maximum coverage across Tech, Security, SEO, UX, Marketing, and Automation with full comparability.',
    },
  },
} as const;

export const CLIENT_AUDIT_VIEW_DEFAULT_UPGRADE_COVERAGE_PACKAGE = 'pro' as const;
