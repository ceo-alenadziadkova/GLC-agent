import { Link, useParams } from 'react-router';
import { useQuery } from '../lib/tanstack-react-query';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { useAudit } from '../hooks/useAudit';
import { useProfile } from '../hooks/useProfile';
import { api } from '../data/apiService';
import { glcKeys } from '../lib/glc-keys';
import { buildRoadmapGanttProjection } from '../lib/roadmap-gantt-mapper';
import { RoadmapGanttView } from '../components/roadmap-gantt/RoadmapGanttView';
import { buildAppRoute } from '../config/route-paths';

export function PortalRoadmapGanttPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading, error } = useAudit(id);
  const { isClient } = useProfile();

  const timelineQuery = useQuery({
    queryKey: glcKeys.timeline.detail(id ?? ''),
    queryFn: () => api.getAuditTimeline(id as string),
    enabled: Boolean(id) && !loading && !error && Boolean(audit),
  });

  const packQuery = useQuery({
    queryKey: glcKeys.orchestrationPack.detail(id ?? ''),
    queryFn: () => api.getOrchestrationPack(id as string),
    enabled: Boolean(id) && !loading && !error && Boolean(audit),
  });

  if (!id) {
    return (
      <AppShell title="Roadmap schedule" subtitle="Missing audit id">
        <div className="mx-auto max-w-4xl text-sm ds-text-score-1">Missing audit id.</div>
      </AppShell>
    );
  }

  if (loading || timelineQuery.isPending) {
    return (
      <AppShell title="Roadmap schedule" subtitle="Loading roadmap">
        <div className="mx-auto max-w-4xl text-sm ds-text-secondary">Loading roadmap timeline...</div>
      </AppShell>
    );
  }

  if (error || timelineQuery.isError || !timelineQuery.data?.timeline) {
    return (
      <AppShell title="Roadmap schedule" subtitle="Timeline unavailable">
        <div className="mx-auto max-w-4xl text-sm ds-text-score-1">Could not load roadmap timeline data.</div>
      </AppShell>
    );
  }

  const projection = buildRoadmapGanttProjection(timelineQuery.data.timeline, {
    pack: packQuery.data?.pack ?? null,
  });
  const backHref = isClient ? buildAppRoute.portalTimeline(id) : buildAppRoute.timeline(id);
  const strategyHref = isClient ? buildAppRoute.portalStrategy(id) : buildAppRoute.strategy(id);

  return (
    <AppShell title="Roadmap schedule" subtitle="Multi-lane timeline with dependencies and task details">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="no-underline">
            <Link to={backHref}>Back to timeline</Link>
          </Button>
        </div>
        <RoadmapGanttView auditId={id} projection={projection} strategyHref={strategyHref} />
      </div>
    </AppShell>
  );
}
