import { z } from 'zod';

export const SeoLocalInternationalReadinessOutputSchema = z
  .object({
    local_international_summary: z.string().trim().min(20),
    readiness_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    expansion_prerequisites: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
