import { z } from 'zod';

export const CsoRiskScoringOutputSchema = z
  .object({
    risk_scoring_summary: z.string().trim().min(20),
    top_risks: z
      .array(
        z
          .object({
            risk: z.string().trim().min(4),
            likelihood: z.number().int().min(1).max(5),
            impact: z.number().int().min(1).max(5),
            risk_score: z.number().int().min(1).max(25),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
