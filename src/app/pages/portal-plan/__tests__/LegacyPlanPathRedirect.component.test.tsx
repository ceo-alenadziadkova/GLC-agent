import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router';

import { APP_ROUTE_PATHS } from '../../../config/route-paths';
import { LegacyPlanPathRedirect } from '../LegacyPlanPathRedirect';

function LocationSentinel() {
  const { pathname, search } = useLocation();
  return (
    <span data-testid="sentinel">
      {pathname}
      {search}
    </span>
  );
}

const auditId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('LegacyPlanPathRedirect (<Navigate /> integration)', () => {
  it('portal roadmap merges search onto /portal/plan/:id/roadmap without view query', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/portal/roadmap/:id',
          element: <LegacyPlanPathRedirect variant="portal" surface="roadmap" />,
        },
        {
          path: '/portal/plan/:id/roadmap',
          element: (
            <>
              landing
              <LocationSentinel />
            </>
          ),
        },
      ],
      { initialEntries: [`/portal/roadmap/${auditId}?from=legacy`] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByTestId('sentinel').textContent ?? '').toContain(`/portal/plan/${auditId}/roadmap`));
    await waitFor(() => expect(screen.getByTestId('sentinel').textContent ?? '').toContain('from=legacy'));
    await waitFor(() => expect(screen.getByTestId('sentinel').textContent ?? '').not.toMatch(/view=/));
  });

  it('consultant legacy /timeline/:id lands on /plan/:id/board path', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/timeline/:id',
          element: <LegacyPlanPathRedirect variant="consultant" surface="timeline" />,
        },
        {
          path: '/plan/:id/board',
          element: (
            <>
              landing
              <LocationSentinel />
            </>
          ),
        },
      ],
      { initialEntries: [`/timeline/${auditId}`] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByTestId('sentinel').textContent ?? '').toContain(`/plan/${auditId}/board`));
    await waitFor(() => expect(screen.getByTestId('sentinel').textContent ?? '').not.toMatch(/view=/));
  });

  it('consultant roadmap entry without id navigates to dashboard', async () => {
    const dashboardPath = APP_ROUTE_PATHS.dashboard;
    expect(dashboardPath).toBe('/dashboard');
    const router = createMemoryRouter(
      [
        { path: '/roadmap/:id?', element: <LegacyPlanPathRedirect variant="consultant" surface="roadmap" /> },
        { path: dashboardPath, element: <>dashboard</> },
      ],
      { initialEntries: ['/roadmap'] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument());
  });
});
