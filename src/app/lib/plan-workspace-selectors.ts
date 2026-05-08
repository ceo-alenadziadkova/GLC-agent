import type { AuditState } from '../data/audit/contracts/state/audit-state.types';
import { isGlcOrchestrationPackView } from './orchestration-pack-guards';

/** Pack view from audit strategy (null when missing or wrong shape). */
export function selectOrchestrationPackView(audit: AuditState | null | undefined) {
  const raw = audit?.strategy?.glc_orchestration_pack;
  return isGlcOrchestrationPackView(raw) ? raw : null;
}

/** Whether strategy block exists for plan workspace chrome. */
export function selectHasStrategyBlock(audit: AuditState | null | undefined): boolean {
  return Boolean(audit?.strategy);
}
