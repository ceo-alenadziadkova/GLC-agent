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
  /** ADR Diagnostic Adaptive Intake — pilot observability (strict optional fields on event row) */
  'signal_confidence_changed',
  'readiness_blocked',
  'remediation_asked',
  'sequencing_transition_taken',
  'guard_question_triggered',
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
    sequencingVersion: z.string().optional(),
  })
  .strict();

const flowReadinessStatusEnum = z.enum(['flow_ready', 'blocked']);
const auditReadinessStatusEnum = z.enum(['audit_ready', 'blocked', 'ready_with_caveats']);

export const intakeAnalyticsEventSchema = z
  .object({
    event_type: z.enum(INTAKE_ANALYTICS_EVENT_TYPES),
    question_id: z.string().min(1).max(REQUEST_FIELD_LIMITS.traceQuestionIdMax).optional(),
    step_index: z.number().int().min(0).max(REQUEST_FIELD_LIMITS.intakeAnalyticsStepIndexMax).optional(),
    client_ts: z.string().datetime().optional(),
    signal_key: z.string().min(1).max(REQUEST_FIELD_LIMITS.intakeAnalyticsSignalKeyMax).optional(),
    transition_rule_ref: z.string().min(1).max(REQUEST_FIELD_LIMITS.intakeAnalyticsTransitionRuleRefMax).optional(),
    audit_readiness_status: auditReadinessStatusEnum.optional(),
    flow_readiness_status: flowReadinessStatusEnum.optional(),
    trace_codes: z
      .array(z.string().min(1).max(REQUEST_FIELD_LIMITS.traceQuestionIdMax))
      .min(1)
      .max(REQUEST_FIELD_LIMITS.intakeAnalyticsTraceCodesMax)
      .optional(),
    /** `remediation_asked` — pilot queue bank ids (max 2 per ADR). */
    remediation_bank_ids: z
      .array(z.string().min(1).max(REQUEST_FIELD_LIMITS.traceQuestionIdMax))
      .min(1)
      .max(2)
      .optional(),
    /** `sequencing_transition_taken` — ordered visible recommendation tail after pilot sort. */
    next_recommended: z
      .array(z.string().min(1).max(REQUEST_FIELD_LIMITS.traceQuestionIdMax))
      .min(1)
      .max(REQUEST_FIELD_LIMITS.intakeAnalyticsNextRecommendedMaxIds)
      .optional(),
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
