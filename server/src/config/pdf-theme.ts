/**
 * PDF report palette and locale for @react-pdf/renderer.
 * Hex values come from `@glc/brand-tokens` (shared with SPA).
 */

import { GLC_BRAND_HEX } from '@glc/brand-tokens';

import { SYSTEM_DEFAULTS } from './system-defaults.js';

/** Brand and layout colors for @react-pdf/renderer. */
export const PDF_THEME = GLC_BRAND_HEX;

/** BCP 47 tag for `toLocaleDateString` (report dates). Source: `SYSTEM_DEFAULTS.reportPdf.localeTag`. */
export function pdfLocaleTag(): string {
  return SYSTEM_DEFAULTS.reportPdf.localeTag;
}

/** Fixed page header middle-dot separator color. Source: `SYSTEM_DEFAULTS.reportPdf.headerSepMuted`. */
export function pdfHeaderSeparatorColor(): string {
  return SYSTEM_DEFAULTS.reportPdf.headerSepMuted;
}
