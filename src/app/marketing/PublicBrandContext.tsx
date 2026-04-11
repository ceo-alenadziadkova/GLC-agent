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
  /** Public support address for mailto (Vite dev fallback or `support_email` from API when set). */
  supportEmail: string;
};

const fallbackValue: PublicBrandContextValue = {
  payload: null,
  brandName: GLC_DEV_BRAND_NAME,
  footer: { ...GLC_DEV_MARKETING_FOOTER_EN },
  supportEmail: GLC_SUPPORT_EMAIL,
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
    const supportEmail = payload?.support_email?.trim() || GLC_SUPPORT_EMAIL;
    return { payload, brandName, footer, supportEmail };
  }, [payload]);

  return <PublicBrandContext.Provider value={value}>{children}</PublicBrandContext.Provider>;
}

export function usePublicBrand(): PublicBrandContextValue {
  return useContext(PublicBrandContext);
}
