/**
 * Published legal document version identifiers (SSOT for server + SPA).
 * Bump when counsel publishes new Terms, Privacy, or DPA text.
 */

export const LEGAL_DOCUMENT_BUNDLE_VERSION = '2026-04-23' as const;

export const LEGAL_DOCUMENT_VERSIONS = {
  bundle: LEGAL_DOCUMENT_BUNDLE_VERSION,
  termsOfService: '1.1.0',
  privacyPolicy: '1.1.0',
  dataProcessingAgreement: '1.1.0',
  legalNotice: '1.0.0',
  cookiesPolicy: '1.0.0',
} as const;

/** SPA routes (no locale); content is placeholder until counsel replaces copy. */
export const LEGAL_DOCUMENT_SPA_ROUTES = {
  termsOfService: '/legal/terms',
  privacyPolicy: '/legal/privacy',
  dataProcessingAgreement: '/legal/dpa',
  legalNotice: '/legal/aviso-legal',
  cookiePolicy: '/legal/cookies',
} as const;

export type LegalDocumentSpaRouteKey = keyof typeof LEGAL_DOCUMENT_SPA_ROUTES;
