/**
 * Browser translation-safety copy (English): live translation warnings
 * and DOM-rewrite recovery guidance for app-level error screens.
 */
export const BROWSER_TRANSLATE_COPY_EN = {
  translationDetectedWarning:
    'We detected browser page translation. It is allowed, but some parts may work with errors. If something breaks or you cannot continue, switch back to the site original language and refresh.',
} as const;

export const GLC_APP_ERROR_COPY_EN = {
  defaultTitle: 'Something interrupted this page',
  supportPayloadTitle: 'GLC Audit — incident reference',
  supportPayloadReferenceLabel: 'Reference',
  supportPayloadPageLabel: 'Page',
  supportPayloadTimeLabel: 'Time',
  supportPayloadDetailLabel: 'Detail (for support)',
  toasts: {
    copySuccess: 'Details copied — you can paste them in an email to your contact at GLC.',
    copyFailure: 'Could not copy. Please note the reference below manually.',
    reportSent: 'Thanks — we have logged this. You can still copy the reference if support asks for it.',
    reportFailedTitle: 'We could not send a report from this session.',
    reportFailedDescription:
      'Copy the reference below and share it with your GLC contact, or try again after signing in.',
  },
  domRewrite: {
    title: 'This often happens with page translation',
    description:
      'The browser or an extension probably changed the page while the app was updating. Your data is usually safe.',
    actionsTitle: 'What to do',
    actions: [
      'Turn off automatic translation for this site (icon in the address bar or browser menu).',
      'Pause extensions that rewrite pages (ad blockers, grammar tools), then reload.',
      'Tap Try again. Built-in languages for the app are planned so translate will not be required.',
    ],
  },
  generic: {
    description:
      'A temporary problem occurred while loading or updating the screen. Your data is usually safe. Try again, go back to your home area, or share the reference below with GLC if the issue continues.',
    translationHint:
      'If you use automatic page translation or extensions that rewrite the page, turn them off for this site and try again — they can trigger this kind of error in web apps.',
  },
  labels: {
    reference: 'Reference',
    tryAgain: 'Try again',
    copyDetailsForSupport: 'Copy details for support',
    reportSent: 'Report sent',
    sending: 'Sending…',
    sendReportToGlc: 'Send report to GLC',
  },
} as const;
