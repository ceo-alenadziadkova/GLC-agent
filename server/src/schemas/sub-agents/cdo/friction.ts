import { z } from 'zod';

export const CdoFrictionOutputSchema = z
  .object({
    friction_summary: z.string().trim().min(16),
    friction_points: z
      .array(
        z
          .object({
            label: z.string().trim().min(4),
            signal: z.string().trim().min(8),
            severity: z.enum(['low', 'medium', 'high']),
          })
          .strict(),
      )
      .min(2)
      .max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
