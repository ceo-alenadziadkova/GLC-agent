/**
 * Intake funnel analytics payloads (ADR Phase G).
 * Public: POST /api/discover/analytics-events
 * Auth: POST /api/audits/:id/brief/analytics-events
 */
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import { z } from 'zod';

export const INTAKE_ANALYTICS_EVENT_TYPES = [
  'question_shown',
  'question_answered',
  'question_skipped',
  'wizard_completed',
  'results_viewed',
] as const;

export type IntakeAnalyticsEventType = (typeof INTAKE_ANALYTICS_EVENT_TYPES)[number];
export const INTAKE_ANALYTICS_EXPERIMENT_VARIANTS = ['A', 'B'] as const;
export type IntakeAnalyticsExperimentVariant =
  (typeof INTAKE_ANALYTICS_EXPERIMENT_VARIANTS)[number];

const intakeVersionsPartialSchema = z
  .object({
    questionBankVersion: z.string().optional(),
    policyVersion: z.string().optional(),
    layoutVersion: z.string().optional(),
    resolverVersion: z.string().optional(),
  })
  .strict();

export const intakeAnalyticsEventSchema = z
  .object({
    event_type: z.enum(INTAKE_ANALYTICS_EVENT_TYPES),
    question_id: z.string().min(1).max(REQUEST_FIELD_LIMITS.traceQuestionIdMax).optional(),
    step_index: z.number().int().min(0).max(REQUEST_FIELD_LIMITS.intakeAnalyticsStepIndexMax).optional(),
    client_ts: z.string().datetime().optional(),
  })
  .strict();

export const intakeAnalyticsDiscoveryBatchSchema = z
  .object({
    surface: z.literal('public_discovery'),
    client_session_id: z.string().min(8).max(80),
    experiment_variant: z.enum(INTAKE_ANALYTICS_EXPERIMENT_VARIANTS).optional(),
    discovery_session_token: z
      .string()
      .regex(/^[a-f0-9]{40}$/i)
      .optional(),
    intake_versions: intakeVersionsPartialSchema.optional(),
    events: z.array(intakeAnalyticsEventSchema).min(1).max(40),
  })
  .strict();

/** @deprecated use intakeAnalyticsDiscoveryBatchSchema */
export const intakeAnalyticsBatchBodySchema = intakeAnalyticsDiscoveryBatchSchema;

export type IntakeAnalyticsDiscoveryBatchBody = z.infer<typeof intakeAnalyticsDiscoveryBatchSchema>;
export type IntakeAnalyticsBatchBody = IntakeAnalyticsDiscoveryBatchBody;

export const intakeAnalyticsAuditBriefBatchSchema = z
  .object({
    surface: z.enum(['consultant_interview', 'client_form', 'client_portal']),
    client_session_id: z.string().min(8).max(80),
    experiment_variant: z.enum(INTAKE_ANALYTICS_EXPERIMENT_VARIANTS).optional(),
    intake_versions: intakeVersionsPartialSchema.optional(),
    events: z.array(intakeAnalyticsEventSchema).min(1).max(40),
  })
  .strict();

export type IntakeAnalyticsAuditBriefBatchBody = z.infer<typeof intakeAnalyticsAuditBriefBatchSchema>;
