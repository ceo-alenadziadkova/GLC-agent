import { useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { IntakePlan } from '@glc/intake-core';
import { Button } from '../../components/ui/button';
import {
  TRACE_LAYERS,
  TRACE_STATES,
  TRACE_VIRTUALIZER_CONFIG,
} from './intake-plan-question-trace/config';
import {
  buildPlanSets,
} from './intake-plan-question-trace/selectors';
import { useBranchFocus, useExpandedRows, useTraceFilters } from './intake-plan-question-trace/hooks';
import { BranchDependenciesPanel, QuestionTraceRow, TraceModeHint } from './intake-plan-question-trace/presenters';

export function IntakePlanQuestionTrace({
  plan,
  mode = 'expert',
  resolveLabel = id => id,
}: {
  plan: IntakePlan;
  mode?: 'simple' | 'expert';
  resolveLabel?: (id: string) => string;
}) {
  const branchPanelRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const sets = useMemo(() => buildPlanSets(plan), [plan]);
  const {
    query,
    setQuery,
    layerFilter,
    stateFilter,
    sortedIds,
    filteredIds,
    debugFiltered,
    resetFilters,
    toggleLayer,
    toggleState,
  } = useTraceFilters(plan);
  const { expandedIds, handleRowToggle, expandAllVisible, collapseAllRows } = useExpandedRows(filteredIds);
  const { graphFocusId, setGraphFocusId, upstream, downstream, stubForGraph } = useBranchFocus();

  const useVirtual = filteredIds.length >= TRACE_VIRTUALIZER_CONFIG.rowThreshold;

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? filteredIds.length : 0,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => TRACE_VIRTUALIZER_CONFIG.estimateSizePx,
    overscan: TRACE_VIRTUALIZER_CONFIG.overscanRows,
  });

  const focusBranch = useCallback((id: string) => {
    setGraphFocusId(id);
    requestAnimationFrame(() => {
      branchPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [setGraphFocusId]);

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--glc-border)] pb-3">
      <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={resetFilters}>
        Reset filters
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto px-2 py-1 text-xs"
        onClick={expandAllVisible}
        disabled={filteredIds.length === 0}
      >
        Expand all (visible list)
      </Button>
      <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={collapseAllRows}>
        Collapse all
      </Button>
      {useVirtual && (
        <span className="text-[length:var(--text-2xs)] text-[var(--glc-muted)]">Virtual scroll on ({filteredIds.length} rows)</span>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <TraceModeHint mode={mode} />

      {filterBar}

      <BranchDependenciesPanel
        branchPanelRef={branchPanelRef}
        graphFocusId={graphFocusId}
        sortedIds={sortedIds}
        resolveLabel={resolveLabel}
        onGraphFocusIdChange={setGraphFocusId}
        branchCondition={stubForGraph?.branchCondition}
        upstream={upstream}
        downstream={downstream}
      />

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
          {TRACE_LAYERS.map(layer => (
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
          {TRACE_STATES.map(state => {
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
                    resolveLabel={resolveLabel}
                    mode={mode}
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
                resolveLabel={resolveLabel}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>

      {(plan.debugTrace?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-[var(--glc-fg)]">Resolver debug trace</div>
          <ul className="max-h-48 overflow-y-auto rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-2 font-mono text-xs text-[var(--glc-muted)]">
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
