import { z } from 'zod';

export const SeoMeasurementExperimentationOutputSchema = z
  .object({
    measurement_experimentation_summary: z.string().trim().min(20),
    kpi_tree: z.array(z.string().trim().min(3)).min(2).max(8),
    experiment_backlog: z.array(z.string().trim().min(3)).min(1).max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
