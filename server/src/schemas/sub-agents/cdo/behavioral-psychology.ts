import { z } from 'zod';

export const CdoBehavioralPsychologyOutputSchema = z
  .object({
    behavioral_summary: z.string().trim().min(16),
    motivation_drivers: z.array(z.string().trim().min(4)).min(1).max(10),
    resistance_factors: z.array(z.string().trim().min(4)).min(1).max(10),
    ethical_guardrails: z.array(z.string().trim().min(4)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
