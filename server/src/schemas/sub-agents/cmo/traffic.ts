import { z } from 'zod';

export const CmoTrafficOutputSchema = z.object({
  hypotheses: z
    .array(
      z.object({
        channel: z.string().min(1),
        mechanism: z.string().min(1),
        expected_outcome: z.string().min(1),
        difficulty: z.string().min(1),
        cost: z.string().min(1),
        time_to_first_results: z.string().min(1),
        dependencies: z.array(z.string().min(1)).default([]),
        priority_score: z.number(),
      }),
    )
    .min(20),
});
