import { useCallback, useEffect, useMemo, useState } from 'react';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakePlan, QuestionReason } from '@glc/intake-core';
import { computeBranchDownstreamIds, computeBranchUpstreamIds } from '../intake-trace-branch-links';
import { TRACE_LAYERS } from './config';
import {
  selectDebugTrace,
  selectFilteredQuestionIds,
  selectSortedQuestionIds,
  toggleValueInSet,
} from './selectors';

export function useTraceFilters(plan: IntakePlan) {
  const [query, setQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState<Set<QuestionReason['layer']>>(
    () => new Set(TRACE_LAYERS),
  );
  const [stateFilter, setStateFilter] = useState<Set<QuestionReason['state']>>(() => new Set());

  const sortedIds = useMemo(() => selectSortedQuestionIds(plan), [plan]);
  const filteredIds = useMemo(
    () =>
      selectFilteredQuestionIds({
        sortedIds,
        reasonsById: plan.reasonsById,
        query,
        layerFilter,
        stateFilter,
      }),
    [sortedIds, plan.reasonsById, query, layerFilter, stateFilter],
  );
  const debugFiltered = useMemo(() => selectDebugTrace(plan, query), [plan, query]);

  const resetFilters = useCallback(() => {
    setQuery('');
    setLayerFilter(new Set(TRACE_LAYERS));
    setStateFilter(new Set());
  }, []);

  const toggleLayer = useCallback((layer: QuestionReason['layer']) => {
    setLayerFilter(prev => {
      const next = toggleValueInSet(prev, layer, !prev.has(layer));
      if (next.size === 0) return new Set(TRACE_LAYERS);
      return next;
    });
  }, []);

  const toggleState = useCallback((state: QuestionReason['state']) => {
    setStateFilter(prev => toggleValueInSet(prev, state, !prev.has(state)));
  }, []);

  return {
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
  };
}

export function useExpandedRows(filteredIds: string[]) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

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

  const handleRowToggle = useCallback((id: string, nextOpen: boolean) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (nextOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const expandAllVisible = useCallback(() => {
    setExpandedIds(new Set(filteredIds));
  }, [filteredIds]);

  const collapseAllRows = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return { expandedIds, handleRowToggle, expandAllVisible, collapseAllRows };
}

export function useBranchFocus() {
  const [graphFocusId, setGraphFocusId] = useState<string>(() => QUESTION_BANK_V1_STUBS[0]?.id ?? '');
  const upstream = useMemo(
    () => (graphFocusId ? computeBranchUpstreamIds(graphFocusId, QUESTION_BANK_V1_STUBS) : []),
    [graphFocusId],
  );
  const downstream = useMemo(
    () => (graphFocusId ? computeBranchDownstreamIds(graphFocusId, QUESTION_BANK_V1_STUBS) : []),
    [graphFocusId],
  );
  const stubForGraph = useMemo(
    () => QUESTION_BANK_V1_STUBS.find(stub => stub.id === graphFocusId),
    [graphFocusId],
  );

  return { graphFocusId, setGraphFocusId, upstream, downstream, stubForGraph };
}
