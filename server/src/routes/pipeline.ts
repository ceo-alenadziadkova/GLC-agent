import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import {
  requireAuth,
  attachProfile,
  requireRole,
  rejectGuestFromPortal,
  type AuthRequest,
  type UserRole,
} from '../middleware/auth.js';
import { safeOrUserFilter } from '../lib/postgrest-filter.js';
import { pipelineLimiter } from '../middleware/rate-limit.js';
import { PipelineOrchestrator } from '../services/pipeline.js';
import {
  currentIntakeVersionTuple,
  isSupportedIntakeArtifactTuple,
} from '@glc/intake-core';
import {
  maxPhaseForMode,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
  type ProductMode,
} from '../types/audit.js';
import { logger } from '../services/logger.js';
import { REQUEST_FIELD_LIMITS } from '../config/request-field-limits.js';
import { PIPELINE_MAX_PHASE_INDEX, PIPELINE_MIN_PHASE } from '../config/pipeline-phases.js';
import { PIPELINE_STATUS_EVENTS_LIMIT } from '../config/route-query-limits.js';
import {
  evaluateBriefGates,
  resolveIntakeSurfaceForPlan,
  validationPerspectiveForBriefAccess,
} from '../services/brief-validator.js';
import { emitStructuredNotification, notifyAuditParticipantsExcept } from '../services/notifications.js';
import {
  PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE,
  PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE,
  pipelineRetryStartedNotificationMessage,
  pipelineReviewApprovedMessage,
} from '../config/route-notification-messages.js';
import { emitPhaseErrorDurable } from '../services/pipeline-error.js';
import { enqueuePipelineJob } from '../services/pipeline-jobs.js';
import {
  API_ERROR_CODES,
  PIPELINE_ACCESS_DENIED_MESSAGE,
  PIPELINE_ALL_PHASES_COMPLETE_MESSAGE,
  PIPELINE_ALREADY_STARTED_MESSAGE,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_FORBIDDEN_MESSAGE,
  PIPELINE_NEXT_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_NEXT_FAILED_MESSAGE,
  PIPELINE_PHASE_IN_PROGRESS_MESSAGE,
  PIPELINE_PHASE_REQUIRED_MESSAGE,
  PIPELINE_QUALITY_GATE_FETCH_FAILED_MESSAGE,
  PIPELINE_QUALITY_GATE_REQUIRES_NOTES_MESSAGE,
  PIPELINE_RETRY_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_RETRY_FAILED_MESSAGE,
  PIPELINE_REVIEW_APPROVE_FAILED_MESSAGE,
  PIPELINE_REVIEW_PENDING_MESSAGE,
  PIPELINE_START_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_START_FAILED_MESSAGE,
  PIPELINE_STATUS_FAILED_MESSAGE,
  PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE,
  apiErrorJson,
  pipelinePhaseNotAvailableMessage,
  pipelinePhaseOutOfRangeMessage,
} from '../config/api-error-codes.js';

export const pipelineRouter = Router();

// Mutations: /start and /next allow the audit owner consultant OR the linked client (self-serve).
// /retry and /reviews remain consultant-only.
// Status endpoint is readable by any authenticated user (client progress tracking).
const consultantGuard = [requireAuth, attachProfile, requireRole('consultant')] as const;

function canOperatePipeline(audit: { user_id: string; client_id: string | null }, uid: string, role: UserRole): boolean {
  if (role === 'consultant' && audit.user_id === uid) return true;
  if (role === 'client' && audit.client_id === uid) return true;
  return false;
}
const PHASE_ACTIVE_STATUSES = ['recon', 'auto', 'analytic', 'strategy'] as const;

function statusForPhase(phase: number): 'recon' | 'auto' | 'analytic' | 'strategy' {
  if (phase === 0) return 'recon';
  if (phase >= 1 && phase <= 4) return 'auto';
  if (phase >= 5 && phase <= 6) return 'analytic';
  return 'strategy';
}

