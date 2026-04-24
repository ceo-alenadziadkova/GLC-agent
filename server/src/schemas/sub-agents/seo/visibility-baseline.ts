import { z } from 'zod';

export const SeoVisibilityBaselineOutputSchema = z
  .object({
    visibility_baseline_summary: z.string().trim().min(20),
    structural_constraints: z.array(z.string().trim().min(3)).min(2).max(8),
    missing_evidence: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
