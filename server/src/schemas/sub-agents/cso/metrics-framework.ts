import { z } from 'zod';

export const CsoMetricsFrameworkOutputSchema = z
  .object({
    metrics_framework_summary: z.string().trim().min(20),
    security_kpis: z.array(z.string().trim().min(3)).min(1).max(10),
    compliance_kpis: z.array(z.string().trim().min(3)).min(1).max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
