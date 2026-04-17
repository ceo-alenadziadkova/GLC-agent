import { TreeStructure } from '@phosphor-icons/react';

import type { ViewMode } from '../types';
import { QUESTION_BANK_STUDIO_COPY_EN } from '../../../config/question-bank-studio-copy.en';
import { STUDIO_COPY_EN } from '../config/studio-copy.en';

type StudioHeaderSectionProps = {
  viewMode: ViewMode;
  overviewUi: boolean;
  onViewModeChange: (next: ViewMode) => void;
};

export function StudioHeaderSection(props: StudioHeaderSectionProps) {
  const { viewMode, overviewUi, onViewModeChange } = props;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 justify-between ds-text-primary">
        <div className="flex items-center gap-2">
          <TreeStructure className="w-4 h-4" weight="bold" />
          <h2 className="text-sm font-semibold m-0">{QUESTION_BANK_STUDIO_COPY_EN.headerTitle}</h2>
        </div>
        <div
          className="inline-flex rounded-lg overflow-hidden text-xs font-medium ds-studio-view-mode-shell"
          role="group"
          aria-label="Studio view mode"
        >
          <button
            type="button"
            className={`ds-studio-view-mode-btn${viewMode === 'user' ? ' ds-studio-view-mode-btn--active' : ''}`}
            onClick={() => onViewModeChange('user')}
          >
            {QUESTION_BANK_STUDIO_COPY_EN.viewModeButtons.flowSimulator}
          </button>
          <button
            type="button"
            className={`ds-studio-view-mode-btn ds-studio-view-mode-btn--segment${viewMode === 'logic' ? ' ds-studio-view-mode-btn--active' : ''}`}
            onClick={() => onViewModeChange('logic')}
          >
            {QUESTION_BANK_STUDIO_COPY_EN.viewModeButtons.fullMap}
          </button>
        </div>
      </div>

      {viewMode === 'logic' ? (
        overviewUi ? (
          <p className="m-0 text-xs rounded-lg px-3 py-2 ds-studio-logic-overview-hint">{STUDIO_COPY_EN.logicOverviewHint}</p>
        ) : (
          <div className="rounded-lg px-3 py-2 space-y-2 text-xs leading-relaxed ds-panel-canvas">
            <p className="m-0 ds-text-secondary">
              <strong className="ds-text-primary">Canon map (default):</strong> every bank id and section from{' '}
              <span className="font-mono">question-bank.v1.json</span> — this is the full semantic tree, not “what one
              product screen asks in one step”.
            </p>
            <p className="m-0 ds-text-quaternary">
              <strong className="ds-text-tertiary">Left stripe</strong> = policy + canon priority;{' '}
              <strong className="ds-text-tertiary">outer glow ring</strong> = trace result (answers +{' '}
              <span className="font-mono">buildIntakePlan</span>) when the trace runs.
            </p>
            <p className="m-0 ds-text-quaternary">
              <strong className="ds-text-tertiary">Policy mode</strong> adjusts participation / requiredness overlays.
            </p>
          </div>
        )
      ) : (
        <div className="rounded-lg px-3 py-2 text-xs ds-panel-canvas">{STUDIO_COPY_EN.userModeHint}</div>
      )}
    </>
  );
}
