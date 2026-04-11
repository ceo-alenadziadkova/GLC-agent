/**
 * Public, non-secret brand surface for marketing UI and white-label overrides.
 * Defaults: `public-brand-defaults.v1.json` (edit for fork / CMS-style copy without env).
 * `public_site_url` remains infrastructure: `GLC_PUBLIC_SITE_URL` via bot-identity.
 */

import {
  GLC_DEV_BRAND_LEGAL_LINE,
  GLC_DEV_SUPPORT_EMAIL,
  type MarketingFooterCopyEn,
} from '@glc/dev-brand-defaults';

import raw from './public-brand-defaults.v1.json' with { type: 'json' };
import { GLC_PUBLIC_SITE_URL } from './bot-identity.js';

export const PUBLIC_BRAND_DEFAULTS_VERSION = raw.version as string;

export type PublicBrandPayload = {
  brand_name: string;
  /** Public contact; JSON `null` hides it in the SPA; empty/omitted falls back to `GLC_DEV_SUPPORT_EMAIL`. */
  support_email: string | null;
  public_site_url: string;
  footer: MarketingFooterCopyEn;
};

/**
 * Values safe to expose to unauthenticated browsers (no secrets).
 */
export function getPublicBrandConfig(): PublicBrandPayload {
  const brandName = String(raw.brand_name ?? '').trim() || 'GLC Tech';
  const legalLine = String(raw.legal_line ?? '').trim() || GLC_DEV_BRAND_LEGAL_LINE;

  const rawSupport = raw.support_email as string | null | undefined;
  let support_email: string | null;
  if (rawSupport === null) {
    support_email = null;
  } else {
    const trimmed = typeof rawSupport === 'string' ? rawSupport.trim() : '';
    support_email = trimmed !== '' ? trimmed : GLC_DEV_SUPPORT_EMAIL;
  }

  const footerBase = raw.footer as Omit<MarketingFooterCopyEn, 'brandTitle' | 'legalLine'>;
  const footer: MarketingFooterCopyEn = {
    ...footerBase,
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
