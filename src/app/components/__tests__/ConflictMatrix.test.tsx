import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConflictMatrix } from '../ConflictMatrix';

describe('ConflictMatrix', () => {
  it('renders resolved and unresolved coalition conflicts', () => {
    render(
      <ConflictMatrix
        resolution={{
          resolved_conflicts: [
            {
              id: 'conflict-1',
              parties: ['tech_infrastructure', 'seo_digital'],
              decision: 'Prioritize crawl stability before SEO expansion.',
            },
          ],
          unresolved: [
            {
              id: 'conflict-2',
              parties: ['marketing_utp', 'automation_processes'],
              reason: 'Budget ownership is unclear.',
              recommended_action: 'escalate',
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Conflict matrix')).toBeInTheDocument();
    expect(screen.getByText('Resolved conflicts')).toBeInTheDocument();
    expect(screen.getByText('Unresolved conflicts')).toBeInTheDocument();
    expect(screen.getByText('Prioritize crawl stability before SEO expansion.')).toBeInTheDocument();
    expect(screen.getByText('Budget ownership is unclear.')).toBeInTheDocument();
    expect(screen.getByText('escalate')).toBeInTheDocument();
  });
});
