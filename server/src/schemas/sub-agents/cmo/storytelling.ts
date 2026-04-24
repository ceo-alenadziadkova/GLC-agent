import { z } from 'zod';

export const CmoStorytellingOutputSchema = z
  .object({
    frameworks: z
      .array(
        z
          .object({
            name: z.string().trim().min(4),
            when_to_use: z.string().trim().min(12),
            example_hook: z.string().trim().min(12),
          })
          .strict(),
      )
      .min(2)
      .max(5),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
