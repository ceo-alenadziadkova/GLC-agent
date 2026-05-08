import { useMemo, useState } from 'react';

import type { IntakePlan } from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import { computeBranchDownstreamIds, computeBranchUpstreamIds } from './intake-trace-branch-links';
import { IntakeTraceEdgeGraph } from './IntakeTraceEdgeGraph';
import { collectPlanQuestionIds, tracePlanNodeStatusFor } from './domain/trace-plan-selectors';

function statusClass(status: 'required' | 'visible' | 'deferred' | 'hidden' | 'other'): string {
  switch (status) {
    case 'required':
      return 'border-amber-500/40 bg-amber-500/15';
    case 'visible':
      return 'border-sky-500/40 bg-sky-500/15';
    case 'deferred':
      return 'border-violet-500/40 bg-violet-500/15';
    case 'hidden':
      return 'border-zinc-500/40 bg-zinc-500/15';
    default:
      return 'border-[var(--border-subtle)] bg-[var(--bg-surface)]';
  }
}

export function IntakeTraceBranchMap({
  plan,
  resolveLabel,
  resolveCanonLabel,
  resolveDraftLabel,
  resolvePublishedLabel,
  showWordingReview = false,
}: {
  plan: IntakePlan;
  resolveLabel: (id: string) => string;
  resolveCanonLabel: (id: string) => string;
  resolveDraftLabel: (id: string) => string | null;
  resolvePublishedLabel?: (id: string) => string | null;
  showWordingReview?: boolean;
}) {
  const ids = useMemo(() => {
    return collectPlanQuestionIds(plan);
  }, [plan]);

  const [focusId, setFocusId] = useState(ids[0] ?? '');

  const upstream = useMemo(
    () => (focusId ? computeBranchUpstreamIds(focusId, QUESTION_BANK_V1_STUBS) : []),
    [focusId],
  );
  const downstream = useMemo(
    () => (focusId ? computeBranchDownstreamIds(focusId, QUESTION_BANK_V1_STUBS) : []),
    [focusId],
  );

  const allEdges = useMemo(() => {
    const edgeRows: Array<{ from: string; to: string }> = [];
    for (const id of ids) {
      for (const up of computeBranchUpstreamIds(id, QUESTION_BANK_V1_STUBS)) {
        edgeRows.push({ from: up, to: id });
      }
    }
    return edgeRows;
  }, [ids]);

  if (ids.length === 0) {
    return <p className="text-sm text-[var(--text-tertiary)]">No questions to map in this plan.</p>;
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Focus question</span>
        <select
          className="glc-input font-mono text-xs"
          value={focusId}
          onChange={e => setFocusId(e.target.value)}
        >
          {ids.map(id => (
            <option key={id} value={id}>
              {id} — {resolveLabel(id)}
            </option>
          ))}
        </select>
      </label>

      <IntakeTraceEdgeGraph
        plan={plan}
        resolveLabel={resolveLabel}
        resolveCanonLabel={resolveCanonLabel}
        resolveDraftLabel={resolveDraftLabel}
        resolvePublishedLabel={resolvePublishedLabel}
        focusId={focusId}
        onFocusIdChange={setFocusId}
        showWordingReview={showWordingReview}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3">
          <div className="mb-2 text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--text-tertiary)]">Upstream (reads)</div>
          <ul className="space-y-1 text-xs">
            {upstream.length === 0 ? (
              <li className="text-[var(--text-tertiary)]">No upstream dependency</li>
            ) : (
              upstream.map(id => (
                <li key={id} className={`rounded border px-2 py-1 ${statusClass(tracePlanNodeStatusFor(id, plan))}`}>
                  <span className="font-mono">{id}</span>
                  <span className="text-[var(--text-tertiary)]"> — {resolveLabel(id)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className={`rounded-lg border p-3 ${statusClass(tracePlanNodeStatusFor(focusId, plan))}`}>
          <div className="mb-2 text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--text-tertiary)]">Current node</div>
          <div className="text-xs">
            <div className="font-mono">{focusId}</div>
            <div className="text-[var(--text-tertiary)]">{resolveLabel(focusId)}</div>
            <div className="mt-2 text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
              status: {tracePlanNodeStatusFor(focusId, plan)}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3">
          <div className="mb-2 text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--text-tertiary)]">Downstream (dependents)</div>
          <ul className="space-y-1 text-xs">
            {downstream.length === 0 ? (
              <li className="text-[var(--text-tertiary)]">No downstream dependency</li>
            ) : (
              downstream.map(id => (
                <li key={id} className={`rounded border px-2 py-1 ${statusClass(tracePlanNodeStatusFor(id, plan))}`}>
                  <span className="font-mono">{id}</span>
                  <span className="text-[var(--text-tertiary)]"> — {resolveLabel(id)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3">
        <summary className="cursor-pointer text-sm font-medium">All branch edges ({allEdges.length})</summary>
        <ul className="mt-3 max-h-56 overflow-y-auto space-y-1 text-xs font-mono">
          {allEdges.length === 0 ? (
            <li className="font-sans text-[var(--text-tertiary)]">No branch edges in current slice.</li>
          ) : (
            allEdges.map((e, i) => (
              <li key={`${e.from}-${e.to}-${i}`}>
                {e.from} {'->'} {e.to}
                <span className="font-sans text-[var(--text-tertiary)]">
                  {' '}
                  ({resolveLabel(e.from)} {'->'} {resolveLabel(e.to)})
                </span>
              </li>
            ))
          )}
        </ul>
      </details>
    </div>
  );
}
