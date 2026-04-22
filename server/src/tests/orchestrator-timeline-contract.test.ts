import { describe, expect, it } from 'vitest';

import { OrchestratorTimelineDtoSchema } from '../schemas/orchestrator-timeline.js';

describe('OrchestratorTimelineDtoSchema', () => {
  it('accepts additive milestones/top_priorities and keeps legacy fields', () => {
    const parsed = OrchestratorTimelineDtoSchema.safeParse({
      status: 'ready',
      version: {
        roadmap_version: 2,
        manifest_snapshot_id: null,
        latest_manifest_snapshot_id: null,
        stale_manifest: false,
        manifest_state: 'draft',
      },
      seasons: [
        { id: 'near', node_ids: ['n1'] },
        { id: 'mid', node_ids: [] },
        { id: 'far', node_ids: [] },
      ],
      lanes: [
        {
          lane_id: 'seo',
          items: [{ id: 'n1', title: 'Improve crawl budget', domain: 'seo_digital', lane: 'seo' }],
        },
      ],
      dependencies: [],
      milestones: [{ id: 'm1', label: 'Milestone 1', target_window_days: 7, unlocks: ['n1'] }],
      top_7d: ['n1'],
      top_30d: [],
      top_priorities: [{ bucket: '7d', action_id: 'n1', reason_code: 'near_term' }],
      waiting_list_domains: [],
      data_gaps: null,
    });
    expect(parsed.success).toBe(true);
  });
});
