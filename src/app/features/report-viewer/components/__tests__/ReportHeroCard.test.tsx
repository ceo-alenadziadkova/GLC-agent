import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportHeroCard } from '../ReportHeroCard';

describe('ReportHeroCard', () => {
  it('renders executive summary as multiple paragraphs', () => {
    render(
      <ReportHeroCard
        companyName="Example Co"
        industry="SaaS"
        createdAt="2026-01-01T00:00:00.000Z"
        executiveSummary={'Paragraph one.\n\nParagraph two.'}
        averageScore={4.2}
        criticalIssueCount={2}
        quickWinsCount={3}
      />,
    );

    const summaryContainer = screen.getByText('Paragraph one.').closest('.ds-report-hero-summary');
    expect(summaryContainer).toBeInTheDocument();
    expect(summaryContainer?.querySelectorAll('p')).toHaveLength(2);
    expect(screen.getByText('Paragraph two.')).toBeInTheDocument();
  });

  it('exposes score ring as accessible image with label', () => {
    render(
      <ReportHeroCard
        companyName="Example Co"
        industry="SaaS"
        createdAt="2026-01-01T00:00:00.000Z"
        executiveSummary="Summary"
        averageScore={4.2}
        criticalIssueCount={2}
        quickWinsCount={3}
      />,
    );

    expect(screen.getByRole('img', { name: /Overall/i })).toBeInTheDocument();
    expect(screen.getByText(/Average score 4.2 out of 5/i)).toBeInTheDocument();
  });
});
