import { z } from 'zod';

export const CdoExperimentationOutputSchema = z
  .object({
    experiment_backlog_summary: z.string().trim().min(16),
    experiments: z
      .array(
        z
          .object({
            hypothesis: z.string().trim().min(12),
            success_metric: z.string().trim().min(4),
            decision_window_days: z.number().int().min(7).max(180),
            implementation_cost: z.enum(['low', 'medium', 'high']),
          })
          .strict(),
      )
      .min(2)
      .max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
