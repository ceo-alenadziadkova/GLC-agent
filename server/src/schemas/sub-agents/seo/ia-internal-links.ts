import { z } from 'zod';

export const SeoIaInternalLinksOutputSchema = z
  .object({
    ia_linking_summary: z.string().trim().min(20),
    discoverability_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    linking_actions: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
