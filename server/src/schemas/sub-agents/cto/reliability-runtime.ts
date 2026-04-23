import { z } from 'zod';

export const CtoReliabilityRuntimeOutputSchema = z
  .object({
    runtime_reliability_summary: z.string().trim().min(20),
    reliability_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    guardrails: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
