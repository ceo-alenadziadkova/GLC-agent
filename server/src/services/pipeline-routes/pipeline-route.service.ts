import {
  currentIntakeVersionTuple,
  isSupportedIntakeArtifactTuple,
} from '@glc/intake-core';
import { supabase } from '../supabase.js';
import { PipelineOrchestrator } from '../pipeline.js';
import {
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  type AuditExecutionPlan,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
} from '../../types/audit.js';
import { safeOrUserFilter } from '../../lib/postgrest-filter.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { PIPELINE_STATUS_EVENTS_LIMIT } from '../../config/route-query-limits.js';
import {
  PIPELINE_CLAIMABLE_STATUSES,
  PIPELINE_PHASE_ACTIVE_STATUSES,
  PIPELINE_STOP_CLAIMABLE_STATUSES,
  PIPELINE_TERMINAL_STATUSES,
  pipelineStatusForPhase,
} from '../../config/pipeline-status.js';
import { buildPipelineUiRoute } from '../../config/route-notification-paths.js';
import {
  evaluateBriefGates,
  resolveIntakeSurfaceForPlan,
  validationPerspectiveForBriefAccess,
} from '../brief-validator.js';
import { emitStructuredNotification, notifyAuditParticipantsExcept } from '../notifications.js';
import {
  PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE,
  pipelineRetryStartedNotificationMessage,
} from '../../config/route-notification-messages.js';
import { emitPhaseErrorDurable } from '../pipeline-error.js';
import { enqueuePipelineJob } from '../pipeline-jobs.js';
import {
  API_ERROR_CODES,
  PIPELINE_ACCESS_DENIED_MESSAGE,
  PIPELINE_ALL_PHASES_COMPLETE_MESSAGE,
  PIPELINE_ALREADY_CANCELLED_MESSAGE,
  PIPELINE_ALREADY_STARTED_MESSAGE,
  PIPELINE_ALREADY_TERMINAL_MESSAGE,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_CANCELLED_BY_USER_MESSAGE,
  PIPELINE_FORBIDDEN_MESSAGE,
  PIPELINE_NEXT_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_PHASE_IN_PROGRESS_MESSAGE,
  PIPELINE_QUALITY_GATE_REQUIRES_NOTES_MESSAGE,
  PIPELINE_RETRY_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_REVIEW_PENDING_MESSAGE,
  PIPELINE_START_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_STOP_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE,
  apiErrorJson,
  pipelinePhaseNotAvailableMessage,
  type ApiErrorCode,
} from '../../config/api-error-codes.js';
import { normalizeExecutionPlanFromAuditFields } from '../pipeline/orchestrator/execution-plan-loader.js';
import { intakeBriefGateModeFromExecutionPlan } from '../../lib/audit-coverage-bridge.js';
import {
  PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE,
  pipelineReviewApprovedMessage,
} from '../../config/route-notification-messages.js';
import type { UserRole } from '../../middleware/auth.js';
import { PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE } from '../../config/pipeline-route-defaults.js';
import { qualityGateRequiresConsultantNotes } from './quality-gate-review.policy.js';

export type PipelineRouteErrorBody = Record<string, unknown>;

export type PipelineRouteErr = {
  status: number;
  body: PipelineRouteErrorBody;
};

function err(status: number, code: ApiErrorCode, message: string, extra?: Record<string, unknown>): PipelineRouteErr {
  const base = apiErrorJson(code, message);
  return { status, body: extra ? { ...base, ...extra } : base };
}

function canOperatePipeline(
  audit: { user_id: string; client_id: string | null },
  uid: string,
  role: UserRole,
): boolean {
  if (role === 'consultant' && audit.user_id === uid) return true;
  if (role === 'client' && audit.client_id === uid) return true;
  return false;
}

export async function schedulePipelineExecution(params: {
  auditId: string;
  action: 'start' | 'next' | 'retry';
  phase: number;
  disableAutoRemediate: boolean;
}): Promise<void> {
  const { auditId, action, phase, disableAutoRemediate } = params;
  const queued = await enqueuePipelineJob({
    auditId,
    action,
    phase,
    disable_auto_remediate: disableAutoRemediate,
  });
  if (queued) return;

  const orchestrator = new PipelineOrchestrator(auditId, { disableAutoRemediate });
  if (action === 'next') {
    void orchestrator.runBlock().catch((e) => emitPhaseErrorDurable(auditId, phase, e as Error));
  } else {
    void orchestrator.startPhase(phase).catch((e) => emitPhaseErrorDurable(auditId, phase, e as Error));
  }
}

