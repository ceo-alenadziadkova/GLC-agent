/**
 * PDF report palette and locale for @react-pdf/renderer.
 * Source of truth: constants in this module.
 */

/** Brand and layout colors for @react-pdf/renderer. */
export const PDF_THEME = {
  navy: '#0F1729',
  green: '#0ECF82',
  orange: '#F24F1D',
  blue: '#1CBDFF',
  white: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  bg: '#F9FAFB',
  border: '#E5E7EB',
  sevCritical: '#EF4444',
  sevHigh: '#F97316',
  sevMedium: '#EAB308',
  coverUrlMuted: '#8BA3C7',
} as const;

/** BCP 47 tag for `toLocaleDateString` (report dates). */
export function pdfLocaleTag(): string {
  return 'en-GB';
}
