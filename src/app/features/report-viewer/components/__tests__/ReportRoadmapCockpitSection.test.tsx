import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { buildAppRoute } from '../../../../config/route-paths';
import { REPORT_VIEWER_COPY } from '../../config/report-viewer.copy.en';
import { ReportRoadmapCockpitSection } from '../ReportRoadmapCockpitSection';

describe('ReportRoadmapCockpitSection', () => {
  it('renders manifest CTA to provided target', () => {
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
          manifestHref={`${buildAppRoute.plan('audit-1', 'board')}#manifest-setup`}
          compareHref={`${buildAppRoute.plan('audit-1', 'board')}#orchestration-panel`}
          hasOrchestrationPack={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: REPORT_VIEWER_COPY.roadmapCockpit.ctaManifest })).toHaveAttribute(
      'href',
      `${buildAppRoute.plan('audit-1', 'board')}#manifest-setup`,
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
          manifestHref={`${buildAppRoute.portalPlan('audit-1', 'board')}#manifest-setup`}
          compareHref={`${buildAppRoute.portalPlan('audit-1', 'board')}#orchestration-panel`}
          hasOrchestrationPack={true}
          audience="portal"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: REPORT_VIEWER_COPY.roadmapCockpit.ctaManifest })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open roadmap comparison/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open domain scorecard/i })).not.toBeInTheDocument();
  });
});
