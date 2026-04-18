import * as cheerio from 'cheerio';

import { SNAPSHOT_MAX_DISCOVERY_LINKS } from '../../config/snapshot-timing.js';

/**
 * Collect internal URLs from nav, footer, and early links (capped).
 */
export function discoverCandidateUrls(homeHtml: string, baseUrl: string): string[] {
  const $ = cheerio.load(homeHtml);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const urls: string[] = [];

  const consider = (href: string | undefined): void => {
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      return;
    }
    try {
      const candidate = new URL(href, baseUrl);
      if (candidate.hostname !== base.hostname) return;
      if (!['http:', 'https:'].includes(candidate.protocol)) return;
      const normalized = `${candidate.origin}${candidate.pathname.replace(/\/$/, '') || '/'}`;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      urls.push(candidate.href);
    } catch {
      // Skip malformed URL values.
    }
  };

  $('header a[href], nav a[href], footer a[href], [role="navigation"] a[href]').each((_, element) => {
    consider($(element).attr('href'));
  });

  $('a[href]').each((_, element) => {
    if (urls.length >= SNAPSHOT_MAX_DISCOVERY_LINKS) {
      return false;
    }
    consider($(element).attr('href'));
    return undefined;
  });

  return urls;
}
