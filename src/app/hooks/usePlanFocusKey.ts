import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { PORTAL_PLAN_FOCUS_QUERY_KEY } from '../lib/plan-cross-nav';
import { resolvePlanFocusToPackGraphNodeId } from '../lib/plan-cross-nav';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

/** Normalized `?focus=` token for Plan surfaces (Board / Roadmap / future Table). */
export function usePlanFocusCanonicalToken(): string | null {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  return raw != null && raw.trim() !== '' ? raw.trim() : null;
}

/** Shared resolver for Roadmap focus selection (`canonical_node_key` -> `pack_graph_node.id`). */
export function usePlanFocusPackNodeId(pack: GlcOrchestrationPackView | null | undefined): string | null {
  const focusToken = usePlanFocusCanonicalToken();
  return useMemo(() => resolvePlanFocusToPackGraphNodeId(focusToken, pack), [focusToken, pack]);
}

export type UsePlanFocusKeyResult = {
  focusToken: string | null;
  setFocusToken: (next: string | null) => void;
};

/** Read/write canonical `focus` query param (replace navigation, preserves other params). */
export function usePlanFocusKey(): UsePlanFocusKeyResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(PORTAL_PLAN_FOCUS_QUERY_KEY);
  const focusToken = raw != null && raw.trim() !== '' ? raw.trim() : null;

  const setFocusToken = useCallback(
    (next: string | null) => {
      setSearchParams(
        prev => {
          const n = new URLSearchParams(prev);
          const t = next?.trim();
          if (t) {
            n.set(PORTAL_PLAN_FOCUS_QUERY_KEY, t);
          } else {
            n.delete(PORTAL_PLAN_FOCUS_QUERY_KEY);
          }
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { focusToken, setFocusToken };
}
