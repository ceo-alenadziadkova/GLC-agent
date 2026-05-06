import { describe, expect, it } from 'vitest';

import { encodeManifestChangeSignature } from '../orchestration-roadmap-manifest';

describe('orchestration roadmap manifest signature compatibility', () => {
  it('stays stable and ignores board identity adjunct inputs', () => {
    const base = encodeManifestChangeSignature({
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
      plan_start_raw: '2026-05-01',
      plan_end_raw: '2026-08-01',
    });

    // Simulates callers that carry extra rename-identity metadata alongside manifest args.
    const withAdjunctPayload = encodeManifestChangeSignature({
      ...( {
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
        plan_start_raw: '2026-05-01',
        plan_end_raw: '2026-08-01',
        board_identity_key: 'preserved-init-1',
      } as unknown as Parameters<typeof encodeManifestChangeSignature>[0]),
    });

    expect(withAdjunctPayload).toBe(base);
  });

  it('suffixes hints_digest into the encoded signature while core inputs match', () => {
    const base = encodeManifestChangeSignature({
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
      plan_horizon: { start_date: '2026-05-01', end_date: '2026-08-01' },
    });
    expect(base).not.toContain('hints');

    const withHints = encodeManifestChangeSignature({
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
      plan_horizon: { start_date: '2026-05-01', end_date: '2026-08-01' },
      hints_digest: 'digest-abc',
    });

    expect(withHints.startsWith(`${base}::hints::`)).toBe(true);
    expect(withHints.endsWith('digest-abc')).toBe(true);
  });
});
