import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { HomeFaqPreviewSection } from './HomeFaqPreviewSection';

describe('HomeFaqPreviewSection', () => {
  it('renders CTA text from view model and links to faq page', () => {
    render(
      <MemoryRouter>
        <HomeFaqPreviewSection
          data={{
            title: 'Questions',
            description: 'Short answers now, full detail in FAQ.',
            allQuestionsLabel: 'All questions and answers',
            items: [{ q: 'Where should I start?', a: 'Start with Snapshot.' }],
          }}
        />
      </MemoryRouter>,
    );

    const cta = screen.getByRole('link', { name: 'All questions and answers' });
    expect(cta).toHaveAttribute('href', '/faq');
  });
});