// ─── POST /api/audits/:id/pipeline/start — Start pipeline ──
pipelineRouter.post('/:id/pipeline/start', requireAuth, attachProfile, pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const role = req.userRole as UserRole | undefined;
    if (role !== 'consultant' && role !== 'client') {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PIPELINE_FORBIDDEN, PIPELINE_FORBIDDEN_MESSAGE));
      return;
    }

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, current_phase, tokens_used, token_budget, updated_at, product_mode, user_id, client_id')
      .eq('id', id)
      .or(safeOrUserFilter(req.userId!))
      .single();

    if (error || !audit) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    if (!canOperatePipeline(audit as { user_id: string; client_id: string | null }, req.userId!, role)) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PIPELINE_ACCESS_DENIED, PIPELINE_ACCESS_DENIED_MESSAGE));
      return;
    }

    if (audit.status !== 'created') {
      res.status(400).json({
        ...apiErrorJson(API_ERROR_CODES.PIPELINE_ALREADY_STARTED, PIPELINE_ALREADY_STARTED_MESSAGE),
        status: audit.status,
      });
      return;
    }

    // Check token budget
    if (audit.tokens_used >= audit.token_budget) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE));
      return;
    }

    const { data: claimedStart } = await supabase
      .from('audits')
      .update({ status: 'recon', current_phase: 0 })
      .eq('id', id)
      .or(safeOrUserFilter(req.userId!))
      .eq('status', 'created')
      .eq('updated_at', audit.updated_at)
      .select('id');
    if (!claimedStart || claimedStart.length === 0) {
      res
        .status(409)
        .json(
          apiErrorJson(API_ERROR_CODES.PIPELINE_START_CLAIM_CONFLICT, PIPELINE_START_CLAIM_CONFLICT_MESSAGE),
        );
      return;
    }

    // Include intake progress contract so UI can render readiness state.
    const { data: brief } = await supabase
      .from('intake_brief')
      .select('responses, collection_mode, intake_versions')
      .eq('audit_id', id)
      .single();
    const cm = (brief?.collection_mode as IntakeBriefCollectionMode | undefined) ?? 'self_serve';
    const perspective = validationPerspectiveForBriefAccess(
      audit.user_id as string,
      audit.client_id as string | null | undefined,
      req.userId!,
    );
    const surface = resolveIntakeSurfaceForPlan(cm, perspective);
    const iv = brief?.intake_versions as IntakeVersionTuple | null | undefined;
    const intakeTuple =
      iv && isSupportedIntakeArtifactTuple(iv) ? iv : currentIntakeVersionTuple();
    const gates = evaluateBriefGates(
      (brief?.responses as Record<string, unknown>) ?? {},
      (audit.product_mode as ProductMode) ?? 'full',
      cm,
      surface,
      intakeTuple,
    );

    // Start pipeline (runs Phase 0: Recon)
    res.json({ status: 'started', phase: 0, intakeProgress: gates.intakeProgress });

    const queued = await enqueuePipelineJob({ auditId: id, action: 'start', phase: 0 });
    if (!queued) {
      // Fallback path when queue backend is unavailable.
      const orchestrator = new PipelineOrchestrator(id);
      orchestrator.startPhase(0).catch(err => emitPhaseErrorDurable(id, 0, err as Error));
    }
  } catch (err) {
    logger.error('Pipeline start route failed', { error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PIPELINE_START_FAILED, PIPELINE_START_FAILED_MESSAGE));
  }
});

