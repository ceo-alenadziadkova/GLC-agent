import { z } from 'zod';

export const CdoFunnelArchitectOutputSchema = z
  .object({
    funnel_summary: z.string().trim().min(20),
    stages: z
      .array(
        z
          .object({
            name: z.string().trim().min(2),
            primary_metric: z.string().trim().min(4),
            conversion_event: z.string().trim().min(4),
          })
          .strict(),
      )
      .min(2)
      .max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
