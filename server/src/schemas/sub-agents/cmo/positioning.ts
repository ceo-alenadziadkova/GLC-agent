import { z } from 'zod';

export const CmoPositioningOutputSchema = z.object({
  core_problem: z.string().min(1),
  unique_mechanism: z.string().min(1),
  differentiation_axes: z.array(z.string().min(1)).min(1),
  anti_positioning: z.string().min(1),
  target_niche: z.string().min(1),
  category_strategy: z.string().min(1),
  positioning_statement: z.string().min(1),
});
