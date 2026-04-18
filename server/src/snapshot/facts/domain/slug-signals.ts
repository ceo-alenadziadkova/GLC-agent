import * as cheerio from 'cheerio';
import type { FetchedPage } from '../../types.js';
import { FACT_EXTRACTION_POLICY } from '../config/fact-extraction-policy.js';
import { TITLE_TOKEN_STOP_WORDS } from '../config/fact-patterns.js';

export function normSlug(pathname: string): string[] {
  return pathname
    .split('/')
    .map(s => s.replace(/\.[a-z0-9]+$/i, '').toLowerCase())
    .filter(Boolean);
}

export function mergeUnique<T>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])];
}

function slugTokensFromTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[|–—\-:]+/g, ' ')
    .split(/[^a-z0-9]+/i)
    .map(s => s.replace(/\.[a-z0-9]+$/i, ''))
    .filter(s => s.length >= FACT_EXTRACTION_POLICY.limits.titleTokenMinLen && !TITLE_TOKEN_STOP_WORDS.has(s));
}

export function collectTitleWordSlugs(pages: FetchedPage[], segmentLimit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const page of pages) {
    if (out.length >= segmentLimit) break;
    const $ = cheerio.load(page.html);
    const title = $('title').first().text().trim();
    for (const token of slugTokensFromTitle(title)) {
      if (!token || seen.has(token)) continue;
      seen.add(token);
      out.push(token);
      if (out.length >= segmentLimit) break;
    }
  }
  return out;
}

export function collectLinkPathSegments(pages: FetchedPage[], segmentLimit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  outer: for (const page of pages) {
    const $ = cheerio.load(page.html);
    let base: URL;
    try {
      base = new URL(page.finalUrl);
    } catch {
      continue;
    }
    const anchors = $('a[href]').toArray();
    for (const el of anchors) {
      if (out.length >= segmentLimit) break outer;
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
      try {
        const u = new URL(href, page.finalUrl);
        if (u.hostname !== base.hostname) continue;
        for (const seg of normSlug(u.pathname)) {
          if (!seg || seen.has(seg)) continue;
          seen.add(seg);
          out.push(seg);
          if (out.length >= segmentLimit) break outer;
        }
      } catch {
        /* skip invalid href */
      }
    }
  }
  return out;
}
