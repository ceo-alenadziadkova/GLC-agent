import { z } from 'zod';

export const CaoProcessMapOutputSchema = z
  .object({
    process_map_summary: z.string().trim().min(20),
    critical_paths: z
      .array(
        z
          .object({
            name: z.string().trim().min(2),
            owner: z.string().trim().min(2),
            handoff_to: z.string().trim().min(2),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
