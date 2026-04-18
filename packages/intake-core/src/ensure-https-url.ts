/**
 * Normalizes a user-entered site URL to include http(s) scheme when missing.
 * Trims whitespace; empty input returns empty string.
 */
export function ensureHttpsUrl(input: string): string {
  const t = input.trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
