import { z } from 'zod';

export const CaoSynthesisBundleOutputSchema = z
  .object({
    synthesis_summary: z.string().trim().min(20),
    top_3_actions: z.array(z.string().trim().min(4)).min(1).max(3),
    dependency_highlights: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
