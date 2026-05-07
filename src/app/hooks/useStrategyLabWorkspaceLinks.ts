import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../config/plan-delivery-board-ui';
import { buildAppRoute } from '../config/route-paths';
import { buildPlanWorkspaceHref } from '../lib/plan-cross-nav';

type UseStrategyLabWorkspaceLinksOptions = {
  auditId: string | undefined;
  isClient: boolean;
};

export function useStrategyLabWorkspaceLinks({ auditId, isClient }: UseStrategyLabWorkspaceLinksOptions) {
  const orchestrationUiEnabled = APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;
  const clientOrchestrationLabReadOnlyEnabled = APP_FEATURE_FLAGS.clientOrchestrationLabReadOnlyEnabled;
  const primaryPlanSurface = primaryPlanWorkbenchViewForStrategyLinks();
  const fallbackReportHref = isClient ? '/portal/reports' : '/reports';

  const reportHref =
    auditId == null
      ? fallbackReportHref
      : isClient
        ? buildAppRoute.portalReports(auditId)
        : buildAppRoute.reports(auditId);

  const planExecutionHref =
    auditId == null
      ? reportHref
      : buildPlanWorkspaceHref({
          auditId,
          isClient,
          mode: 'execute',
          view: primaryPlanSurface,
        });

  return {
    orchestrationUiEnabled,
    clientOrchestrationLabReadOnlyEnabled,
    reportHref,
    planExecutionHref,
  };
}
