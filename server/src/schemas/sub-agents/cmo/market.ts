import { z } from 'zod';

export const CmoMarketOutputSchema = z
  .object({
    market_thesis: z.string().trim().min(20),
    competitor_alternatives: z
      .array(
        z
          .object({
            name: z.string().trim().min(2),
            differentiator: z.string().trim().min(8),
          })
          .strict(),
      )
      .min(2)
      .max(5),
    market_risks: z.array(z.string().trim().min(8)).min(1).max(5),
    open_questions: z.array(z.string().trim().min(8)).min(1).max(5),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
