import type * as cheerio from 'cheerio';
import { FACT_EXTRACTION_REGEX } from '../config/fact-patterns.js';

export function extractOpeningHours($: cheerio.CheerioAPI): boolean {
  const text = $.root().text().toLowerCase();
  return (
    $('[itemtype*="OpeningHours"]').length > 0 ||
    FACT_EXTRACTION_REGEX.openingHours.test(text)
  );
}

export function extractAddressish($: cheerio.CheerioAPI): boolean {
  return (
    $('[itemtype*="PostalAddress"]').length > 0 ||
    FACT_EXTRACTION_REGEX.addressish.test($.root().text())
  );
}
