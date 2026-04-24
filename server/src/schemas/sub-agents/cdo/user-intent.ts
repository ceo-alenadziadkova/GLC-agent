import { z } from 'zod';

export const CdoUserIntentOutputSchema = z
  .object({
    jtbd_summary: z.string().trim().min(16),
    intent_signals: z.array(z.string().trim().min(4)).min(2).max(8),
    anxieties: z.array(z.string().trim().min(4)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
