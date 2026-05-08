import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClientSituationCard } from '../ClientSituationCard';

describe('ClientSituationCard', () => {
  it('renders the essential coalition snapshot fields', () => {
    render(
      <ClientSituationCard
        snapshot={{
          entity_type: 'b2b_saas',
          dominant_constraint: 'conversion',
          strategic_mode: 'growth',
          data_quality_score: 72,
          maturity: {
            product_clarity: 4,
            audience_clarity: 3,
          },
          assumptions: [{ id: 'A1' }],
          clarifying_questions: [{ id: 'Q1' }],
        }}
      />,
    );

    expect(screen.getByText('Client situation')).toBeInTheDocument();
    expect(screen.getByText('b2b saas')).toBeInTheDocument();
    expect(screen.getByText('conversion')).toBeInTheDocument();
    expect(screen.getByText('growth')).toBeInTheDocument();
    expect(screen.getByText('72/100')).toBeInTheDocument();
  });
});
