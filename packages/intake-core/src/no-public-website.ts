/**
 * Canonical placeholder URL when the client has no public website (audits.company_url).
 * Collectors must skip outbound fetches when this value is detected.
 */
export const NO_PUBLIC_WEBSITE_URL = 'https://glc-audit.placeholder/no-public-website';

export function isNoPublicWebsiteUrl(url: string): boolean {
  const t = url.trim();
  if (t === NO_PUBLIC_WEBSITE_URL) return true;
  try {
    const u = new URL(t);
    const n = new URL(NO_PUBLIC_WEBSITE_URL);
    return u.origin === n.origin && u.pathname.replace(/\/$/, '') === n.pathname.replace(/\/$/, '');
  } catch {
    return false;
  }
}

/** Human-readable label for UI; empty input stays empty (use fallback in the caller). */
export function formatAuditWebsiteDisplay(url: string | null | undefined): string {
  if (url == null || url === '') return '';
  return isNoPublicWebsiteUrl(url) ? 'No public website' : url;
}
