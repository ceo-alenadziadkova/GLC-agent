import { LEGAL_CONSENT_KEYS } from '../../../config/legal-consent-client-policy';
import type { LegalConsentKey } from '../../../data/api/brief-profile-platform';
import type { SignupLegalFieldState } from '../types';

/**
 * Builds POST /profile/legal-consents payload after password signup with an active session.
 * Signup records only required contract acknowledgements.
 * Optional marketing/analytics/case-study/evaluation consents are managed from Settings.
 */
export function buildSignupLegalConsentEvents(
  _state: SignupLegalFieldState,
): Array<{ consent_key: LegalConsentKey; accepted: boolean }> {
  return [
    { consent_key: LEGAL_CONSENT_KEYS.tosAcceptance, accepted: true },
    { consent_key: LEGAL_CONSENT_KEYS.privacyAcknowledgment, accepted: true },
  ];
}
