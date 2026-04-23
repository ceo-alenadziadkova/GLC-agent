import { z } from 'zod';

export const CtoObservabilityIncidentOutputSchema = z
  .object({
    observability_summary: z.string().trim().min(20),
    telemetry_gaps: z.array(z.string().trim().min(3)).min(2).max(8),
    incident_readiness_actions: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
