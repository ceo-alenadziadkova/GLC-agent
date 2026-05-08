import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { PLAN_WORKSPACE_UI_COPY } from '../../../config/plan-workspace-ui-copy.en';
import type { AuditState } from '../../../data/audit/contracts/state/audit-state.types';
import type { StrategyJourneyStepComputed } from '../../../lib/strategy-journey-status';
import { StrategyPlanningChrome } from '../StrategyPlanningChrome';

function auditFixture(): AuditState {
  return { strategy: { executive_summary: 'Fixture summary' } } as AuditState;
}

function renderPlanChrome(args: {
  initialPath: string;
  steps: ReadonlyArray<StrategyJourneyStepComputed>;
  variant?: 'plan' | 'strategy-lab';
}) {
  render(
    <MemoryRouter initialEntries={[args.initialPath]}>
      <StrategyPlanningChrome
        auditId="audit-status-test"
        isClient={false}
        audit={auditFixture()}
        variant={
          args.variant === 'strategy-lab' ?
            { kind: 'strategy-lab' }
          : { kind: 'plan', activePlanView: 'board' }
        }
        steps={args.steps}
      />
    </MemoryRouter>,
  );
}

describe('StrategyPlanningChrome mode status mapping', () => {
  it('keeps execute current on plan view and resolves define/shape from steps', () => {
    renderPlanChrome({
      initialPath: '/plan/audit-status-test/board?mode=shape',
      steps: [
        { id: 'context', status: 'done' },
        { id: 'manifest', status: 'current' },
        { id: 'pack', status: 'pending' },
        { id: 'plan', status: 'pending' },
      ],
    });

    const defineTab = screen.getByRole('tab', { name: new RegExp(PLAN_WORKSPACE_UI_COPY.modeBarDefine, 'i') });
    const shapeTab = screen.getByRole('tab', { name: new RegExp(PLAN_WORKSPACE_UI_COPY.modeBarShape, 'i') });
    const executeTab = screen.getByRole('tab', { name: new RegExp(PLAN_WORKSPACE_UI_COPY.modeBarExecute, 'i') });

    expect(within(defineTab).getByText(PLAN_WORKSPACE_UI_COPY.modeBarStatusDone)).toBeInTheDocument();
    expect(within(shapeTab).getByText(PLAN_WORKSPACE_UI_COPY.modeBarStatusCurrent)).toBeInTheDocument();
    expect(within(executeTab).getByText(PLAN_WORKSPACE_UI_COPY.modeBarStatusCurrent)).toBeInTheDocument();
  });

  it('marks execute done in strategy-lab when plan step is already completed', () => {
    renderPlanChrome({
      initialPath: '/lab/audit-status-test?mode=shape',
      variant: 'strategy-lab',
      steps: [
        { id: 'context', status: 'current' },
        { id: 'manifest', status: 'pending' },
        { id: 'pack', status: 'pending' },
        { id: 'plan', status: 'done' },
      ],
    });

    const executeTab = screen.getByRole('tab', { name: new RegExp(PLAN_WORKSPACE_UI_COPY.modeBarExecute, 'i') });
    expect(within(executeTab).getByText(PLAN_WORKSPACE_UI_COPY.modeBarStatusDone)).toBeInTheDocument();
  });
});
