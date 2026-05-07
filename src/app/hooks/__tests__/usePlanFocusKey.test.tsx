import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PORTAL_PLAN_FOCUS_QUERY_KEY } from '../../lib/plan-cross-nav';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { usePlanFocusCanonicalToken, usePlanFocusKey, usePlanFocusPackNodeId } from '../usePlanFocusKey';

function wrapper(initialPath: string) {
  return function W({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/plan/:id" element={children} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('usePlanFocusKey', () => {
  it('usePlanFocusCanonicalToken reads focus from search params', () => {
    const { result } = renderHook(() => usePlanFocusCanonicalToken(), {
      wrapper: wrapper('/plan/a?focus=node-123'),
    });
    expect(result.current).toBe('node-123');
  });

  it('usePlanFocusKey setFocusToken updates URL (replace)', () => {
    const { result } = renderHook(() => usePlanFocusKey(), {
      wrapper: wrapper('/plan/a'),
    });
    expect(result.current.focusToken).toBeNull();
    act(() => {
      result.current.setFocusToken('  lane-x  ');
    });
    expect(result.current.focusToken).toBe('lane-x');
  });

  it('clears focus when setFocusToken(null)', () => {
    const { result } = renderHook(() => usePlanFocusKey(), {
      wrapper: wrapper(`/plan/a?${PORTAL_PLAN_FOCUS_QUERY_KEY}=old`),
    });
    expect(result.current.focusToken).toBe('old');
    act(() => {
      result.current.setFocusToken(null);
    });
    expect(result.current.focusToken).toBeNull();
  });

  it('usePlanFocusPackNodeId resolves canonical key to pack node id', () => {
    const pack = {
      graph: {
        nodes: [
          {
            id: 'node-42',
            title: 'Node 42',
            domain: 'seo_digital',
            lane: 'seo_digital',
            board_identity_key: 'seo-42',
          },
        ],
        edges: [],
      },
    } as unknown as GlcOrchestrationPackView;
    const { result } = renderHook(() => usePlanFocusPackNodeId(pack), {
      wrapper: wrapper('/plan/a?focus=seo-42'),
    });
    expect(result.current).toBe('node-42');
  });
});
