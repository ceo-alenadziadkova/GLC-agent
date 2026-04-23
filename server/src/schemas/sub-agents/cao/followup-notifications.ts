import { z } from 'zod';

export const CaoFollowupNotificationsOutputSchema = z
  .object({
    followup_automation_summary: z.string().trim().min(20),
    notification_flows: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
