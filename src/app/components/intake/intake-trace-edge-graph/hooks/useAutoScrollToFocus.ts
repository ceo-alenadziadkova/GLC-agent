import { useEffect } from 'react';
import type { RefObject } from 'react';

import { INTAKE_TRACE_GRAPH_CONFIG } from '../config/graph-config';
import type { GraphLayout } from '../types';

export function useAutoScrollToFocus(
  focusId: string,
  containerRef: RefObject<HTMLDivElement | null>,
  layout: GraphLayout,
) {
  useEffect(() => {
    if (!focusId) return;
    const container = containerRef.current;
    const position = layout.positions.get(focusId);
    if (!container || !position) return;
    container.scrollTo({
      left: Math.max(0, position.x - INTAKE_TRACE_GRAPH_CONFIG.layout.focusScrollOffsetX),
      top: Math.max(0, position.y - INTAKE_TRACE_GRAPH_CONFIG.layout.focusScrollOffsetY),
      behavior: 'smooth',
    });
  }, [focusId, containerRef, layout.positions]);
}

