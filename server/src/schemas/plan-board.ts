import { z } from 'zod';

import { PLAN_BOARD_COLUMN_IDS } from '../config/plan-board-columns.js';

const columnEnum = z.enum([PLAN_BOARD_COLUMN_IDS[0], ...PLAN_BOARD_COLUMN_IDS.slice(1)]);

export const PlanBoardCardPatchSchema = z.object({
  to_column: columnEnum.optional(),
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
  column_id: columnEnum.optional(),
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
