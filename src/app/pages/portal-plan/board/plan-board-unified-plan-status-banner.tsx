import { Link } from 'react-router';

import { Button } from '../../../components/ui/button';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';
import { PlanBoardOrphanReconcileBanner } from './PlanBoardOrphanReconcileBanner';

export type PlanBoardUnifiedPlanStatusBannerProps = {
  strategyHref: string;
  governanceReadOnly: boolean;
  showOrphanReconcile: boolean;
  reconcileProps: null | {
    auditId: string;
    orchestrationPackVersion: number;
    reconcilePreviewEnabled: boolean;
  };
  manifestDraftPendingCount: number;
  showManifestDraftQueueCopy: boolean;
};

/**
 * Single consultant-facing status strip for Delivery Board plan upkeep (Linear-style priority banner stack).
 */
export function PlanBoardUnifiedPlanStatusBanner(props: PlanBoardUnifiedPlanStatusBannerProps) {
  const {
    strategyHref,
    governanceReadOnly,
    showOrphanReconcile,
    reconcileProps,
    manifestDraftPendingCount,
    showManifestDraftQueueCopy,
  } = props;

  const showReconcile = showOrphanReconcile && reconcileProps != null && !governanceReadOnly;
  const showManifestBanner = showManifestDraftQueueCopy && manifestDraftPendingCount > 0;

  if (!governanceReadOnly && !showReconcile && !showManifestBanner) {
    return null;
  }

  return (
    <aside
      className="border-border bg-muted/25 space-y-3 rounded-lg border p-4"
      aria-label={PLAN_BOARD_COPY.unifiedPlanStatusAriaLabel}
    >
      <h3 className="text-foreground m-0 text-sm font-semibold tracking-tight">
        {PLAN_BOARD_COPY.unifiedPlanStatusHeading}
      </h3>

      <div className="space-y-3">
        {governanceReadOnly ? (
          <div
            role="status"
            className="border-border bg-muted/25 flex flex-col gap-3 rounded-md border px-3 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.governanceBlockedBannerTitle}</div>
              <p className="text-muted-foreground mt-1 text-sm">{PLAN_BOARD_COPY.governanceBlockedBannerBody}</p>
            </div>
            <Button asChild variant="default" type="button" size="sm" className="shrink-0 no-underline">
              <Link to={strategyHref}>{PLAN_BOARD_COPY.governanceBlockedStrategyCta}</Link>
            </Button>
          </div>
        ) : null}

        {showReconcile && reconcileProps ?
          <PlanBoardOrphanReconcileBanner
            auditId={reconcileProps.auditId}
            orchestrationPackVersion={reconcileProps.orchestrationPackVersion}
            reconcilePreviewEnabled={reconcileProps.reconcilePreviewEnabled}
            surfaceTone="embedded"
          />
        : null}

        {showManifestBanner ?
          <div
            role="status"
            className="border-border bg-muted/15 flex flex-col gap-3 rounded-md border px-3 py-3 md:flex-row md:items-start md:justify-between"
          >
            <div>
              <div className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.manifestDraftQueuePanelTitle}</div>
              <p className="text-muted-foreground mt-1 text-sm">{ORCHESTRATION_UI_COPY.manifestDraftQueueBanner}</p>
            </div>
            <Button asChild variant="outline" size="sm" type="button" className="shrink-0 no-underline">
              <Link to={strategyHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
            </Button>
          </div>
        : null}
      </div>
    </aside>
  );
}
