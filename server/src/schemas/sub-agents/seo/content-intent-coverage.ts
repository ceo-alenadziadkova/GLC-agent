import { z } from 'zod';

export const SeoContentIntentCoverageOutputSchema = z
  .object({
    content_intent_summary: z.string().trim().min(20),
    intent_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    opportunity_clusters: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
