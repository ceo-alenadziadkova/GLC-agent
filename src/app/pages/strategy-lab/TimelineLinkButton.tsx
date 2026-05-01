import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { buildAppRoute } from '../../config/route-paths';
import { useProfile } from '../../hooks/useProfile';

export function TimelineLinkButton({ auditId }: { auditId: string }) {
  const { isClient } = useProfile();
  const to = isClient ? buildAppRoute.portalPlan(auditId, 'timeline') : buildAppRoute.plan(auditId, 'timeline');
  return (
    <Button asChild variant="outline" size="sm" className="no-underline">
      <Link to={to}>{ORCHESTRATION_UI_COPY.commercialAcceptedOpenTimeline}</Link>
    </Button>
  );
}
