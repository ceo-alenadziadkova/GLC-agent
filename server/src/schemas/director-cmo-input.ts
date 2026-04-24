import { z } from 'zod';

export const DirectorCmoInputSchema = z.object({
  project_introduction: z.string().min(1),
  product: z.string().min(1),
  audience: z.string().min(1),
  market: z.string().min(1),
  goals: z.array(z.string().min(1)).min(1),
  context: z.array(z.string().min(1)).default([]),
  output_preferences: z.array(z.string().min(1)).default([]),
});

export type DirectorCmoInput = z.infer<typeof DirectorCmoInputSchema>;
