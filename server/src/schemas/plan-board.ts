import { z } from 'zod';

import { PLAN_BOARD_COLUMN_POLICY_LIMITS } from '../config/plan-board-column-policy-limits.js';

/** Validated further in-route against per-audit resolved column policy. */
const planBoardColumnIdInput = z
  .string()
  .trim()
  .min(1)
  .max(PLAN_BOARD_COLUMN_POLICY_LIMITS.maxIdLength)
  .regex(PLAN_BOARD_COLUMN_POLICY_LIMITS.columnIdPattern);

function refinePlanBoardCardPatchDates(
  value: {
    start_date?: string | undefined;
    due_date?: string | undefined;
    end_date?: string | undefined;
  },
  ctx: z.RefinementCtx,
): void {
  if (value.start_date && value.due_date && value.due_date < value.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['due_date'],
      message: 'due_date_before_start_date',
    });
  }
  if (value.start_date && value.end_date && value.end_date < value.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_date'],
      message: 'end_date_before_start_date',
    });
  }
  if (value.due_date && value.end_date && value.end_date < value.due_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_date'],
      message: 'end_date_before_due_date',
    });
  }
}

/** Plain object before refinements so callers can `.omit` / `.extend` (ZodEffects from `.superRefine` has no `.omit`). */
const PlanBoardCardPatchObjectSchema = z.object({
  to_column: planBoardColumnIdInput.optional(),
  position: z.number().finite().optional(),
  pinned: z.boolean().optional(),
  delivery_area: z.enum(['backlog', 'board', 'archived']).optional(),
  title: z.string().trim().min(2).max(300).optional(),
  lane: z.string().trim().min(1).max(120).optional(),
  ticket_description: z.string().trim().max(3000).optional(),
  assignee: z.string().trim().max(160).optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(24).optional(),
  story_points: z.number().finite().min(0).max(999).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  start_date: z.string().date().optional(),
  due_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  expected_pack_version: z.number().int().nonnegative(),
});

export const PlanBoardCardPatchSchema = PlanBoardCardPatchObjectSchema.superRefine(refinePlanBoardCardPatchDates);

export type PlanBoardCardPatch = z.infer<typeof PlanBoardCardPatchSchema>;

export const PlanBoardManualCardPostSchema = z.object({
  title: z.string().min(2).max(300),
  lane: z.string().min(1).max(120),
  column_id: planBoardColumnIdInput.optional(),
  ticket_description: z.string().trim().max(3000).optional(),
  assignee: z.string().trim().max(160).optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(24).optional(),
  story_points: z.number().finite().min(0).max(999).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  start_date: z.string().date().optional(),
  due_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
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

const PlanBoardBatchPatchCardSchema = PlanBoardCardPatchObjectSchema.omit({ expected_pack_version: true })
  .extend({
    card_id: z.string().uuid(),
  })
  .superRefine(refinePlanBoardCardPatchDates);

export const PlanBoardBatchPatchSchema = z.object({
  expected_pack_version: z.number().int().nonnegative(),
  patches: z.array(PlanBoardBatchPatchCardSchema).min(1).max(200),
});

export type PlanBoardBatchPatch = z.infer<typeof PlanBoardBatchPatchSchema>;

export const PlanTicketCommentPostSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  mentions: z.array(z.string().trim().min(1).max(120)).max(24).optional(),
  source_surface: z.enum(['board', 'table', 'roadmap', 'shape', 'api']).optional(),
});

export type PlanTicketCommentPost = z.infer<typeof PlanTicketCommentPostSchema>;
