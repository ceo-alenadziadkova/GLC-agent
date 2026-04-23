import { describe, expect, it } from 'vitest';

import { CdoValuePropositionOutputSchema } from '../schemas/sub-agents/cdo/value-proposition.js';

describe('director CDO schema rigor', () => {
  it('rejects value proposition summary below minimum length', () => {
    const parsed = CdoValuePropositionOutputSchema.safeParse({
      value_proposition_summary: 'short',
      clarity_gaps: ['gap one here'],
      hierarchy_actions: ['action one here'],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});
