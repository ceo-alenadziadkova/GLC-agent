import crypto from 'node:crypto';

const HEADER = 'x-benchmark-recompute-secret';

/**
 * Validates the cron / ops header against `BENCHMARK_RECOMPUTE_SECRET` (constant-time when lengths match).
 */
export function benchmarkRecomputeSecretHeaderName(): typeof HEADER {
  return HEADER;
}

export function benchmarkRecomputeSecretValid(headerValue: string | undefined): boolean {
  const secret = process.env.BENCHMARK_RECOMPUTE_SECRET?.trim();
  if (!secret || headerValue === undefined) return false;
  try {
    const a = Buffer.from(secret, 'utf8');
    const b = Buffer.from(headerValue, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
