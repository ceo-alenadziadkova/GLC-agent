/**
 * Host/path heuristics for extracting social handles from crawled external links.
 * Product-tunable rules — keep separate from collector implementation.
 */

/**
 * First path segment on twitter.com / x.com that is never a profile handle
 * (share intents, in-app routes, settings, etc.).
 */
export const SOCIAL_TWITTER_NON_PROFILE_FIRST_SEGMENTS = [
  'account',
  'compose',
  'download',
  'explore',
  'hashtag',
  'hashtags',
  'help',
  'home',
  'i',
  'intent',
  'login',
  'messages',
  'notifications',
  'oauth',
  'privacy',
  'rules',
  'search',
  'settings',
  'share',
  'signup',
  'teams',
  'tos',
  'widgets',
] as const;

const TWITTER_FIRST_SEGMENT_SKIP_PATTERN = SOCIAL_TWITTER_NON_PROFILE_FIRST_SEGMENTS.map(
  (s) => `${s}(?:/|$|\\?)`,
).join('|');

/** Capture profile slug only; exclude /intent/tweet, /share, /i/, etc. */
const TWITTER_PROFILE_RE = new RegExp(
  `(?:twitter\\.com|x\\.com)\\/(?!${TWITTER_FIRST_SEGMENT_SKIP_PATTERN})([a-zA-Z0-9_]+)`,
  'i',
);

export const SOCIAL_LINK_PATTERNS: Record<string, RegExp> = {
  twitter: TWITTER_PROFILE_RE,
  linkedin: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/,
  facebook: /facebook\.com\/([a-zA-Z0-9._-]+)/,
  instagram: /instagram\.com\/([a-zA-Z0-9._-]+)/,
  youtube: /youtube\.com\/(?:@|channel\/)([a-zA-Z0-9_-]+)/,
  github: /github\.com\/([a-zA-Z0-9_-]+)/,
};
