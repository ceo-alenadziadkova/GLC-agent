import { describe, expect, it } from 'vitest';

import {
  buildLighthouseBankPrefillHints,
  buildLighthouseBootstrapSummaryLine,
} from '../services/audits/lighthouse-bootstrap-bank-prefill.js';

describe('lighthouse-bootstrap-bank-prefill', () => {
  it('suggests f2 focus areas and f3 self-rating from low scores', () => {
    const hints = buildLighthouseBankPrefillHints({
      requested_url: 'https://ex.com',
      performance_score: 35,
      seo_score: 35,
      accessibility_score: 35,
      best_practices_score: 35,
      lcp: null,
      cls: null,
      fcp: null,
    });
    expect(hints.f2_suggested_options).toEqual([
      'Website performance and technology (speed, stability, technical health)',
      'Online visibility and SEO (finding and attracting the right traffic)',
      'Customer experience and conversions (turning visitors into customers)',
    ]);
    expect(hints.f3_suggested_option).toBe('1 — Struggling');
    expect(hints.reasons.length).toBe(3);
  });

  it('builds a one-line English summary for recon_prefills', () => {
    const s = buildLighthouseBootstrapSummaryLine({
      requested_url: 'https://ex.com',
      performance_score: 80,
      seo_score: 70,
      accessibility_score: null,
      best_practices_score: null,
      lcp: null,
      cls: null,
      fcp: null,
    });
    expect(s).toContain('Performance 80/100');
    expect(s).toContain('SEO 70/100');
  });
});
