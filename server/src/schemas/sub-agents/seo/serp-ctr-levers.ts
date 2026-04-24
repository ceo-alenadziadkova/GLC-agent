import { z } from 'zod';

export const SeoSerpCtrLeversOutputSchema = z
  .object({
    serp_ctr_summary: z.string().trim().min(20),
    ctr_levers: z.array(z.string().trim().min(3)).min(2).max(8),
    snippet_tests: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
