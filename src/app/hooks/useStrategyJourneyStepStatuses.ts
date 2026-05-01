import { useMemo } from 'react';

import type { AuditState } from '../data/audit/contracts/state/audit-state.types';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import {
  computeStrategyJourneyStepStatuses,
  type StrategyJourneyStepComputed,
} from '../lib/strategy-journey-status';

/**
 * Single source for journey-step derivation (Strategy Lab + Plan chrome).
 * Safe when `audit` is null (loading / error guards live in pages).
 */
export function useStrategyJourneyStepStatuses(audit: AuditState | null): ReadonlyArray<StrategyJourneyStepComputed> {
  const effectiveConstraintsPresent = Boolean(audit?.strategy?.effective_constraints);
  const executionPlanDomainCount = audit?.meta.execution_plan?.selected_domains.length ?? 0;
  const orchestrationPackVersion = audit?.strategy?.orchestration_pack_version;
  const glcRaw = audit?.strategy?.glc_orchestration_pack;

  return useMemo(() => {
    const glcPackView = isGlcOrchestrationPackView(glcRaw) ? glcRaw : null;
    return computeStrategyJourneyStepStatuses({
      effectiveConstraintsPresent,
      executionPlanDomainCount,
      manifestSnapshotId: glcPackView?.manifest_snapshot_id,
      orchestrationPackVersion,
    });
  }, [
    effectiveConstraintsPresent,
    executionPlanDomainCount,
    orchestrationPackVersion,
    glcRaw,
  ]);
}
