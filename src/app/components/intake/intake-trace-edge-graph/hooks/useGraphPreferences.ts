import { useEffect, useState } from 'react';

import { INTAKE_TRACE_GRAPH_CONFIG } from '../config/graph-config';
import type { GraphPreferencesState, WordingScoringMode } from '../types';

function clampDepth(value: number): number {
  const range = INTAKE_TRACE_GRAPH_CONFIG.prefs.downstreamDepth;
  return Math.max(range.min, Math.min(range.max, Math.round(value)));
}

function isWordingScoringMode(value: unknown): value is WordingScoringMode {
  return value === 'strict' || value === 'normal' || value === 'lenient';
}

export function useGraphPreferences(showWordingReview: boolean) {
  const [state, setState] = useState<GraphPreferencesState>(INTAKE_TRACE_GRAPH_CONFIG.prefs.defaultState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(INTAKE_TRACE_GRAPH_CONFIG.prefs.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<GraphPreferencesState>;
      setState(prev => ({
        pathOnlyMode: typeof parsed.pathOnlyMode === 'boolean' ? parsed.pathOnlyMode : prev.pathOnlyMode,
        downstreamDepth:
          typeof parsed.downstreamDepth === 'number' ? clampDepth(parsed.downstreamDepth) : prev.downstreamDepth,
        searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : prev.searchQuery,
        showBeforeAfter:
          typeof parsed.showBeforeAfter === 'boolean' ? parsed.showBeforeAfter : prev.showBeforeAfter,
        baReviewMode: typeof parsed.baReviewMode === 'boolean' ? parsed.baReviewMode : prev.baReviewMode,
        highOnly: typeof parsed.highOnly === 'boolean' ? parsed.highOnly : prev.highOnly,
        scoringMode: isWordingScoringMode(parsed.scoringMode) ? parsed.scoringMode : prev.scoringMode,
      }));
    } catch {
      // no-op when storage is unavailable
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(INTAKE_TRACE_GRAPH_CONFIG.prefs.storageKey, JSON.stringify(state));
    } catch {
      // no-op when storage is unavailable
    }
  }, [state]);

  useEffect(() => {
    if (!showWordingReview) {
      setState(prev => ({ ...prev, baReviewMode: false }));
      return;
    }
    setState(prev => ({ ...prev, baReviewMode: true }));
  }, [showWordingReview]);

  const reset = () => {
    setState({
      ...INTAKE_TRACE_GRAPH_CONFIG.prefs.defaultState,
      baReviewMode: false,
    });
    try {
      window.localStorage.removeItem(INTAKE_TRACE_GRAPH_CONFIG.prefs.storageKey);
    } catch {
      // no-op when storage is unavailable
    }
  };

  return {
    state,
    setState,
    reset,
    clampDepth,
  };
}

