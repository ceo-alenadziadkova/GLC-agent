import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { STRATEGY_LAB_PAGE_ANCHORS } from '../../../config/strategy-lab';
import { LegacyStrategyPathRedirect } from '../LegacyStrategyPathRedirect';

describe('LegacyStrategyPathRedirect', () => {
  it('redirects consultant /strategy/:id to /lab/:id with mode=shape by default', () => {
    render(
      <MemoryRouter initialEntries={['/strategy/audit-x']}>
        <Routes>
          <Route path="/strategy/:id" element={<LegacyStrategyPathRedirect variant="consultant" />} />
          <Route path="/lab/:id" element={<div data-testid="plan-dest">plan</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('plan-dest')).toBeInTheDocument();
  });

  it('maps define hash to mode=define', () => {
    render(
      <MemoryRouter initialEntries={[`/strategy/audit-y#${STRATEGY_LAB_PAGE_ANCHORS.definePhase}`]}>
        <Routes>
          <Route path="/strategy/:id" element={<LegacyStrategyPathRedirect variant="consultant" />} />
          <Route path="/lab/:id" element={<div data-testid="plan-dest">plan</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('plan-dest')).toBeInTheDocument();
  });
});
