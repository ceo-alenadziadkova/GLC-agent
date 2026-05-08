import { CaretRight, Funnel, Graph } from '@phosphor-icons/react';
import type { IntakePlan } from '@glc/intake-core';
import { humanizeReason, summarizeStatus } from '../../../lib/intake-trace-humanize';

type PlanSets = {
  eligible: Set<string>;
  visible: Set<string>;
  required: Set<string>;
  hidden: Set<string>;
  deferred: Set<string>;
  sla: Set<string>;
};

function membershipClass(
  kind: 'eligible' | 'visible' | 'required' | 'hidden' | 'deferred' | 'sla',
): string {
  switch (kind) {
    case 'eligible':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
    case 'visible':
      return 'bg-sky-500/15 text-sky-200 border-sky-500/30';
    case 'required':
      return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
    case 'hidden':
      return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/35';
    case 'deferred':
      return 'bg-violet-500/15 text-violet-200 border-violet-500/30';
    case 'sla':
      return 'bg-teal-500/15 text-teal-200 border-teal-500/30';
    default:
      return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)]';
  }
}

export function TraceModeHint({ mode }: { mode: 'simple' | 'expert' }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
      <Funnel className="w-4 h-4 shrink-0" aria-hidden />
      <span>
        {mode === 'simple'
          ? 'Simple mode: question text + human-readable reasons.'
          : 'Expert mode: raw reason rows; membership chips reflect plan sets.'}
      </span>
    </div>
  );
}

