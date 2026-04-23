import { z } from 'zod';

export const CdoAnalyticsTrackingOutputSchema = z
  .object({
    analytics_summary: z.string().trim().min(16),
    missing_events: z.array(z.string().trim().min(4)).min(1).max(12),
    funnel_gaps: z.array(z.string().trim().min(4)).min(1).max(12),
    metric_definitions: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
