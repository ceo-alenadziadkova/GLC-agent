import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { PLAN_WORKSPACE_UI_COPY } from '../../../config/plan-workspace-ui-copy.en';
import { buildAppRoute } from '../../../config/route-paths';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import type { StrategyJourneyStepComputed } from '../../../lib/strategy-journey-status';
import { StrategyPlanningChrome } from '../StrategyPlanningChrome';

function auditFixture(): AuditState {
  return { strategy: { executive_summary: 'Fixture summary' } } as AuditState;
}

const STEPS_FIXTURE: ReadonlyArray<StrategyJourneyStepComputed> = [
  { id: 'context', status: 'done' },
  { id: 'manifest', status: 'done' },
  { id: 'pack', status: 'done' },
  { id: 'plan', status: 'current' },
];

function renderPlanChrome(isClient: boolean) {
  render(
    <MemoryRouter>
      <StrategyPlanningChrome
        auditId="audit-primary-cta-test"
        isClient={isClient}
        audit={auditFixture()}
        variant={{ kind: 'plan', activePlanView: 'board' }}
        steps={STEPS_FIXTURE}
      />
    </MemoryRouter>,
  );
}

describe('StrategyPlanningChrome plan primary CTA', () => {
  it('renders consultant Strategy Lab CTA with expected href', async () => {
    renderPlanChrome(false);

    const link = await screen.findByRole('link', {
      name: PLAN_WORKSPACE_UI_COPY.planWorkbenchConsultantPrimaryAriaLabel,
    });
    expect(link).toHaveAttribute('href', buildAppRoute.strategy('audit-primary-cta-test'));
    expect(link).toHaveTextContent(PLAN_WORKSPACE_UI_COPY.planWorkbenchConsultantPrimaryLabel);
  });

  it('renders client weekly priorities CTA pointing at portal board when delivery board UI is enabled', async () => {
    renderPlanChrome(true);

    const link = await screen.findByRole('link', {
      name: PLAN_WORKSPACE_UI_COPY.planWorkbenchClientPrimaryAriaLabel,
    });
    expect(link).toHaveAttribute('href', buildAppRoute.portalPlan('audit-primary-cta-test', 'board'));
    expect(link).toHaveTextContent(PLAN_WORKSPACE_UI_COPY.planWorkbenchClientPrimaryLabel);
  });
});
