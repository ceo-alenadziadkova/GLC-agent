import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PLAN_WORKSPACE_UI_COPY } from '../../../config/plan-workspace-ui-copy.en';
import { PortalPlanRoadmapScopeCallout } from '../portal-plan-roadmap-scope-callout';

const auditId = 'audit-roadmap-scope-test';

describe('PortalPlanRoadmapScopeCallout', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('shows scope note after expanding the collapsible disclosure', async () => {
    const user = userEvent.setup();
    render(<PortalPlanRoadmapScopeCallout auditId={auditId} governanceBlocked={false} orphanCardCount={0} />);
    await user.click(screen.getByRole('button', { name: PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutExpandTrigger }));
    await waitFor(() => {
      expect(
        screen.getByLabelText(PLAN_WORKSPACE_UI_COPY.roadmapViewInteractionScopeAriaLabel),
      ).toHaveTextContent(PLAN_WORKSPACE_UI_COPY.roadmapViewInteractionScopeNote);
    });
  });

  it('does not render when the educational tip was dismissed for this session', () => {
    sessionStorage.setItem(`glc.plan.roadmapScope.educationAck.${auditId}`, '1');
    const { container } = render(
      <PortalPlanRoadmapScopeCallout auditId={auditId} governanceBlocked={false} orphanCardCount={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('still renders when governance is blocked even after educational dismiss', () => {
    sessionStorage.setItem(`glc.plan.roadmapScope.educationAck.${auditId}`, '1');
    render(<PortalPlanRoadmapScopeCallout auditId={auditId} governanceBlocked orphanCardCount={0} />);
    expect(screen.getByText(PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutGovernanceNote)).toBeInTheDocument();
  });

  it('shows orphan count line when orphaned cards exist', () => {
    render(<PortalPlanRoadmapScopeCallout auditId={auditId} governanceBlocked={false} orphanCardCount={3} />);
    expect(
      screen.getByText(PLAN_WORKSPACE_UI_COPY.roadmapScopeCalloutOrphanNote.replace('{count}', '3')),
    ).toBeInTheDocument();
  });
});
