/**
 * Public, non-secret brand surface for marketing UI and white-label overrides.
 * Defaults: `@glc/dev-brand-defaults/public-brand-defaults.v1.json` (forks edit the package JSON).
 * `public_site_url` remains infrastructure: `GLC_PUBLIC_SITE_URL` via bot-identity.
 */

import {
  GLC_DEV_BRAND_LEGAL_LINE,
  GLC_DEV_BRAND_NAME,
  GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN,
  GLC_DEV_SUPPORT_EMAIL,
  type MarketingFooterCopyEn,
} from '@glc/dev-brand-defaults';

import raw from '@glc/dev-brand-defaults/public-brand-defaults.v1.json' with { type: 'json' };
import { GLC_PUBLIC_SITE_URL } from './bot-identity.js';

export const PUBLIC_BRAND_DEFAULTS_VERSION = raw.version as string;

export type PublicBrandPayload = {
  brand_name: string;
  /** Public contact; JSON `null` hides it in the SPA; empty/omitted falls back to `GLC_DEV_SUPPORT_EMAIL`. */
  support_email: string | null;
  public_site_url: string;
  /** English fallback for sentinel / `no_public_website` rows (i18n key: `NO_PUBLIC_WEBSITE_DISPLAY_I18N_KEY`). */
  no_public_website_display_en: string;
  footer: MarketingFooterCopyEn;
};

/** Fork JSON shape; `support_email: null` hides public contact in the SPA. */
export type PublicBrandDefaultsJsonInput = {
  brand_name?: string;
  legal_line?: string;
  support_email?: string | null;
  no_public_website_display_en?: string;
  footer: Omit<MarketingFooterCopyEn, 'brandTitle' | 'legalLine'>;
};

/**
 * Build the public brand API payload from defaults JSON (used by `getPublicBrandConfig` and tests).
 */
export function publicBrandPayloadFromDefaultsJson(
  defaults: PublicBrandDefaultsJsonInput,
  publicSiteUrl: string,
): PublicBrandPayload {
  const brandName = String(defaults.brand_name ?? '').trim() || GLC_DEV_BRAND_NAME;
  const legalLine = String(defaults.legal_line ?? '').trim() || GLC_DEV_BRAND_LEGAL_LINE;

  const rawSupport = defaults.support_email;
  let support_email: string | null;
  if (rawSupport === null) {
    support_email = null;
  } else {
    const trimmed = typeof rawSupport === 'string' ? rawSupport.trim() : '';
    support_email = trimmed !== '' ? trimmed : GLC_DEV_SUPPORT_EMAIL;
  }

  const footerBase = defaults.footer;
  const footer: MarketingFooterCopyEn = {
    ...footerBase,
    brandTitle: brandName,
    legalLine,
  };

  const noPublicDisplay = String(defaults.no_public_website_display_en ?? '').trim();
  const no_public_website_display_en =
    noPublicDisplay !== '' ? noPublicDisplay : GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN;

  return {
    brand_name: brandName,
    support_email,
    public_site_url: publicSiteUrl,
    no_public_website_display_en,
    footer,
  };
}

/**
 * Values safe to expose to unauthenticated browsers (no secrets).
 */
export function getPublicBrandConfig(): PublicBrandPayload {
  return publicBrandPayloadFromDefaultsJson(raw, GLC_PUBLIC_SITE_URL);
}
