import { describe, expect, it } from 'vitest';
import {
  getBriefTailoredFollowUpUnlocked,
  getEarlyIntelligenceEligible,
  getNewAuditBankIntakeSurface,
} from './newAuditWizardMappers';

describe('newAuditWizardMappers', () => {
  it('unlocks tailored follow-up when phase already unlocked', () => {
    expect(
      getBriefTailoredFollowUpUnlocked({
        briefTailoredPhaseUnlocked: true,
        intakePrefillActive: false,
      }),
    ).toBe(true);
  });

  it('computes early intelligence eligibility with minimal valid args', () => {
    const eligible = getEarlyIntelligenceEligible({
      noPublicWebsite: false,
      isClientSelfServe: false,
      draftAuditId: 'audit_1',
      intakePrefillActive: false,
      briefTailoredFollowUpUnlocked: false,
      intakeMapForSnapshots: {
        a2: 'B2B',
        a5: 'yes',
        a7: '50000',
        a8: ['lead_generation'],
      },
    });
    expect(typeof eligible).toBe('boolean');
  });

  it('returns client form surface for self-serve', () => {
    expect(
      getNewAuditBankIntakeSurface({
        isClientSelfServe: true,
        noPublicWebsite: false,
      }),
    ).toBe('client_form');
  });
});
