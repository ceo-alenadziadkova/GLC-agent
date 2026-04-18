import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SnapshotScoreBadge } from './SnapshotScoreBadge';
import { SCORE_LABELS } from '@glc/intake-core';

describe('SnapshotScoreBadge', () => {
  it('renders overall score (bento variant)', () => {
    render(<SnapshotScoreBadge variant="bento" overallScore={45} uxScore={3} />);

    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('renders legacy band (bento variant)', () => {
    render(<SnapshotScoreBadge variant="bento" overallScore={null} uxScore={3} />);

    expect(screen.getByText('3/5')).toBeInTheDocument();

    const band = 3 as keyof typeof SCORE_LABELS;
    expect(screen.getByText(SCORE_LABELS[band])).toBeInTheDocument();
  });

  it('renders overall score (compact variant)', () => {
    render(<SnapshotScoreBadge variant="compact" overallScore={48} uxScore={3} />);

    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });
});

