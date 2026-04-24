import { z } from 'zod';

export const CaoBuildVsBuyOutputSchema = z
  .object({
    build_vs_buy_summary: z.string().trim().min(20),
    decision_criteria: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
