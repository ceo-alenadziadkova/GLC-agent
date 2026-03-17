import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBadge, ScoreBar, ScoreDot } from '../ScoreBadge';

describe('ScoreBadge', () => {
  it('renders score/5 text', () => {
    render(<ScoreBadge score={3} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('has aria-label with score and label', () => {
    render(<ScoreBadge score={1} />);
    expect(screen.getByLabelText('Score 1/5 — Critical')).toBeInTheDocument();
  });

  it('shows label text when showLabel=true', () => {
    render(<ScoreBadge score={5} showLabel />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('clamps score to 1–5 range', () => {
    render(<ScoreBadge score={10} />);
    expect(screen.getByText('5/5')).toBeInTheDocument();
  });
});

describe('ScoreBar', () => {
  it('renders score number', () => {
    render(<ScoreBar score={4} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('ScoreDot', () => {
  it('renders without crashing', () => {
    const { container } = render(<ScoreDot score={3} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
