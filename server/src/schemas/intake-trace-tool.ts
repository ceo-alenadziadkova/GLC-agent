/**
 * Consultant-only Intake trace tool: telemetry batches + wording draft payloads.
 */
import { z } from 'zod';

export const INTAKE_TRACE_TOOL_EVENT_TYPES = [
  'intake_trace_tab_opened',
  'intake_trace_advanced_toggled',
  'intake_trace_graph_control_used',
  'intake_wording_draft_saved',
  'intake_wording_review_exported',
  'intake_wording_published',
  'intake_wording_rollback',
  'intake_trace_session_completed',
] as const;

export type IntakeTraceToolEventType = (typeof INTAKE_TRACE_TOOL_EVENT_TYPES)[number];

export const intakeTraceToolEventSchema = z
  .object({
    event_type: z.enum(INTAKE_TRACE_TOOL_EVENT_TYPES),
    client_ts: z.string().datetime().optional(),
    payload: z.record(z.string(), z.any()).optional(),
  })
  .strict();

export const intakeTraceToolAnalyticsBatchSchema = z
  .object({
    client_session_id: z.string().min(8).max(80),
    ia_v2_enabled: z.boolean().optional(),
    events: z.array(intakeTraceToolEventSchema).min(1).max(40),
  })
  .strict();

export type IntakeTraceToolAnalyticsBatchBody = z.infer<typeof intakeTraceToolAnalyticsBatchSchema>;

export const intakeTraceToolWordingDraftsPutSchema = z
  .object({
    drafts: z
      .record(z.string(), z.string())
      .superRefine((val, ctx) => {
        if (Object.keys(val).length > 500) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Too many draft keys' });
        }
      }),
    /** When true, deletes server rows for this user whose question_id is absent from `drafts`. */
    replace_all: z.boolean().optional(),
  })
  .strict();

export type IntakeTraceToolWordingDraftsPutBody = z.infer<typeof intakeTraceToolWordingDraftsPutSchema>;

const questionIdListSchema = z
  .array(z.string().min(1).max(64))
  .max(500)
  .optional();

export const intakeTraceToolWordingPublishSchema = z
  .object({
    question_ids: questionIdListSchema,
  })
  .strict();

export const intakeTraceToolWordingRollbackSchema = z
  .object({
    question_ids: questionIdListSchema,
  })
  .strict();

export type IntakeTraceToolWordingPublishBody = z.infer<typeof intakeTraceToolWordingPublishSchema>;
export type IntakeTraceToolWordingRollbackBody = z.infer<typeof intakeTraceToolWordingRollbackSchema>;

/** Express `req.query`: `limit` 1..100, default 30. */
export const intakeTraceToolPublicationLogQuerySchema = z.object({
  limit: z.preprocess(
    val => (Array.isArray(val) ? val[0] : val),
    z
      .union([z.string(), z.number(), z.undefined()])
      .transform(v => {
        if (v === undefined || v === '') return 30;
        const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10);
        if (!Number.isFinite(n)) return 30;
        return Math.min(100, Math.max(1, Math.floor(n)));
      }),
  ),
});

export type IntakeTraceToolPublicationLogQuery = z.infer<typeof intakeTraceToolPublicationLogQuerySchema>;
