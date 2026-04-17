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
  | { ok: true; response: { status: 'running'; phase: number }; nextPhase: number; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr };

export type PipelineRetryResult =
  | { ok: true; response: { status: 'retrying'; phase: number }; disableAutoRemediate: boolean }
  | { ok: false; error: PipelineRouteErr };

export type PipelineStopResult =
  | { ok: true; response: { status: 'cancelled'; stopped: true } }
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
