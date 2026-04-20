import { describe, expect, it } from 'vitest';
import type { DomainKey } from '@glc/intake-core';
import { collectOrchestrationActionInputs } from '../services/orchestration/orchestration-action-sources.js';
import type { GlcDirectorOrchestrationSlice } from '../schemas/glc-director-orchestration-slice.js';

describe('collectOrchestrationActionInputs', () => {
  it('returns strategy fallback quality when director slices are unavailable', () => {
    const result = collectOrchestrationActionInputs({
      initiatives: [],
      selectedDomains: ['tech_infrastructure'],
      directorSlicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice | null | undefined>(),
      directorInputStatusByDomain: new Map([['tech_infrastructure', 'missing']]),
    });

    expect(result.combined_nodes).toEqual([]);
    expect(result.director.input_quality).toMatchObject({
      input_mode: 'strategy_fallback',
      degraded: true,
      fallback_reason_code: 'director_slice_missing',
    });
  });

  it('promotes director actions as canonical source when coverage exists', () => {
    const directorSlice: GlcDirectorOrchestrationSlice = {
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'tech:director:baseline:01',
            title: 'Stabilize deployment pipeline',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    };

    const result = collectOrchestrationActionInputs({
      initiatives: [],
      selectedDomains: ['tech_infrastructure'],
      directorSlicesByDomain: new Map([['tech_infrastructure', directorSlice]]),
      directorInputStatusByDomain: new Map([['tech_infrastructure', 'valid']]),
    });

    expect(result.combined_nodes.length).toBe(1);
    expect(result.combined_nodes[0]?.source).toBe('director');
    expect(result.director.input_quality).toMatchObject({
      input_mode: 'director_enriched',
      degraded: false,
      director_coverage_ratio: 1,
      director_input_coverage_ratio: 1,
    });
  });

  it('keeps deterministic output ordering for identical inputs', () => {
    const directorSlice: GlcDirectorOrchestrationSlice = {
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'node-1',
            title: 'Action 1',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
          {
            id: 'node-2',
            title: 'Action 2',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    };
    const payload = {
      initiatives: [],
      selectedDomains: ['tech_infrastructure'] as const,
      directorSlicesByDomain: new Map([['tech_infrastructure', directorSlice]]),
      directorInputStatusByDomain: new Map([['tech_infrastructure', 'valid' as const]]),
    };
    const first = collectOrchestrationActionInputs(payload);
    const second = collectOrchestrationActionInputs(payload);
    expect(first.combined_nodes.map((node) => node.id)).toEqual(second.combined_nodes.map((node) => node.id));
    expect(first.director.conflicts_resolved).toEqual(second.director.conflicts_resolved);
  });
});
