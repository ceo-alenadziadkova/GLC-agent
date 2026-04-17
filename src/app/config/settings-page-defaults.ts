export const SETTINGS_PAGE_DEFAULTS = {
  minPasswordChars: 8,
  scrollAnchorHash: '#brief-layout',
  questionBankStudioHash: 'question-bank-studio',
} as const;

/** Browser localStorage id for notification toggles on Settings (not a secret). */
export const NOTIFY_PREFS_LOCAL_STORAGE_ID = 'glc_notify_prefs_v1';
