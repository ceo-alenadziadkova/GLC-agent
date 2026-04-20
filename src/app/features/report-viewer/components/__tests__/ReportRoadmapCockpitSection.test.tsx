import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

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
          timelineHref="/timeline/audit-1"
          manifestHref="/timeline/audit-1#manifest-setup"
          compareHref="/timeline/audit-1#orchestration-panel"
          hasOrchestrationPack={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /View execution timeline/i })).toHaveAttribute(
      'href',
      '/timeline/audit-1',
    );
    expect(screen.getByRole('link', { name: /Open timeline setup/i })).toHaveAttribute(
      'href',
      '/timeline/audit-1#manifest-setup',
    );
  });
});