// ─── POST /api/audits/:id/pipeline/next — Run next phase ───
pipelineRouter.post('/:id/pipeline/next', requireAuth, attachProfile, pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const role = req.userRole as UserRole | undefined;
    if (role !== 'consultant' && role !== 'client') {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PIPELINE_FORBIDDEN, PIPELINE_FORBIDDEN_MESSAGE));
      return;
    }

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, current_phase, tokens_used, token_budget, product_mode, updated_at, user_id, client_id')
      .eq('id', id)
      .or(safeOrUserFilter(req.userId!))
      .single();

    if (error || !audit) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    if (!canOperatePipeline(audit as { user_id: string; client_id: string | null }, req.userId!, role)) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.PIPELINE_ACCESS_DENIED, PIPELINE_ACCESS_DENIED_MESSAGE));
      return;
    }

    if (audit.tokens_used >= audit.token_budget) {
      res.status(400).json({
        ...apiErrorJson(API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE),
        tokens_used: audit.tokens_used,
        token_budget: audit.token_budget,
      });
      return;
    }

    // [C4] Concurrent phase lock: reject if a phase is actively executing.
    // DB constraint has no 'running' status — orchestrator uses 'recon'/'auto'/'analytic'/'strategy'.
    if ((PHASE_ACTIVE_STATUSES as readonly string[]).includes(audit.status)) {
      res.status(409).json({
        ...apiErrorJson(API_ERROR_CODES.PIPELINE_PHASE_IN_PROGRESS, PIPELINE_PHASE_IN_PROGRESS_MESSAGE),
        status: audit.status,
      });
      return;
    }

    const mode = (audit.product_mode ?? 'full') as ProductMode;
    const maxPhase = maxPhaseForMode(mode);
    const nextPhase = audit.current_phase + 1;

    if (nextPhase > maxPhase) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.PIPELINE_ALL_PHASES_COMPLETE, PIPELINE_ALL_PHASES_COMPLETE_MESSAGE),
        );
      return;
    }

    // Check if review point is pending
    const { data: pendingReview } = await supabase
      .from('review_points')
      .select('*')
      .eq('audit_id', id)
      .eq('after_phase', audit.current_phase)
      .eq('status', 'pending')
      .single();

    if (pendingReview) {
      res.status(400).json({
        ...apiErrorJson(API_ERROR_CODES.PIPELINE_REVIEW_PENDING, PIPELINE_REVIEW_PENDING_MESSAGE),
        review_after_phase: audit.current_phase,
      });
      return;
    }

    const lockStatus = statusForPhase(nextPhase);
    const { data: claimedNext } = await supabase
      .from('audits')
      .update({ status: lockStatus })
      .eq('id', id)
      .or(safeOrUserFilter(req.userId!))
      .eq('updated_at', audit.updated_at)
      .in('status', ['review', 'completed', 'failed', 'created'])
      .select('id');
    if (!claimedNext || claimedNext.length === 0) {
      res
        .status(409)
        .json(
          apiErrorJson(API_ERROR_CODES.PIPELINE_NEXT_CLAIM_CONFLICT, PIPELINE_NEXT_CLAIM_CONFLICT_MESSAGE),
        );
      return;
    }

    res.json({ status: 'running', phase: nextPhase });

    const queued = await enqueuePipelineJob({ auditId: id, action: 'next', phase: nextPhase });
    if (!queued) {
      const orchestrator = new PipelineOrchestrator(id);
      orchestrator.runBlock().catch(err => emitPhaseErrorDurable(id, nextPhase, err as Error));
    }
  } catch (err) {
    logger.error('Pipeline next route failed', { error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PIPELINE_NEXT_FAILED, PIPELINE_NEXT_FAILED_MESSAGE));
  }
});

