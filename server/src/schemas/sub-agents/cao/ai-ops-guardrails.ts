import { z } from 'zod';

export const CaoAiOpsGuardrailsOutputSchema = z
  .object({
    ai_ops_summary: z.string().trim().min(20),
    guardrails: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
