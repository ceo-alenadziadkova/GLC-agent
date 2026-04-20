import { describe, expect, it } from 'vitest';

import {
  laneIdsForOrchestrationDisplayPreset,
  visibleOrchestrationLanesForPack,
} from '../orchestration-client-roadmap-lanes';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

function makePack(lanes: GlcOrchestrationPackView['lanes']): GlcOrchestrationPackView {
  return {
    version: 1,
    graph: { nodes: [], edges: [] },
    lanes,
    critical_path: [],
    conflicts_resolved: [],
    manifest_snapshot_id: 'snap',
  };
}

describe('orchestration-client-roadmap-lanes', () => {
  it('returns ordered MVP lane ids for client preset', () => {
    const ids = laneIdsForOrchestrationDisplayPreset('client_mvp');
    expect(ids).toEqual(['product_change', 'tech_delivery', 'marketing_narrative']);
  });

  it('filters to lanes that have node ids, preserving preset order', () => {
    const pack = makePack({
      marketing_narrative: ['a'],
      product_change: ['b'],
      tech_delivery: [],
      seo: ['c'],
    });
    const order = laneIdsForOrchestrationDisplayPreset('client_mvp');
    expect(visibleOrchestrationLanesForPack(pack.lanes, order)).toEqual(['product_change', 'marketing_narrative']);
  });

  it('full preset lists all lanes with data in canonical order', () => {
    const pack = makePack({
      risk_compliance: ['r'],
      product_change: ['p'],
    });
    const order = laneIdsForOrchestrationDisplayPreset('full');
    expect(visibleOrchestrationLanesForPack(pack.lanes, order)).toEqual(['product_change', 'risk_compliance']);
  });
});