// ─── POST /api/audits/:id/pipeline/retry — Retry failed phase
pipelineRouter.post('/:id/pipeline/retry', ...consultantGuard, pipelineLimiter, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { phase } = req.body;

    if (phase === undefined || typeof phase !== 'number') {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_PHASE_REQUIRED, PIPELINE_PHASE_REQUIRED_MESSAGE));
      return;
    }
    if (!Number.isInteger(phase) || phase < PIPELINE_MIN_PHASE || phase > PIPELINE_MAX_PHASE_INDEX) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_PHASE_OUT_OF_RANGE,
          pipelinePhaseOutOfRangeMessage(PIPELINE_MIN_PHASE, PIPELINE_MAX_PHASE_INDEX),
        ),
      );
      return;
    }

    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, tokens_used, token_budget, product_mode, updated_at')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !audit) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    if (audit.tokens_used >= audit.token_budget) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE));
      return;
    }

    const retryMode = (audit.product_mode ?? 'full') as ProductMode;
    if (phase > maxPhaseForMode(retryMode)) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_PHASE_NOT_AVAILABLE_FOR_MODE,
          pipelinePhaseNotAvailableMessage(phase, retryMode),
        ),
      );
      return;
    }

    // [C4] Concurrent phase lock — same guard as /next
    if ((PHASE_ACTIVE_STATUSES as readonly string[]).includes(audit.status)) {
      res.status(409).json({
        ...apiErrorJson(API_ERROR_CODES.PIPELINE_PHASE_IN_PROGRESS, PIPELINE_PHASE_IN_PROGRESS_MESSAGE),
        status: audit.status,
      });
      return;
    }

    const lockStatus = statusForPhase(phase);
    const { data: claimedRetry } = await supabase
      .from('audits')
      .update({ status: lockStatus })
      .eq('id', id)
      .eq('user_id', req.userId!)
      .eq('updated_at', audit.updated_at)
      .in('status', ['review', 'completed', 'failed', 'created'])
      .select('id');
    if (!claimedRetry || claimedRetry.length === 0) {
      res
        .status(409)
        .json(
          apiErrorJson(API_ERROR_CODES.PIPELINE_RETRY_CLAIM_CONFLICT, PIPELINE_RETRY_CLAIM_CONFLICT_MESSAGE),
        );
      return;
    }

    res.json({ status: 'retrying', phase });

    await notifyAuditParticipantsExcept(
      id,
      'pipeline',
      PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE,
      pipelineRetryStartedNotificationMessage(phase),
      [req.userId!],
      {
        phase,
        status: 'retrying',
        route: `/pipeline/${id}`,
        occurred_at: new Date().toISOString(),
        actor_role: 'consultant',
        failure_type: 'retry_started',
      },
    );

    const queued = await enqueuePipelineJob({ auditId: id, action: 'retry', phase });
    if (!queued) {
      const orchestrator = new PipelineOrchestrator(id);
      orchestrator.startPhase(phase).catch(err => emitPhaseErrorDurable(id, phase as number, err as Error));
    }
  } catch (err) {
    logger.error('Pipeline retry route failed', { error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PIPELINE_RETRY_FAILED, PIPELINE_RETRY_FAILED_MESSAGE));
  }
});

// ─── GET /api/audits/:id/pipeline/status — Pipeline status ──
// Clients and consultants track progress; snapshot guests use /api/snapshot until registered.
pipelineRouter.get('/:id/pipeline/status', requireAuth, attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const [auditRes, eventsRes, reviewsRes] = await Promise.all([
      supabase.from('audits')
        .select('status, current_phase, tokens_used, token_budget, product_mode')
        .eq('id', id)
        .or(`user_id.eq.${req.userId!},client_id.eq.${req.userId!}`)
        .single(),
      supabase.from('pipeline_events')
        .select('*')
        .eq('audit_id', id)
        .order('created_at', { ascending: false })
        .limit(PIPELINE_STATUS_EVENTS_LIMIT),
      supabase.from('review_points')
        .select('*')
        .eq('audit_id', id)
        .order('after_phase'),
    ]);

    if (auditRes.error || !auditRes.data) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    res.json({
      ...auditRes.data,
      events: eventsRes.data ?? [],
      reviews: reviewsRes.data ?? [],
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.pipeline_status_failed', { component: 'pipeline', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PIPELINE_STATUS_FAILED, PIPELINE_STATUS_FAILED_MESSAGE));
  }
});

