import { z } from 'zod';

export const CsoIncidentReadinessOutputSchema = z
  .object({
    incident_readiness_summary: z.string().trim().min(20),
    detection_response_gaps: z.array(z.string().trim().min(3)).min(1).max(10),
    continuity_actions: z.array(z.string().trim().min(3)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
