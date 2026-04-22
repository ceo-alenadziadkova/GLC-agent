import { z } from 'zod';

export const CmoContentStrategyOutputSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().min(1),
        content_goal: z.string().min(1),
        awareness_stage: z.string().min(1),
        format: z.string().min(1),
        strategic_note: z.string().min(1),
      }),
    )
    .min(50),
});
