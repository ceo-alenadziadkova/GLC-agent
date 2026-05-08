import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { STRATEGY_LAB_PAGE_ANCHORS } from '../../config/strategy-lab';
import { useStrategyLabEmbeddedScroll } from '../useStrategyLabEmbeddedScroll';

function appendAnchor(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  const scrollIntoView = vi.fn();
  Object.defineProperty(el, 'scrollIntoView', { value: scrollIntoView, configurable: true });
  document.body.appendChild(el);
  return el;
}

describe('useStrategyLabEmbeddedScroll', () => {
  const rafMock = vi.fn((cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  const cafMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', rafMock);
    vi.stubGlobal('cancelAnimationFrame', cafMock);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('scrolls to define anchor for embedded define mode with focus token', () => {
    const onSelectPackNode = vi.fn();
    const el = appendAnchor(STRATEGY_LAB_PAGE_ANCHORS.definePhase);

    renderHook(() =>
      useStrategyLabEmbeddedScroll({
        embedded: true,
        planStudioScrollTarget: 'define',
        strategyPresent: true,
        focusToken: 'seo_digital',
        packView: null,
        onSelectPackNode,
      }),
    );

    expect(onSelectPackNode).toHaveBeenCalledWith('seo_digital');
    expect((el as HTMLElement & { scrollIntoView: ReturnType<typeof vi.fn> }).scrollIntoView).toHaveBeenCalled();
  });

  it('resolves canonical focus token to pack node and scrolls shape anchor', () => {
    const onSelectPackNode = vi.fn();
    const el = appendAnchor(STRATEGY_LAB_PAGE_ANCHORS.shapePack);
    const pack = {
      graph: {
        nodes: [
          {
            id: 'node-1',
            title: 'Node 1',
            domain: 'seo_digital',
            lane: 'seo_digital',
            board_identity_key: 'seo-1',
          },
        ],
        edges: [],
      },
    } as unknown as GlcOrchestrationPackView;

    renderHook(() =>
      useStrategyLabEmbeddedScroll({
        embedded: true,
        planStudioScrollTarget: 'shape-pack',
        strategyPresent: true,
        focusToken: 'seo-1',
        packView: pack,
        onSelectPackNode,
      }),
    );

    expect(onSelectPackNode).toHaveBeenCalledWith('node-1');
    expect((el as HTMLElement & { scrollIntoView: ReturnType<typeof vi.fn> }).scrollIntoView).toHaveBeenCalled();
  });
});
