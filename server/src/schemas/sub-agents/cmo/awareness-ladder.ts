import { z } from 'zod';

export const CmoAwarenessLadderOutputSchema = z
  .object({
    ladder: z
      .array(
        z
          .object({
            stage: z.string().trim().min(4),
            insight: z.string().trim().min(12),
            next_best_message: z.string().trim().min(12),
          })
          .strict(),
      )
      .min(4)
      .max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
