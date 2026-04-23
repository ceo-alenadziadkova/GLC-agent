import { z } from 'zod';

export const CdoCopyMicrocopyOutputSchema = z
  .object({
    copy_summary: z.string().trim().min(16),
    cta_gaps: z.array(z.string().trim().min(4)).min(1).max(10),
    microcopy_fixes: z.array(z.string().trim().min(4)).min(1).max(10),
    error_state_rewrites: z.array(z.string().trim().min(4)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
