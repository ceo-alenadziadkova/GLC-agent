import { GLC_DEV_SUPPORT_EMAIL } from '@glc/dev-brand-defaults';

/**
 * Public support contact for marketing UI and error copy.
 * Production builds require VITE_SUPPORT_EMAIL (no default brand email in prod).
 */

function trimEnv(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const trimmedSupport = trimEnv(import.meta.env.VITE_SUPPORT_EMAIL);
if (import.meta.env.PROD && !trimmedSupport) {
  throw new Error('VITE_SUPPORT_EMAIL is required in production builds (public contact for footer and error copy)');
}

export const GLC_SUPPORT_EMAIL = trimmedSupport || GLC_DEV_SUPPORT_EMAIL;

export function glcSupportMailtoHref(): string {
  return `mailto:${GLC_SUPPORT_EMAIL}`;
}
