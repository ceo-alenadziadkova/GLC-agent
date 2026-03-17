import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickWinTag } from '../QuickWinTag';

describe('QuickWinTag', () => {
  it('renders "Quick Win" text', () => {
    render(<QuickWinTag />);
    expect(screen.getByText(/Quick Win/)).toBeInTheDocument();
  });

  it('shows time when provided', () => {
    render(<QuickWinTag time="2 days" />);
    expect(screen.getByText(/2 days/)).toBeInTheDocument();
  });

  it('shows cost when provided', () => {
    render(<QuickWinTag cost="low" />);
    expect(screen.getByText(/low/)).toBeInTheDocument();
  });

  it('does not render detail span when neither time nor cost is given', () => {
    render(<QuickWinTag />);
    // The separator "·" only appears inside the conditional span
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
