/**
 * PDF report palette and locale (env-tunable for white-label).
 */

function readEnvHex(name: string, fallback: string): string {
  const t = process.env[name]?.trim();
  if (t && /^#[0-9A-Fa-f]{6}$/.test(t)) {
    return t;
  }
  return fallback;
}

/** Brand and layout colors for @react-pdf/renderer. */
export const PDF_THEME = {
  navy: readEnvHex('PDF_COLOR_NAVY', '#0F1729'),
  green: readEnvHex('PDF_COLOR_GREEN', '#0ECF82'),
  orange: readEnvHex('PDF_COLOR_ORANGE', '#F24F1D'),
  blue: readEnvHex('PDF_COLOR_BLUE', '#1CBDFF'),
  white: readEnvHex('PDF_COLOR_WHITE', '#FFFFFF'),
  text: readEnvHex('PDF_COLOR_TEXT', '#111827'),
  sub: readEnvHex('PDF_COLOR_SUB', '#6B7280'),
  bg: readEnvHex('PDF_COLOR_BG', '#F9FAFB'),
  border: readEnvHex('PDF_COLOR_BORDER', '#E5E7EB'),
  sevCritical: readEnvHex('PDF_COLOR_SEV_CRITICAL', '#EF4444'),
  sevHigh: readEnvHex('PDF_COLOR_SEV_HIGH', '#F97316'),
  sevMedium: readEnvHex('PDF_COLOR_SEV_MEDIUM', '#EAB308'),
  coverUrlMuted: readEnvHex('PDF_COLOR_COVER_URL', '#8BA3C7'),
} as const;

/** BCP 47 tag for `toLocaleDateString` (report dates). */
export function pdfLocaleTag(): string {
  const t = process.env.PDF_LOCALE?.trim();
  return t && t.length > 0 ? t : 'en-GB';
}
