import {
  displayDomainLabel,
  scoreBandColorFrom1To5,
  scoreLabelFrom1To5,
} from '@glc/intake-core';

import { PDF_PAGE_LAYOUT } from '../../../config/pdf-layout.js';
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
  return s.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, max);
}

export function fmtOverallScoreFraction(score: number): string {
  return `${score.toFixed(1)} / 5`;
}
