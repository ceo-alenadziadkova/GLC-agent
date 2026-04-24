import { z } from 'zod';

export const CsoThreatModelOutputSchema = z
  .object({
    threat_summary: z.string().trim().min(20),
    top_threats: z
      .array(
        z
          .object({
            vector: z.string().trim().min(4),
            impact: z.string().trim().min(6),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
