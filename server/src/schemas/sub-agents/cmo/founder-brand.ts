import { z } from 'zod';

export const CmoFounderBrandOutputSchema = z
  .object({
    narrative_pillars: z.array(z.string().trim().min(8)).min(2).max(4),
    visibility_tactics: z.array(z.string().trim().min(8)).min(1).max(5),
    proof_assets: z.array(z.string().trim().min(8)).min(0).max(5),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
