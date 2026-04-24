import { describe, expect, it } from 'vitest';

import { CaoAdoptionRolloutGovernanceOutputSchema } from '../schemas/sub-agents/cao/adoption-rollout-governance.js';

describe('director CAO schema rigor', () => {
  it('rejects adoption governance payload below minimum string depth', () => {
    const parsed = CaoAdoptionRolloutGovernanceOutputSchema.safeParse({
      adoption_governance_summary: 'too short',
      rollout_controls: ['control-one'],
      analysis_mode: 'researched',
    });
    expect(parsed.success).toBe(false);
  });
});
