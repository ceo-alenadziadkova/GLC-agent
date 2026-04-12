/**
 * SSRF-safe public HTTP fetch policy (redirect cap, retryable statuses, backoff).
 * Used by `server/src/lib/public-http-url.ts`.
 */

export const PUBLIC_HTTP_FETCH = {
  defaultMaxRedirects: 5,
  maxRetries: 3,
  /** Status codes that trigger retry for GET-like requests (excludes mutating methods). */
  retryableStatusCodes: [408, 429, 500, 502, 503, 504, 529] as const,
  methodsWithoutRetry: ['POST', 'PATCH', 'PUT', 'DELETE'] as const,
  backoffBaseMs: 300,
  backoffJitterMaxMs: 120,
} as const;

export const PUBLIC_HTTP_FETCH_RETRYABLE_STATUS = new Set<number>(
  PUBLIC_HTTP_FETCH.retryableStatusCodes,
);

export const PUBLIC_HTTP_FETCH_METHODS_WITHOUT_RETRY = new Set<string>(
  PUBLIC_HTTP_FETCH.methodsWithoutRetry,
);
