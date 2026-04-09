import { useMemo, useState } from 'react';

import type { IntakePlan } from '../../../../server/src/intake/core/types';

function setDiff(next: string[], prev: string[]): string[] {
  const prevSet = new Set(prev);
  return next.filter(id => !prevSet.has(id));
}

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export function IntakeTraceJourney({
  plan,
  resolveLabel,
}: {
  plan: IntakePlan;
  resolveLabel: (id: string) => string;
}) {
  const fallbackSteps = useMemo(() => {
    const requiredFirst = uniqueSorted(plan.required);
    const visibleRest = uniqueSorted(plan.visible.filter(id => !new Set(requiredFirst).has(id)));
    const deferred = uniqueSorted(plan.deferred);
    return [
      { stepId: 'required_now', label: 'Required now', questionIds: requiredFirst },
      { stepId: 'visible_optional', label: 'Shown now', questionIds: visibleRest },
      { stepId: 'deferred_later', label: 'Deferred for later', questionIds: deferred },
    ].filter(s => s.questionIds.length > 0);
  }, [plan.required, plan.visible, plan.deferred]);

  const steps = (plan.stepPlan?.length ?? 0) > 0 ? plan.stepPlan! : fallbackSteps;
  const [index, setIndex] = useState(0);

  const current = steps[index];
  const prev = index > 0 ? steps[index - 1] : undefined;

  const newlyShown = useMemo(
    () => (prev ? setDiff(current.questionIds, prev.questionIds) : current.questionIds),
    [current.questionIds, prev],
  );
  const noLongerShown = useMemo(
    () => (prev ? setDiff(prev.questionIds, current.questionIds) : []),
    [current.questionIds, prev],
  );

  if (!current) {
    return <p className="text-sm text-[var(--glc-muted)]">No journey steps available for this plan.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-[var(--glc-muted)]">
          Step {index + 1} of {steps.length}
        </label>
        <input
          type="range"
          min={0}
          max={Math.max(steps.length - 1, 0)}
          value={index}
          onChange={e => setIndex(Number(e.target.value))}
          className="w-[260px]"
        />
        <div className="text-sm">
          <span className="font-medium">{current.label ?? current.stepId}</span>
          <span className="text-[var(--glc-muted)]"> ({current.stepId})</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--glc-muted)] mb-2">Shown in this step</div>
          <ul className="space-y-1 text-xs">
            {current.questionIds.map(id => (
              <li key={id}>
                <span className="font-mono">{id}</span>
                <span className="text-[var(--glc-muted)]"> — {resolveLabel(id)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--glc-muted)] mb-2">Newly shown vs previous</div>
          <ul className="space-y-1 text-xs">
            {newlyShown.length === 0 ? (
              <li className="text-[var(--glc-muted)]">No additions</li>
            ) : (
              newlyShown.map(id => (
                <li key={id}>
                  <span className="font-mono">{id}</span>
                  <span className="text-[var(--glc-muted)]"> — {resolveLabel(id)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--glc-muted)] mb-2">No longer shown</div>
          <ul className="space-y-1 text-xs">
            {noLongerShown.length === 0 ? (
              <li className="text-[var(--glc-muted)]">No removals</li>
            ) : (
              noLongerShown.map(id => (
                <li key={id}>
                  <span className="font-mono">{id}</span>
                  <span className="text-[var(--glc-muted)]"> — {resolveLabel(id)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
