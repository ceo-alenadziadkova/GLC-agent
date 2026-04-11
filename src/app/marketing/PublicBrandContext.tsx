import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GLC_DEV_BRAND_NAME,
  GLC_DEV_MARKETING_FOOTER_EN,
  GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN,
  type MarketingFooterCopyEn,
} from '@glc/dev-brand-defaults';
import { GLC_SUPPORT_EMAIL } from '../lib/support-email';
import { fetchPublicBrandConfig, type PublicBrandPayload } from '../lib/public-brand';

export type PublicBrandContextValue = {
  /** Raw API payload when fetch succeeded; null before resolve or on failure. */
  payload: PublicBrandPayload | null;
  /** `GET /api/public/brand` `brand_name`, else dev default. */
  brandName: string;
  /** Footer copy merged from API or dev template. */
  footer: MarketingFooterCopyEn;
  /** Public support address from API; empty when JSON `support_email` is null (hidden). */
  supportEmail: string;
  /** Label for audits without a public URL (matches `NO_PUBLIC_WEBSITE_DISPLAY_I18N_KEY` / brief tooling). */
  noPublicWebsiteDisplayEn: string;
};

const fallbackValue: PublicBrandContextValue = {
  payload: null,
  brandName: GLC_DEV_BRAND_NAME,
  footer: { ...GLC_DEV_MARKETING_FOOTER_EN },
  supportEmail: GLC_SUPPORT_EMAIL,
  noPublicWebsiteDisplayEn: GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN,
};

const PublicBrandContext = createContext<PublicBrandContextValue>(fallbackValue);

export function PublicBrandProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<PublicBrandPayload | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchPublicBrandConfig(ac.signal)
      .then(setPayload)
      .catch(() => {
        /* keep dev defaults */
      });
    return () => ac.abort();
  }, []);

  const value = useMemo((): PublicBrandContextValue => {
    const brandName = payload?.brand_name?.trim() || GLC_DEV_BRAND_NAME;
    const footer = payload?.footer ?? { ...GLC_DEV_MARKETING_FOOTER_EN };
    let supportEmail: string;
    if (!payload) {
      supportEmail = GLC_SUPPORT_EMAIL;
    } else if (payload.support_email === null) {
      supportEmail = '';
    } else {
      const t = payload.support_email.trim();
      supportEmail = t || GLC_SUPPORT_EMAIL;
    }
    const noPublicWebsiteDisplayEn =
      payload?.no_public_website_display_en?.trim() || GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN;
    return { payload, brandName, footer, supportEmail, noPublicWebsiteDisplayEn };
  }, [payload]);

  return <PublicBrandContext.Provider value={value}>{children}</PublicBrandContext.Provider>;
}

export function usePublicBrand(): PublicBrandContextValue {
  return useContext(PublicBrandContext);
}
