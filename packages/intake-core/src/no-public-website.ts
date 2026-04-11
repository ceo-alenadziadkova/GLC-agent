import { GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL } from '@glc/dev-brand-defaults';

const DEFAULT_NO_PUBLIC_WEBSITE_URL = GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL;

function readNoPublicWebsiteUrlFromEnv(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.NO_PUBLIC_WEBSITE_URL) {
    const t = process.env.NO_PUBLIC_WEBSITE_URL.trim();
    if (t) return t;
  }
  try {
    const im = import.meta as unknown as { env?: Record<string, string | boolean | undefined> };
    const v = im.env?.VITE_NO_PUBLIC_WEBSITE_URL;
    if (v === undefined || v === '') return undefined;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Canonical placeholder URL when the client has no public website (audits.company_url).
 * Collectors must skip outbound fetches when this value is detected.
 *
 * Override on the server with `NO_PUBLIC_WEBSITE_URL` and on the Vite SPA with
 * `VITE_NO_PUBLIC_WEBSITE_URL` so UI and API agree for white-label installs.
 * The API server must set `NO_PUBLIC_WEBSITE_URL` in production — enforced in
 * `server/src/config/runtime-assert.ts` (not here) so Vite client builds are not blocked.
 */
export const NO_PUBLIC_WEBSITE_URL =
  readNoPublicWebsiteUrlFromEnv() ?? DEFAULT_NO_PUBLIC_WEBSITE_URL;

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
