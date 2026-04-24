import { CheckCircle, ClipboardText, Globe, Eye, PaperPlaneTilt } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../config/workspace-page-copy';

const STEP_ICONS = [Globe, ClipboardText, Eye, PaperPlaneTilt] as const;

export function StepIndicator({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick?: (step: number) => void;
}) {
  const steps = [
    { label: WORKSPACE_PAGE_COPY.newAudit.wizardStepBasicsLabel, icon: STEP_ICONS[0] },
    { label: WORKSPACE_PAGE_COPY.newAudit.wizardStepBriefLabel, icon: STEP_ICONS[1] },
    { label: WORKSPACE_PAGE_COPY.newAudit.wizardStepReviewLabel, icon: STEP_ICONS[2] },
    { label: WORKSPACE_PAGE_COPY.newAudit.wizardStepLaunchLabel, icon: STEP_ICONS[3] },
  ];

  return (
    <div className="ds-new-audit-step-indicator-row">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const canNavigate = done && typeof onStepClick === 'function';
        const labelColClassName = `ds-new-audit-step-indicator-label-col ${canNavigate ? 'cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]' : ''}`;
        return (
          <div key={s.label} className="ds-new-audit-step-indicator-segment">
            {canNavigate ? (
              <button
                type="button"
                className={labelColClassName}
                onClick={() => onStepClick(i)}
                aria-label={`Go to ${s.label}`}
              >
                <div
                  className="ds-new-audit-step-indicator-circle"
                  data-state={done ? 'done' : active ? 'active' : 'idle'}
                >
                  {done
                    ? <CheckCircle weight="fill" className="h-4 w-4 text-[var(--score-5)]" />
                    : <s.icon className={`h-4 w-4 ${active ? 'text-[var(--primary-foreground)]' : 'text-[var(--text-tertiary)]'}`} />}
                </div>
                <span className="ds-new-audit-step-label" data-active={active ? 'true' : 'false'}>
                  {s.label}
                </span>
              </button>
            ) : (
              <div className={labelColClassName}>
                <div
                  className="ds-new-audit-step-indicator-circle"
                  data-state={done ? 'done' : active ? 'active' : 'idle'}
                >
                  {done
                    ? <CheckCircle weight="fill" className="h-4 w-4 text-[var(--score-5)]" />
                    : <s.icon className={`h-4 w-4 ${active ? 'text-[var(--primary-foreground)]' : 'text-[var(--text-tertiary)]'}`} />}
                </div>
                <span className="ds-new-audit-step-label" data-active={active ? 'true' : 'false'}>
                  {s.label}
                </span>
              </div>
            )}
            {i < steps.length - 1 && (
              <div
                className="ds-new-audit-step-connector"
                data-complete={i < current ? 'true' : 'false'}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
