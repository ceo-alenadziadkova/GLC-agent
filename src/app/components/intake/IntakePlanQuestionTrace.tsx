import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CaretRight, Funnel, Graph } from '@phosphor-icons/react';

import type { IntakePlan, QuestionReason } from '../../../../server/src/intake/core/types';
import { QUESTION_BANK_V1_STUBS } from '../../../../server/src/intake/question-bank';
import { computeBranchDownstreamIds, computeBranchUpstreamIds } from './intake-trace-branch-links';

const LAYERS: QuestionReason['layer'][] = ['canon', 'policy', 'layout'];
const STATES: QuestionReason['state'][] = ['eligible', 'hidden', 'visible', 'deferred', 'required'];
/** Use virtual scroll when at or above this count (collapsed row height is approximate). */
const VIRTUALIZE_COUNT = 20;

function toggleInSet<T>(set: Set<T>, v: T, on: boolean): Set<T> {
  const next = new Set(set);
  if (on) next.add(v);
  else next.delete(v);
  return next;
}

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
      return 'bg-[var(--glc-surface)] text-[var(--glc-fg)] border-[var(--glc-border)]';
  }
}

type PlanSets = ReturnType<typeof buildSets>;

function buildSets(plan: IntakePlan) {
  return {
    eligible: new Set(plan.eligible),
    visible: new Set(plan.visible),
    required: new Set(plan.required),
    hidden: new Set(plan.hidden),
    deferred: new Set(plan.deferred),
    sla: new Set(plan.slaVisibleBankIds),
  };
}

function QuestionTraceRow({
  id,
  plan,
  sets,
  open,
  onToggleOpen,
  onFocusBranch,
}: {
  id: string;
  plan: IntakePlan;
  sets: PlanSets;
  open: boolean;
  onToggleOpen: (id: string, nextOpen: boolean) => void;
  onFocusBranch: (id: string) => void;
}) {
  const reasons = (plan.reasonsById ?? {})[id] ?? [];
  return (
    <details
      className="group border-b border-[var(--glc-border)] bg-[var(--glc-surface-2)]"
      open={open}
      onToggle={e => {
        onToggleOpen(id, e.currentTarget.open);
      }}
    >
      <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-2 text-xs marker:content-none [&::-webkit-details-marker]:hidden">
        <CaretRight
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--glc-muted)] transition-transform group-open:rotate-90"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[var(--glc-fg)]">{id}</span>
            <button
              type="button"
              className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--glc-muted)] hover:text-[var(--glc-fg)]"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onFocusBranch(id);
              }}
            >
              Branch links
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {sets.eligible.has(id) && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${membershipClass('eligible')}`}
              >
                eligible
              </span>
            )}
            {sets.visible.has(id) && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${membershipClass('visible')}`}
              >
                visible
              </span>
            )}
            {sets.required.has(id) && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${membershipClass('required')}`}
              >
                required
              </span>
            )}
            {sets.hidden.has(id) && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${membershipClass('hidden')}`}
              >
                hidden
              </span>
            )}
            {sets.deferred.has(id) && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${membershipClass('deferred')}`}
              >
                deferred
              </span>
            )}
            {sets.sla.has(id) && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${membershipClass('sla')}`}
              >
                sla visible
              </span>
            )}
          </div>
        </div>
      </summary>
      <ol className="space-y-1 border-t border-[var(--glc-border)] bg-[var(--glc-surface)] px-3 py-2 pl-10 font-mono text-[11px] text-[var(--glc-muted)]">
        {reasons.length === 0 ? (
          <li className="text-[var(--glc-muted)]">No reason entries</li>
        ) : (
          reasons.map((r, i) => (
            <li key={`${r.layer}-${r.state}-${r.code}-${i}`}>
              <span className="text-[var(--glc-fg)]">{r.layer}</span>
              <span className="text-[var(--glc-muted)]"> / </span>
              <span>{r.state}</span>
              <span className="text-[var(--glc-muted)]"> / </span>
              <span>{r.code}</span>
              {r.detail ? (
                <>
                  <span className="text-[var(--glc-muted)]"> — </span>
                  <span className="break-all">{r.detail}</span>
                </>
              ) : null}
            </li>
          ))
        )}
      </ol>
    </details>
  );
}

