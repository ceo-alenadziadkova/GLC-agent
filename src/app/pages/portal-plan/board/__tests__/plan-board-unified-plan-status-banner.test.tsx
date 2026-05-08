import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { PLAN_BOARD_COPY } from '../../../../config/plan-board-copy.en';
import { ORCHESTRATION_UI_COPY } from '../../../../config/orchestration-roadmap-ui-copy.en';
import { PlanBoardUnifiedPlanStatusBanner } from '../plan-board-unified-plan-status-banner';

describe('PlanBoardUnifiedPlanStatusBanner', () => {
  it('renders governance block when plan quality gates block edits', () => {
    render(
      <MemoryRouter>
        <PlanBoardUnifiedPlanStatusBanner
          strategyHref="/strategy/x"
          governanceReadOnly
          showOrphanReconcile={false}
          reconcileProps={null}
          manifestDraftPendingCount={0}
          showManifestDraftQueueCopy={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(PLAN_BOARD_COPY.unifiedPlanStatusAriaLabel)).toBeInTheDocument();
    expect(screen.getByText(PLAN_BOARD_COPY.governanceBlockedBannerTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: PLAN_BOARD_COPY.governanceBlockedStrategyCta })).toHaveAttribute(
      'href',
      '/strategy/x',
    );
  });

  it('shows manifest signing queue when drafts are pending', () => {
    render(
      <MemoryRouter>
        <PlanBoardUnifiedPlanStatusBanner
          strategyHref="/strategy/y"
          governanceReadOnly={false}
          showOrphanReconcile={false}
          reconcileProps={null}
          manifestDraftPendingCount={2}
          showManifestDraftQueueCopy
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(PLAN_BOARD_COPY.manifestDraftQueuePanelTitle)).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.manifestDraftQueueBanner)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: PLAN_BOARD_COPY.openStrategyLabCta })).toHaveAttribute('href', '/strategy/y');
  });
});
