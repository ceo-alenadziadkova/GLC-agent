import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MarketingHome } from '../MarketingHome';

vi.mock('../../marketing/MarketingLayout', () => ({
  MarketingLayout: ({ children }: PropsWithChildren) => (
    <div data-testid="marketing-layout">{children}</div>
  ),
}));

vi.mock('../../marketing/PublicBrandContext', () => ({
  usePublicBrand: () => ({
    payload: null,
    brandName: 'Acme Brand',
    footer: {},
    supportEmail: 'support@example.com',
    noPublicWebsiteDisplayEn: 'No public website',
  }),
}));

describe('MarketingHome smoke', () => {
  it('renders core marketing home actions and links', () => {
    render(
      <MemoryRouter>
        <MarketingHome />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('marketing-layout')).toBeInTheDocument();
    expect(screen.getByTestId('marketing-home')).toBeInTheDocument();
    expect(screen.getByText(/Acme Brand/i)).toBeInTheDocument();

    const briefCta = screen.getByTestId('hero-cta-brief');
    expect(briefCta).toHaveAttribute('href', '/brief');

    const howItWorksCta = screen.getByTestId('hero-cta-how-it-works');
    expect(howItWorksCta).toHaveAttribute('href', '/#how-it-works');

    const faqCta = screen.getByRole('link', { name: 'See all answers' });
    expect(faqCta).toHaveAttribute('href', '/faq');
  });
});
