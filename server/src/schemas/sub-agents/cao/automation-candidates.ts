import { z } from 'zod';

export const CaoAutomationCandidatesOutputSchema = z
  .object({
    candidate_rankings: z
      .array(
        z
          .object({
            title: z.string().trim().min(4),
            rationale: z.string().trim().min(10),
            expected_delta: z.string().trim().min(6),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict();