export function IntakePlanQuestionTrace({ plan }: { plan: IntakePlan }) {
  const [query, setQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState<Set<QuestionReason['layer']>>(
    () => new Set(LAYERS),
  );
  const [stateFilter, setStateFilter] = useState<Set<QuestionReason['state']>>(() => new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [graphFocusId, setGraphFocusId] = useState<string>(() => QUESTION_BANK_V1_STUBS[0]?.id ?? '');

  const branchPanelRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const sets = useMemo(() => buildSets(plan), [plan]);

  const sortedIds = useMemo(() => {
    const reasons = plan.reasonsById ?? {};
    return Object.keys(reasons).sort((a, b) => a.localeCompare(b));
  }, [plan.reasonsById]);

  const filteredIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    const reasons = plan.reasonsById ?? {};
    return sortedIds.filter(id => {
      if (q && !id.toLowerCase().includes(q)) return false;
      const entries = reasons[id];
      if (!entries?.length) return q.length === 0;
      const layerOk = entries.some(r => layerFilter.has(r.layer));
      if (!layerOk) return false;
      if (stateFilter.size > 0) {
        return entries.some(r => stateFilter.has(r.state));
      }
      return true;
    });
  }, [sortedIds, plan.reasonsById, query, layerFilter, stateFilter]);

  useEffect(() => {
    setExpandedIds(prev => {
      const allowed = new Set(filteredIds);
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      if (next.size !== prev.size) changed = true;
      return changed ? next : prev;
    });
  }, [filteredIds]);

  const debugFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = plan.debugTrace ?? [];
    if (!q) return entries;
    return entries.filter(
      e =>
        e.code.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.layer.toLowerCase().includes(q),
    );
  }, [plan.debugTrace, query]);

  const upstream = useMemo(
    () => (graphFocusId ? computeBranchUpstreamIds(graphFocusId, QUESTION_BANK_V1_STUBS) : []),
    [graphFocusId],
  );
  const downstream = useMemo(
    () =>
      graphFocusId ? computeBranchDownstreamIds(graphFocusId, QUESTION_BANK_V1_STUBS) : [],
    [graphFocusId],
  );

  const stubForGraph = useMemo(
    () => QUESTION_BANK_V1_STUBS.find(s => s.id === graphFocusId),
    [graphFocusId],
  );

  const useVirtual = filteredIds.length >= VIRTUALIZE_COUNT;

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filteredIds.length : 0,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  const handleRowToggle = useCallback((id: string, nextOpen: boolean) => {
    setExpandedIds(prev => {
      const n = new Set(prev);
      if (nextOpen) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const focusBranch = useCallback((id: string) => {
    setGraphFocusId(id);
    requestAnimationFrame(() => {
      branchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const resetFilters = useCallback(() => {
    setQuery('');
    setLayerFilter(new Set(LAYERS));
    setStateFilter(new Set());
  }, []);

  const expandAllVisible = useCallback(() => {
    setExpandedIds(new Set(filteredIds));
  }, [filteredIds]);

  const collapseAllRows = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const toggleLayer = (layer: QuestionReason['layer']) => {
    setLayerFilter(prev => {
      const next = toggleInSet(prev, layer, !prev.has(layer));
      if (next.size === 0) return new Set(LAYERS);
      return next;
    });
  };

  const toggleState = (state: QuestionReason['state']) => {
    setStateFilter(prev => {
      const next = toggleInSet(prev, state, !prev.has(state));
      return next;
    });
  };

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--glc-border)] pb-3">
      <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={resetFilters}>
        Reset filters
      </button>
      <button
        type="button"
        className="glc-btn-secondary text-xs px-2 py-1"
        onClick={expandAllVisible}
        disabled={filteredIds.length === 0}
      >
        Expand all (visible list)
      </button>
      <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={collapseAllRows}>
        Collapse all
      </button>
      {useVirtual && (
        <span className="text-[10px] text-[var(--glc-muted)]">Virtual scroll on ({filteredIds.length} rows)</span>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--glc-muted)]">
        <Funnel className="w-4 h-4 shrink-0" aria-hidden />
        <span>Filter reasons; membership chips reflect plan sets.</span>
      </div>

      {filterBar}

      <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface)] px-3 py-2">
        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--glc-fg)] marker:content-none [&::-webkit-details-marker]:hidden flex items-center gap-2">
          <Graph className="h-4 w-4 text-[var(--glc-muted)]" aria-hidden />
          Branch dependencies (canon, static graph)
        </summary>
        <div ref={branchPanelRef} className="mt-3 space-y-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-[var(--glc-muted)]">Focus question id</span>
            <select
              className="glc-input font-mono text-xs"
              value={graphFocusId}
              onChange={e => setGraphFocusId(e.target.value)}
            >
              {sortedIds.map(id => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          {stubForGraph?.branchCondition ? (
            <p className="font-mono text-[var(--glc-muted)]">
              branchCondition: <span className="text-[var(--glc-fg)]">{stubForGraph.branchCondition}</span>
            </p>
          ) : (
            <p className="text-[var(--glc-muted)]">No branchCondition on this stub (always eligible at canon layer).</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-2">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--glc-muted)]">
                Reads (upstream)
              </div>
              {upstream.length === 0 ? (
                <p className="text-[var(--glc-muted)]">None (root inputs for this branch)</p>
              ) : (
                <ul className="space-y-1 font-mono text-[11px] text-[var(--glc-fg)]">
                  {upstream.map(p => (
                    <li key={p}>
                      <span className="text-[var(--glc-muted)]">{p}</span>
                      <span className="text-[var(--glc-muted)]"> → </span>
                      <span>{graphFocusId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-2">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--glc-muted)]">
                Dependents (downstream)
              </div>
              {downstream.length === 0 ? (
                <p className="text-[var(--glc-muted)]">No other stub lists this id in branch key deps</p>
              ) : (
                <ul className="space-y-1 font-mono text-[11px] text-[var(--glc-fg)]">
                  {downstream.map(c => (
                    <li key={c}>
                      <span>{graphFocusId}</span>
                      <span className="text-[var(--glc-muted)]"> → </span>
                      <span className="text-[var(--glc-muted)]">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </details>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--glc-fg)]">Question id contains</span>
        <input
          type="search"
          className="glc-input font-mono text-xs"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. c_nosite or a5"
          autoComplete="off"
        />
      </label>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--glc-muted)]">Layer (reason row)</div>
        <div className="flex flex-wrap gap-2">
          {LAYERS.map(layer => (
            <button
              key={layer}
              type="button"
              className={`rounded-md border px-2 py-1 text-xs font-mono transition-colors ${
                layerFilter.has(layer)
                  ? 'border-[var(--glc-accent)] bg-[var(--glc-accent)]/15 text-[var(--glc-fg)]'
                  : 'border-[var(--glc-border)] text-[var(--glc-muted)] hover:bg-[var(--glc-surface)]'
              }`}
              onClick={() => toggleLayer(layer)}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-[var(--glc-muted)]">
          State (row matches if any reason has selected state; none selected = no state filter)
        </div>
        <div className="flex flex-wrap gap-2">
          {STATES.map(state => {
            const highlight = stateFilter.size > 0 && stateFilter.has(state);
            return (
              <button
                key={state}
                type="button"
                className={`rounded-md border px-2 py-1 text-xs font-mono transition-colors ${
                  highlight
                    ? 'border-[var(--glc-accent)] bg-[var(--glc-accent)]/10 text-[var(--glc-fg)]'
                    : stateFilter.size === 0
                      ? 'border-[var(--glc-border)] text-[var(--glc-muted)] hover:bg-[var(--glc-surface)]'
                      : 'border-[var(--glc-border)] text-[var(--glc-muted)] opacity-50'
                }`}
                onClick={() => toggleState(state)}
              >
                {state}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-[var(--glc-muted)]">
        Showing {filteredIds.length} of {sortedIds.length} question ids
      </div>

      <div
        ref={scrollParentRef}
        className="max-h-[min(70vh,560px)] overflow-y-auto rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)]"
      >
        {filteredIds.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-[var(--glc-muted)]">
            No questions match filters.
          </div>
        ) : useVirtual ? (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map(vRow => {
              const id = filteredIds[vRow.index];
              return (
                <div
                  key={id}
                  ref={rowVirtualizer.measureElement}
                  data-index={vRow.index}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${vRow.start}px)` }}
                >
                  <QuestionTraceRow
                    id={id}
                    plan={plan}
                    sets={sets}
                    open={expandedIds.has(id)}
                    onToggleOpen={handleRowToggle}
                    onFocusBranch={focusBranch}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {filteredIds.map(id => (
              <QuestionTraceRow
                key={id}
                id={id}
                plan={plan}
                sets={sets}
                open={expandedIds.has(id)}
                onToggleOpen={handleRowToggle}
                onFocusBranch={focusBranch}
              />
            ))}
          </div>
        )}
      </div>

      {(plan.debugTrace?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[var(--glc-fg)]">Resolver debug trace</div>
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-2 font-mono text-[11px] text-[var(--glc-muted)]">
            {debugFiltered.map((e, i) => (
              <li key={`${e.code}-${i}`} className="border-b border-[var(--glc-border)] py-1 last:border-0">
                <span className="text-[var(--glc-fg)]">[{e.layer}]</span> {e.level.toUpperCase()} {e.code}
                : {e.message}
              </li>
            ))}
          </ul>
          {query.trim() && debugFiltered.length === 0 && (
            <p className="text-xs text-[var(--glc-muted)]">No debug lines match search.</p>
          )}
        </div>
      )}
    </div>
  );
}
