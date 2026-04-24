import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StrategyRoadmap } from '../StrategyRoadmap';
import type { StrategyInitiative } from '../../data/audit';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';

const BASE_INITIATIVE: StrategyInitiative = {
  id: 'initiative-1',
  title: 'Strengthen onboarding value proposition',
  description: 'Refine the first-run value moment around SQL-level audit clarity.',
  impact: 'high',
  effort: 'medium',
  timeframe: 'quick-win',
};

describe('StrategyRoadmap', () => {
  it('renders initiative outcome description and timeframe when present', () => {
    render(
      <StrategyRoadmap
        initiatives={[
          {
            ...BASE_INITIATIVE,
            outcome: {
              description: 'Higher demo conversion from first-touch visitors',
              timeframe: '14 days',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(new RegExp(`${ORCHESTRATION_UI_COPY.initiativeOutcomeLabel}:`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(/Higher demo conversion from first-touch visitors/)).toBeInTheDocument();
    expect(screen.getByText(/\(14 days\)/)).toBeInTheDocument();
  });

  it('does not render outcome block for initiatives without outcome payload', () => {
    render(<StrategyRoadmap initiatives={[BASE_INITIATIVE]} />);
    expect(screen.queryByText(ORCHESTRATION_UI_COPY.initiativeOutcomeLabel)).not.toBeInTheDocument();
  });
});
