import { z } from 'zod';

export const SeoAuthorityTrustOutputSchema = z
  .object({
    authority_trust_summary: z.string().trim().min(20),
    trust_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    credibility_actions: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
