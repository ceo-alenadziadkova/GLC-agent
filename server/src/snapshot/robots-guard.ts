/**
 * robots.txt fetch + parse for free snapshot (ADR: honor disallow for extras; block home when disallowed).
 * Small in-memory TTL cache per origin. Not a full RFC parser; covers User-agent groups for * and GLC-SnapshotScanner.
 */
import { fetchPublicHttpUrl } from '../lib/public-http-url.js';
import { logger } from '../services/logger.js';

const SNAPSHOT_UA_TOKEN = 'glc-snapshotscanner';
const DEFAULT_ROBOTS_CACHE_MS = 20 * 60 * 1000; // 20 minutes
const MAX_ROBOTS_BYTES = 512_000;

export type SnapshotRobotsPolicy = {
  /** False if no usable file or parse yielded no restrictive rules for us */
  hadFile: boolean;
  disallowPathPrefixes: string[];
  crawlDelayMs: number;
};

const cache = new Map<string, { expires: number; policy: SnapshotRobotsPolicy }>();

function cacheTtlMs(): number {
  const n = Number(process.env.SNAPSHOT_ROBOTS_CACHE_MS ?? DEFAULT_ROBOTS_CACHE_MS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_ROBOTS_CACHE_MS;
}

function uaGroupRelevant(agentLine: string): boolean {
  const a = agentLine.trim().toLowerCase();
  return a === '*' || a === SNAPSHOT_UA_TOKEN || a.includes(SNAPSHOT_UA_TOKEN);
}

/**
 * Parse robots.txt into merged disallow prefixes for relevant user-agents.
 * Disallow: with empty value is ignored (allow). Disallow: / blocks entire site for path checks.
 * Consecutive User-agent lines belong to one group; a new User-agent after rules starts a new group.
 */
export function parseRobotsTxtForSnapshot(text: string): { disallows: string[]; crawlDelayMs: number } {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.replace(/#.*$/, '').trim())
    .filter(l => l.length > 0);

  const mergedDisallows: string[] = [];
  let crawlDelayMs = 0;

  let currentAgents: string[] = [];
  let currentDisallows: string[] = [];
  let currentCrawlSec: number | undefined;
  let sawRuleInGroup = false;

  const flushGroup = () => {
    if (currentAgents.length === 0) return;
    const relevant = currentAgents.some(a => uaGroupRelevant(a));
    if (relevant) {
      mergedDisallows.push(...currentDisallows);
      if (currentCrawlSec !== undefined) {
        crawlDelayMs = Math.max(crawlDelayMs, Math.round(currentCrawlSec * 1000));
      }
    }
    currentAgents = [];
    currentDisallows = [];
    currentCrawlSec = undefined;
    sawRuleInGroup = false;
  };

  for (const line of lines) {
    const ua = /^user-agent:\s*(.+)$/i.exec(line);
    if (ua) {
      if (currentAgents.length > 0 && sawRuleInGroup) {
        flushGroup();
      }
      currentAgents.push(ua[1].trim());
      continue;
    }

    if (currentAgents.length === 0) continue;

    const dis = /^disallow:\s*(.*)$/i.exec(line);
    if (dis) {
      sawRuleInGroup = true;
      const path = dis[1].trim();
      if (path.length > 0) {
        const p = path.startsWith('/') ? path : `/${path}`;
        currentDisallows.push(p);
      }
      continue;
    }

    const cd = /^crawl-delay:\s*([\d.]+)\s*$/i.exec(line);
    if (cd) {
      sawRuleInGroup = true;
      const sec = parseFloat(cd[1]);
      if (Number.isFinite(sec) && sec >= 0) {
        currentCrawlSec = Math.min(Math.max(sec, 0), 60);
      }
    }
  }
  flushGroup();

  return {
    disallows: [...new Set(mergedDisallows)],
    crawlDelayMs: Math.min(crawlDelayMs, 60_000),
  };
}

function pathHitsDisallow(pathname: string, prefixes: string[]): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  for (const rule of prefixes) {
    if (rule === '/') return true;
    if (p === rule || p.startsWith(rule.endsWith('/') ? rule : `${rule}/`)) return true;
    if (!rule.endsWith('/') && p.startsWith(rule)) return true;
  }
  return false;
}

export function robotsSnapshotHomeAllowed(policy: SnapshotRobotsPolicy): boolean {
  return !pathHitsDisallow('/', policy.disallowPathPrefixes);
}

export function robotsSnapshotUrlAllowed(fullUrl: string, policy: SnapshotRobotsPolicy): boolean {
  try {
    const u = new URL(fullUrl);
    return !pathHitsDisallow(u.pathname || '/', policy.disallowPathPrefixes);
  } catch {
    return false;
  }
}

export async function getSnapshotRobotsPolicy(origin: string, signal: AbortSignal): Promise<SnapshotRobotsPolicy> {
  const ttl = cacheTtlMs();
  const now = Date.now();
  const cached = cache.get(origin);
  if (cached && cached.expires > now) {
    return cached.policy;
  }

  let hadFile = false;
  let disallows: string[] = [];
  let crawlDelayMs = 0;

  try {
    const robotsUrl = `${origin.replace(/\/$/, '')}/robots.txt`;
    const res = await fetchPublicHttpUrl(robotsUrl, {
      signal,
      headers: {
        'User-Agent': 'GLC-SnapshotScanner/1.0 (+https://glctech.es)',
        Accept: 'text/plain,text/*,*/*',
      },
    });

    if (!res.ok) {
      const policy: SnapshotRobotsPolicy = { hadFile: false, disallowPathPrefixes: [], crawlDelayMs: 0 };
      if (ttl > 0) cache.set(origin, { expires: now + ttl, policy });
      return policy;
    }

    const buf = await res.text();
    const text = buf.length > MAX_ROBOTS_BYTES ? buf.slice(0, MAX_ROBOTS_BYTES) : buf;
    hadFile = true;
    const parsed = parseRobotsTxtForSnapshot(text);
    disallows = parsed.disallows;
    crawlDelayMs = parsed.crawlDelayMs;
  } catch (e) {
    logger.warn('snapshot.robots_fetch_failed', { origin, error: (e as Error).message });
  }

  const policy: SnapshotRobotsPolicy = {
    hadFile,
    disallowPathPrefixes: disallows,
    crawlDelayMs,
  };
  if (ttl > 0) {
    cache.set(origin, { expires: now + ttl, policy });
  }
  return policy;
}

export function pathHitsDisallowForTests(pathname: string, prefixes: string[]): boolean {
  return pathHitsDisallow(pathname, prefixes);
}

export function resetSnapshotRobotsCacheForTests(): void {
  cache.clear();
}
