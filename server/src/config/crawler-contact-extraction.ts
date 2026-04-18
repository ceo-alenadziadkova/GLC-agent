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

/** Phone-like runs in HTML (prefix optional; length bound matches snippet min). */
export function crawlerContactPhonePattern(): RegExp {
  const n = CRAWLER_PHONE_SNIPPET_MIN_CHARS;
  return new RegExp(`(?:tel:|phone:|whatsapp:)?\\+?[\\d\\s()-]{${n},}`, 'g');
}
