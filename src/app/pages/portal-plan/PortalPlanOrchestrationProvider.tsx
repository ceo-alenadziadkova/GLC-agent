import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAudit } from '../../hooks/useAudit';
import { useOrchestrationReadModel } from '../../data/api/use-orchestration-read-model';

type ReadModel = ReturnType<typeof useOrchestrationReadModel>;

export type PortalPlanOrchestrationValue = {
  auditId: string;
  audit: ReturnType<typeof useAudit>['audit'];
  auditLoading: boolean;
  auditError: ReturnType<typeof useAudit>['error'];
  reloadAudit: ReturnType<typeof useAudit>['reload'];
  timelineQuery: ReadModel['timelineQuery'];
  packQuery: ReadModel['packQuery'];
};

const PortalPlanOrchestrationContext = createContext<PortalPlanOrchestrationValue | null>(null);

/**
 * Holds audit + orchestration timeline/pack reads for Plan surfaces (`useOrchestrationReadModel`:
 * conditional pack GET + shared React Query keys with Strategy Lab / cockpit invalidations).
 */
export function PortalPlanOrchestrationProvider({
  auditId,
  children,
}: {
  auditId: string;
  children: ReactNode;
}) {
  const { audit, loading, error, reload } = useAudit(auditId);
  const orchestrationEnabled = Boolean(auditId) && !loading && !error && Boolean(audit);
  const { packQuery, timelineQuery } = useOrchestrationReadModel(auditId, {
    enabled: orchestrationEnabled,
    includePack: true,
    includeTimeline: true,
  });

  const value = useMemo(
    (): PortalPlanOrchestrationValue => ({
      auditId,
      audit,
      auditLoading: loading,
      auditError: error,
      reloadAudit: reload,
      timelineQuery,
      packQuery,
    }),
    [auditId, audit, loading, error, reload, timelineQuery, packQuery],
  );

  return <PortalPlanOrchestrationContext.Provider value={value}>{children}</PortalPlanOrchestrationContext.Provider>;
}

export function usePortalPlanOrchestration(): PortalPlanOrchestrationValue {
  const ctx = useContext(PortalPlanOrchestrationContext);
  if (!ctx) {
    throw new Error('usePortalPlanOrchestration must be used within PortalPlanOrchestrationProvider');
  }
  return ctx;
}
