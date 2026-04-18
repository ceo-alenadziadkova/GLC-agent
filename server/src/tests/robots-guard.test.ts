import { describe, it, expect, beforeEach } from 'vitest';
import robotsParser from 'robots-parser';

import { SNAPSHOT_ROBOTS_USER_AGENT } from '../lib/robots-policy-shared.js';
import {
  robotsSnapshotHomeAllowed,
  robotsSnapshotUrlAllowed,
  resetSnapshotRobotsCacheForTests,
  getSnapshotRobotsPolicy,
  type SnapshotRobotsPolicy,
} from '../snapshot/robots-guard.js';

function policyFromRobotsText(text: string, origin = 'https://ex.com'): SnapshotRobotsPolicy {
  const robotsResourceUrl = `${origin.replace(/\/$/, '')}/robots.txt`;
  const robot = robotsParser(robotsResourceUrl, text);
  const sec = robot.getCrawlDelay(SNAPSHOT_ROBOTS_USER_AGENT);
  const crawlDelayMs =
    sec != null && Number.isFinite(sec) ? Math.min(Math.round(sec * 1000), 60_000) : 0;
  return {
    hadFile: true,
    crawlDelayMs,
    robotsBody: text,
    robotsResourceUrl,
  };
}

describe('robots-parser-backed snapshot policy', () => {
  it('merges User-agent * Disallow rules', () => {
    const text = `
User-agent: *
Disallow: /admin
Disallow: /tmp
`;
    const p = policyFromRobotsText(text);
    expect(robotsSnapshotUrlAllowed('https://ex.com/admin', p)).toBe(false);
    expect(robotsSnapshotUrlAllowed('https://ex.com/tmp/foo', p)).toBe(false);
    expect(robotsSnapshotUrlAllowed('https://ex.com/public', p)).toBe(true);
  });

  it('applies rules to GLC-SnapshotScanner user-agent group', () => {
    const text = `
User-agent: GLC-SnapshotScanner
Disallow: /secret
`;
    const p = policyFromRobotsText(text);
    expect(robotsSnapshotUrlAllowed('https://ex.com/secret', p)).toBe(false);
  });

  it('allows multiple User-agent lines before Disallow', () => {
    const text = `
User-agent: *
User-agent: GLC-SnapshotScanner
Disallow: /x
`;
    const p = policyFromRobotsText(text);
    expect(robotsSnapshotUrlAllowed('https://ex.com/x', p)).toBe(false);
  });

  it('does not apply OtherBot-only rules to our scanner', () => {
    const text = `
User-agent: *
Disallow: /a

User-agent: OtherBot
Disallow: /b
`;
    const p = policyFromRobotsText(text);
    expect(robotsSnapshotUrlAllowed('https://ex.com/a', p)).toBe(false);
    expect(robotsSnapshotUrlAllowed('https://ex.com/b', p)).toBe(true);
  });

  it('parses crawl-delay in seconds', () => {
    const text = `
User-agent: *
Crawl-delay: 2
Disallow:
`;
    const p = policyFromRobotsText(text);
    expect(p.crawlDelayMs).toBe(2000);
  });

  it('ignores full-line comments', () => {
    const text = `User-agent: *
# Disallow: /skip
Disallow: /z`;
    const p = policyFromRobotsText(text);
    expect(robotsSnapshotUrlAllowed('https://ex.com/z', p)).toBe(false);
    expect(robotsSnapshotUrlAllowed('https://ex.com/skip', p)).toBe(true);
  });

  it('treats empty Disallow value as allow-all for that line', () => {
    const text = `User-agent: *
Disallow:
Disallow: /admin
`;
    const p = policyFromRobotsText(text);
    expect(robotsSnapshotUrlAllowed('https://ex.com/', p)).toBe(true);
    expect(robotsSnapshotUrlAllowed('https://ex.com/admin', p)).toBe(false);
  });
});

describe('robotsSnapshotHomeAllowed / url allowed', () => {
  it('blocks home when Disallow: / for *', () => {
    const p = policyFromRobotsText('User-agent: *\nDisallow: /');
    expect(robotsSnapshotHomeAllowed(p, 'https://ex.com')).toBe(false);
  });

  it('allows extras when path not disallowed', () => {
    const p = policyFromRobotsText('User-agent: *\nDisallow: /admin');
    expect(robotsSnapshotUrlAllowed('https://ex.com/contact', p)).toBe(true);
    expect(robotsSnapshotUrlAllowed('https://ex.com/admin/login', p)).toBe(false);
  });
});

describe('getSnapshotRobotsPolicy cache', () => {
  beforeEach(() => {
    resetSnapshotRobotsCacheForTests();
  });

  it('returns empty policy when fetch fails (no network in unit test — uses invalid port)', async () => {
    const policy = await getSnapshotRobotsPolicy('http://127.0.0.1:9', AbortSignal.timeout(100));
    expect(policy.hadFile).toBe(false);
    expect(policy.robotsBody).toBeUndefined();
  });
});
