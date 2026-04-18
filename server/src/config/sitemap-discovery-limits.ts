/**
 * Bounded sitemap discovery (fetch count, depth, body size, URL cap, fallback paths).
 * Used by `server/src/lib/sitemap-discovery.ts`.
 */

export const SITEMAP_DISCOVERY = {
  maxFetches: 24,
  maxNestingDepth: 5,
  maxBytes: 5_000_000,
  maxUrlsTracked: 50_000,
  fallbackPaths: ['/sitemap.xml', '/sitemap_index.xml', '/sitemap.txt'] as const,
} as const;
