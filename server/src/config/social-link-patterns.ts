/**
 * Host/path heuristics for extracting social handles from crawled external links.
 * Product-tunable rules — keep separate from collector implementation.
 */

export const SOCIAL_LINK_PATTERNS: Record<string, RegExp> = {
  twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/,
  linkedin: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/,
  facebook: /facebook\.com\/([a-zA-Z0-9._-]+)/,
  instagram: /instagram\.com\/([a-zA-Z0-9._-]+)/,
  youtube: /youtube\.com\/(?:@|channel\/)([a-zA-Z0-9_-]+)/,
  github: /github\.com\/([a-zA-Z0-9_-]+)/,
};
