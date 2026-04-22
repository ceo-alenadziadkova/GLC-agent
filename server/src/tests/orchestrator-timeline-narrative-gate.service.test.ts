import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNarrativeForRequest = vi.hoisted(() => vi.fn());

vi.mock('../config/orchestration-rollout-gates.js', () => ({
  isOrchestrationRoadmapNarrativeEnabledForRequest: mockNarrativeForRequest,
}));

import { redactOrchestratorTimelineNarrativeIfDisabled } from '../services/orchestration/orchestrator-timeline-narrative-gate.service.js';
import type { OrchestratorTimelineDto } from '../schemas/orchestrator-timeline.js';

function baseTimeline(): OrchestratorTimelineDto {
  return {
    status: 'ready',
    version: {
      roadmap_version: 1,
      manifest_snapshot_id: null,
      latest_manifest_snapshot_id: null,
      stale_manifest: false,
      manifest_state: 'confirmed',
    },
    seasons: [],
    lanes: [],
    dependencies: [],
    top_7d: [],
    top_30d: [],
    waiting_list_domains: [],
    data_gaps: null,
    milestones: [
      { id: 'm1', label: 'M1', target_window_days: 30, unlocks: ['a1'] },
    ],
    top_priorities: [{ bucket: '7d' as const, action_id: 'a1', reason_code: 'r1' }],
  };
}

describe('redactOrchestratorTimelineNarrativeIfDisabled', () => {
  beforeEach(() => {
    mockNarrativeForRequest.mockReset();
  });

  it('passes through milestones and top_priorities when narrative is enabled for the user', () => {
    mockNarrativeForRequest.mockReturnValue(true);
    const t = baseTimeline();
    const out = redactOrchestratorTimelineNarrativeIfDisabled(t, 'any@example.com');
    expect(out.milestones).toEqual(t.milestones);
    expect(out.top_priorities).toEqual(t.top_priorities);
  });

  it('strips narrative fields when disabled for the user (legacy top_7d unchanged)', () => {
    mockNarrativeForRequest.mockReturnValue(false);
    const t = baseTimeline();
    t.top_7d = ['legacy-node'];
    const out = redactOrchestratorTimelineNarrativeIfDisabled(t, 'client@example.com');
    expect(out.milestones).toBeUndefined();
    expect(out.top_priorities).toBeUndefined();
    expect(out.top_7d).toEqual(['legacy-node']);
  });
});
