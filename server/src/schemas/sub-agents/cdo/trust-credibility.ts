import { z } from 'zod';

export const CdoTrustCredibilityOutputSchema = z
  .object({
    trust_summary: z.string().trim().min(16),
    trust_gaps: z.array(z.string().trim().min(4)).min(1).max(10),
    reassurance_interventions: z.array(z.string().trim().min(4)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
