import { z } from 'zod';

export const CtoDataPlatformResilienceOutputSchema = z
  .object({
    data_resilience_summary: z.string().trim().min(20),
    resilience_risks: z.array(z.string().trim().min(3)).min(2).max(8),
    recovery_priorities: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
