import { useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router';

import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';
import {
  ORCHESTRATION_LAB_FOCUS_QUERY_KEY,
  ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE,
  ORCHESTRATION_PANEL_DOM_ID,
  ORCHESTRATION_UI_LIMITS,
} from '../config/orchestration-ui-limits';

type SearchParamsLike = { get: (k: string) => string | null };

/**
 * When the Strategy Lab URL requests roadmap focus (`?focus=roadmap`), scroll the orchestration panel
 * into view and strip the param (consultant-only, feature-flagged).
 */
export function useOrchestrationFocusScroll(args: {
  searchParams: SearchParamsLike;
  setSearchParams: SetURLSearchParams;
  isClient: boolean;
}): void {
  const { searchParams, setSearchParams, isClient } = args;

  useEffect(() => {
    const focus = searchParams.get(ORCHESTRATION_LAB_FOCUS_QUERY_KEY);
    if (
      focus !== ORCHESTRATION_LAB_FOCUS_ROADMAP_VALUE ||
      !APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled ||
      isClient
    ) {
      return;
    }
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete(ORCHESTRATION_LAB_FOCUS_QUERY_KEY);
        return next;
      },
      { replace: true },
    );

    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    let detachTimer: ReturnType<typeof window.setTimeout> | undefined;

    const scrollPanelIntoView = () => {
      document.getElementById(ORCHESTRATION_PANEL_DOM_ID)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    };

    window.requestAnimationFrame(() => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        let locateAttempts = 0;
        const maxLocateAttempts = 60;

        const tryLocatePanel = (): void => {
          if (cancelled) return;
          const el = document.getElementById(ORCHESTRATION_PANEL_DOM_ID);
          if (!el) {
            locateAttempts += 1;
            if (locateAttempts < maxLocateAttempts) {
              window.requestAnimationFrame(tryLocatePanel);
            }
            return;
          }
          scrollPanelIntoView();
          if (typeof IntersectionObserver === 'undefined') return;
          observer = new IntersectionObserver(
            entries => {
              if (cancelled || !entries[0]) return;
              if (!entries[0].isIntersecting) {
                scrollPanelIntoView();
              }
            },
            { root: null, threshold: 0.01 },
          );
          observer.observe(el);
          detachTimer = window.setTimeout(() => {
            if (cancelled) return;
            observer?.disconnect();
            observer = undefined;
          }, ORCHESTRATION_UI_LIMITS.orchestrationFocusScrollIntersectionWatchMs);
        };

        tryLocatePanel();
      });
    });

    return () => {
      cancelled = true;
      if (detachTimer != null) window.clearTimeout(detachTimer);
      observer?.disconnect();
    };
  }, [searchParams, setSearchParams, isClient]);
}