// ─── GET /api/audits/:id/quality-gate/:phase — Fetch quality gate report ──
pipelineRouter.get('/:id/quality-gate/:phase', requireAuth, attachProfile, rejectGuestFromPortal, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const phase = parseInt(req.params.phase as string);

    // Verify audit is accessible to this user (consultant or client)
    const { data: audit } = await supabase
      .from('audits')
      .select('id')
      .eq('id', id)
      .or(`user_id.eq.${req.userId!},client_id.eq.${req.userId!}`)
      .single();

    if (!audit) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const { data: event } = await supabase
      .from('pipeline_events')
      .select('data, created_at')
      .eq('audit_id', id)
      .eq('phase', phase)
      .eq('event_type', 'quality_gate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!event) {
      res.json(null);
      return;
    }

    res.json(event.data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.quality_gate_failed', { component: 'pipeline', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_QUALITY_GATE_FETCH_FAILED,
          PIPELINE_QUALITY_GATE_FETCH_FAILED_MESSAGE,
        ),
      );
  }
});

// ─── POST /api/audits/:id/reviews/:phase — Approve review ──
pipelineRouter.post('/:id/reviews/:phase', ...consultantGuard, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const phase = req.params.phase as string;
    const { consultant_notes, interview_notes } = req.body;

    const maxNotes = REQUEST_FIELD_LIMITS.reviewGateNotesMax;
    const sanitizedConsultantNotes = consultant_notes
      ? String(consultant_notes).trim().slice(0, maxNotes) || null
      : null;
    const sanitizedInterviewNotes = interview_notes
      ? String(interview_notes).trim().slice(0, maxNotes) || null
      : null;

    // Verify ownership
    const { data: audit } = await supabase
      .from('audits')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId!)
      .single();

    if (!audit) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    // ── Quality gate enforcement ───────────────────────────────────────
    // If this gate has warning-level flags, consultant notes are required.
    // This prevents silent approval of low-confidence or miscalibrated findings.
    const { data: qgEvent } = await supabase
      .from('pipeline_events')
      .select('data')
      .eq('audit_id', id)
      .eq('phase', parseInt(phase))
      .eq('event_type', 'quality_gate')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (qgEvent?.data) {
      const qgReport = qgEvent.data as { passed: boolean; flags: Array<{ severity: string }> };
      const hasWarnings = !qgReport.passed && qgReport.flags.some(f => f.severity === 'warning');
      if (hasWarnings && !sanitizedConsultantNotes) {
        res.status(400).json(
          apiErrorJson(
            API_ERROR_CODES.PIPELINE_QUALITY_GATE_REQUIRES_NOTES,
            PIPELINE_QUALITY_GATE_REQUIRES_NOTES_MESSAGE,
          ),
        );
        return;
      }
    }

    const { data, error } = await supabase
      .from('review_points')
      .update({
        status: 'approved',
        consultant_notes: sanitizedConsultantNotes,
        interview_notes: sanitizedInterviewNotes,
        approved_at: new Date().toISOString(),
      })
      .eq('audit_id', id)
      .eq('after_phase', parseInt(phase))
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(200).json({ status: 'already_approved' });
      return;
    }

    const approvedPhase = parseInt(phase, 10);
    const reviewApprovedMsg = pipelineReviewApprovedMessage(approvedPhase);
    await supabase.from('pipeline_events').insert({
      audit_id: id,
      phase: approvedPhase,
      event_type: 'review_approved',
      message: reviewApprovedMsg,
      data: { consultant_notes: sanitizedConsultantNotes, interview_notes: sanitizedInterviewNotes },
    });

    await emitStructuredNotification({
      category: 'review',
      event: 'review_approved',
      priority: 'low',
      audience: 'audit_participants',
      auditId: id,
      title: PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE,
      message: reviewApprovedMsg,
      payload: { phase: approvedPhase },
      route: `/audit/${id}`,
    });

    res.json(data);
  } catch (err) {
    const e = err as Error;
    logger.error('route.review_approve_failed', { component: 'pipeline', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PIPELINE_REVIEW_APPROVE_FAILED,
          PIPELINE_REVIEW_APPROVE_FAILED_MESSAGE,
        ),
      );
  }
});
