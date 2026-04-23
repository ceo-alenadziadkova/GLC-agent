import {
  displayDomainLabel,
  scoreBandColorFrom1To5,
  scoreLabelFrom1To5,
} from '@glc/intake-core';

import { PDF_PAGE_LAYOUT } from '../../../config/pdf-layout.js';
import { REPORT_PDF_MAX_SANITIZED_TEXT_CHARS } from '../../../config/report-profiler-limits.js';
import { PDF_THEME, pdfLocaleTag } from '../../../config/pdf-theme.js';

const C = PDF_THEME;

export function scoreColor(score: number): string {
  return scoreBandColorFrom1To5(score);
}

export function sevColor(sev: string): string {
  if (sev === 'critical') return C.sevCritical;
  if (sev === 'high') return C.sevHigh;
  if (sev === 'medium') return C.sevMedium;
  return C.sub;
}

export function domainName(key: string): string {
  return displayDomainLabel(key);
}

export function scoreLabel(score: number): string {
  return scoreLabelFrom1To5(score);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(pdfLocaleTag(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function safeName(s: string): string {
  const max = PDF_PAGE_LAYOUT.documentMetaSafeNameMaxChars;
  const cleaned = sanitizePdfText(s, max).replace(/[^a-zA-Z0-9\s]/g, '').trim();
  return cleaned || 'report';
}

export function fmtOverallScoreFraction(score: number): string {
  return `${score.toFixed(1)} / 5`;
}

function stripC0AndDelControlChars(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c <= 0x8) continue;
    if (c === 0xb || c === 0xc) continue;
    if (c >= 0xe && c <= 0x1f) continue;
    if (c === 0x7f) continue;
    out += ch;
  }
  return out;
}

export function sanitizePdfText(value: string, maxChars: number = REPORT_PDF_MAX_SANITIZED_TEXT_CHARS): string {
  // Strip control and bidi direction override chars to prevent visual spoofing in exported PDFs.
  const withoutControl = stripC0AndDelControlChars(value).replace(
    /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,
    '',
  );
  const collapsedWhitespace = withoutControl.replace(/[ \t]{2,}/g, ' ').trim();
  if (collapsedWhitespace.length <= maxChars) {
    return collapsedWhitespace;
  }
  return collapsedWhitespace.slice(0, maxChars).trimEnd();
}
