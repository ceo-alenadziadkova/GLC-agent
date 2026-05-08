/**
 * Best-effort business address from public HTML: schema.org / JSON-LD, then footer.
 */
import * as cheerio from 'cheerio';
import { FACT_EXTRACTION_REGEX } from '../facts/config/fact-patterns.js';

const MAX_ADDRESS_LEN = 500;

function normalizeLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_ADDRESS_LEN);
}

function collectLdJsonBlobs($: cheerio.CheerioAPI): unknown[] {
  const out: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw?.trim()) return;
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) {
        out.push(...j);
      } else if (j && typeof j === 'object' && '@graph' in (j as Record<string, unknown>)) {
        const g = (j as { '@graph'?: unknown[] })['@graph'];
        if (Array.isArray(g)) out.push(...g);
        else out.push(j);
      } else {
        out.push(j);
      }
    } catch {
      /* skip */
    }
  });
  return out;
}

function addressFromObject(addr: unknown): string | null {
  if (!addr || typeof addr !== 'object') return null;
  const a = addr as Record<string, unknown>;
  if (a['@type'] && String(a['@type']).includes('PostalAddress')) {
    const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
      .map(x => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean);
    if (parts.length) return normalizeLine(parts.join(', '));
  }
  if (typeof a.streetAddress === 'string' && a.streetAddress.trim()) {
    const line = [a.streetAddress, a.addressLocality, a.postalCode]
      .map(x => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean);
    if (line.length) return normalizeLine(line.join(', '));
  }
  return null;
}

function walkForPostalAddress(node: unknown, depth: number): string | null {
  if (depth > 12 || node === null || node === undefined) return null;
  if (typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = walkForPostalAddress(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  const t = o['@type'];
  if (t !== undefined) {
    const typeStr = Array.isArray(t) ? t.map(String).join(' ') : String(t);
    if (typeStr.includes('PostalAddress')) {
      const direct = addressFromObject(o);
      if (direct) return direct;
    }
  }
  if (o.address) {
    const r = addressFromObject(o.address);
    if (r) return r;
    const w = walkForPostalAddress(o.address, depth + 1);
    if (w) return w;
  }
  for (const v of Object.values(o)) {
    const r = walkForPostalAddress(v, depth + 1);
    if (r) return r;
  }
  return null;
}

function pickFromMicrodata($: cheerio.CheerioAPI): string | null {
  const el = $('[itemtype*="schema.org/PostalAddress"],[itemtype*="PostalAddress"]');
  if (el.length === 0) return null;
  const parts: string[] = [];
  el.first()
    .find('[itemprop=streetAddress],[itemprop=addressLocality],[itemprop=postalCode],[itemprop=addressCountry]')
    .each((_, n) => {
      const t = $(n).text().trim();
      if (t) parts.push(t);
    });
  if (parts.length) return normalizeLine(parts.join(', '));
  const t = el.first().text().replace(/\s+/g, ' ').trim();
  if (t.length >= 12 && t.length <= MAX_ADDRESS_LEN && FACT_EXTRACTION_REGEX.addressish.test(t)) {
    return normalizeLine(t);
  }
  return null;
}

function pickFromItemprop($: cheerio.CheerioAPI): string | null {
  const s = $('[itemprop=streetAddress]').first().text().replace(/\s+/g, ' ').trim();
  if (s.length >= 6) return normalizeLine(s);
  return null;
}

const STREET_LIKE = /\b\d+[^,]{0,80}(?:street|st\.|ave|avenue|road|rd\.|blvd|boulevard|ln\.|lane|way|plaza|suite|unit|fl\.|floor)\b/i;

function pickFromFooter($: cheerio.CheerioAPI): string | null {
  const scope = $('footer, [role="contentinfo"]');
  if (scope.length === 0) return null;
  const text = scope
    .map((_, n) => $(n).text())
    .get()
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 15) return null;
  const segments = text
    .split(/(?:\n|·|•|\||\s+—\s+|(?=\b\d{4,5}\b))/u)
    .map(s => s.trim())
    .filter(s => s.length >= 10 && s.length <= MAX_ADDRESS_LEN);
  for (const seg of segments) {
    if (STREET_LIKE.test(seg) || FACT_EXTRACTION_REGEX.addressish.test(seg)) {
      return normalizeLine(seg);
    }
  }
  if (text.length < 400 && STREET_LIKE.test(text) && !/©|copyright|all rights reserved|privacy policy|terms of service/i.test(text)) {
    return normalizeLine(text);
  }
  return null;
}

/**
 * Returns a single line suitable for "Business location" (footer / structured data), or null.
 */
export function extractPublicAddressFromHtml(html: string): string | null {
  if (!html || html.length < 50) return null;
  const $ = cheerio.load(html);

  for (const blob of collectLdJsonBlobs($)) {
    const a = walkForPostalAddress(blob, 0);
    if (a) return a;
  }

  const micro = pickFromMicrodata($);
  if (micro) return micro;

  const itemprop = pickFromItemprop($);
  if (itemprop) return itemprop;

  return pickFromFooter($);
}
