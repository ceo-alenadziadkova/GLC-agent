import { SNAPSHOT_EXTRACTION_LIMITS } from '../config/snapshot-runtime.js';

/** Conservative email pattern for best-effort extraction from concatenated HTML (snapshot contact_info). */
export const SNAPSHOT_HTML_EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function extractContactEmailsFromHtml(
  combinedHtml: string,
  maxEmails: number = SNAPSHOT_EXTRACTION_LIMITS.contactEmailsMax,
): string[] {
  const emails = new Set<string>();
  const m = combinedHtml.match(SNAPSHOT_HTML_EMAIL_PATTERN);
  if (m) m.slice(0, maxEmails).forEach(e => emails.add(e.toLowerCase()));
  return [...emails];
}
