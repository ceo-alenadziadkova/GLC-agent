import { z } from 'zod';

/** Normalized scan basis (ADR-FREE-SNAPSHOT-SCANNER). */
export const SnapshotScanBasisCodeSchema = z.enum([
  'homepage_only',
  'homepage_plus_core_pages',
  'homepage_rendered_fallback',
  'degraded',
  'cache_hit',
]);

export type SnapshotScanBasisCode = z.infer<typeof SnapshotScanBasisCodeSchema>;

export function deriveScanBasisCode(opts: {
  cacheHit: boolean;
  pagesFetched: number;
  playwrightUsed: boolean;
  degraded: boolean;
}): SnapshotScanBasisCode {
  if (opts.cacheHit) return 'cache_hit';
  if (opts.degraded || opts.pagesFetched < 1) return 'degraded';
  if (opts.playwrightUsed) return 'homepage_rendered_fallback';
  if (opts.pagesFetched > 1) return 'homepage_plus_core_pages';
  return 'homepage_only';
}
