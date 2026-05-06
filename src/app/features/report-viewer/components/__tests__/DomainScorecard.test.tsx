import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { DomainScorecard } from '../DomainScorecard';

describe('DomainScorecard', () => {
  it('uses provided route builder for domain links', () => {
    render(
      <MemoryRouter>
        <DomainScorecard
          auditId="audit-1"
          domains={[
            {
              key: 'seo_digital',
              label: 'SEO',
              data: null,
              score: 4,
            },
          ]}
          domainEntriesCount={1}
          isFilteredProfile={false}
          averageScore={4}
          buildDomainHref={(auditId, domainKey) => `/portal/audit/${auditId}?domain=${domainKey}`}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Open SEO details/i })).toHaveAttribute(
      'href',
      '/portal/audit/audit-1?domain=seo_digital',
    );
  });
});