export async function runPipelineStart(params: {
  auditId: string;
  userId: string;
  role: UserRole;
  disableAutoRemediate: boolean;
}): Promise<
  | { ok: true; response: { status: 'started'; phase: 0; intakeProgress: unknown }; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr }
> {
  const { auditId, userId, role, disableAutoRemediate } = params;
  if (role !== 'consultant' && role !== 'client') {
    return { ok: false, error: err(403, API_ERROR_CODES.PIPELINE_FORBIDDEN, PIPELINE_FORBIDDEN_MESSAGE) };
  }

  const { data: audit, error } = await supabase
    .from('audits')
    .select(
      'id, status, current_phase, tokens_used, token_budget, updated_at, product_mode, execution_plan, user_id, client_id',
    )
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();

  if (error || !audit) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  if (!canOperatePipeline(audit as { user_id: string; client_id: string | null }, userId, role)) {
    return {
      ok: false,
      error: err(403, API_ERROR_CODES.PIPELINE_ACCESS_DENIED, PIPELINE_ACCESS_DENIED_MESSAGE),
    };
  }

  if (audit.status === 'cancelled') {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALREADY_CANCELLED, PIPELINE_ALREADY_CANCELLED_MESSAGE),
    };
  }

  if (audit.status !== 'created') {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALREADY_STARTED, PIPELINE_ALREADY_STARTED_MESSAGE, {
        status: audit.status,
      }),
    };
  }

  if (audit.tokens_used >= audit.token_budget) {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE),
    };
  }

  const { data: claimedStart } = await supabase
    .from('audits')
    .update({ status: 'recon', current_phase: 0 })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('status', 'created')
    .eq('updated_at', audit.updated_at)
    .select('id');
  if (!claimedStart || claimedStart.length === 0) {
    return {
      ok: false,
      error: err(409, API_ERROR_CODES.PIPELINE_START_CLAIM_CONFLICT, PIPELINE_START_CLAIM_CONFLICT_MESSAGE),
    };
  }

  const { data: brief } = await supabase
    .from('intake_brief')
    .select('responses, collection_mode, intake_versions')
    .eq('audit_id', auditId)
    .single();

  const cm =
    (brief?.collection_mode as IntakeBriefCollectionMode | undefined) ??
    PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE;
  const perspective = validationPerspectiveForBriefAccess(
    audit.user_id as string,
    audit.client_id as string | null | undefined,
    userId,
  );
  const surface = resolveIntakeSurfaceForPlan(cm, perspective);
  const iv = brief?.intake_versions as IntakeVersionTuple | null | undefined;
  const intakeTuple = iv && isSupportedIntakeArtifactTuple(iv) ? iv : currentIntakeVersionTuple();
  const gatePlan = normalizeExecutionPlanFromAuditFields(audit as { execution_plan?: Partial<AuditExecutionPlan> | null; product_mode?: string | null });
  const gates = evaluateBriefGates(
    (brief?.responses as Record<string, unknown>) ?? {},
    intakeBriefGateModeFromExecutionPlan(gatePlan),
    cm,
    surface,
    intakeTuple,
  );

  return {
    ok: true,
    response: { status: 'started', phase: 0, intakeProgress: gates.intakeProgress },
    disableAutoRemediate,
  };
}

export async function runPipelineNext(params: {
  auditId: string;
  userId: string;
  role: UserRole;
  disableAutoRemediate: boolean;
}): Promise<
  | { ok: true; response: { status: 'running'; phase: number }; nextPhase: number; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr }
