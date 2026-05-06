/**
 * Heuristic for PostgREST / Postgres errors that are worth retrying on idempotent writes.
 * Conservative: expand only with evidence from production logs.
 */

function msg(err: { message?: string } | null): string {
  return (err?.message ?? '').toLowerCase();
}

export function isLikelyTransientSupabaseError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? '';
  const m = msg(err);

  const transientCodes = new Set([
    '57014', // statement timeout
    '55P03', // lock_not_available
    '08006', // connection_failure (driver-dependent)
    '08003', // connection_does_not_exist
    'PGRST002', // schema cache loading (transient on deploy)
    'PGRST503', // service unavailable
    'PGRST504', // gateway timeout
  ]);
  if (transientCodes.has(code)) return true;

  if (
    m.includes('timeout') ||
    m.includes('econnreset') ||
    m.includes('etimedout') ||
    m.includes('socket') ||
    m.includes('fetch failed') ||
    m.includes('network') ||
    m.includes(' 502') ||
    m.includes(' 503') ||
    m.includes(' 504') ||
    m.includes('bad gateway') ||
    m.includes('service unavailable') ||
    m.includes('gateway time-out')
  ) {
    return true;
  }

  return false;
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}
