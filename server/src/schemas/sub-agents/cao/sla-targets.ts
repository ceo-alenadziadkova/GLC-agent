import { z } from 'zod';

export const CaoSlaTargetsOutputSchema = z
  .object({
    sla_targets_summary: z.string().trim().min(20),
    response_targets: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
