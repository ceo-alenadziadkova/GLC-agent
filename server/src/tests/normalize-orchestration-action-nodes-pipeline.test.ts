import { describe, expect, it } from 'vitest';

import { applyOrchestrationActionNodeNormalizationPipeline } from '../services/orchestration/normalize-orchestration-action-nodes-pipeline.js';
import type { OrchestrationActionNode } from '../types/orchestration/index.js';

function node(partial: Partial<OrchestrationActionNode>): OrchestrationActionNode {
  return {
    id: 'n1',
    title: 'T',
    domain: 'tech_infrastructure',
    lane: 'tech_delivery',
    dependencies: [],
    weight: 1,
    ...partial,
  };
}

describe('applyOrchestrationActionNodeNormalizationPipeline', () => {
  it('dedupes and sorts dependencies', () => {
    const { nodes, conflicts_resolved } = applyOrchestrationActionNodeNormalizationPipeline([
      node({ id: 'a', dependencies: ['z', '  z ', 'm', 'm'] }),
    ]);
    expect(nodes[0]!.dependencies).toEqual(['m', 'z']);
    expect(conflicts_resolved.some(c => c.id === 'norm-deps:a')).toBe(true);
  });

  it('defaults missing confidence and risk', () => {
    const { nodes, conflicts_resolved } = applyOrchestrationActionNodeNormalizationPipeline([
      node({ id: 'b', confidence: undefined, risk_score: undefined as unknown as number }),
    ]);
    expect(nodes[0]!.confidence).toBe('medium');
    expect(typeof nodes[0]!.risk_score).toBe('number');
    expect(conflicts_resolved.some(c => c.id === 'norm-confidence:b')).toBe(true);
    expect(conflicts_resolved.some(c => c.id === 'norm-risk:b')).toBe(true);
  });
});
