/**
 * HTTP timeouts and payload truncation for pipeline collectors.
 * Source of truth: `SYSTEM_DEFAULTS.collectorsHttp`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const C = SYSTEM_DEFAULTS.collectorsHttp;

/** Default HTTP timeout for security/performance collectors (HEAD/GET probes). */
export const COLLECTOR_FETCH_TIMEOUT_MS = C.fetchTimeoutMs;

/** Max stored length for header values in security collector (CSP, Permissions-Policy, etc.). */
export const COLLECTOR_HEADER_PREVIEW_MAX = C.headerPreviewMax;

/** Timeout for SEO robots.txt fetch. */
export const COLLECTOR_SEO_FETCH_TIMEOUT_MS = C.seoFetchTimeoutMs;

/** Max characters of robots.txt body stored in audit payload. */
export const COLLECTOR_SEO_ROBOTS_CONTENT_MAX = C.seoRobotsContentMax;

/** Per-request timeout when fetching sitemap XML/text documents. */
export const SITEMAP_FETCH_TIMEOUT_MS = C.sitemapFetchTimeoutMs;
