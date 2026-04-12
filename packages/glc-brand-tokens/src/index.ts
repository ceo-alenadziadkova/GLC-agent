/**
 * Canonical GLC brand hex palette (PDF, marketing surfaces, discovery chrome).
 * Server and SPA import from this package — avoid duplicating literals.
 */

export const GLC_BRAND_HEX = {
  navy: '#0F1729',
  green: '#0ECF82',
  orange: '#F24F1D',
  blue: '#1CBDFF',
  blueDeep: '#0066CC',
  white: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  bg: '#F9FAFB',
  border: '#E5E7EB',
  sevCritical: '#EF4444',
  sevHigh: '#F97316',
  sevMedium: '#EAB308',
  coverUrlMuted: '#8BA3C7',
  coverMetaLabel: '#5B7299',
  coverBarUrlOnGreen: '#0A5C3B',
} as const;

export type GlcBrandHexKey = keyof typeof GLC_BRAND_HEX;
