/**
 * Normalize `audits.industry` into a stable benchmark bucket key.
 * Returns null when the audit should contribute only to the cross-industry `all` bucket.
 */

export const ALL_BUCKET = 'all' as const;

export type BenchmarkIndustryBucket = typeof ALL_BUCKET | string;

/**
 * Trims and lowercases, collapses whitespace to underscores.
 * Empty after trim => null (caller should route row to `all`-only aggregation).
 */
export function normalizeAuditIndustryKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  return t.length > 0 ? t : null;
}