> {
  const { auditId, userId, role, disableAutoRemediate } = params;
  if (role !== 'consultant' && role !== 'client') {
    return { ok: false, error: err(403, API_ERROR_CODES.PIPELINE_FORBIDDEN, PIPELINE_FORBIDDEN_MESSAGE) };
  }

  const { data: audit, error } = await supabase
    .from('audits')
    .select(
      'id, status, current_phase, tokens_used, token_budget, product_mode, execution_plan, updated_at, user_id, client_id',
    )
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();

  if (error || !audit) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  if (!canOperatePipeline(audit as { user_id: string; client_id: string | null }, userId, role)) {
    return {
      ok: false,
      error: err(403, API_ERROR_CODES.PIPELINE_ACCESS_DENIED, PIPELINE_ACCESS_DENIED_MESSAGE),
    };
  }

  if (audit.status === 'cancelled') {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALREADY_CANCELLED, PIPELINE_ALREADY_CANCELLED_MESSAGE),
    };
  }

  if (audit.tokens_used >= audit.token_budget) {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE, {
        tokens_used: audit.tokens_used,
        token_budget: audit.token_budget,
      }),
    };
  }

  if ((PIPELINE_PHASE_ACTIVE_STATUSES as readonly string[]).includes(audit.status)) {
    return {
      ok: false,
      error: err(409, API_ERROR_CODES.PIPELINE_PHASE_IN_PROGRESS, PIPELINE_PHASE_IN_PROGRESS_MESSAGE, {
        status: audit.status,
      }),
    };
  }

  const plan = normalizeExecutionPlanFromAuditFields(audit as { execution_plan?: Partial<AuditExecutionPlan> | null; product_mode?: string | null });
  const maxPhase = maxPhaseForExecutionPlan(plan);
  const nextPhase = executionPlanToPhases(plan).filter((p) => p > 0).find((p) => p > audit.current_phase);

  if (!nextPhase || nextPhase > maxPhase) {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALL_PHASES_COMPLETE, PIPELINE_ALL_PHASES_COMPLETE_MESSAGE),
    };
  }

  const { data: pendingReview } = await supabase
    .from('review_points')
    .select('*')
    .eq('audit_id', auditId)
    .eq('after_phase', audit.current_phase)
    .eq('status', 'pending')
    .single();

  if (pendingReview) {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_REVIEW_PENDING, PIPELINE_REVIEW_PENDING_MESSAGE, {
        review_after_phase: audit.current_phase,
      }),
    };
  }

  const lockStatus = pipelineStatusForPhase(nextPhase);
  const { data: claimedNext } = await supabase
    .from('audits')
    .update({ status: lockStatus })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('updated_at', audit.updated_at)
    .in('status', PIPELINE_CLAIMABLE_STATUSES as unknown as string[])
    .select('id');
  if (!claimedNext || claimedNext.length === 0) {
    return {
      ok: false,
      error: err(409, API_ERROR_CODES.PIPELINE_NEXT_CLAIM_CONFLICT, PIPELINE_NEXT_CLAIM_CONFLICT_MESSAGE),
    };
  }

  return {
    ok: true,
    response: { status: 'running', phase: nextPhase },
    nextPhase,
    disableAutoRemediate,
  };
}

export async function runPipelineRetry(params: {
  auditId: string;
  userId: string;
  phase: number;
  disableAutoRemediate: boolean;
}): Promise<
  | { ok: true; response: { status: 'retrying'; phase: number }; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr }
