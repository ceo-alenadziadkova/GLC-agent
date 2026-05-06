import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { PLAN_WORKSPACE_MODE_QUERY_KEY } from '../../../config/plan-workspace-mode';
import { PLAN_WORKSPACE_UI_COPY } from '../../../config/plan-workspace-ui-copy.en';
import { PlanModeBar } from '../PlanModeBar';

describe('PlanModeBar', () => {
  it('renders three mode tabs linking to the same plan path', () => {
    render(
      <MemoryRouter initialEntries={[`/plan/audit-z?${PLAN_WORKSPACE_MODE_QUERY_KEY}=execute&view=board`]}>
        <Routes>
          <Route path="/plan/:id" element={<PlanModeBar />} />
        </Routes>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: PLAN_WORKSPACE_UI_COPY.modeBarAriaLabel });
    const tabs = within(nav).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('href', expect.stringContaining(`${PLAN_WORKSPACE_MODE_QUERY_KEY}=define`));
    expect(tabs[1]).toHaveAttribute('href', expect.stringContaining(`${PLAN_WORKSPACE_MODE_QUERY_KEY}=shape`));
    expect(tabs[2]).toHaveAttribute('href', expect.stringMatching(/plan\/audit-z(?:\?|$)/));
  });
});
