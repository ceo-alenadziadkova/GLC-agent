import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildGlcOrchestrationPackFromActionNodes } from '../services/orchestration/build-glc-orchestration-pack.js';
import { applyOrchestrationActionNodeNormalizationPipeline } from '../services/orchestration/normalize-orchestration-action-nodes-pipeline.js';
import type { OrchestrationActionNode } from '../types/orchestration/index.js';

interface NormalizationGoldenFixture {
  scenario: string;
  manifestSnapshotId: string;
  nodes: OrchestrationActionNode[];
  expected: {
    normalized_dependencies_alpha: string[];
    norm_conflict_ids: string[];
  };
}

describe('orchestration normalization golden', () => {
  it('applies dependency normalization before pack build', () => {
    const path = resolve(process.cwd(), 'src/tests/fixtures/orchestration-golden/normalize-deps.json');
    const fixture = JSON.parse(readFileSync(path, 'utf-8')) as NormalizationGoldenFixture;
    const norm = applyOrchestrationActionNodeNormalizationPipeline(fixture.nodes);
    const alpha = norm.nodes.find(n => n.id === 'alpha');
    expect(alpha?.dependencies).toEqual(fixture.expected.normalized_dependencies_alpha);
    expect(norm.conflicts_resolved.map(c => c.id)).toEqual(fixture.expected.norm_conflict_ids);

    const pack = buildGlcOrchestrationPackFromActionNodes({
      nodes: norm.nodes,
      preGraphConflicts: norm.conflicts_resolved,
      manifestSnapshotId: fixture.manifestSnapshotId,
      seasonPreset: 'rolling_90d',
    });
    expect(pack.graph.nodes.map(n => n.id).sort()).toContain('alpha');
    expect(pack.graph.nodes.map(n => n.id).sort()).toContain('gamma');
  });
});