export function BranchDependenciesPanel(props: {
  branchPanelRef: React.RefObject<HTMLDivElement>;
  graphFocusId: string;
  sortedIds: string[];
  resolveLabel: (id: string) => string;
  onGraphFocusIdChange: (id: string) => void;
  branchCondition?: string;
  upstream: string[];
  downstream: string[];
}) {
  const {
    branchPanelRef,
    graphFocusId,
    sortedIds,
    resolveLabel,
    onGraphFocusIdChange,
    branchCondition,
    upstream,
    downstream,
  } = props;
  return (
    <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2">
      <summary className="cursor-pointer list-none text-sm font-medium text-[var(--text-primary)] marker:content-none [&::-webkit-details-marker]:hidden flex items-center gap-2">
        <Graph className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
        Branch dependencies (canon, static graph)
      </summary>
      <div ref={branchPanelRef} className="mt-3 space-y-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-[var(--text-tertiary)]">Focus question id</span>
          <select
            className="glc-input font-mono text-xs"
            value={graphFocusId}
            onChange={event => onGraphFocusIdChange(event.target.value)}
          >
            {sortedIds.map(id => (
              <option key={id} value={id}>
                {id} — {resolveLabel(id)}
              </option>
            ))}
          </select>
        </label>
        {branchCondition ? (
          <p className="font-mono text-[var(--text-tertiary)]">
            branchCondition: <span className="text-[var(--text-primary)]">{branchCondition}</span>
          </p>
        ) : (
          <p className="text-[var(--text-tertiary)]">No branchCondition on this stub (always eligible at canon layer).</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-2">
            <div className="mb-1 text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Reads (upstream)
            </div>
            {upstream.length === 0 ? (
              <p className="text-[var(--text-tertiary)]">None (root inputs for this branch)</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs text-[var(--text-primary)]">
                {upstream.map(parent => (
                  <li key={parent}>
                    <span className="text-[var(--text-tertiary)]">{parent}</span>
                    <span className="text-[var(--text-tertiary)]"> → </span>
                    <span>{graphFocusId}</span>
                    <div className="text-[length:var(--text-2xs)] font-sans text-[var(--text-tertiary)]">
                      {resolveLabel(parent)} → {resolveLabel(graphFocusId)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-2">
            <div className="mb-1 text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Dependents (downstream)
            </div>
            {downstream.length === 0 ? (
              <p className="text-[var(--text-tertiary)]">No other stub lists this id in branch key deps</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs text-[var(--text-primary)]">
                {downstream.map(child => (
                  <li key={child}>
                    <span>{graphFocusId}</span>
                    <span className="text-[var(--text-tertiary)]"> → </span>
                    <span className="text-[var(--text-tertiary)]">{child}</span>
                    <div className="text-[length:var(--text-2xs)] font-sans text-[var(--text-tertiary)]">
                      {resolveLabel(graphFocusId)} → {resolveLabel(child)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}

export function QuestionTraceRow(props: {
  id: string;
  plan: IntakePlan;
  sets: PlanSets;
  open: boolean;
  onToggleOpen: (id: string, nextOpen: boolean) => void;
  onFocusBranch: (id: string) => void;
  resolveLabel: (id: string) => string;
  mode: 'simple' | 'expert';
}) {
  const { id, plan, sets, open, onToggleOpen, onFocusBranch, resolveLabel, mode } = props;
  const reasons = (plan.reasonsById ?? {})[id] ?? [];
  const label = resolveLabel(id);
  const statusSummary = summarizeStatus(id, sets);
  return (
    <details
      className="group border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]"
      open={open}
      onToggle={event => {
        onToggleOpen(id, event.currentTarget.open);
      }}
    >
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2 text-xs marker:content-none [&::-webkit-details-marker]:hidden">
        <CaretRight
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-open:rotate-90"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[var(--text-primary)]">{id}</span>
            {mode === 'simple' && (
              <span className="text-xs break-all text-[var(--text-tertiary)]">{label}</span>
            )}
            <button
              type="button"
              className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[length:var(--text-2xs)] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                onFocusBranch(id);
              }}
            >
              Branch links
            </button>
          </div>
          {mode === 'simple' && (
            <div className="text-xs text-[var(--text-tertiary)]">{statusSummary}</div>
          )}
          <div className="flex flex-wrap gap-1">
            {sets.eligible.has(id) && (
              <span className={`rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide ${membershipClass('eligible')}`}>
                eligible
              </span>
            )}
            {sets.visible.has(id) && (
              <span className={`rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide ${membershipClass('visible')}`}>
                visible
              </span>
            )}
            {sets.required.has(id) && (
              <span className={`rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide ${membershipClass('required')}`}>
                required
              </span>
            )}
            {sets.hidden.has(id) && (
              <span className={`rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide ${membershipClass('hidden')}`}>
                hidden
              </span>
            )}
            {sets.deferred.has(id) && (
              <span className={`rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide ${membershipClass('deferred')}`}>
                deferred
              </span>
            )}
            {sets.sla.has(id) && (
              <span className={`rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)] uppercase tracking-wide ${membershipClass('sla')}`}>
                sla visible
              </span>
            )}
          </div>
        </div>
      </summary>
      <ol className="space-y-1 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 pl-10 font-mono text-xs text-[var(--text-tertiary)]">
        {reasons.length === 0 ? (
          <li className="text-[var(--text-tertiary)]">No reason entries</li>
        ) : (
          reasons.map((reason, index) => (
            <li key={`${reason.layer}-${reason.state}-${reason.code}-${index}`}>
              {mode === 'simple' ? (
                <span className="break-words">{humanizeReason(reason)}</span>
              ) : (
                <>
                  <span className="text-[var(--text-primary)]">{reason.layer}</span>
                  <span className="text-[var(--text-tertiary)]"> / </span>
                  <span>{reason.state}</span>
                  <span className="text-[var(--text-tertiary)]"> / </span>
                  <span>{reason.code}</span>
                  {reason.detail ? (
                    <>
                      <span className="text-[var(--text-tertiary)]"> — </span>
                      <span className="break-all">{reason.detail}</span>
                    </>
                  ) : null}
                </>
              )}
            </li>
          ))
        )}
      </ol>
    </details>
  );
}
