import type { IntakeReadinessEnvelope } from '@glc/intake-core';
import {
  API_ERROR_CODES,
  PIPELINE_INTAKE_CONTINUE_READINESS_BLOCKED_MESSAGE,
  PIPELINE_INTAKE_READINESS_BLOCKED_MESSAGE,
  PIPELINE_ACCESS_DENIED_MESSAGE,
  PIPELINE_ALL_PHASES_COMPLETE_MESSAGE,
  PIPELINE_ALREADY_CANCELLED_MESSAGE,
  PIPELINE_ALREADY_STARTED_MESSAGE,
  PIPELINE_ALREADY_TERMINAL_MESSAGE,
  PIPELINE_AUDIT_NOT_FOUND_MESSAGE,
  PIPELINE_FORBIDDEN_MESSAGE,
  PIPELINE_NEXT_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_PHASE_IN_PROGRESS_MESSAGE,
  PIPELINE_QUALITY_GATE_REQUIRES_NOTES_MESSAGE,
  PIPELINE_RETRY_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_RESUME_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_RESUME_NOT_CANCELLED_MESSAGE,
  PIPELINE_REVIEW_PENDING_MESSAGE,
  PIPELINE_START_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_STOP_CLAIM_CONFLICT_MESSAGE,
  PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE,
  apiErrorJson,
  type ApiErrorCode,
} from '../../../config/api-error-codes.js';
import type { PipelineRouteErr } from './pipeline-route.types.js';
import { buildPipelineIntakeReadinessBlockedDetails } from './intake-readiness-error-details.js';

function buildErr(status: number, code: ApiErrorCode, message: string, extra?: Record<string, unknown>): PipelineRouteErr {
  const base = apiErrorJson(code, message);
  return { status, body: extra ? { ...base, ...extra } : base };
}

export const pipelineRouteErr = {
  forbidden: () => buildErr(403, API_ERROR_CODES.PIPELINE_FORBIDDEN, PIPELINE_FORBIDDEN_MESSAGE),
  auditNotFound: () => buildErr(404, API_ERROR_CODES.PIPELINE_AUDIT_NOT_FOUND, PIPELINE_AUDIT_NOT_FOUND_MESSAGE),
  accessDenied: () => buildErr(403, API_ERROR_CODES.PIPELINE_ACCESS_DENIED, PIPELINE_ACCESS_DENIED_MESSAGE),
  alreadyCancelled: () => buildErr(400, API_ERROR_CODES.PIPELINE_ALREADY_CANCELLED, PIPELINE_ALREADY_CANCELLED_MESSAGE),
  alreadyStarted: (status: string) =>
    buildErr(400, API_ERROR_CODES.PIPELINE_ALREADY_STARTED, PIPELINE_ALREADY_STARTED_MESSAGE, { status }),
  tokenBudgetExceeded: (extra?: Record<string, unknown>) =>
    buildErr(400, API_ERROR_CODES.PIPELINE_TOKEN_BUDGET_EXCEEDED, PIPELINE_TOKEN_BUDGET_EXCEEDED_MESSAGE, extra),
  startClaimConflict: () =>
    buildErr(409, API_ERROR_CODES.PIPELINE_START_CLAIM_CONFLICT, PIPELINE_START_CLAIM_CONFLICT_MESSAGE),
  phaseInProgress: (status: string) =>
    buildErr(409, API_ERROR_CODES.PIPELINE_PHASE_IN_PROGRESS, PIPELINE_PHASE_IN_PROGRESS_MESSAGE, { status }),
  allPhasesComplete: () =>
    buildErr(400, API_ERROR_CODES.PIPELINE_ALL_PHASES_COMPLETE, PIPELINE_ALL_PHASES_COMPLETE_MESSAGE),
  reviewPending: (afterPhase: number) =>
    buildErr(400, API_ERROR_CODES.PIPELINE_REVIEW_PENDING, PIPELINE_REVIEW_PENDING_MESSAGE, {
      review_after_phase: afterPhase,
    }),
  nextClaimConflict: () =>
    buildErr(409, API_ERROR_CODES.PIPELINE_NEXT_CLAIM_CONFLICT, PIPELINE_NEXT_CLAIM_CONFLICT_MESSAGE),
  retryClaimConflict: () =>
    buildErr(409, API_ERROR_CODES.PIPELINE_RETRY_CLAIM_CONFLICT, PIPELINE_RETRY_CLAIM_CONFLICT_MESSAGE),
  alreadyTerminal: () =>
    buildErr(400, API_ERROR_CODES.PIPELINE_ALREADY_TERMINAL, PIPELINE_ALREADY_TERMINAL_MESSAGE),
  stopClaimConflict: () =>
    buildErr(409, API_ERROR_CODES.PIPELINE_STOP_CLAIM_CONFLICT, PIPELINE_STOP_CLAIM_CONFLICT_MESSAGE),
  qualityGateRequiresNotes: () =>
    buildErr(
      400,
      API_ERROR_CODES.PIPELINE_QUALITY_GATE_REQUIRES_NOTES,
      PIPELINE_QUALITY_GATE_REQUIRES_NOTES_MESSAGE,
    ),
  phaseNotAvailableForMode: (message: string) =>
    buildErr(400, API_ERROR_CODES.PIPELINE_PHASE_NOT_AVAILABLE_FOR_MODE, message),
  resumeNotCancelled: (status: string) =>
    buildErr(400, API_ERROR_CODES.PIPELINE_RESUME_NOT_CANCELLED, PIPELINE_RESUME_NOT_CANCELLED_MESSAGE, { status }),
  resumeClaimConflict: () =>
    buildErr(409, API_ERROR_CODES.PIPELINE_RESUME_CLAIM_CONFLICT, PIPELINE_RESUME_CLAIM_CONFLICT_MESSAGE),
  intakeReadinessBlocked: (
    envelope: IntakeReadinessEnvelope,
    boundary: 'pipeline_start' | 'pipeline_next',
  ): PipelineRouteErr => {
    const message =
      boundary === 'pipeline_start'
        ? PIPELINE_INTAKE_READINESS_BLOCKED_MESSAGE
        : PIPELINE_INTAKE_CONTINUE_READINESS_BLOCKED_MESSAGE;
    return {
      status: 400,
      body: apiErrorJson(
        API_ERROR_CODES.PIPELINE_INTAKE_READINESS_BLOCKED,
        message,
        buildPipelineIntakeReadinessBlockedDetails(envelope),
      ),
    };
  },
};
