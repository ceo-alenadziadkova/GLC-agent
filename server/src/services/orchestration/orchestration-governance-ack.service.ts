import { ORCHESTRATION_TELEMETRY_METRICS } from '../../config/orchestration-telemetry-policy.js';
import { logger } from '../logger.js';
import { fetchPersistedGlcOrchestrationPackForUser, persistGlcOrchestrationPack } from './orchestration-read.service.js';

export type GovernPackAction = 'accept_plan' | 'accept_with_warnings' | 'refine_plan';

export type RunGovernancePackActionResult =
  | { ok: true; orchestration_pack_version: number; refine_hint: boolean }
  | { ok: false; kind: 'stale' | 'no_pack' | 'persist_failed'; message?: string };

/**
 * Records an explicit consultant governance CTA: bump pack version (same JSON) for accept paths,
 * or return refine hint without persisting. Uses optimistic concurrency on `expectedVersion`.
 */
export async function runGovernancePackAction(args: {
  auditId: string;
  userId: string;
  action: GovernPackAction;
  expectedOrchestrationPackVersion: number;
}): Promise<RunGovernancePackActionResult> {
  if (args.action === 'refine_plan') {
    logger.info('orchestration.governance_refine_hint', {
      component: 'route.orchestration_pack',
      auditId: args.auditId,
      metric: ORCHESTRATION_TELEMETRY_METRICS.governanceAction,
      action: args.action,
    });
    return { ok: true, orchestration_pack_version: args.expectedOrchestrationPackVersion, refine_hint: true };
  }

  const persisted = await fetchPersistedGlcOrchestrationPackForUser({
    auditId: args.auditId,
    userId: args.userId,
  });
  if (persisted.status !== 'ok' || !persisted.pack) {
    return { ok: false, kind: 'no_pack' };
  }
  if (persisted.orchestration_pack_version !== args.expectedOrchestrationPackVersion) {
    return { ok: false, kind: 'stale' };
  }

  const revision_reason =
    args.action === 'accept_plan'
      ? 'governance_accept_plan'
      : 'governance_accept_with_warnings';

  const { orchestration_pack_version, error: persistErr } = await persistGlcOrchestrationPack({
    auditId: args.auditId,
    userId: args.userId,
    pack: persisted.pack,
    historySupplement: { govern_action: args.action, revision_reason },
  });

  if (persistErr) {
    logger.error('orchestration.governance_ack_persist_failed', {
      component: 'route.orchestration_pack',
      auditId: args.auditId,
      error: persistErr.message,
    });
    return { ok: false, kind: 'persist_failed', message: persistErr.message };
  }

  logger.info('orchestration.governance_ack_success', {
    component: 'route.orchestration_pack',
    auditId: args.auditId,
    metric: ORCHESTRATION_TELEMETRY_METRICS.governanceAction,
    action: args.action,
    orchestration_pack_version,
  });

  return { ok: true, orchestration_pack_version, refine_hint: false };
}
