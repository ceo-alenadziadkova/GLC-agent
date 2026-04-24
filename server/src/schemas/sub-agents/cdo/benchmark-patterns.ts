import { z } from 'zod';

export const CdoBenchmarkPatternsOutputSchema = z
  .object({
    benchmark_summary: z.string().trim().min(16),
    applicable_patterns: z.array(z.string().trim().min(4)).min(1).max(12),
    adaptation_notes: z.array(z.string().trim().min(4)).min(1).max(12),
    guardrails: z.array(z.string().trim().min(4)).min(1).max(12),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
