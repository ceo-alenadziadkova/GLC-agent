import { XMLParser } from 'fast-xml-parser';
import robotsParser from 'robots-parser';

import { fetchPublicHttpUrl } from './public-http-url.js';
import { AUDIT_ROBOTS_USER_AGENT } from './robots-policy-shared.js';
import { SITEMAP_FETCH_TIMEOUT_MS } from '../config/collector-http.js';
import { SITEMAP_DISCOVERY } from '../config/sitemap-discovery-limits.js';

const MAX_SITEMAP_FETCHES = SITEMAP_DISCOVERY.maxFetches;
const MAX_NESTING_DEPTH = SITEMAP_DISCOVERY.maxNestingDepth;
const MAX_SITEMAP_BYTES = SITEMAP_DISCOVERY.maxBytes;
const MAX_URLS_TRACKED = SITEMAP_DISCOVERY.maxUrlsTracked;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (tagName: string) => tagName === 'url' || tagName === 'sitemap',
});

function normalizeChildren<T>(node: T | T[] | undefined): T[] {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
}

function extractLoc(entry: unknown): string | null {
  if (entry == null) return null;
  if (typeof entry === 'string') return entry.trim() || null;
  if (typeof entry !== 'object') return null;
  const o = entry as Record<string, unknown>;
  const loc = o.loc;
  if (typeof loc === 'string') return loc.trim() || null;
  if (loc && typeof loc === 'object' && '#text' in loc) {
    const t = (loc as { '#text': unknown })['#text'];
    return typeof t === 'string' ? t.trim() || null : null;
  }
  return null;
}

function findUrlsetOrIndexRoot(parsed: Record<string, unknown>): Record<string, unknown> | null {
  if (parsed.urlset || parsed.sitemapindex) return parsed;
  for (const v of Object.values(parsed)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = v as Record<string, unknown>;
      if (inner.urlset || inner.sitemapindex) return inner;
    }
  }
  return null;
}

export type SitemapDiscoveryResult = {
  exists: boolean;
  /** First sitemap URL that returned a usable body */
  url: string | null;
  /** Unique page locs from all urlset sitemaps (capped) */
  url_count: number;
  format: 'xml' | 'text' | null;
  /** Number of sitemap XML documents fetched (including indexes) */
  sitemaps_fetched: number;
  /** True if any fetched file was a sitemap index */
  had_index: boolean;
};

function parseTxtSitemapUrls(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith('http://') || t.startsWith('https://')) out.push(t);
  }
  return out;
}

async function fetchSitemapBody(sitemapUrl: string): Promise<string | null> {
  try {
    const res = await fetchPublicHttpUrl(sitemapUrl, {
      headers: { 'User-Agent': AUDIT_ROBOTS_USER_AGENT },
      signal: AbortSignal.timeout(SITEMAP_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_SITEMAP_BYTES ? text.slice(0, MAX_SITEMAP_BYTES) : text;
  } catch {
    return null;
  }
}

type WalkState = {
  pageUrls: Set<string>;
  fetches: number;
  hadIndex: boolean;
  primaryUrl: string | null;
};

async function walkSitemapUrl(sitemapUrl: string, depth: number, state: WalkState): Promise<void> {
  if (state.fetches >= MAX_SITEMAP_FETCHES || depth > MAX_NESTING_DEPTH) return;

  const body = await fetchSitemapBody(sitemapUrl);
  if (!body) return;

  state.fetches += 1;
  if (!state.primaryUrl) state.primaryUrl = sitemapUrl;

  const trimmed = body.trimStart();
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
    let parsed: Record<string, unknown>;
    try {
      parsed = xmlParser.parse(body) as Record<string, unknown>;
    } catch {
      return;
    }

    const root = findUrlsetOrIndexRoot(parsed);
    if (!root) return;

    const urlset = root.urlset as Record<string, unknown> | undefined;
    if (urlset) {
      const urls = normalizeChildren(urlset.url as unknown);
      for (const u of urls) {
        const loc = extractLoc(u);
        if (loc && state.pageUrls.size < MAX_URLS_TRACKED) state.pageUrls.add(loc);
      }
      return;
    }

    const index = root.sitemapindex as Record<string, unknown> | undefined;
    if (index) {
      state.hadIndex = true;
      const children = normalizeChildren(index.sitemap as unknown);
      for (const ch of children) {
        const loc = extractLoc(ch);
        if (!loc) continue;
        await walkSitemapUrl(loc, depth + 1, state);
        if (state.fetches >= MAX_SITEMAP_FETCHES) break;
      }
    }
    return;
  }

  // Plain-text sitemap
  for (const u of parseTxtSitemapUrls(body)) {
    if (state.pageUrls.size < MAX_URLS_TRACKED) state.pageUrls.add(u);
  }
}

const FALLBACK_SITEMAP_PATHS = [...SITEMAP_DISCOVERY.fallbackPaths];

/**
 * Discover sitemaps from robots.txt directives and common paths; parse urlsets and sitemap indexes (bounded).
 */
export async function discoverSitemaps(
  origin: string,
  robotsTxtBody: string | null,
  robotsResourceUrl: string,
): Promise<SitemapDiscoveryResult> {
  const state: WalkState = {
    pageUrls: new Set(),
    fetches: 0,
    hadIndex: false,
    primaryUrl: null,
  };

  const seeds = new Set<string>();

  if (robotsTxtBody) {
    try {
      const robot = robotsParser(robotsResourceUrl, robotsTxtBody);
      for (const s of robot.getSitemaps()) {
        try {
          seeds.add(new URL(s).href);
        } catch {
          /* skip invalid */
        }
      }
    } catch {
      /* ignore parser errors */
    }
  }

  const base = origin.replace(/\/$/, '');
  for (const p of FALLBACK_SITEMAP_PATHS) {
    try {
      seeds.add(new URL(p, `${base}/`).href);
    } catch {
      /* skip */
    }
  }

  for (const seed of seeds) {
    await walkSitemapUrl(seed, 0, state);
    if (state.pageUrls.size >= MAX_URLS_TRACKED) break;
  }

  const exists = state.fetches > 0 && (state.pageUrls.size > 0 || state.hadIndex);
  return {
    exists,
    url: state.primaryUrl,
    url_count: state.pageUrls.size,
    format: state.primaryUrl?.endsWith('.txt') ? 'text' : state.fetches > 0 ? 'xml' : null,
    sitemaps_fetched: state.fetches,
    had_index: state.hadIndex,
  };
}