> {
  const { auditId, userId, phase, disableAutoRemediate } = params;

  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, status, tokens_used, token_budget, product_mode, execution_plan, updated_at')
    .eq('id', auditId)
    .eq('user_id', userId)
    .single();

  if (error || !audit) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  if (audit.status === 'cancelled') {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALREADY_CANCELLED, PIPELINE_ALREADY_CANCELLED_MESSAGE),
    };
  }

  if (audit.tokens_used >= audit.token_budget) {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE),
    };
  }

  const retryPlan = normalizeExecutionPlanFromAuditFields(audit as { execution_plan?: Partial<AuditExecutionPlan> | null; product_mode?: string | null });
  if (!executionPlanToPhases(retryPlan).includes(phase)) {
    return {
      ok: false,
      error: err(
        400,
        API_ERROR_CODES.PIPELINE_PHASE_NOT_AVAILABLE_FOR_MODE,
        pipelinePhaseNotAvailableMessage(phase, retryPlan.coverage_package ?? DEFAULT_AUDIT_COVERAGE_PACKAGE),
      ),
    };
  }

  if ((PIPELINE_PHASE_ACTIVE_STATUSES as readonly string[]).includes(audit.status)) {
    return {
      ok: false,
      error: err(409, API_ERROR_CODES.PIPELINE_PHASE_IN_PROGRESS, PIPELINE_PHASE_IN_PROGRESS_MESSAGE, {
        status: audit.status,
      }),
    };
  }

  const lockStatus = pipelineStatusForPhase(phase);
  const { data: claimedRetry } = await supabase
    .from('audits')
    .update({ status: lockStatus })
    .eq('id', auditId)
    .eq('user_id', userId)
    .eq('updated_at', audit.updated_at)
    .in('status', PIPELINE_CLAIMABLE_STATUSES as unknown as string[])
    .select('id');
  if (!claimedRetry || claimedRetry.length === 0) {
    return {
      ok: false,
      error: err(409, API_ERROR_CODES.PIPELINE_RETRY_CLAIM_CONFLICT, PIPELINE_RETRY_CLAIM_CONFLICT_MESSAGE),
    };
  }

  return {
    ok: true,
    response: { status: 'retrying', phase },
    disableAutoRemediate,
  };
}

export async function sendPipelineRetryNotifications(params: {
  auditId: string;
  actorUserId: string;
  phase: number;
}): Promise<void> {
  const { auditId, actorUserId, phase } = params;
  await notifyAuditParticipantsExcept(
    auditId,
    'pipeline',
    PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE,
    pipelineRetryStartedNotificationMessage(phase),
    [actorUserId],
    {
      phase,
      status: 'retrying',
      route: buildPipelineUiRoute(auditId),
      occurred_at: new Date().toISOString(),
      actor_role: 'consultant',
      failure_type: 'retry_started',
    },
  );
}

export async function runPipelineStop(params: {
  auditId: string;
  userId: string;
  role: UserRole;
}): Promise<
  | { ok: true; response: { status: 'cancelled'; stopped: true } }
  | { ok: false; error: PipelineRouteErr }
> {
  const { auditId, userId, role } = params;
  if (role !== 'consultant' && role !== 'client') {
    return { ok: false, error: err(403, API_ERROR_CODES.PIPELINE_FORBIDDEN, PIPELINE_FORBIDDEN_MESSAGE) };
  }

  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, status, current_phase, updated_at, user_id, client_id')
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();

  if (error || !audit) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  if (!canOperatePipeline(audit as { user_id: string; client_id: string | null }, userId, role)) {
    return {
      ok: false,
      error: err(403, API_ERROR_CODES.PIPELINE_ACCESS_DENIED, PIPELINE_ACCESS_DENIED_MESSAGE),
    };
  }

  if (audit.status === 'cancelled') {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALREADY_CANCELLED, PIPELINE_ALREADY_CANCELLED_MESSAGE),
    };
  }

  if ((PIPELINE_TERMINAL_STATUSES as readonly string[]).includes(audit.status)) {
    return {
      ok: false,
      error: err(400, API_ERROR_CODES.PIPELINE_ALREADY_TERMINAL, PIPELINE_ALREADY_TERMINAL_MESSAGE),
    };
  }

  const { data: claimedStop } = await supabase
    .from('audits')
    .update({ status: 'cancelled' })
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .eq('updated_at', audit.updated_at)
    .in('status', PIPELINE_STOP_CLAIMABLE_STATUSES as unknown as string[])
    .select('id');
  if (!claimedStop || claimedStop.length === 0) {
    return {
      ok: false,
      error: err(409, API_ERROR_CODES.PIPELINE_STOP_CLAIM_CONFLICT, PIPELINE_STOP_CLAIM_CONFLICT_MESSAGE),
    };
  }

  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase: audit.current_phase as number,
    event_type: PIPELINE_EVENT_TYPES.cancelled,
    message: PIPELINE_CANCELLED_BY_USER_MESSAGE,
    data: { actor_role: role, actor_user_id: userId },
  });

  return { ok: true, response: { status: 'cancelled', stopped: true as const } };
}

