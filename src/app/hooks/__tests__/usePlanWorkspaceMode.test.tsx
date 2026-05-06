import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PLAN_WORKSPACE_MODE_QUERY_KEY } from '../../config/plan-workspace-mode';
import { usePlanWorkspaceMode } from '../usePlanWorkspaceMode';

function createWrapper(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/plan/:id" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('usePlanWorkspaceMode', () => {
  it('defaults to execute when mode query is absent', () => {
    const { result } = renderHook(() => usePlanWorkspaceMode(), {
      wrapper: createWrapper('/plan/audit-1'),
    });
    expect(result.current.mode).toBe('execute');
  });

  it('reads define from query', () => {
    const { result } = renderHook(() => usePlanWorkspaceMode(), {
      wrapper: createWrapper(`/plan/audit-1?${PLAN_WORKSPACE_MODE_QUERY_KEY}=define`),
    });
    expect(result.current.mode).toBe('define');
  });

  it('setMode updates mode in search params', () => {
    const { result } = renderHook(() => usePlanWorkspaceMode(), {
      wrapper: createWrapper('/plan/audit-1'),
    });
    act(() => {
      result.current.setMode('shape');
    });
    expect(result.current.mode).toBe('shape');
  });
});
