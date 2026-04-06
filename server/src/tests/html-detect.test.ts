import { describe, it, expect } from 'vitest';
import { isLikelyHtmlDocument } from '../snapshot/html-detect.js';

describe('isLikelyHtmlDocument', () => {
  it('accepts text/html', () => {
    expect(isLikelyHtmlDocument('text/html; charset=utf-8', '<html><body>x</body></html>')).toBe(true);
  });

  it('rejects application/json', () => {
    expect(isLikelyHtmlDocument('application/json', '{"ok":true}')).toBe(false);
  });

  it('rejects PDF content-type', () => {
    expect(isLikelyHtmlDocument('application/pdf', '%PDF-1.4')).toBe(false);
  });

  it('sniffs HTML when Content-Type missing', () => {
    expect(isLikelyHtmlDocument(null, '<!DOCTYPE html><html></html>')).toBe(true);
    expect(isLikelyHtmlDocument(null, '<div class="root">')).toBe(true);
  });

  it('rejects JSON-looking body when type is generic', () => {
    expect(isLikelyHtmlDocument('text/plain', '{"data":1}')).toBe(false);
  });

  it('declared text/html passes even for whitespace-only body (empty check is done in fetch)', () => {
    expect(isLikelyHtmlDocument('text/html', '   ')).toBe(true);
  });
});
