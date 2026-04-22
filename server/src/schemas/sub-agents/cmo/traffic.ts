import { z } from 'zod';

const DIFFICULTY_LEVELS = ['low', 'medium', 'high'] as const;
const COST_LEVELS = ['free', 'low', 'medium', 'high'] as const;
const TIME_TO_FIRST_RESULTS_LEVELS = ['days', 'weeks', 'months'] as const;
const EVIDENCE_TYPES = ['observed', 'derived', 'assumed'] as const;

export const CmoTrafficOutputSchema = z.object({
  hypotheses: z
    .array(
      z.object({
        channel: z.string().trim().min(3),
        mechanism: z.string().trim().min(10),
        expected_outcome: z.string().trim().min(10),
        difficulty: z.enum(DIFFICULTY_LEVELS),
        cost: z.enum(COST_LEVELS),
        time_to_first_results: z.enum(TIME_TO_FIRST_RESULTS_LEVELS),
        dependencies: z.array(z.string().trim().min(3)).max(10).default([]),
        priority_score: z.number().int().min(1).max(10),
        evidence_type: z.enum(EVIDENCE_TYPES),
        confidence_score: z.number().min(0).max(1),
        assumptions: z.array(z.string().trim().min(8)).min(1).max(5),
        validation_next_step: z.string().trim().min(12),
        expected_outcome_metric: z.string().trim().min(3),
        analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
      }).strict(),
    )
    .min(20)
    .superRefine((hypotheses, ctx) => {
      const uniqueness = new Set<string>();
      const difficulties = new Set<string>();
      for (const [index, hypothesis] of hypotheses.entries()) {
        const key = `${hypothesis.channel.trim().toLowerCase()}::${hypothesis.mechanism.trim().toLowerCase()}`;
        if (uniqueness.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate hypothesis detected (channel + mechanism must be unique).',
            path: [index, 'mechanism'],
          });
        }
        uniqueness.add(key);
        difficulties.add(hypothesis.difficulty);
      }
      if (difficulties.size < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hypotheses must cover at least 2 distinct difficulty levels.',
          path: ['hypotheses'],
        });
      }
    }),
}).strict();
