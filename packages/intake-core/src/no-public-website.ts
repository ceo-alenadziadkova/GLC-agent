import { GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL } from '@glc/dev-brand-defaults';

/**
 * Canonical placeholder URL when the client has no public website (`audits.company_url`).
 * Collectors must skip outbound fetches when this value is detected.
 *
 * Single shared constant from `@glc/dev-brand-defaults` — API and SPA import the same module
 * so no env pair is required. Forks change `GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL` in that package.
 */
export const NO_PUBLIC_WEBSITE_URL = GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL;

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

/**
 * True when outbound public-website fetches must be skipped: DB flag and/or legacy sentinel URL.
 */
export function auditSkipsPublicWebsiteFetches(
  noPublicWebsiteColumn: boolean | null | undefined,
  companyUrl: string,
): boolean {
  if (noPublicWebsiteColumn === true) return true;
  return isNoPublicWebsiteUrl(companyUrl);
}

/** English default for “no public website” (until message catalogs ship). */
export const NO_PUBLIC_WEBSITE_DISPLAY_EN = 'No public website' as const;

/**
 * Stable key for future i18n catalogs; UI maps this to localized copy.
 * Keep in sync with docs/FRONTEND.md (user-visible strings strategy).
 */
export const NO_PUBLIC_WEBSITE_DISPLAY_I18N_KEY = 'glc.audit.noPublicWebsite' as const;

/** Human-readable label for UI; empty input stays empty (use fallback in the caller). */
export function formatAuditWebsiteDisplay(
  url: string | null | undefined,
  noPublicWebsite?: boolean | null,
): string {
  if (url == null || url === '') return '';
  if (noPublicWebsite === true || isNoPublicWebsiteUrl(url)) return NO_PUBLIC_WEBSITE_DISPLAY_EN;
  return url;
}
