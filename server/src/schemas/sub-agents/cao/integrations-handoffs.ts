import { z } from 'zod';

export const CaoIntegrationsHandoffsOutputSchema = z
  .object({
    integrations_handoffs_summary: z.string().trim().min(20),
    handoff_dependencies: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
