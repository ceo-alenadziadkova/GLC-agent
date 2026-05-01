import { describe, expect, it } from 'vitest';

import { manifestChangeSignatureFromDraft, manifestChangeSignatureFromPayload } from '../manifest-change-signature';

describe('manifestChangeSignatureFromDraft', () => {
  it('matches encode(manifestSignatureArgsFromDraft(..)) normalization', () => {
    expect(
      manifestChangeSignatureFromDraft({
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        plan_start_raw: ' ',
        plan_end_raw: '',
      }),
    ).toContain('rolling_90d');
  });
});

describe('manifestChangeSignatureFromPayload', () => {
  it('matches draft signature when horizon ISO matches payload', () => {
    const payload = {
      change_scenario: 'hybrid' as const,
      season_preset: 'rolling_90d' as const,
      plan_horizon: { start_date: '2026-01-01', end_date: '2026-03-31' },
    };
    expect(manifestChangeSignatureFromPayload(payload)).toBe(
      manifestChangeSignatureFromDraft({
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        plan_start_raw: '2026-01-01',
        plan_end_raw: '2026-03-31',
      }),
    );
  });

  it('matches empty-horizon draft', () => {
    const payload = {
      change_scenario: 'build_new' as const,
      season_preset: 'rolling_30d' as const,
      plan_horizon: null,
    };
    expect(manifestChangeSignatureFromPayload(payload)).toBe(
      manifestChangeSignatureFromDraft({
        change_scenario: 'build_new',
        season_preset: 'rolling_30d',
        plan_start_raw: '',
        plan_end_raw: '',
      }),
    );
  });

  it('matches saved API payload with Strategy Lab manifest draft fields (wizard + lab share one signing path)', () => {
    const draftSig = manifestChangeSignatureFromDraft({
      change_scenario: 'hybrid',
      season_preset: 'rolling_180d',
      plan_start_raw: '2026-06-01',
      plan_end_raw: '2026-09-01',
    });
    const payload = {
      change_scenario: 'hybrid' as const,
      season_preset: 'rolling_180d' as const,
      plan_horizon: { start_date: '2026-06-01', end_date: '2026-09-01' },
    };
    expect(manifestChangeSignatureFromPayload(payload)).toBe(draftSig);
  });
});
