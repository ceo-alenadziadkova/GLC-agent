import { describe, expect, it } from 'vitest';

import { shouldRunNewAuditSnapshotGate } from './useNewAuditWizard';

describe('shouldRunNewAuditSnapshotGate', () => {
  it('requires snapshot gate after short brief even without public website split', () => {
    expect(
      shouldRunNewAuditSnapshotGate({
        snapshotStepEnabled: true,
        isClientSelfServe: false,
        hasDraftAuditId: true,
        briefIntelligenceSubStep: 'short_brief',
        intakePrefillActive: false,
      }),
    ).toBe(true);
  });

  it('skips snapshot gate for prefilled brief flow', () => {
    expect(
      shouldRunNewAuditSnapshotGate({
        snapshotStepEnabled: true,
        isClientSelfServe: false,
        hasDraftAuditId: true,
        briefIntelligenceSubStep: 'short_brief',
        intakePrefillActive: true,
      }),
    ).toBe(false);
  });

  it('skips snapshot gate for client self-serve flow', () => {
    expect(
      shouldRunNewAuditSnapshotGate({
        snapshotStepEnabled: true,
        isClientSelfServe: true,
        hasDraftAuditId: true,
        briefIntelligenceSubStep: 'short_brief',
        intakePrefillActive: false,
      }),
    ).toBe(false);
  });
});
