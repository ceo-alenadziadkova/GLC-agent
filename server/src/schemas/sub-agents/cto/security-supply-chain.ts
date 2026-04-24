import { z } from 'zod';

export const CtoSecuritySupplyChainOutputSchema = z
  .object({
    supply_chain_summary: z.string().trim().min(20),
    security_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    security_controls: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
