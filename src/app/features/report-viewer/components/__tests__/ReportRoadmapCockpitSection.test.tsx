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

    expect(screen.getByRole('link', { name: /^Open timeline$/i })).toHaveAttribute(
      'href',
      buildAppRoute.plan('audit-1', 'timeline'),
    );
    expect(screen.getByRole('link', { name: /Open timeline setup/i })).toHaveAttribute(
      'href',
      `${buildAppRoute.plan('audit-1', 'timeline')}#manifest-setup`,
    );
  });

  it('keeps only essential CTAs for portal audience', () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports/audit-1']}>
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
          timelineHref={buildAppRoute.portalPlan('audit-1', 'timeline')}
          manifestHref={`${buildAppRoute.portalPlan('audit-1', 'timeline')}#manifest-setup`}
          compareHref={`${buildAppRoute.portalPlan('audit-1', 'timeline')}#orchestration-panel`}
          hasOrchestrationPack={true}
          audience="portal"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /^Open timeline$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open timeline setup/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open roadmap comparison/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open domain scorecard/i })).not.toBeInTheDocument();
  });
});
