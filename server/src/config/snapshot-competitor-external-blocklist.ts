/**
 * Hostname substrings to skip when picking an external "competitor" link from the homepage crawl.
 * CDN, analytics, and major platforms — not comparable standalone sites.
 */

export const SNAPSHOT_COMPETITOR_BLOCKED_HOST_PATTERN =
  /facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|tiktok\.com|google\.com|gstatic\.com|doubleclick\.net|googletagmanager\.com|analytics\.google|googleadservices\.com|clk\.|fonts\.googleapis\.com|cdnjs\.|jsdelivr\.net/i;
