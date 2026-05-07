import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PLAN_WORKSPACE_MODE_QUERY_KEY } from '../../config/plan-workspace-mode';
import { usePlanWorkspaceMode } from '../usePlanWorkspaceMode';

function createWrapper(initialPath: string, pathPattern: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={pathPattern} element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('usePlanWorkspaceMode', () => {
  it('defaults to execute on delivery path', () => {
    const { result } = renderHook(() => usePlanWorkspaceMode(), {
      wrapper: createWrapper('/plan/audit-1/board', '/plan/:id/board'),
    });
    expect(result.current.mode).toBe('execute');
  });

  it('reads define from query on studio path', () => {
    const { result } = renderHook(() => usePlanWorkspaceMode(), {
      wrapper: createWrapper(`/lab/audit-1?${PLAN_WORKSPACE_MODE_QUERY_KEY}=define`, '/lab/:id'),
    });
    expect(result.current.mode).toBe('define');
  });

  it('setMode navigates to studio for shape', async () => {
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <MemoryRouter initialEntries={['/plan/audit-1/board']}>
          <Routes>
            <Route path="/plan/:id/board" element={<>{children}</>} />
            <Route path="/lab/:id" element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      );
    }
    const { result } = renderHook(() => usePlanWorkspaceMode(), { wrapper: Wrapper });
    expect(result.current.mode).toBe('execute');
    act(() => {
      result.current.setMode('shape');
    });
    await waitFor(() => expect(result.current.mode).toBe('shape'));
  });
});
