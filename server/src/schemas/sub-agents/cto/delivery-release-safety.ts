import { z } from 'zod';

export const CtoDeliveryReleaseSafetyOutputSchema = z
  .object({
    release_safety_summary: z.string().trim().min(20),
    release_risks: z.array(z.string().trim().min(3)).min(2).max(8),
    rollback_controls: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
