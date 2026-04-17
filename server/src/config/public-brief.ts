import { SYSTEM_DEFAULTS } from './system-defaults.js';
import { PUBLIC_BRIEF_COPY } from './public-brief-copy.js';

export const BRIEF_PUBLIC_TEXT_INPUT_LIMITS = {
  contactNameMax: 120,
  companyNameMax: 160,
  websiteUrlMax: 240,
  emailMax: 180,
  phoneMax: 80,
  fallbackMax: 300,
} as const;

export const BRIEF_PUBLIC_DEFAULT_RESPONSES = {
  noWebsiteAnswer: PUBLIC_BRIEF_COPY.noWebsiteAnswer,
  /** Semantic sentinel stored when the user has no public URL — not user-facing copy. */
  noWebsiteUrlSentinel: 'none',
} as const;

export const BRIEF_PUBLIC_SUBMISSIONS_LIST_MAX = SYSTEM_DEFAULTS.routeQueries.briefPublicSubmissionsMaxRows;
