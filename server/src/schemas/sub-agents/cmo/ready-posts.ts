import { z } from 'zod';

export const CmoReadyPostsOutputSchema = z
  .object({
    posts: z
      .array(
        z
          .object({
            title: z.string().trim().min(6),
            channel: z.string().trim().min(2),
            body_outline: z.string().trim().min(20),
            cta: z.string().trim().min(4),
          })
          .strict(),
      )
      .min(2)
      .max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
