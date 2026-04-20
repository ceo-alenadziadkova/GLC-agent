import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildGlcOrchestrationPackFromActionNodes } from '../services/orchestration/build-glc-orchestration-pack.js';
import type { OrchestrationActionNode } from '../types/orchestration/index.js';

interface OrchestrationGoldenFixture {
  scenario: string;
  manifestSnapshotId: string;
  nodes: OrchestrationActionNode[];
  expected: {
    critical_path: string[];
    conflict_ids: string[];
    top_7d?: string[];
    top_30d?: string[];
  };
}

function loadFixture(fileName: string): OrchestrationGoldenFixture {
  const path = resolve(process.cwd(), 'src/tests/fixtures/orchestration-golden', fileName);
  const json = readFileSync(path, 'utf-8');
  return JSON.parse(json) as OrchestrationGoldenFixture;
}

describe('orchestration golden regression fixtures', () => {
  const fixtureFiles = ['growth-vs-tech.json', 'ux-vs-compliance.json', 'deep-plus-fallback.json'] as const;

  for (const fixtureFile of fixtureFiles) {
    it(`matches golden snapshot for ${fixtureFile}`, () => {
      const fixture = loadFixture(fixtureFile);
      const pack = buildGlcOrchestrationPackFromActionNodes({
        nodes: fixture.nodes,
        preGraphConflicts: [],
        manifestSnapshotId: fixture.manifestSnapshotId,
        seasonPreset: 'rolling_90d',
      });

      expect(pack.critical_path).toEqual(fixture.expected.critical_path);
      expect(pack.conflicts_resolved.map(entry => entry.id)).toEqual(fixture.expected.conflict_ids);
      if (fixture.expected.top_7d) {
        expect(pack.top_7d).toEqual(fixture.expected.top_7d);
      }
      if (fixture.expected.top_30d) {
        expect(pack.top_30d).toEqual(fixture.expected.top_30d);
      }
    });
  }
});
