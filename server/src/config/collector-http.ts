/**
 * HTTP timeouts and payload truncation for pipeline collectors (env-tunable).
 */

import { parsePositiveIntFromEnv } from './rate-limits.js';

/** Default HTTP timeout for security/performance collectors (HEAD/GET probes). */
export const COLLECTOR_FETCH_TIMEOUT_MS = parsePositiveIntFromEnv(
  process.env.COLLECTOR_FETCH_TIMEOUT_MS,
  10_000,
);

/** Max stored length for header values in security collector (CSP, Permissions-Policy, etc.). */
export const COLLECTOR_HEADER_PREVIEW_MAX = parsePositiveIntFromEnv(
  process.env.COLLECTOR_HEADER_PREVIEW_MAX,
  200,
);

/** Timeout for SEO robots.txt fetch. */
export const COLLECTOR_SEO_FETCH_TIMEOUT_MS = parsePositiveIntFromEnv(
  process.env.COLLECTOR_SEO_FETCH_TIMEOUT_MS,
  15_000,
);

/** Max characters of robots.txt body stored in audit payload. */
export const COLLECTOR_SEO_ROBOTS_CONTENT_MAX = parsePositiveIntFromEnv(
  process.env.COLLECTOR_SEO_ROBOTS_CONTENT_MAX,
  2000,
);

/** Per-request timeout when fetching sitemap XML/text documents. */
export const SITEMAP_FETCH_TIMEOUT_MS = parsePositiveIntFromEnv(
  process.env.SITEMAP_FETCH_TIMEOUT_MS,
  25_000,
);
