import { Link } from 'react-router';

import { Button } from '../../../components/ui/button';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { PortalPlanEmptyCallout } from '../PortalPlanPageStates';
import { PlanBoardUnifiedPlanStatusBanner } from './plan-board-unified-plan-status-banner';

type PlanBoardOperationalStatusBlockProps = {
  boardOperationalVisible: boolean;
  strategyStudioHref: string;
  governanceReadOnly: boolean;
  showConsultantPlanTools: boolean;
  orphanCount: number;
  auditId: string;
  orchestrationPackVersion: number;
  boardIssueNoPack: boolean;
  boardPending: boolean;
  boardError: boolean;
  manifestDraftPendingCount: number;
};

export function PlanBoardOperationalStatusBlock(props: PlanBoardOperationalStatusBlockProps) {
  return (
    <>
      {props.boardOperationalVisible ? (
        <PlanBoardUnifiedPlanStatusBanner
          strategyHref={props.strategyStudioHref}
          governanceReadOnly={props.governanceReadOnly}
          showOrphanReconcile={props.showConsultantPlanTools && props.orphanCount > 0}
          reconcileProps={
            props.showConsultantPlanTools
              ? {
                  auditId: props.auditId,
                  orchestrationPackVersion: props.orchestrationPackVersion,
                  reconcilePreviewEnabled: APP_FEATURE_FLAGS.planBoardReconcileDiffPreviewEnabled,
                }
              : null
          }
          manifestDraftPendingCount={props.manifestDraftPendingCount}
          showManifestDraftQueueCopy={APP_FEATURE_FLAGS.manifestDraftRevisionsFromBoard && props.showConsultantPlanTools}
        />
      ) : null}

      {props.boardIssueNoPack ? (
        <PortalPlanEmptyCallout title={PLAN_BOARD_COPY.emptyNoPackTitle} body={PLAN_BOARD_COPY.emptyNoPackBody}>
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={props.strategyStudioHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
          </Button>
        </PortalPlanEmptyCallout>
      ) : null}

      {props.boardError ? <div className="text-muted-foreground text-sm">Unable to load delivery board operational state.</div> : null}
      {props.boardOperationalVisible && props.boardPending ? (
        <div className="text-muted-foreground text-sm">Loading persisted delivery cards...</div>
      ) : null}
    </>
  );
}
