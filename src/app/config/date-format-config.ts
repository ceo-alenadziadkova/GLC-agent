/**
 * Shared locale-aware date/time formatting presets for app UI.
 */
export const DATE_FORMAT_CONFIG = {
  locale: undefined,
  shortDate: {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  } satisfies Intl.DateTimeFormatOptions,
  mediumDateTime: {
    dateStyle: 'medium',
    timeStyle: 'short',
  } satisfies Intl.DateTimeFormatOptions,
} as const;
