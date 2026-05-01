import { describe, expect, it } from 'vitest';
import { siteIndustryDisputesClientBasics } from '../client-industry-compare';

describe('siteIndustryDisputesClientBasics', () => {
  it('returns false when guess matches the selected industry (case/space-insensitive)', () => {
    expect(siteIndustryDisputesClientBasics('Hospitality', 'Hospitality', undefined)).toBe(false);
  });

  it('returns true when guess differs from Basics', () => {
    expect(siteIndustryDisputesClientBasics('Retail', 'Hospitality', undefined)).toBe(true);
  });

  it('compares "Other" + specify against the site guess', () => {
    expect(siteIndustryDisputesClientBasics('Boutique hotels', 'Other', 'Boutique hotels')).toBe(false);
    expect(siteIndustryDisputesClientBasics('Retail', 'Other', 'Hotels only')).toBe(true);
  });
});
