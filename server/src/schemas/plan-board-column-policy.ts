import { z } from 'zod';

import { PLAN_BOARD_COLUMN_POLICY_LIMITS } from '../config/plan-board-column-policy-limits.js';
import { PLAN_BOARD_SEMANTIC_KEYS } from '../config/plan-board-semantics.js';

const columnIdSchema = z
  .string()
  .min(1)
  .max(PLAN_BOARD_COLUMN_POLICY_LIMITS.maxIdLength)
  .regex(PLAN_BOARD_COLUMN_POLICY_LIMITS.columnIdPattern, 'invalid_column_id');

const columnDefSchema = z.object({
  id: columnIdSchema,
  title: z.string().trim().min(1).max(PLAN_BOARD_COLUMN_POLICY_LIMITS.maxTitleLength),
});

const semanticsKeyEnum = z.enum([
  PLAN_BOARD_SEMANTIC_KEYS[0],
  ...PLAN_BOARD_SEMANTIC_KEYS.slice(1),
]);

export const PlanBoardColumnPolicyPutSchema = z.object({
  schema_version: z.literal(PLAN_BOARD_COLUMN_POLICY_LIMITS.schemaVersion),
  columns: z.array(columnDefSchema).min(PLAN_BOARD_COLUMN_POLICY_LIMITS.minSemanticColumns).max(PLAN_BOARD_COLUMN_POLICY_LIMITS.maxColumns),
  semantics: z.object({
    backlog: columnIdSchema,
    next_up: columnIdSchema,
    in_progress: columnIdSchema,
    review: columnIdSchema,
    done: columnIdSchema,
    blocked: columnIdSchema,
  }),
});

export type PlanBoardColumnPolicyPut = z.infer<typeof PlanBoardColumnPolicyPutSchema>;

export const PlanBoardColumnPolicyPatchBodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reset') }),
  z.object({ kind: z.literal('replace'), policy: PlanBoardColumnPolicyPutSchema }),
]);

export type PlanBoardColumnPolicyPatchBody = z.infer<typeof PlanBoardColumnPolicyPatchBodySchema>;
