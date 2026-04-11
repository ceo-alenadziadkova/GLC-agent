/**
 * Client-side batching for Discovery analytics. Optional Vite env overrides (production builds must define in Vercel if used).
 */

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const n = s === '' ? NaN : Number(s);
  if (!Number.isFinite(n)) return fallback;
  const f = Math.floor(n);
  if (f < min || f > max) return fallback;
  return f;
}

/** Debounce before flushing batched events (ms). */
export const DISCOVERY_ANALYTICS_FLUSH_MS = clampInt(
  import.meta.env.VITE_DISCOVERY_ANALYTICS_FLUSH_MS,
  500,
  60_000,
  3200,
);

/** Max events per POST batch. */
export const DISCOVERY_ANALYTICS_MAX_BATCH = clampInt(import.meta.env.VITE_DISCOVERY_ANALYTICS_MAX_BATCH, 1, 200, 24);
