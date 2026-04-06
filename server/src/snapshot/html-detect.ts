/**
 * Decide if an HTTP response body is usable as HTML for cheerio snapshot (ADR: non-HTML homepage → degraded).
 */

export function isLikelyHtmlDocument(contentType: string | null, body: string): boolean {
  const ct = (contentType ?? '').toLowerCase().split(';')[0].trim();

  if (ct.includes('text/html') || ct.includes('application/xhtml')) {
    return true;
  }

  if (
    ct.startsWith('image/') ||
    ct.startsWith('video/') ||
    ct.startsWith('audio/') ||
    ct === 'application/pdf' ||
    ct === 'application/json' ||
    ct === 'text/json' ||
    ct === 'application/ld+json'
  ) {
    return false;
  }

  const s = body.slice(0, 4096).trimStart();

  if (s.length === 0) {
    return false;
  }

  if (s.startsWith('<!DOCTYPE') || /^<\s*html[\s>]/i.test(s.slice(0, 64))) {
    return true;
  }

  if (s.startsWith('{') || s.startsWith('[')) {
    return false;
  }

  if (!ct || ct === 'application/octet-stream' || ct === 'text/plain') {
    return /<\s*[a-zA-Z!/?]/.test(s.slice(0, 800));
  }

  return false;
}
