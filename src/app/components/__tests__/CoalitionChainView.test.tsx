import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CoalitionChainView } from '../CoalitionChainView';

describe('CoalitionChainView', () => {
  it('renders hypothesis and alignment correction counts by domain', () => {
    render(
      <CoalitionChainView
        coalition={{
          client_situation_snapshot: null,
          conflict_resolution: null,
          hypothesis_drafts: [
            {
              domain_key: 'tech_infrastructure',
              draft: {
                hypotheses: [
                  { id: 'tech_infrastructure-H1', statement: 'Hosting limits conversion experiments.' },
                  { id: 'tech_infrastructure-H2', statement: 'CMS constraints slow landing page iteration.' },
                ],
              },
            },
          ],
          alignment_responses: [
            {
              domain_key: 'tech_infrastructure',
              alignment: {
                self_corrections: [{ hypothesis_id: 'tech_infrastructure-H2', change: 'refine' }],
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Coalition chain')).toBeInTheDocument();
    expect(screen.getByText('Tech Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('2 Hypotheses · 1 Self-corrections')).toBeInTheDocument();
    expect(screen.getByText('Hosting limits conversion experiments.')).toBeInTheDocument();
  });
});
