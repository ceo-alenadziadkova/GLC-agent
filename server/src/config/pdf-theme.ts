/**
 * PDF report palette and locale for @react-pdf/renderer.
 * Values are aligned with design tokens from src/styles/tokens.css (SSOT).
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

/** Brand and layout colors for @react-pdf/renderer. */
export const PDF_THEME = {
  navy: '#0F1729',
  green: '#0ECF82',
  orange: '#F24F1D',
  blue: '#1CBDFF',
  blueDeep: '#0077A8',
  white: '#FFFFFF',
  text: '#0B1120',
  sub: '#7488A4',
  bg: '#F8FAFD',
  border: '#D6E0ED',
  sevCritical: '#EF4444',
  sevHigh: '#F97316',
  sevMedium: '#EAB308',
  coverUrlMuted: '#A3B2C4',
  coverMetaLabel: '#95A7C0',
  coverBarUrlOnGreen: '#0A5C3B',
} as const;

/** BCP 47 tag for `toLocaleDateString` (report dates). Source: `SYSTEM_DEFAULTS.reportPdf.localeTag`. */
export function pdfLocaleTag(): string {
  return SYSTEM_DEFAULTS.reportPdf.localeTag;
}

/** Fixed page header middle-dot separator color. Source: `SYSTEM_DEFAULTS.reportPdf.headerSepMuted`. */
export function pdfHeaderSeparatorColor(): string {
  return SYSTEM_DEFAULTS.reportPdf.headerSepMuted;
}
