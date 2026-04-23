import { z } from 'zod';

export const CdoUiConsistencyOutputSchema = z
  .object({
    ui_consistency_summary: z.string().trim().min(16),
    hierarchy_issues: z.array(z.string().trim().min(4)).min(1).max(10),
    pattern_breaks: z.array(z.string().trim().min(4)).min(1).max(10),
    usability_actions: z.array(z.string().trim().min(4)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
