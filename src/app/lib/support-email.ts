import { GLC_DEV_SUPPORT_EMAIL } from '@glc/dev-brand-defaults';

/**
 * Synchronous fallback before `GET /api/public/brand` resolves (marketing shell).
 * Canonical public contact for production: `support_email` in `public-brand-defaults.v1.json` / API payload.
 */

export const GLC_SUPPORT_EMAIL = GLC_DEV_SUPPORT_EMAIL;

export function glcSupportMailtoHref(): string {
  return `mailto:${GLC_SUPPORT_EMAIL}`;
}
