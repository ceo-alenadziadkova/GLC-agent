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
    <div
      className="rounded-lg px-3 py-2 space-y-2 text-xs ds-panel-canvas"
      
    >
      <div className="text-[length:var(--text-2xs)] font-semibold uppercase ds-text-tertiary" >
        Breadcrumbs (current path)
      </div>
      <div style={{ color: 'var(--text-secondary)' }}>
        {breadcrumbs.length > 0 ? breadcrumbs.map(id => `${shortUserLabel(id)} (${id})`).join(' -> ') : STUDIO_COPY_EN.userModeSelectQuestionHint}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: pathHistory.length > 1 ? 'pointer' : 'not-allowed',
            opacity: pathHistory.length > 1 ? 1 : 0.5,
          }}
          onClick={onBack}
        >
          {STUDIO_COPY_EN.userModeBackButton}
        </button>
        <button
          type="button"
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: nextIdsCount > 0 ? 'pointer' : 'not-allowed',
            opacity: nextIdsCount > 0 ? 1 : 0.5,
          }}
          onClick={onNextPreview}
        >
          {STUDIO_COPY_EN.userModeNextPreviewButton}
        </button>
        <button
          type="button"
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          onClick={onResetPath}
        >
          {STUDIO_COPY_EN.userModeResetPathButton}
        </button>
      </div>
      {userStepLanes.length > 0 && (
        <div className="pt-1 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <div className="text-[length:var(--text-2xs)] uppercase mb-1 ds-text-tertiary" >
            Swimlanes by step
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="text-xs font-medium px-2 py-1 rounded-md"
              style={{
                border: '1px solid var(--border-default)',
                backgroundColor: activeUserStep === null ? 'var(--glc-blue-muted)' : 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onClick={() => onSetActiveStep(null)}
            >
              All steps
            </button>
            {userStepLanes.map(step => (
              <button
                key={step.laneId}
                type="button"
                className="text-xs font-medium px-2 py-1 rounded-md"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: activeUserStep === step.stepIndex ? 'var(--glc-blue-muted)' : 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
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
