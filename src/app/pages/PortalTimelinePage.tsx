import { Link, useParams } from 'react-router';
import { ArrowsClockwise, FileText, Flask } from '@phosphor-icons/react';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { useAudit } from '../hooks/useAudit';
import { ReportOrchestrationRoadmapSection } from '../features/report-viewer/components/ReportOrchestrationRoadmapSection';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { CLIENT_AUDIT_VIEW_COPY } from '../config/client-audit-view-copy';
import { StrategyLabOrchestrationPanel } from './strategy-lab/StrategyLabOrchestrationPanel';
import { useProfile } from '../hooks/useProfile';
import { buildAppRoute } from '../config/route-paths';
import { ORCHESTRATION_MANIFEST_SETUP_DOM_ID } from '../config/orchestration-ui-limits';

export function PortalTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading, error, reload } = useAudit(id);
  const { isClient } = useProfile();

  if (!id) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.page.missingId}>
        <div className="glc-page-content mx-auto max-w-3xl text-sm ds-text-score-1">{CLIENT_AUDIT_VIEW_COPY.page.missingId}</div>
      </AppShell>
    );
  }

  const reportHref = isClient ? buildAppRoute.portalReports(id) : buildAppRoute.reports(id);
  const labHref = isClient ? buildAppRoute.portalStrategy(id) : buildAppRoute.strategy(id);
  const auditHref = isClient ? buildAppRoute.portalAudit(id) : buildAppRoute.audit(id);

  if (loading && !audit) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={ORCHESTRATION_UI_COPY.previewLoading}>
        <div className="flex h-64 items-center justify-center">
          <ArrowsClockwise className="h-6 w-6 animate-spin ds-text-brand" />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={CLIENT_AUDIT_VIEW_COPY.cockpit.subtitle}>
        <div className="flex h-64 items-center justify-center">
          <p className="ds-text-score-1">{error ?? ORCHESTRATION_UI_COPY.noPackYet}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={ORCHESTRATION_UI_COPY.timelineHint}>
      <div className="mx-auto max-w-3xl space-y-4 ds-pattern-page-shell-body">
        <div className="glc-soft-panel flex flex-wrap gap-2 p-4">
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={auditHref}>{CLIENT_AUDIT_VIEW_COPY.cockpit.title}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={reportHref}>
              <FileText className="h-4 w-4" />
              {CLIENT_AUDIT_VIEW_COPY.cockpit.openFullReport}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={labHref}>
              <Flask className="h-4 w-4" />
              {CLIENT_AUDIT_VIEW_COPY.cockpit.adjustScopeTitle}
            </Link>
          </Button>
        </div>

        {audit.strategy && audit.meta.execution_plan ? (
          <section id={ORCHESTRATION_MANIFEST_SETUP_DOM_ID}>
            <StrategyLabOrchestrationPanel
              auditId={audit.meta.id}
              executionPlan={audit.meta.execution_plan}
              strategy={audit.strategy}
              onReload={reload}
            />
          </section>
        ) : null}

        <ReportOrchestrationRoadmapSection
          strategy={audit.strategy}
          strategyLabHref={labHref}
          laneDisplayPreset="client_mvp"
          selectedDomains={audit.meta.execution_plan?.selected_domains ?? null}
        />
      </div>
    </AppShell>
  );
}
