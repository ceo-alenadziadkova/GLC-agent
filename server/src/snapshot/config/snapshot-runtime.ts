export const SNAPSHOT_DOMAIN_KEY = 'ux_conversion' as const;
export const SNAPSHOT_PHASE_NUMBER = 4 as const;
export const SNAPSHOT_PROMPT_VERSION = 'snapshot-det-v1' as const;

export const SNAPSHOT_PREVIEW_LIMITS = {
  issuesMax: 2,
  quickWinsMax: 2,
} as const;

export const SNAPSHOT_EXTRACTION_LIMITS = {
  externalLinksMax: 40,
  evidenceRefsMax: 5,
  contactEmailsMax: 8,
} as const;

/** Homepage snippet: if paragraph exceeds this length, truncate for preview. */
export const SNAPSHOT_HOMEPAGE_SNIPPET_MAX_CHARS = 320 as const;

/** Characters to keep before ellipsis when truncating (must be < MAX_CHARS). */
export const SNAPSHOT_HOMEPAGE_SNIPPET_TRUNCATE_TO = 317 as const;

export const SNAPSHOT_HOMEPAGE_SNIPPET_TRUNCATE_SUFFIX = '...' as const;

/** Cap on matched_signals returned in classification_transparency (API payload size). */
export const SNAPSHOT_CLASSIFICATION_TRANSPARENCY_MATCHED_SIGNALS_MAX = 30 as const;
