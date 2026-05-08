import type { KeyboardEvent } from 'react';

import { ORCHESTRATION_UI_COPY } from '../../../config/orchestration-roadmap-ui-copy.en';

type ActivePanel = 'timeline' | 'dependencies';

export type RoadmapGanttMainTabsProps = {
  activePanel: ActivePanel;
  onActivePanelChange: (panel: ActivePanel) => void;
  onPanelTablistKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onTimelineSelected: () => void;
  onDependenciesSelected: () => void;
  ids: {
    mainTabTimelineId: string;
    mainTabDependenciesId: string;
    mainPanelTimelineId: string;
    mainPanelDependenciesId: string;
  };
};

/**
 * Top-level tablist switching between Timeline and Dependencies panels.
 * Receives a key-down handler for ARIA tab navigation.
 */
export function RoadmapGanttMainTabs(props: RoadmapGanttMainTabsProps) {
  const {
    activePanel,
    onActivePanelChange,
    onPanelTablistKeyDown,
    onTimelineSelected,
    onDependenciesSelected,
    ids,
  } = props;

  return (
    <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
      <div
        className="flex items-center gap-2"
        role="tablist"
        aria-orientation="horizontal"
        aria-label={ORCHESTRATION_UI_COPY.roadmapGanttMainPanelsTablistAriaLabel}
        onKeyDown={onPanelTablistKeyDown}
      >
        <button
          type="button"
          role="tab"
          id={ids.mainTabTimelineId}
          aria-selected={activePanel === 'timeline'}
          aria-controls={ids.mainPanelTimelineId}
          tabIndex={activePanel === 'timeline' ? 0 : -1}
          onClick={() => {
            onActivePanelChange('timeline');
            onTimelineSelected();
          }}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            activePanel === 'timeline'
              ? 'bg-muted ds-text-primary'
              : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttMainTabTimelineLabel}
        </button>
        <button
          type="button"
          role="tab"
          id={ids.mainTabDependenciesId}
          aria-selected={activePanel === 'dependencies'}
          aria-controls={ids.mainPanelDependenciesId}
          tabIndex={activePanel === 'dependencies' ? 0 : -1}
          onClick={() => {
            onActivePanelChange('dependencies');
            onDependenciesSelected();
          }}
          className={[
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            activePanel === 'dependencies'
              ? 'bg-muted ds-text-primary'
              : 'ds-text-secondary hover:bg-muted',
          ].join(' ')}
        >
          {ORCHESTRATION_UI_COPY.roadmapGanttMainTabDependenciesLabel}
        </button>
      </div>
    </div>
  );
}
