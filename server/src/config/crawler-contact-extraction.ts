/**
 * Crawler contact extraction policy (emails / phones from HTML).
 * Tunable noise filters and length bounds — keep out of collector implementation.
 */

/** Substrings that disqualify crawled emails (examples, monitoring vendors). */
export const CRAWLER_CONTACT_EMAIL_EXCLUDED_SUBSTRINGS = ['example.com', 'sentry'] as const;

/** Global regex for email-like tokens in page HTML. */
export const CRAWLER_CONTACT_EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Minimum characters in a tel:/text phone snippet before digit cleanup. */
export const CRAWLER_PHONE_SNIPPET_MIN_CHARS = 7;

/** After stripping non-digits/plus, keep only plausible E.164-ish lengths. */
export const CRAWLER_PHONE_MIN_DIGITS = 7;
export const CRAWLER_PHONE_MAX_DIGITS = 15;

/** Years treated as “calendar-like” when rejecting 8-digit YYYYMMDD phone false positives. */
export const CRAWLER_PHONE_DATE_NOISE_YEAR_MIN = 1900;
export const CRAWLER_PHONE_DATE_NOISE_YEAR_MAX = 2099;

/**
 * True when digit-only phone candidate is exactly 8 digits and looks like YYYYMMDD
 * (markup, analytics, build ids). Not a full calendar validation — enough to drop common noise.
 */
export function crawlerContactPhoneDigitsLikelyYYYYMMDD(digits: string): boolean {
  const only = digits.replace(/^\++/g, '');
  if (only.length !== 8 || !/^\d{8}$/.test(only)) return false;
  const y = Number(only.slice(0, 4));
  const m = Number(only.slice(4, 6));
  const d = Number(only.slice(6, 8));
  if (y < CRAWLER_PHONE_DATE_NOISE_YEAR_MIN || y > CRAWLER_PHONE_DATE_NOISE_YEAR_MAX) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

/** Phone-like runs in HTML (prefix optional; length bound matches snippet min). */
export function crawlerContactPhonePattern(): RegExp {
  const n = CRAWLER_PHONE_SNIPPET_MIN_CHARS;
  return new RegExp(`(?:tel:|phone:|whatsapp:)?\\+?[\\d\\s()-]{${n},}`, 'g');
}
