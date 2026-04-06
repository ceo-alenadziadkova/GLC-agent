/**
 * Canonical URL stored on `audits.company_url` when the client has no public website.
 * Collectors must skip outbound fetches when this value is detected.
 * Keep in sync with src/app/data/no-public-website.ts
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
