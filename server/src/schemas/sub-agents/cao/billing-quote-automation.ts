import { z } from 'zod';

export const CaoBillingQuoteAutomationOutputSchema = z
  .object({
    billing_automation_summary: z.string().trim().min(20),
    billing_workflows: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
