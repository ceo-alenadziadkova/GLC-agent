import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PLAN_BOARD_COPY } from '../../../../config/plan-board-copy.en';
import { QueryClient, QueryClientProvider } from '../../../../lib/tanstack-react-query';
import { PlanBoardOrphanReconcileBanner } from '../PlanBoardOrphanReconcileBanner';

const postPreview = vi.fn();
const postReconcile = vi.fn();

vi.mock('../../../../data/apiService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../../data/apiService')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      postPlanBoardReconcilePreview: (...args: unknown[]) => postPreview(...args),
      postPlanBoardReconcile: (...args: unknown[]) => postReconcile(...args),
    },
  };
});

function renderWithQuery(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('PlanBoardOrphanReconcileBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides preview CTA when reconcile preview is disabled', () => {
    renderWithQuery(
      <PlanBoardOrphanReconcileBanner
        auditId="a1"
        orchestrationPackVersion={2}
        reconcilePreviewEnabled={false}
      />,
    );
    expect(screen.queryByRole('button', { name: PLAN_BOARD_COPY.reconcilePreviewCta })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: PLAN_BOARD_COPY.reconcileBannerCta })).toBeInTheDocument();
  });

  it('opens preview dialog and confirms reconcile when preview is enabled', async () => {
    const user = userEvent.setup();
    postPreview.mockResolvedValueOnce({
      orchestration_pack_version: 2,
      matched: 3,
      orphaned_node_removed: 1,
      orphaned_lane_changed: 0,
      auto_created: 2,
    });
    postReconcile.mockResolvedValueOnce({ ok: true, orchestration_pack_version: 2 });

    renderWithQuery(
      <PlanBoardOrphanReconcileBanner
        auditId="a1"
        orchestrationPackVersion={2}
        reconcilePreviewEnabled
      />,
    );

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.reconcilePreviewCta }));

    await waitFor(() => {
      expect(screen.getByText(`${PLAN_BOARD_COPY.reconcilePreviewMatchedLabel}: 3`)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: PLAN_BOARD_COPY.reconcilePreviewConfirmCta }));

    await waitFor(() => {
      expect(postReconcile).toHaveBeenCalledWith('a1');
    });
  });
});
