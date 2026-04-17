import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { getGlcQueryClient } from '../../../lib/glc-query-client';
import { MarketingHomePage } from '../MarketingHomePage';

/**
 * Full-tree render (jsdom) to surface throws that only appear outside shallow mocks.
 * Complements e2e/smoke when Playwright hits RouteErrorPage.
 */
describe('MarketingHomePage render', () => {
  it('mounts without throwing and exposes marketing-home', () => {
    const qc = getGlcQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MarketingHomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId('marketing-home')).toBeInTheDocument();
  });
});
