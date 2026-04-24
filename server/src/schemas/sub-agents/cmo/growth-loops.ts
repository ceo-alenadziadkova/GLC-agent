import { z } from 'zod';

export const CmoGrowthLoopsOutputSchema = z
  .object({
    loops: z
      .array(
        z
          .object({
            name: z.string().trim().min(4),
            loop_type: z.string().trim().min(4),
            compounding_action: z.string().trim().min(12),
            north_star_metric: z.string().trim().min(4),
          })
          .strict(),
      )
      .min(2)
      .max(5),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
