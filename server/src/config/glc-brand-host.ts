import { GLC_DEV_BRAND_ORIGIN } from '@glc/dev-brand-defaults';

import { GLC_PUBLIC_SITE_URL } from './bot-identity.js';

function hostnameFromMaybeUrlOrHost(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) {
    try {
      return new URL(t).hostname;
    } catch {
      return t.replace(/^https?:\/\//i, '').split('/')[0] ?? t;
    }
  }
  return t.split('/')[0] ?? t;
}

/**
 * Hostname for GLC brand in PDFs and report footers.
 * Uses `GLC_PUBLIC_SITE_URL`; if parsing fails, optional `GLC_BRAND_HOST_FALLBACK`
 * (hostname or https URL); in non-production, falls back to `@glc/dev-brand-defaults`.
 */
export function glcBrandSiteHostname(): string {
  try {
    return new URL(GLC_PUBLIC_SITE_URL).hostname;
  } catch {
    const fb = process.env.GLC_BRAND_HOST_FALLBACK?.trim();
    if (fb) {
      return hostnameFromMaybeUrlOrHost(fb);
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[server] Invalid GLC_PUBLIC_SITE_URL and GLC_BRAND_HOST_FALLBACK is unset — cannot resolve brand hostname for reports',
      );
    }
    return new URL(GLC_DEV_BRAND_ORIGIN).hostname;
  }
}
