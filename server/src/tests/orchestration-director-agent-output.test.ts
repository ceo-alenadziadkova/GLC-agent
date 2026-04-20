import { describe, expect, it } from 'vitest';

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
    expect(details.mode).toBe('missing');
  });

  it('marks explicit invalid payload as invalid mode', () => {
    const details = extractGlcDirectorOrchestrationSliceFromAgentOutputDetailed({
      glc_director_execution: { schema_version: 1, baseline: { actions: [{ id: 1 }] } },
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
