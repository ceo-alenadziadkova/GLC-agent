/**
 * A4 PDF layout numbers (cover logo position, header logo size, string caps).
 * Source: `SYSTEM_DEFAULTS.reportPdf`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const R = SYSTEM_DEFAULTS.reportPdf;

export const PDF_PAGE_LAYOUT = {
  coverLogoOffsetTop: R.coverLogoOffsetTop,
  coverLogoOffsetLeft: R.coverLogoOffsetLeft,
  headerInlineLogoSize: R.headerInlineLogoSize,
  documentMetaSafeNameMaxChars: R.documentMetaSafeNameMaxChars,
  sectionPerPage: R.sectionPerPage,
} as const;
