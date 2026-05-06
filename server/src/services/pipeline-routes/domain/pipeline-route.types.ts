import type { UserRole } from '../../../middleware/auth.js';

export type PipelineRouteErrorBody = Record<string, unknown>;

export type PipelineRouteErr = {
  status: number;
  body: PipelineRouteErrorBody;
};

export type PipelineAction = 'start' | 'next' | 'retry';

export type PipelineStartResult =
  | { ok: true; response: { status: 'started'; phase: 0; intakeProgress: unknown }; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr };

export type PipelineNextResult =
  | {
      ok: true;
      outcome: 'running';
      response: { status: 'running'; phase: number };
      nextPhase: number;
      disableAutoRemediate: boolean;
    }
  | {
      ok: true;
      outcome: 'completed';
      response: { status: 'completed'; phase: number };
      disableAutoRemediate: boolean;
    }
  | { ok: false; error: PipelineRouteErr };

export type PipelineRetryResult =
  | { ok: true; response: { status: 'retrying'; phase: number }; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr };

export type PipelineStopResult =
  | { ok: true; response: { status: 'cancelled'; stopped: true } }
  | { ok: false; error: PipelineRouteErr };

/** Platform admin only: move audit from `cancelled` to claimable state; best-effort auto `pipeline/next` as owner. */
export type PipelineResumeFromCancelledResult =
  | {
      ok: true;
      response: {
        current_phase: number;
        resumed: true;
        execution_scheduled: boolean;
        status: 'review' | 'running' | 'completed';
        /**
         * Present when resumed successfully but owner's best-effort `pipeline/next` was rejected
         * (same shape as standalone next/start errors, e.g. intake readiness gate).
         */
        auto_next_blocked?: boolean;
        auto_next_error_code?: string;
        auto_next_error_details?: unknown;
      };
    }
  | { ok: false; error: PipelineRouteErr };

export type PipelineStatusResult =
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
        event_page?: {
          limit: number;
          next_before: string | null;
          detail_level: 'default' | 'debug';
        };
      };
    }
  | { ok: false; error: PipelineRouteErr };

export type PipelineQualityGateResult = { ok: true; data: unknown } | { ok: false; error: PipelineRouteErr };

export type PipelineReviewApproveResult =
  | { ok: true; response: Record<string, unknown> }
  | { ok: false; error: PipelineRouteErr };

export type PipelineAuditAccessRow = {
  user_id: string;
  client_id: string | null;
};

export type PipelineRouteMutationParams = {
  auditId: string;
  userId: string;
  role: UserRole;
};
