/**
 * Defaults for TanStack Query in the SPA. Optional Vite env overrides.
 */

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const n = s === '' ? NaN : Number(s);
  if (!Number.isFinite(n)) return fallback;
  const f = Math.floor(n);
  if (f < min || f > max) return fallback;
  return f;
}

export function glcQueryDefaultRetry(): number | boolean {
  const raw = import.meta.env.VITE_QUERY_DEFAULT_RETRY;
  if (raw === undefined || raw === '') return 1;
  const s = String(raw).trim().toLowerCase();
  if (s === 'false' || s === '0') return false;
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n <= 5) return Math.floor(n);
  return 1;
}

export const GLC_QUERY_STALE_TIME_MS = clampInt(
  import.meta.env.VITE_QUERY_STALE_TIME_MS,
  10_000,
  3_600_000,
  120_000,
);

export const GLC_QUERY_GC_TIME_MS = clampInt(
  import.meta.env.VITE_QUERY_GC_TIME_MS,
  60_000,
  86_400_000,
  900_000,
);
