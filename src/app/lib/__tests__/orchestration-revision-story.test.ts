import { describe, expect, it } from 'vitest';
import { buildOrchestrationRevisionStorySummary } from '../orchestration-revision-story';
import type { GlcOrchestrationPackRevisionDiffView } from '../../data/audit/contracts/report/orchestration-pack.types';

function baseDiff(
  overrides: Partial<GlcOrchestrationPackRevisionDiffView> = {},
): GlcOrchestrationPackRevisionDiffView {
  return {
    from_version: 1,
    to_version: 2,
    nodes_added: [],
    nodes_removed: [],
    nodes_lane_changed: [],
    edges_added: [],
    edges_removed: [],
    critical_path_changed: false,
    conflicts_resolved_before: 0,
    conflicts_resolved_after: 0,
    ...overrides,
  };
}

describe('buildOrchestrationRevisionStorySummary', () => {
  it('returns null for null/undefined diff', () => {
    expect(buildOrchestrationRevisionStorySummary(null)).toBeNull();
    expect(buildOrchestrationRevisionStorySummary(undefined)).toBeNull();
  });

  it('matches server-style summary for structural adds', () => {
    const s = buildOrchestrationRevisionStorySummary(
      baseDiff({
        from_version: 2,
        to_version: 3,
        nodes_added: ['a'],
      }),
    );
    expect(s).toContain('v2 -> v3');
    expect(s).toContain('+1 initiatives');
  });

  it('describes non-structural governance-style flags', () => {
    const s = buildOrchestrationRevisionStorySummary(
      baseDiff({
        from_version: 3,
        to_version: 4,
        execution_mode_changed: true,
        confidence_map_changed: true,
        risk_layer_changed: true,
        domain_influence_changed: true,
        conflicts_resolved_after: 1,
      }),
    );
    expect(s).toContain('execution mode updated');
    expect(s).toContain('confidence model updated');
    expect(s).toContain('risk layer updated');
    expect(s).toContain('domain influence updated');
    expect(s).toContain('conflicts 0 -> 1');
  });

  it('uses no-structural sentence when diff is empty of changes', () => {
    const s = buildOrchestrationRevisionStorySummary(
      baseDiff({ from_version: 4, to_version: 5 }),
    );
    expect(s).toBe('No structural changes (v4 -> v5)');
  });
});
