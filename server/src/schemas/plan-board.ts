import { z } from 'zod';

import { PLAN_BOARD_COLUMN_POLICY_LIMITS } from '../config/plan-board-column-policy-limits.js';

/** Validated further in-route against per-audit resolved column policy. */
const planBoardColumnIdInput = z
  .string()
  .trim()
  .min(1)
  .max(PLAN_BOARD_COLUMN_POLICY_LIMITS.maxIdLength)
  .regex(PLAN_BOARD_COLUMN_POLICY_LIMITS.columnIdPattern);

export const PlanBoardCardPatchSchema = z.object({
  to_column: planBoardColumnIdInput.optional(),
  position: z.number().finite().optional(),
  pinned: z.boolean().optional(),
  delivery_area: z.enum(['backlog', 'board', 'archived']).optional(),
  title: z.string().trim().min(2).max(300).optional(),
  lane: z.string().trim().min(1).max(120).optional(),
  expected_pack_version: z.number().int().nonnegative(),
});

export type PlanBoardCardPatch = z.infer<typeof PlanBoardCardPatchSchema>;

export const PlanBoardManualCardPostSchema = z.object({
  title: z.string().min(2).max(300),
  lane: z.string().min(1).max(120),
  column_id: planBoardColumnIdInput.optional(),
});

export type PlanBoardManualCardPost = z.infer<typeof PlanBoardManualCardPostSchema>;

export const PlanBoardViewOpenedTelemetrySchema = z.object({
  pack_version: z.number().int().nonnegative(),
  has_pack: z.boolean(),
});

export type PlanBoardViewOpenedTelemetry = z.infer<typeof PlanBoardViewOpenedTelemetrySchema>;

export const PlanBoardCardDeleteSchema = z.object({
  expected_pack_version: z.number().int().nonnegative(),
});

export type PlanBoardCardDelete = z.infer<typeof PlanBoardCardDeleteSchema>;