export async function loadPipelineStatus(params: { auditId: string; userId: string }): Promise<
  | {
      ok: true;
      payload: {
        status: unknown;
        current_phase: unknown;
        tokens_used: unknown;
        token_budget: unknown;
        execution_plan: unknown;
        events: unknown[];
        reviews: unknown[];
      };
    }
  | { ok: false; error: PipelineRouteErr }
> {
  const { auditId, userId } = params;
  const filter = safeOrUserFilter(userId);

  const [auditRes, eventsRes, reviewsRes] = await Promise.all([
    supabase
      .from('audits')
      .select('status, current_phase, tokens_used, token_budget, execution_plan')
      .eq('id', auditId)
      .or(filter)
      .single(),
    supabase
      .from('pipeline_events')
      .select('*')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: false })
      .limit(PIPELINE_STATUS_EVENTS_LIMIT),
    supabase.from('review_points').select('*').eq('audit_id', auditId).order('after_phase'),
  ]);

  if (auditRes.error || !auditRes.data) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  return {
    ok: true,
    payload: {
      ...auditRes.data,
      events: eventsRes.data ?? [],
      reviews: reviewsRes.data ?? [],
    },
  };
}

export async function loadQualityGateData(params: {
  auditId: string;
  userId: string;
  phase: number;
}): Promise<{ ok: true; data: unknown } | { ok: false; error: PipelineRouteErr }> {
  const { auditId, userId, phase } = params;
  const { data: audit } = await supabase
    .from('audits')
    .select('id')
    .eq('id', auditId)
    .or(safeOrUserFilter(userId))
    .single();

  if (!audit) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  const { data: event } = await supabase
    .from('pipeline_events')
    .select('data, created_at')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('event_type', PIPELINE_EVENT_TYPES.qualityGate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!event) {
    return { ok: true, data: null };
  }

  return { ok: true, data: event.data };
}

export async function runReviewApprove(params: {
  auditId: string;
  userId: string;
  afterPhase: number;
  consultantNotes: string | null;
  interviewNotes: string | null;
}): Promise<{ ok: true; response: Record<string, unknown> } | { ok: false; error: PipelineRouteErr }> {
  const { auditId, userId, afterPhase, consultantNotes, interviewNotes } = params;

  const { data: audit } = await supabase.from('audits').select('id').eq('id', auditId).eq('user_id', userId).single();

  if (!audit) {
    return {
      ok: false,
      error: err(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
    };
  }

  const { data: qgEvent } = await supabase
    .from('pipeline_events')
    .select('data')
    .eq('audit_id', auditId)
    .eq('phase', afterPhase)
    .eq('event_type', PIPELINE_EVENT_TYPES.qualityGate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (qgEvent?.data) {
    const qgReport = qgEvent.data as { passed: boolean; flags: Array<{ severity: string }> };
    if (qualityGateRequiresConsultantNotes(qgReport) && !consultantNotes) {
      return {
        ok: false,
        error: err(
          400,
          API_ERROR_CODES.PIPELINE_QUALITY_GATE_REQUIRES_NOTES,
          PIPELINE_QUALITY_GATE_REQUIRES_NOTES_MESSAGE,
        ),
      };
    }
  }

  const { data, error } = await supabase
    .from('review_points')
    .update({
      status: 'approved',
      consultant_notes: consultantNotes,
      interview_notes: interviewNotes,
      approved_at: new Date().toISOString(),
    })
    .eq('audit_id', auditId)
    .eq('after_phase', afterPhase)
    .eq('status', 'pending')
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { ok: true, response: { status: 'already_approved' } };
  }

  const reviewApprovedMsg = pipelineReviewApprovedMessage(afterPhase);
  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase: afterPhase,
    event_type: PIPELINE_EVENT_TYPES.reviewApproved,
    message: reviewApprovedMsg,
    data: { consultant_notes: consultantNotes, interview_notes: interviewNotes },
  });

  await emitStructuredNotification({
    category: 'review',
    event: 'review_approved',
    priority: 'low',
    audience: 'audit_participants',
    auditId,
    title: PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE,
    message: reviewApprovedMsg,
    payload: { phase: afterPhase },
    route: buildPipelineUiRoute(auditId),
  });

  return { ok: true, response: data as Record<string, unknown> };
}
