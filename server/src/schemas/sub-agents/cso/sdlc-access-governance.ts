import { z } from 'zod';

export const CsoSdlcAccessGovernanceOutputSchema = z
  .object({
    sdlc_access_governance_summary: z.string().trim().min(20),
    sdlc_control_gaps: z.array(z.string().trim().min(3)).min(1).max(10),
    access_governance_priorities: z.array(z.string().trim().min(3)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
