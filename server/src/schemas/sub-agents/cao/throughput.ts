import { z } from 'zod';

export const CaoThroughputOutputSchema = z
  .object({
    throughput_risks: z.array(z.string().trim().min(4)).min(1).max(8),
    wip_guardrails: z.array(z.string().trim().min(4)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
