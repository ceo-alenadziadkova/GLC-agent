import { describe, expect, it } from 'vitest';

import { extractGlcDirectorOrchestrationSliceFromAgentOutput } from '../services/orchestration/extract-glc-director-slice-from-agent-output.js';

describe('extractGlcDirectorOrchestrationSliceFromAgentOutput', () => {
  it('parses explicit glc_director_execution payload', () => {
    const slice = extractGlcDirectorOrchestrationSliceFromAgentOutput({
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
    expect(slice?.baseline?.actions).toHaveLength(1);
  });

  it('builds baseline slice from legacy actions array', () => {
    const slice = extractGlcDirectorOrchestrationSliceFromAgentOutput({
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
    expect(slice).not.toBeNull();
    expect(slice?.baseline?.actions[0]?.id).toBe('legacy');
    expect(slice?.deep).toBeUndefined();
  });

  it('returns null for unsupported payloads', () => {
    const slice = extractGlcDirectorOrchestrationSliceFromAgentOutput({
      actions: [{ id: 1, title: 'bad' }],
    });
    expect(slice).toBeNull();
  });
});
