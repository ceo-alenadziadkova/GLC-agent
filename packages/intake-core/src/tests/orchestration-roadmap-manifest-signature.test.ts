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
});
