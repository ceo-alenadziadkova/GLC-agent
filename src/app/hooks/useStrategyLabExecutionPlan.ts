import { useMemo } from 'react';

import { DOMAIN_KEYS } from '../data/auditTypes';
import type { AuditMeta } from '../data/audit/contracts/core/audit-meta.types';
import type { AuditStrategyView } from '../data/audit/contracts/report/report-domain.types';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';

type ExecutionPlanForLab = NonNullable<AuditMeta['execution_plan']>;

type UseStrategyLabExecutionPlanArgs = {
  strategy: AuditStrategyView | null | undefined;
  executionPlan: AuditMeta['execution_plan'] | null | undefined;
};

/**
 * Strategy Lab expects execution-plan domains even when legacy audit payloads omit `meta.execution_plan`.
 * Falls back to domains inferred from the orchestration pack graph.
 */
export function useStrategyLabExecutionPlan({
  strategy,
  executionPlan,
}: UseStrategyLabExecutionPlanArgs): ExecutionPlanForLab | null {
  return useMemo((): ExecutionPlanForLab | null => {
    if (!strategy) return null;
    if (executionPlan) return executionPlan;

    const rawPack = strategy.glc_orchestration_pack;
    if (!isGlcOrchestrationPackView(rawPack)) return null;

    const domainSet = new Set<(typeof DOMAIN_KEYS)[number]>();
    for (const node of rawPack.graph?.nodes ?? []) {
      const domain = node.domain;
      if (domain && (DOMAIN_KEYS as readonly string[]).includes(domain)) {
        domainSet.add(domain as (typeof DOMAIN_KEYS)[number]);
      }
    }

    return {
      selected_domains: domainSet.size > 0 ? [...domainSet] : [...DOMAIN_KEYS],
      depth: 'standard',
      source: 'system_default',
    };
  }, [executionPlan, strategy]);
}
