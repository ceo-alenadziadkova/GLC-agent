import { Link } from 'react-router';

import { Button } from '../../components/ui/button';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { buildAppRoute } from '../../config/route-paths';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../../config/plan-delivery-board-ui';
import { useProfile } from '../../hooks/useProfile';

/**
 * After commercial accept / pack rebuild — opens canonical Plan with `view=board` when Delivery Board
 * is rolled out, otherwise `view=roadmap` (Gantt schedule).
 */
export function TimelineLinkButton({ auditId }: { auditId: string }) {
  const { isClient } = useProfile();
  const view = primaryPlanWorkbenchViewForStrategyLinks();
  const to = isClient ? buildAppRoute.portalPlan(auditId, view) : buildAppRoute.plan(auditId, view);
  const label =
    view === 'board'
      ? ORCHESTRATION_UI_COPY.commercialAcceptedOpenPlanBoard
      : ORCHESTRATION_UI_COPY.commercialAcceptedOpenPlanRoadmap;
  return (
    <Button asChild variant="outline" size="sm" className="no-underline">
      <Link to={to}>{label}</Link>
    </Button>
  );
}
