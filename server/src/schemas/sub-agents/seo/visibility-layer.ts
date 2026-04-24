import { z } from 'zod';

export const SeoVisibilityLayerOutputSchema = z
  .object({
    visibility_summary: z.string().trim().min(20),
    growth_surfaces: z.array(z.string().trim().min(3)).min(2).max(8),
    content_risks: z.array(z.string().trim().min(3)).min(1).max(6),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
