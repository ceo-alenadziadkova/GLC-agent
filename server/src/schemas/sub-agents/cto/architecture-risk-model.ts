import { z } from 'zod';

export const CtoArchitectureRiskModelOutputSchema = z
  .object({
    architecture_risk_summary: z.string().trim().min(20),
    critical_risks: z.array(z.string().trim().min(3)).min(2).max(8),
    coupling_hotspots: z.array(z.string().trim().min(3)).min(1).max(6),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
