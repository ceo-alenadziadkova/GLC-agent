import { describe, expect, it } from 'vitest';

import { orchestrationNodeTitleMap, projectCriticalPathToTimelineBuckets } from '../orchestration-timeline-projection';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

const pack = (critical_path: string[]): GlcOrchestrationPackView => ({
  version: 1,
  graph: {
    nodes: critical_path.map((id, i) => ({
      id,
      title: `T${i}`,
      domain: 'marketing_utp',
      lane: 'marketing_narrative',
    })),
    edges: [],
  },
  lanes: {
    product_change: [],
    tech_delivery: [],
    marketing_narrative: critical_path,
    seo: [],
    processes_automation: [],
    risk_compliance: [],
  },
  critical_path,
  conflicts_resolved: [],
  manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
});

describe('orchestration-timeline-projection', () => {
  it('splits critical path across three buckets', () => {
    const p = pack(['a', 'b', 'c', 'd', 'e', 'f']);
    const buckets = projectCriticalPathToTimelineBuckets(p, { near: 'N', mid: 'M', far: 'F' });
    expect(buckets.map(b => b.nodeIds.join(','))).toEqual(['a,b', 'c,d', 'e,f']);
  });

  it('builds title map', () => {
    const p = pack(['x']);
    p.graph.nodes[0]!.title = 'Hello';
    const m = orchestrationNodeTitleMap(p);
    expect(m.get('x')).toBe('Hello');
  });
});
