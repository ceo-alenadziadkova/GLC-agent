import { describe, expect, it } from 'vitest';

import {
  encodeManifestChangeSignature,
  manifestSignatureArgsFromDraft,
} from '../orchestration-roadmap-manifest';

describe('manifestSignatureArgsFromDraft', () => {
  it('matches persisted snapshot signatures when horizon ISO is equivalent aside from surrounding whitespace', () => {
    const fromDraft = encodeManifestChangeSignature(
      manifestSignatureArgsFromDraft({
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        plan_start_raw: ' 2025-01-15 ',
        plan_end_raw: '\t2026-01-15\n',
      }),
    );
    const fromHydratedPayload = encodeManifestChangeSignature({
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
      plan_horizon: { start_date: '2025-01-15', end_date: '2026-01-15' },
    });
    expect(fromDraft).toBe(fromHydratedPayload);
  });

  it('still distinguishes incomplete horizon drafts from saved empty horizon', () => {
    const partial = encodeManifestChangeSignature(
      manifestSignatureArgsFromDraft({
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        plan_start_raw: '2025-01-15',
        plan_end_raw: '',
      }),
    );
    const emptySaved = encodeManifestChangeSignature({
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
    });
    expect(partial).not.toBe(emptySaved);
  });
});
