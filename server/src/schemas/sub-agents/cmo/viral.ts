import { z } from 'zod';

export const CmoViralOutputSchema = z
  .object({
    concepts: z
      .array(
        z
          .object({
            title: z.string().trim().min(8),
            hook_pattern: z.string().trim().min(12),
            target_stage: z.string().trim().min(4),
            confidence_score: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(5)
      .max(20),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
