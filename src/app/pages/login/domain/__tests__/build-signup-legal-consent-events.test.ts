import { describe, expect, it } from 'vitest';
import { LEGAL_CONSENT_KEYS } from '../../../../config/legal-consent-client-policy';
import { buildSignupLegalConsentEvents } from '../build-signup-legal-consent-events';

describe('buildSignupLegalConsentEvents', () => {
  it('always records required acknowledgements', () => {
    const events = buildSignupLegalConsentEvents({
      acceptTos: true,
      acceptPrivacy: true,
    });
    expect(events).toEqual([
      { consent_key: LEGAL_CONSENT_KEYS.tosAcceptance, accepted: true },
      { consent_key: LEGAL_CONSENT_KEYS.privacyAcknowledgment, accepted: true },
    ]);
  });
});
