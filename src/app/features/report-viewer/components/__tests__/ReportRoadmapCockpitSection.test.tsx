import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { buildAppRoute } from '../../../../config/route-paths';
import { ReportRoadmapCockpitSection } from '../ReportRoadmapCockpitSection';

describe('ReportRoadmapCockpitSection', () => {
  it('renders timeline and manifest CTA to provided targets', () => {
    render(
      <MemoryRouter initialEntries={['/reports/audit-1']}>
        <ReportRoadmapCockpitSection
          audit={{
            meta: {
              execution_plan: { selected_domains: ['seo_digital'] },
            },
            strategy: null,
          } as never}
          reportVm={{
            criticalIssues: [{ title: 'Top issue' }],
            coverage: { coveredDomains: ['seo_digital'] },
          } as never}
          timelineHref={buildAppRoute.plan('audit-1', 'timeline')}
          manifestHref={`${buildAppRoute.plan('audit-1', 'timeline')}#manifest-setup`}
          compareHref={`${buildAppRoute.plan('audit-1', 'timeline')}#orchestration-panel`}
          hasOrchestrationPack={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /View execution timeline/i })).toHaveAttribute(
      'href',
      buildAppRoute.plan('audit-1', 'timeline'),
    );
    expect(screen.getByRole('link', { name: /Open timeline setup/i })).toHaveAttribute(
      'href',
      `${buildAppRoute.plan('audit-1', 'timeline')}#manifest-setup`,
    );
  });
});
