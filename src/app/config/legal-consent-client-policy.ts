import type { LegalConsentKey } from '../data/api/brief-profile-platform';

/** Fired on `window` when optional consents are saved from Settings (or similar) so cookie UI stays aligned. */
export const GLC_LEGAL_CONSENTS_UPDATED_WINDOW_EVENT = 'glc_legal_consents_updated';

/**
 * Canonical consent keys for the profile legal-consents API (client-side SSOT for literals).
 * Server enum must stay aligned; integration tests cover the contract.
 */
export const LEGAL_CONSENT_KEYS = {
  tosAcceptance: 'tos_acceptance',
  privacyAcknowledgment: 'privacy_acknowledgment',
  marketing: 'marketing',
  productAnalytics: 'product_analytics',
  caseStudyUse: 'case_study_use',
  evaluationInternal: 'evaluation_internal',
  dpaAcceptance: 'dpa_acceptance',
} as const satisfies Record<string, LegalConsentKey>;

