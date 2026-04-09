import { describe, expect, it } from 'vitest';

import { labelIntakeCoverageDomain, labelsForMissingReportDomains } from './intake-coverage-domain-labels';

describe('intake-coverage-domain-labels', () => {
  it('labels recon and strategy slices', () => {
    expect(labelIntakeCoverageDomain('recon')).toBe('Business context');
    expect(labelIntakeCoverageDomain('strategy')).toBe('Strategy');
  });

  it('maps pipeline domain keys', () => {
    expect(labelIntakeCoverageDomain('seo_digital')).toBe('SEO & Digital');
  });

  it('maps missing-for-report lists', () => {
    expect(labelsForMissingReportDomains(['recon', 'marketing_utp'])).toEqual([
      'Business context',
      'Marketing & Positioning',
    ]);
  });
});
