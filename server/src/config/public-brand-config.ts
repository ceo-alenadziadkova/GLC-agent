/**
 * Public, non-secret brand surface for marketing UI and white-label overrides.
 * Env overrides (optional): PUBLIC_BRAND_NAME, PUBLIC_SUPPORT_EMAIL, PUBLIC_BRAND_LEGAL_LINE.
 */

import {
  GLC_DEV_BRAND_LEGAL_LINE,
  GLC_DEV_BRAND_NAME,
  GLC_DEV_MARKETING_FOOTER_EN,
  GLC_DEV_SUPPORT_EMAIL,
  type MarketingFooterCopyEn,
} from '@glc/dev-brand-defaults';

import { GLC_PUBLIC_SITE_URL } from './bot-identity.js';

export type PublicBrandPayload = {
  brand_name: string;
  /** Public contact; null means SPA should use build-time VITE_SUPPORT_EMAIL only. */
  support_email: string | null;
  public_site_url: string;
  footer: MarketingFooterCopyEn;
};

function trimOrUndef(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/**
 * Values safe to expose to unauthenticated browsers (no secrets).
 */
export function getPublicBrandConfig(): PublicBrandPayload {
  const brandName = trimOrUndef(process.env.PUBLIC_BRAND_NAME) ?? GLC_DEV_BRAND_NAME;
  const legalLine = trimOrUndef(process.env.PUBLIC_BRAND_LEGAL_LINE) ?? GLC_DEV_BRAND_LEGAL_LINE;

  const supportFromEnv = trimOrUndef(process.env.PUBLIC_SUPPORT_EMAIL);
  const support_email: string | null =
    supportFromEnv ??
    (process.env.NODE_ENV === 'production' ? null : GLC_DEV_SUPPORT_EMAIL);

  const footer: MarketingFooterCopyEn = {
    ...GLC_DEV_MARKETING_FOOTER_EN,
    brandTitle: brandName,
    legalLine,
  };

  return {
    brand_name: brandName,
    support_email,
    public_site_url: GLC_PUBLIC_SITE_URL,
    footer,
  };
}
