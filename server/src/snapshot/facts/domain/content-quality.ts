import * as cheerio from 'cheerio';
import type { SnapshotFacts } from '../../types.js';
import { FACT_EXTRACTION_POLICY } from '../config/fact-extraction-policy.js';
import { FACT_EXTRACTION_REGEX } from '../config/fact-patterns.js';

/**
 * True when the raw HTML is probably an empty JS shell — tier-3 Playwright may recover real content.
 * Keep behavior aligned with fetch-tiered shell heuristics.
 */
export function htmlLooksLikeClientShell(html: string): boolean {
  const $ = cheerio.load(html);
  const main = $('main').text() || $('article').text() || $('body').text();
  const trimmed = main.replace(/\s+/g, ' ').trim();
  const len = trimmed.length;
  const scripts = $('script').length;
  return (
    (len < FACT_EXTRACTION_POLICY.quality.shellTextLengthMax &&
      scripts > FACT_EXTRACTION_POLICY.quality.shellScriptCountMin) ||
    FACT_EXTRACTION_REGEX.homepageShellMount.test(html)
  );
}

export function contentQualityAndShell(html: string, $: cheerio.CheerioAPI): {
  contentQuality: SnapshotFacts['contentQuality'];
  appShellLikely: boolean;
  bodyTextSample: string;
} {
  const main = $('main').text() || $('article').text() || $('body').text();
  const trimmed = main.replace(/\s+/g, ' ').trim();
  const len = trimmed.length;

  const appShellLikely = htmlLooksLikeClientShell(html);

  let contentQuality: SnapshotFacts['contentQuality'] = 'high';
  if (len < FACT_EXTRACTION_POLICY.quality.lowTextLengthMax || appShellLikely) contentQuality = 'low';
  else if (len < FACT_EXTRACTION_POLICY.quality.mediumTextLengthMax) contentQuality = 'medium';

  return {
    contentQuality,
    appShellLikely,
    bodyTextSample: trimmed.slice(0, FACT_EXTRACTION_POLICY.quality.bodyTextSampleMax),
  };
}
