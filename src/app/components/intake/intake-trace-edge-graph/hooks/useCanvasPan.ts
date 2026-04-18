import { useRef } from 'react';
import type { RefObject } from 'react';

import type { MouseEventHandler } from 'react';

interface DragState {
  dragging: boolean;
  x: number;
  y: number;
  left: number;
  top: number;
}

export function useCanvasPan(containerRef: RefObject<HTMLDivElement | null>) {
  const dragStateRef = useRef<DragState>({
    dragging: false,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
  });

  const onMouseDown: MouseEventHandler<HTMLDivElement> = event => {
    const container = containerRef.current;
    if (!container) return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('g[role="button"]')) return;

    dragStateRef.current = {
      dragging: true,
      x: event.clientX,
      y: event.clientY,
      left: container.scrollLeft,
      top: container.scrollTop,
    };
  };

  const onMouseMove: MouseEventHandler<HTMLDivElement> = event => {
    const container = containerRef.current;
    const dragState = dragStateRef.current;
    if (!container || !dragState.dragging) return;
    container.scrollLeft = dragState.left - (event.clientX - dragState.x);
    container.scrollTop = dragState.top - (event.clientY - dragState.y);
  };

  const onMouseUp: MouseEventHandler<HTMLDivElement> = () => {
    dragStateRef.current.dragging = false;
  };

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}

