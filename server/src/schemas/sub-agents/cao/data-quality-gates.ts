import { z } from 'zod';

export const CaoDataQualityGatesOutputSchema = z
  .object({
    data_quality_summary: z.string().trim().min(20),
    quality_gates: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
