import { describe, expect, it } from 'vitest';

import { GLC_DIRECTOR_EXECUTION_LEGACY_KEYS } from '../config/director-orchestration-policy.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';
import {
  extractGlcDirectorOrchestrationSliceFromAgentOutput,
  extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed,
} from '../services/orchestration/extract-glc-director-slice-from-agent-output.js';

describe('extractGlcDirectorOrchestrationSliceFromAgentOutput', () => {
  it('parses explicit glc_director_execution payload', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      glc_director_execution: {
        schema_version: 1,
        baseline: {
          actions: [
            {
              id: 'a1',
              title: 'Action',
              impact: 4,
              effort: 2,
              risk: 2,
              urgency: 3,
              confidence: 'high',
              dependencies: [],
            },
          ],
        },
      },
    });
    const slice = details.slice;
    expect(slice?.baseline?.actions).toHaveLength(1);
    expect(details.mode).toBe('canonical');
  });

  it('builds baseline slice from legacy actions array', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      actions: [
        {
          id: 'legacy',
          title: 'Legacy Action',
          impact: 3,
          effort: 3,
          risk: 2,
          urgency: 3,
          confidence: 'medium',
          dependencies: [],
        },
      ],
    });
    const slice = details.slice;
    expect(slice).not.toBeNull();
    expect(slice?.baseline?.actions[0]?.id).toBe('legacy');
    expect(slice?.deep).toBeUndefined();
    expect(details.mode).toBe('legacy');
  });

  it('returns null for unsupported payloads', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      actions: [{ id: 1, title: 'bad' }],
    });
    const slice = details.slice;
    expect(slice).toBeNull();
    expect(details.mode).toBe('invalid');
  });

  it('marks explicit invalid payload as invalid mode', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      glc_director_execution: { schema_version: 1, baseline: { actions: [{ id: 1 }] } },
    });
    expect(details.slice).toBeNull();
    expect(details.mode).toBe('invalid');
  });

  it('marks malformed legacy wave payload as invalid mode', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      baseline: { actions: [{ id: 1, title: 'bad' }] },
    });
    expect(details.slice).toBeNull();
    expect(details.mode).toBe('invalid');
  });

  it('keeps compatibility helper returning slice only', () => {
    const slice = extractGlcDirectorOrchestrationSliceFromAgentOutput({
      glc_director_execution: { schema_version: 1, baseline: { actions: [] } },
    });
    expect(slice).not.toBeNull();
  });
});

describe('extractGlcDirectorOrchestrationSliceFromAgentOutput edge cases', () => {
  it('parses baseline plus deep with dependencies and evidence', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      glc_director_execution: {
        schema_version: 1,
        baseline: {
          actions: [
            {
              id: 'root',
              title: 'Stabilize baseline',
              impact: 4,
              effort: 2,
              risk: 2,
              urgency: 4,
              confidence: 'high',
              dependencies: [],
              evidence: { observed: ['Collector confirmed gap'] },
            },
            {
              id: 'follow',
              title: 'Follow-on',
              impact: 3,
              effort: 3,
              risk: 2,
              urgency: 3,
              confidence: 'medium',
              dependencies: ['root'],
            },
          ],
        },
        deep: {
          actions: [
            {
              id: 'deep-1',
              title: 'Second wave',
              impact: 4,
              effort: 4,
              risk: 3,
              urgency: 3,
              confidence: 'low',
              dependencies: [],
            },
          ],
          bottlenecks: ['Capacity'],
        },
      },
    });
    expect(details.mode).toBe('canonical');
    expect(details.slice?.baseline?.actions).toHaveLength(2);
    expect(details.slice?.deep?.actions[0]?.id).toBe('deep-1');
    expect(details.slice?.baseline?.actions[1]?.dependencies).toEqual(['root']);
  });

  it('accepts director_orchestration alias in legacy compatibility mode', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      director_orchestration: {
        schema_version: 1,
        baseline: {
          actions: [
            {
              id: 'alias',
              title: 'Alias key',
              impact: 3,
              effort: 3,
              risk: 2,
              urgency: 3,
              confidence: 'medium',
              dependencies: [],
            },
          ],
        },
      },
    });
    expect(details.mode).toBe('legacy');
    expect(details.slice?.baseline?.actions[0]?.id).toBe('alias');
  });

  it.each(GLC_DIRECTOR_EXECUTION_LEGACY_KEYS)(
    'accepts %s alias in legacy compatibility mode',
    (legacyKey) => {
      const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
        [legacyKey]: {
          schema_version: 1,
          baseline: {
            actions: [
              {
                id: 'alias-key',
                title: 'Alias key',
                impact: 3,
                effort: 3,
                risk: 2,
                urgency: 3,
                confidence: 'medium',
                dependencies: [],
              },
            ],
          },
        },
      });
      expect(details.mode).toBe('legacy');
      expect(details.slice?.baseline?.actions[0]?.id).toBe('alias-key');
    },
  );
});

describe('DomainOutputSchema director field', () => {
  it('accepts optional glc_director_execution on full domain payload', () => {
    const pad = 'Word '.repeat(20);
    const parsed = DomainOutputSchema.safeParse({
      score: 3,
      label: 'Moderate',
      summary: pad,
      strengths: ['Solid signal'],
      weaknesses: ['Gap'],
      issues: [
        {
          id: 'issue-1',
          severity: 'high',
          title: 'Sample issue',
          description: 'Description of the issue long enough for schema tests.',
          impact: 'High',
          confidence: 'high',
          evidence_refs: [{ type: 'stub', finding: 'collector saw X' }],
          data_source: 'auto_detected',
        },
      ],
      quick_wins: [],
      recommendations: [
        {
          id: 'rec-1',
          title: 'Fix it',
          description: 'Actionable recommendation text for the contract test case.',
          priority: 'high',
          estimated_cost: 'Low',
          estimated_time: '1 week',
          impact: 'High',
        },
      ],
      unknown_items: [],
      glc_director_execution: {
        schema_version: 1,
        baseline: {
          actions: [
            {
              id: 'dir-1',
              title: 'Director action',
              impact: 4,
              effort: 2,
              risk: 2,
              urgency: 4,
              confidence: 'high',
              dependencies: [],
            },
          ],
        },
      },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.glc_director_execution?.baseline?.actions).toHaveLength(1);
  });

  it('rejects glc_director_execution when baseline exceeds max actions', () => {
    const pad = 'Word '.repeat(20);
    const actions = Array.from({ length: 33 }, (_, i) => ({
      id: `a${i}`,
      title: `Action ${i}`,
      impact: 3,
      effort: 3,
      risk: 2,
      urgency: 3,
      confidence: 'medium' as const,
      dependencies: [] as string[],
    }));
    const parsed = DomainOutputSchema.safeParse({
      score: 3,
      label: 'Moderate',
      summary: pad,
      strengths: ['S'],
      weaknesses: ['W'],
      issues: [
        {
          id: 'issue-1',
          severity: 'high' as const,
          title: 'Sample issue',
          description: 'Description of the issue long enough for schema tests.',
          impact: 'High',
          confidence: 'high' as const,
          evidence_refs: [{ type: 'stub', finding: 'x' }],
          data_source: 'auto_detected',
        },
      ],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
      glc_director_execution: { schema_version: 1, baseline: { actions } },
    });
    expect(parsed.success).toBe(false);
  });
});
