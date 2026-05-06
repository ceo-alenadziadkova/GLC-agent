import { describe, expect, it } from 'vitest';

import { mergeQueuedDraftRevisionsIntoManifestPayload } from '../services/orchestration/manifest-draft-revision.service.js';

describe('mergeQueuedDraftRevisionsIntoManifestPayload', () => {
  const base = {
    schema_version: 2 as const,
    selected_domains: ['seo_digital'] as ['seo_digital'],
    change_scenario: 'hybrid' as const,
    season_preset: 'rolling_90d' as const,
  };

  it('returns base unchanged when draft queue is empty', () => {
    expect(
      mergeQueuedDraftRevisionsIntoManifestPayload({
        base,
        draftRows: [],
      }),
    ).toBe(base);
  });

  it('merges rows into schema_version 3 node_execution_hints', () => {
    const merged = mergeQueuedDraftRevisionsIntoManifestPayload({
      base,
      draftRows: [
        {
          id: 'dr-1',
          audit_id: 'a',
          canonical_node_key: 'k::alpha',
          requested_lane: 'seo',
          owner_hint: 'Team A',
          expected_pack_version_at_enqueue: 1,
          updated_at: '2026-01-01',
        },
      ],
    });

    expect(merged).toMatchObject({
      schema_version: 3,
      change_scenario: 'hybrid',
      node_execution_hints: {
        'k::alpha': { lane: 'seo', owner_hint: 'Team A' },
      },
    });
  });
});
