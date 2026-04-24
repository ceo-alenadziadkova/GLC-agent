export const LEGAL_CONSENT_KEYS = [
  'tos_acceptance',
  'privacy_acknowledgment',
  'marketing',
  'product_analytics',
  'case_study_use',
  'evaluation_internal',
  'dpa_acceptance',
] as const;

export type LegalConsentKey = (typeof LEGAL_CONSENT_KEYS)[number];

export const LEGAL_CONSENT_SOURCES = ['signup', 'settings', 'api', 'import', 'audit_create'] as const;

export type LegalConsentSource = (typeof LEGAL_CONSENT_SOURCES)[number];
