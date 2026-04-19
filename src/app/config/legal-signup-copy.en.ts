/**
 * Signup legal UX copy (English). Required vs optional consents stay separate (GDPR); wording is shortened for clarity, not to hide legal effect.
 */

export const LEGAL_SIGNUP_COPY_EN = {
  /** Shown above required checkboxes — sets expectations (only two mandatory). */
  requiredIntro:
    'To register you only need to accept the contract terms and confirm the privacy notice below. Optional marketing/analytics preferences are managed later in Settings.',
  tosLabelPrefix: 'I accept the ',
  tosLink: 'Terms of Service',
  tosLabelSuffix: ' (contract)',
  privacyLabelPrefix: 'I acknowledge the ',
  privacyLink: 'Privacy Policy',
  privacyLabelSuffix: ' (how we use data)',
  validationTos: 'You must accept the Terms of Service to create an account.',
  validationPrivacy: 'Please confirm you have read the Privacy Policy.',
} as const;
