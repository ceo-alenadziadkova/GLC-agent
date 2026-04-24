import { z } from 'zod';

export const CtoReadinessOutputSchema = z
  .object({
    readiness_summary: z.string().trim().min(20),
    architecture_focus: z.array(z.string().trim().min(3)).min(2).max(8),
    delivery_risks: z.array(z.string().trim().min(3)).min(1).max(6),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
