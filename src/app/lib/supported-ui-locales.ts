/**
 * Target UI languages for future in-app localization (i18n).
 * Use these codes in message bundles, locale pickers, and HTML `lang`.
 *
 * BCP-47 tags: https://datatracker.ietf.org/doc/html/rfc5646
 */
export const GLC_UI_LOCALES = [
  'en',
  'de',
  'es',
  'ca',
  'ru',
  'it',
] as const;

export type GlcUiLocale = (typeof GLC_UI_LOCALES)[number];

export const GLC_DEFAULT_UI_LOCALE: GlcUiLocale = 'en';

/** Display metadata for settings / language chooser (labels in each language’s own form). */
export const GLC_UI_LOCALE_LABELS: Record<GlcUiLocale, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  de: { native: 'Deutsch', english: 'German' },
  es: { native: 'Español', english: 'Spanish' },
  ca: { native: 'Català', english: 'Catalan' },
  ru: { native: 'Русский', english: 'Russian' },
  it: { native: 'Italiano', english: 'Italian' },
};

export function isGlcUiLocale(value: string): value is GlcUiLocale {
  return (GLC_UI_LOCALES as readonly string[]).includes(value);
}
