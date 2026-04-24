import { z } from 'zod';

export const CaoSopGovernanceOutputSchema = z
  .object({
    sop_governance_summary: z.string().trim().min(20),
    approval_controls: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
