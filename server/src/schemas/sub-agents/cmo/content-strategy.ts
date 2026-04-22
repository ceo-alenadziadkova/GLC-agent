import { z } from 'zod';

const CONTENT_GOALS = ['education', 'authority', 'engagement', 'credibility', 'conversion'] as const;
const AWARENESS_STAGES = [
  'unaware',
  'problem_aware',
  'solution_aware',
  'product_aware',
  'most_aware',
] as const;
const EVIDENCE_TYPES = ['observed', 'derived', 'assumed'] as const;

export const CmoContentStrategyOutputSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().trim().min(8),
        content_goal: z.enum(CONTENT_GOALS),
        awareness_stage: z.enum(AWARENESS_STAGES),
        format: z.string().trim().min(3),
        strategic_note: z.string().trim().min(20),
        evidence_type: z.enum(EVIDENCE_TYPES),
        confidence_score: z.number().min(0).max(1),
        assumptions: z.array(z.string().trim().min(8)).min(1).max(5),
        open_questions: z.array(z.string().trim().min(8)).min(1).max(5),
        validation_next_step: z.string().trim().min(12),
        analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
      }).strict(),
    )
    .min(50)
    .superRefine((ideas, ctx) => {
      const uniqueness = new Set<string>();
      const stages = new Set<string>();
      for (const [index, idea] of ideas.entries()) {
        const key = `${idea.title.trim().toLowerCase()}::${idea.format.trim().toLowerCase()}`;
        if (uniqueness.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate idea detected (title + format must be unique).',
            path: [index, 'title'],
          });
        }
        uniqueness.add(key);
        stages.add(idea.awareness_stage);
      }
      if (stages.size < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ideas must cover at least 3 distinct awareness stages.',
          path: ['ideas'],
        });
      }
    }),
}).strict();
