/**
 * Intake brief — **Zod validation** for persisted / API brief responses.
 *
 * Question definitions (no Zod) live in **`intake-brief-questions.ts`**. The SPA should import only that
 * file so Vite does not bundle `zod` for question lists.
 */
export * from './intake-brief-questions.js';

import { z } from 'zod';

import { BRIEF_ANSWER_STRING_MAX } from './intake-brief-questions.js';

const answerSchema = z.union([
  z.string().max(BRIEF_ANSWER_STRING_MAX),
  z.array(z.string()).max(10),
  z.number(),
  z.boolean(),
  z.object({
    value: z.union([
      z.string().max(BRIEF_ANSWER_STRING_MAX),
      z.array(z.string()).max(10),
      z.number(),
      z.boolean(),
      z.null(),
    ]),
    source: z.enum(['client', 'consultant', 'recon_confirmed', 'unknown']),
  }),
  z.null(),
]);

export const BriefResponsesSchema = z.record(z.string(), answerSchema);

export type BriefResponses = z.infer<typeof BriefResponsesSchema>;
