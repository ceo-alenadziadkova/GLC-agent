import { z } from 'zod';

export const CdoValuePropositionOutputSchema = z
  .object({
    value_proposition_summary: z.string().trim().min(16),
    clarity_gaps: z.array(z.string().trim().min(4)).min(1).max(10),
    hierarchy_actions: z.array(z.string().trim().min(4)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
