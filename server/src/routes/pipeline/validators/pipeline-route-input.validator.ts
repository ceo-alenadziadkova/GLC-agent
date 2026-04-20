import { z } from 'zod';
import { PIPELINE_MAX_PHASE_INDEX, PIPELINE_MIN_PHASE } from '../../../config/pipeline-phases.js';

export const pipelineAuditIdParamsSchema = z.object({
  id: z.string().min(1),
});

/** Path segment `:phase` for quality gate and review approve (integer string). */
export const pipelinePhasePathParamSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'phase must be a non-negative integer string')
  .transform((s) => parseInt(s, 10))
  .pipe(z.number().int().min(PIPELINE_MIN_PHASE).max(PIPELINE_MAX_PHASE_INDEX));

export const pipelineRetryBodySchema = z
  .object({
    phase: z.number().int().min(PIPELINE_MIN_PHASE).max(PIPELINE_MAX_PHASE_INDEX),
    disable_auto_remediate: z.unknown().optional(),
  })
  .passthrough()
  .transform((d) => ({
    phase: d.phase,
    disable_auto_remediate: Boolean(d.disable_auto_remediate),
  }));

/** Matches legacy `readDisableAutoRemediateFromBody`: any truthy value enables the flag. */
export const pipelineStartNextBodySchema = z.unknown().transform((body): { disable_auto_remediate: boolean } => {
  if (!body || typeof body !== 'object') return { disable_auto_remediate: false };
  return {
    disable_auto_remediate: Boolean((body as { disable_auto_remediate?: unknown }).disable_auto_remediate),
  };
});

export const pipelineReviewApproveBodySchema = z.object({
  consultant_notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
  interview_notes: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

export const pipelineStatusQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  before: z.string().datetime().optional(),
  phase: z.coerce.number().int().min(-1).max(99).optional(),
  event_type: z.string().trim().min(1).max(64).optional(),
  detail_level: z.enum(['default', 'debug']).optional(),
});
