import type { Response } from 'express';

export const SECURITY_HEADERS = {
  benchmarkRecomputeSecretHeader: 'x-benchmark-recompute-secret',
} as const;

/** HSTS for production only (1 year, subdomains). */
export const STRICT_TRANSPORT_SECURITY_VALUE = 'max-age=31536000; includeSubDomains' as const;

/**
 * Baseline security headers on every response. Adds HSTS when `isProduction` is true.
 */
export function setStandardSecurityHeaders(res: Response, isProduction: boolean): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', STRICT_TRANSPORT_SECURITY_VALUE);
  }
}
