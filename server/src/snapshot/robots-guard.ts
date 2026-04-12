/**
 * robots.txt fetch + parse for free snapshot (ADR: honor disallow for extras; block home when disallowed).
 * Parsing via robots-parser (Allow/Disallow precedence, wildcards, crawl-delay).
 */
import robotsParser from 'robots-parser';

import { fetchPublicHttpUrl } from '../lib/public-http-url.js';
import { SNAPSHOT_ROBOTS_USER_AGENT } from '../lib/robots-policy-shared.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { logger } from '../services/logger.js';

const MAX_ROBOTS_BYTES = 512_000;

export type SnapshotRobotsPolicy = {
  hadFile: boolean;
  crawlDelayMs: number;
  /** Raw robots.txt body when hadFile (for robots-parser) */
  robotsBody?: string;
  /** Absolute URL of the robots.txt resource */
  robotsResourceUrl?: string;
};

const cache = new Map<string, { expires: number; policy: SnapshotRobotsPolicy }>();

function cacheTtlMs(): number {
  return SYSTEM_DEFAULTS.snapshotRobots.cacheMs;
}

function getRobot(policy: SnapshotRobotsPolicy) {
  if (!policy.hadFile || !policy.robotsBody || !policy.robotsResourceUrl) return null;
  try {
    return robotsParser(policy.robotsResourceUrl, policy.robotsBody);
  } catch {
    return null;
  }
}

function crawlDelayMsFromRobot(policy: SnapshotRobotsPolicy): number {
  const robot = getRobot(policy);
  if (!robot) return 0;
  const sec = robot.getCrawlDelay(SNAPSHOT_ROBOTS_USER_AGENT);
  if (sec == null || !Number.isFinite(sec)) return 0;
  return Math.min(Math.round(sec * 1000), 60_000);
}

/** Large sites that typically disallow automated homepage reads by policy (not a misconfiguration). */
const MAJOR_CRAWL_CONTROL_ROOTS = new Set([
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'reddit.com',
  'pinterest.com',
]);

function registrableHostRoot(hostname: string): string {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  const parts = h.split('.');
  if (parts.length >= 2) return parts.slice(-2).join('.');
  return h;
}

/**
 * When the homepage is disallowed for our UA, classify intent for deterministic notes (no LLM).
 */
export function classifyRobotsFallbackSiteClass(hostname: string): 'major_platform' | 'standard' {
  const root = registrableHostRoot(hostname);
  if (MAJOR_CRAWL_CONTROL_ROOTS.has(root)) return 'major_platform';
  return 'standard';
}

export function robotsSnapshotHomeAllowed(policy: SnapshotRobotsPolicy, origin: string): boolean {
  const robot = getRobot(policy);
  if (!robot) return true;
  try {
    const home = `${origin.replace(/\/$/, '')}/`;
    const allowed = robot.isAllowed(home, SNAPSHOT_ROBOTS_USER_AGENT);
    return allowed !== false;
  } catch {
    return true;
  }
}

export function robotsSnapshotUrlAllowed(fullUrl: string, policy: SnapshotRobotsPolicy): boolean {
  const robot = getRobot(policy);
  if (!robot) return true;
  try {
    const allowed = robot.isAllowed(fullUrl, SNAPSHOT_ROBOTS_USER_AGENT);
    return allowed !== false;
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
  let robotsBody: string | undefined;
  const robotsResourceUrl = `${origin.replace(/\/$/, '')}/robots.txt`;

  try {
    const res = await fetchPublicHttpUrl(robotsResourceUrl, {
      signal,
      headers: {
        'User-Agent': SNAPSHOT_ROBOTS_USER_AGENT,
        Accept: 'text/plain,text/*,*/*',
      },
    });

    if (!res.ok) {
      const policy: SnapshotRobotsPolicy = { hadFile: false, crawlDelayMs: 0 };
      if (ttl > 0) cache.set(origin, { expires: now + ttl, policy });
      return policy;
    }

    const buf = await res.text();
    const text = buf.length > MAX_ROBOTS_BYTES ? buf.slice(0, MAX_ROBOTS_BYTES) : buf;
    hadFile = true;
    robotsBody = text;
  } catch (e) {
    logger.warn('snapshot.robots_fetch_failed', { origin, error: (e as Error).message });
  }

  const basePolicy: SnapshotRobotsPolicy = {
    hadFile,
    crawlDelayMs: 0,
    ...(hadFile && robotsBody ? { robotsBody, robotsResourceUrl } : {}),
  };
  const crawlDelayMs = crawlDelayMsFromRobot(basePolicy);

  const policy: SnapshotRobotsPolicy = {
    ...basePolicy,
    crawlDelayMs,
  };

  if (ttl > 0) {
    cache.set(origin, { expires: now + ttl, policy });
  }
  return policy;
}

export function resetSnapshotRobotsCacheForTests(): void {
  cache.clear();
}
