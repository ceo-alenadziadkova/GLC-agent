import { z } from 'zod';

export const CmoDistributionOutputSchema = z
  .object({
    system_map: z
      .array(
        z
          .object({
            channel: z.string().trim().min(2),
            role: z.string().trim().min(8),
            priority_score: z.number().int().min(1).max(10),
          })
          .strict(),
      )
      .min(2)
      .max(6),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
