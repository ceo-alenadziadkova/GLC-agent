import {
  PIPELINE_PHASE_ACTIVE_STATUSES,
  PIPELINE_TERMINAL_STATUSES,
} from '../../../config/pipeline-status.js';
import type { UserRole } from '../../../middleware/auth.js';
import { pipelineRouteErr } from './pipeline-route.errors.js';
import type { PipelineAuditAccessRow, PipelineRouteErr } from './pipeline-route.types.js';

export type PipelineAuditLifecycleRow = {
  status: string;
  tokens_used: number;
  token_budget: number;
};

export function hasPipelineRole(role: UserRole): boolean {
  return role === 'consultant' || role === 'client';
}

export function canOperatePipeline(audit: PipelineAuditAccessRow, uid: string, role: UserRole): boolean {
  if (role === 'consultant' && audit.user_id === uid) return true;
  if (role === 'client' && audit.client_id === uid) return true;
  return false;
}

export function assertPipelineRole(role: UserRole): PipelineRouteErr | null {
  return hasPipelineRole(role) ? null : pipelineRouteErr.forbidden();
}

export function assertPipelineAccess(audit: PipelineAuditAccessRow, uid: string, role: UserRole): PipelineRouteErr | null {
  return canOperatePipeline(audit, uid, role) ? null : pipelineRouteErr.accessDenied();
}

export function assertNotCancelled(status: string): PipelineRouteErr | null {
  return status === 'cancelled' ? pipelineRouteErr.alreadyCancelled() : null;
}

export function assertTokenBudgetAvailable(audit: PipelineAuditLifecycleRow): PipelineRouteErr | null {
  return audit.tokens_used >= audit.token_budget ? pipelineRouteErr.tokenBudgetExceeded() : null;
}

export function isPipelinePhaseActive(status: string): boolean {
  return (PIPELINE_PHASE_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isPipelineTerminal(status: string): boolean {
  return (PIPELINE_TERMINAL_STATUSES as readonly string[]).includes(status);
}
