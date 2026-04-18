import { shortUserLabel } from '../selectors/trace';
import { STUDIO_COPY_EN } from '../config/studio-copy.en';
import type { UserStepLane } from '../selectors/visibility';

type StudioUserFlowSectionProps = {
  breadcrumbs: string[];
  pathHistory: string[];
  nextIdsCount: number;
  userStepLanes: UserStepLane[];
  activeUserStep: number | null;
  onBack: () => void;
  onNextPreview: () => void;
  onResetPath: () => void;
  onSetActiveStep: (next: number | null) => void;
};

export function StudioUserFlowSection(props: StudioUserFlowSectionProps) {
  const {
    breadcrumbs,
    pathHistory,
    nextIdsCount,
    userStepLanes,
    activeUserStep,
    onBack,
    onNextPreview,
    onResetPath,
    onSetActiveStep,
  } = props;

  return (
    <div className="rounded-lg px-3 py-2 space-y-2 text-xs ds-panel-canvas">
      <div className="text-[length:var(--text-2xs)] font-semibold uppercase ds-text-tertiary">
        Breadcrumbs (current path)
      </div>
      <div className="ds-text-secondary">
        {breadcrumbs.length > 0 ? breadcrumbs.map(id => `${shortUserLabel(id)} (${id})`).join(' -> ') : STUDIO_COPY_EN.userModeSelectQuestionHint}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`text-xs font-medium px-2 py-1 rounded-md ds-studio-user-flow-btn${pathHistory.length <= 1 ? ' ds-studio-user-flow-btn--muted' : ''}`}
          onClick={onBack}
        >
          {STUDIO_COPY_EN.userModeBackButton}
        </button>
        <button
          type="button"
          className={`text-xs font-medium px-2 py-1 rounded-md ds-studio-user-flow-btn${nextIdsCount <= 0 ? ' ds-studio-user-flow-btn--muted' : ''}`}
          onClick={onNextPreview}
        >
          {STUDIO_COPY_EN.userModeNextPreviewButton}
        </button>
        <button type="button" className="text-xs font-medium px-2 py-1 rounded-md ds-studio-user-flow-btn" onClick={onResetPath}>
          {STUDIO_COPY_EN.userModeResetPathButton}
        </button>
      </div>
      {userStepLanes.length > 0 && (
        <div className="pt-1 border-t ds-studio-user-flow-divider">
          <div className="text-[length:var(--text-2xs)] uppercase mb-1 ds-text-tertiary">Swimlanes by step</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="text-xs font-medium px-2 py-1 rounded-md ds-studio-user-flow-btn"
              data-studio-lane-active={activeUserStep === null ? 'true' : 'false'}
              onClick={() => onSetActiveStep(null)}
            >
              All steps
            </button>
            {userStepLanes.map(step => (
              <button
                key={step.laneId}
                type="button"
                className="text-xs font-medium px-2 py-1 rounded-md ds-studio-user-flow-btn"
                data-studio-lane-active={activeUserStep === step.stepIndex ? 'true' : 'false'}
                onClick={() => onSetActiveStep(step.stepIndex)}
                title={step.label}
              >
                {`Step ${step.stepIndex + 1} (${step.questionIds.length})`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
