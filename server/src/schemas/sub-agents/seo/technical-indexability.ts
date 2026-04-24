import { z } from 'zod';

export const SeoTechnicalIndexabilityOutputSchema = z
  .object({
    technical_indexability_summary: z.string().trim().min(20),
    indexability_blockers: z.array(z.string().trim().min(3)).min(2).max(8),
    remediation_priorities: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
