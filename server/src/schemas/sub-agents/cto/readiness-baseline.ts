import { z } from 'zod';

export const CtoReadinessBaselineOutputSchema = z
  .object({
    readiness_summary: z.string().trim().min(20),
    fragility_zones: z.array(z.string().trim().min(3)).min(2).max(8),
    top_unknowns: z.array(z.string().trim().min(3)).min(1).max(6),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
