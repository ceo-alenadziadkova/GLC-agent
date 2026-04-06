import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseRobotsTxtForSnapshot,
  robotsSnapshotHomeAllowed,
  robotsSnapshotUrlAllowed,
  resetSnapshotRobotsCacheForTests,
  getSnapshotRobotsPolicy,
  pathHitsDisallowForTests,
} from '../snapshot/robots-guard.js';

describe('parseRobotsTxtForSnapshot', () => {
  it('merges User-agent * Disallow rules', () => {
    const text = `
User-agent: *
Disallow: /admin
Disallow: /tmp
`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.disallows).toContain('/admin');
    expect(r.disallows).toContain('/tmp');
  });

  it('applies rules to GLC-SnapshotScanner user-agent group', () => {
    const text = `
User-agent: GLC-SnapshotScanner
Disallow: /secret
`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.disallows).toContain('/secret');
  });

  it('allows multiple User-agent lines before Disallow', () => {
    const text = `
User-agent: *
User-agent: GLC-SnapshotScanner
Disallow: /x
`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.disallows).toContain('/x');
  });

  it('starts a new group after rules when a new User-agent appears', () => {
    const text = `
User-agent: *
Disallow: /a

User-agent: OtherBot
Disallow: /b
`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.disallows).toContain('/a');
    expect(r.disallows).not.toContain('/b');
  });

  it('parses crawl-delay in seconds', () => {
    const text = `
User-agent: *
Crawl-delay: 2
Disallow:
`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.crawlDelayMs).toBe(2000);
  });

  it('ignores full-line comments', () => {
    const text = `User-agent: *
# Disallow: /skip
Disallow: /z`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.disallows).toContain('/z');
    expect(r.disallows).not.toContain('/skip');
  });

  it('treats empty Disallow value as allow-all for that line', () => {
    const text = `User-agent: *
Disallow:
Disallow: /admin
`;
    const r = parseRobotsTxtForSnapshot(text);
    expect(r.disallows).toEqual(['/admin']);
  });
});

describe('robotsSnapshotHomeAllowed / url allowed', () => {
  it('blocks home when Disallow: / for *', () => {
    const policy = {
      hadFile: true,
      crawlDelayMs: 0,
      disallowPathPrefixes: parseRobotsTxtForSnapshot('User-agent: *\nDisallow: /').disallows,
    };
    expect(robotsSnapshotHomeAllowed(policy)).toBe(false);
  });

  it('allows extras when path not disallowed', () => {
    const policy = {
      hadFile: true,
      crawlDelayMs: 0,
      disallowPathPrefixes: ['/admin'],
    };
    expect(robotsSnapshotUrlAllowed('https://ex.com/contact', policy)).toBe(true);
    expect(robotsSnapshotUrlAllowed('https://ex.com/admin/login', policy)).toBe(false);
  });
});

describe('pathHitsDisallowForTests', () => {
  it('treats Disallow / as full site', () => {
    expect(pathHitsDisallowForTests('/foo', ['/'])).toBe(true);
  });
});

describe('getSnapshotRobotsPolicy cache', () => {
  beforeEach(() => {
    resetSnapshotRobotsCacheForTests();
  });

  it('returns empty policy when fetch fails (no network in unit test — uses invalid port)', async () => {
    const policy = await getSnapshotRobotsPolicy('http://127.0.0.1:9', AbortSignal.timeout(100));
    expect(policy.hadFile).toBe(false);
    expect(policy.disallowPathPrefixes).toEqual([]);
  });
});
