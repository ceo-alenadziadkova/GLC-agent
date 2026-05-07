import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useOrchestrationCompileFlow } from '../useOrchestrationCompileFlow';
import type { RoadmapManifestRequestBody } from '../../data/api/audits-orchestration';

const postRoadmapManifestSnapshot = vi.fn();
const compileMutateAsync = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../../data/apiService', () => ({
  api: {
    postRoadmapManifestSnapshot: (...args: unknown[]) => postRoadmapManifestSnapshot(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('../useCompilePlanMutation', () => ({
  useCompilePlanMutation: () => ({
    mutateAsync: (...args: unknown[]) => compileMutateAsync(...args),
    isPending: false,
  }),
}));

function wrap(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useOrchestrationCompileFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postRoadmapManifestSnapshot.mockResolvedValue({ id: 'snap-manual-1' });
    compileMutateAsync.mockResolvedValue({
      manifest_snapshot_id: 'snap-compile-1',
      orchestration_pack_version: 7,
      roadmap_version: 11,
      plan_governance: { status: 'ok', reasons: [], capabilities: {} },
      last_revision_diff: null,
    });
  });

  it('marks manifest as saved after snapshot save', async () => {
    const qc = new QueryClient();
    const setManifestSaveWorking = vi.fn();
    const appendOrReplaceManifestSnapshot = vi.fn();
    const markDraftAsSavedBaseline = vi.fn();
    const setLastPostRevision = vi.fn();
    const setPlanGovernance = vi.fn();
    const onReload = vi.fn();
    const { result } = renderHook(
      () =>
        useOrchestrationCompileFlow({
          auditId: 'audit-1',
          selectedDomains: ['tech_infrastructure'],
          scenario: 'balanced',
          season: 'rolling_90d',
          planHorizonStart: '',
          planHorizonEnd: '',
          queryClient: qc,
          invalidateBoardDraftHints: false,
          setManifestSaveWorking,
          appendOrReplaceManifestSnapshot,
          markDraftAsSavedBaseline,
          setLastPostRevision,
          setPlanGovernance,
          onReload,
        }),
      { wrapper: wrap(qc) },
    );

    await act(async () => {
      await result.current.handleSaveManifest();
    });

    expect(postRoadmapManifestSnapshot).toHaveBeenCalledWith(
      'audit-1',
      expect.objectContaining({ selected_domains: ['tech_infrastructure'] }),
    );
    expect(appendOrReplaceManifestSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snap-manual-1' }),
    );
    expect(markDraftAsSavedBaseline).toHaveBeenCalledTimes(1);
    expect(setManifestSaveWorking).toHaveBeenNthCalledWith(1, true);
    expect(setManifestSaveWorking).toHaveBeenLastCalledWith(false);
  });

  it('marks draft saved and updates status line after compile', async () => {
    const qc = new QueryClient();
    const setManifestSaveWorking = vi.fn();
    const appendOrReplaceManifestSnapshot = vi.fn();
    const markDraftAsSavedBaseline = vi.fn();
    const setLastPostRevision = vi.fn();
    const setPlanGovernance = vi.fn();
    const onReload = vi.fn();
    const { result } = renderHook(
      () =>
        useOrchestrationCompileFlow({
          auditId: 'audit-1',
          selectedDomains: ['tech_infrastructure'],
          scenario: 'balanced',
          season: 'rolling_90d',
          planHorizonStart: '',
          planHorizonEnd: '',
          queryClient: qc,
          invalidateBoardDraftHints: false,
          setManifestSaveWorking,
          appendOrReplaceManifestSnapshot,
          markDraftAsSavedBaseline,
          setLastPostRevision,
          setPlanGovernance,
          onReload,
        }),
      { wrapper: wrap(qc) },
    );

    await act(async () => {
      await result.current.handleCompilePlan();
    });

    expect(compileMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ selected_domains: ['tech_infrastructure'] } satisfies Partial<RoadmapManifestRequestBody>),
    );
    expect(appendOrReplaceManifestSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snap-compile-1' }),
    );
    expect(markDraftAsSavedBaseline).toHaveBeenCalledTimes(1);
    expect(setLastPostRevision).toHaveBeenCalledWith({ roadmap_version: 11, diff: null });
    expect(setPlanGovernance).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok' }),
    );
    expect(result.current.compileStatusLine).toContain('7');
  });
});
