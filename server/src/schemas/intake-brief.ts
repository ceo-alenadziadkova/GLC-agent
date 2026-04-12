/**
 * Intake brief — **Zod validation** for persisted / API brief responses.
 *
 * Question lists (no Zod) are built in **`@glc/intake-core`** (`intake-brief-catalog-meta.ts`). The SPA may
 * import them from that package or from **`intake-brief-questions.ts`** (re-export) so Vite does not bundle `zod`.
 */
export * from './intake-brief-questions.js';

import { z } from 'zod';

import { BRIEF_ANSWER_STRING_MAX } from './intake-brief-questions.js';

/** Persisted/API brief answers: structured cell only (`responses_format` = 2). */
const answerSchema = z.union([
  z.null(),
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
]);

export const BriefResponsesSchema = z.record(z.string(), answerSchema);

export type BriefResponses = z.infer<typeof BriefResponsesSchema>;
