import './parts/RoadmapGanttView.css';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { useRoadmapGanttView } from '../../hooks/useRoadmapGanttView';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';
import { RoadmapGanttDependenciesPanel } from './parts/RoadmapGanttDependenciesPanel';
import { RoadmapGanttMainTabs } from './parts/RoadmapGanttMainTabs';
import { RoadmapGanttTimelinePanel } from './parts/RoadmapGanttTimelinePanel';
import type { RoadmapGanttPlanBoardHydration, RoadmapGanttViewProps } from './types';

export type { RoadmapGanttPlanBoardHydration, RoadmapGanttViewProps };

/**
 * Roadmap Gantt view — orchestrates the Timeline and Dependencies panels.
 *
 * Implementation is split across:
 * - {@link useRoadmapGanttView} — single controller hook owning all state, derivations
 *   and side-effects (URL ↔ state sync, localStorage persistence, scroll metrics,
 *   focus management, baseline lifecycle, Plan Board PATCH on DnD).
 * - {@link RoadmapGanttMainTabs} / {@link RoadmapGanttTimelinePanel} /
 *   {@link RoadmapGanttDependenciesPanel} — presentational subcomponents.
 * - {@link RoadmapGanttEmptyState} — empty/filtered states.
 *
 * Public API surface (component name and exported types) intentionally unchanged.
 */
export function RoadmapGanttView({
  auditId,
  projection,
  strategyHref,
  getDeliveryBoardHrefForPackNode,
  orchestrationPack,
  planBoardHydration,
  toolbarLeadingSlot,
}: RoadmapGanttViewProps) {
  const ctl = useRoadmapGanttView({
    auditId,
    projection,
    orchestrationPack,
    planBoardHydration,
    getDeliveryBoardHrefForPackNode,
  });

  return (
    <section className="space-y-4">
      <RoadmapGanttMainTabs
        activePanel={ctl.state.activePanel}
        onActivePanelChange={ctl.setters.setActivePanel}
        onPanelTablistKeyDown={ctl.handlers.handleMainPanelTablistKeyDown}
        onTimelineSelected={() => {
          ctl.setters.setMainPanelTabAnnouncement(
            ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementTimeline,
          );
        }}
        onDependenciesSelected={() => {
          ctl.setters.setMainPanelTabAnnouncement(
            ORCHESTRATION_UI_COPY.roadmapGanttMainTabPanelAnnouncementDependencies,
          );
        }}
        ids={{
          mainTabTimelineId: ctl.ids.mainTabTimelineId,
          mainTabDependenciesId: ctl.ids.mainTabDependenciesId,
          mainPanelTimelineId: ctl.ids.mainPanelTimelineId,
          mainPanelDependenciesId: ctl.ids.mainPanelDependenciesId,
        }}
      />
      {ctl.state.activePanel === 'timeline' ? (
        <RoadmapGanttTimelinePanel ctl={ctl} projection={projection} toolbarLeadingSlot={toolbarLeadingSlot} />
      ) : (
        <RoadmapGanttDependenciesPanel ctl={ctl} projection={projection} strategyHref={strategyHref} />
      )}
      <TaskDetailsDrawer
        auditId={auditId}
        open={ctl.derived.drawerTask != null}
        onOpenChange={(open) => {
          if (!open) ctl.setters.setSelectedTaskId(null);
        }}
        task={ctl.derived.drawerTask}
        dependencies={projection.dependencies}
        taskTitleById={ctl.derived.taskTitleById}
        downstreamTaskCount={ctl.derived.downstreamTaskCount}
        deliveryBoardHref={ctl.derived.deliveryBoardHref}
        planBoardMove={ctl.derived.taskPlanBoardMove}
        consultantBoardPlanHref={ctl.derived.consultantBoardPlanHref}
        onFilterToLane={(laneId) => {
          ctl.setters.setLaneFilter(String(laneId));
          ctl.setters.setRoadmapToolbarMoreOpen(true);
          ctl.setters.setActivePanel('timeline');
        }}
      />
    </section>
  );
}
