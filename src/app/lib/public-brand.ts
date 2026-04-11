import type { MarketingFooterCopyEn } from '@glc/dev-brand-defaults';
import { getApiBaseUrl } from './api-base-url';

export type PublicBrandPayload = {
  brand_name: string;
  support_email: string | null;
  public_site_url: string;
  footer: MarketingFooterCopyEn;
};

/**
 * Fetches server-driven brand defaults (white-label). Safe to call from public marketing pages.
 */
export async function fetchPublicBrandConfig(signal?: AbortSignal): Promise<PublicBrandPayload> {
  const base = getApiBaseUrl();
  const r = await fetch(`${base}/api/public/brand`, { signal, credentials: 'omit' });
  if (!r.ok) {
    throw new Error(`public brand fetch failed: ${r.status}`);
  }
  return r.json() as Promise<PublicBrandPayload>;
}
