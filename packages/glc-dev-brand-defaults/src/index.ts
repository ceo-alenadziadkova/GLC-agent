/**
 * @glc/dev-brand-defaults
 *
 * - **Brand / copy / sentinel:** `public-brand-defaults.v1.json` (imported via `brand-from-json.ts`).
 * - **Dev-only ports and CORS:** `dev-infra.ts`.
 */

export {
  GLC_DEV_NO_PUBLIC_WEBSITE_SENTINEL,
  GLC_DEV_NO_PUBLIC_WEBSITE_DISPLAY_EN,
  GLC_DEV_BRAND_ORIGIN,
  GLC_DEV_SUPPORT_EMAIL,
  GLC_DEV_BRAND_NAME,
  GLC_DEV_BRAND_LEGAL_LINE,
  GLC_DEV_MARKETING_FOOTER_EN,
  PUBLIC_BRAND_DEFAULTS_VERSION,
  type MarketingFooterCopyEn,
  type PublicBrandDefaultsJsonV1,
} from './brand-from-json.js';

export {
  GLC_DEV_API_PORT,
  GLC_DEV_API_ORIGIN,
  GLC_DEV_SPA_PORT,
  GLC_DEV_SPA_ORIGIN,
  GLC_DEV_SPA_HOST_FOR_E2E,
  GLC_DEV_SPA_ORIGIN_E2E,
  GLC_DEV_CORS_EXTRA_ORIGINS,
} from './dev-infra.js';
