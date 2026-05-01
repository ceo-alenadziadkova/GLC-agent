import { describe, expect, it } from 'vitest';

import { COLLECTOR_KEY_NEW_AUDIT_SITE_RECON } from '../config/collector-keys.js';
import {
  buildClientProjectEnrichmentFromCollectedData,
  getLighthouseSummaryForIntelligenceSnapshot,
} from '../services/client-project/client-project-collected-enrichment.js';

describe('client-project-collected-enrichment', () => {
  it('embeds a trimmed Lighthouse snapshot from the performance collector', () => {
    const e = buildClientProjectEnrichmentFromCollectedData([
      {
        collector_key: 'performance',
        data: {
          lighthouse: {
            enabled: true,
            performance_score: 72,
            seo_score: 88,
            requested_url: 'https://example.com',
            lcp: '2.1 s',
            extra_noise: { nested: 'drop me at api boundary' },
          },
        },
      },
    ]);
    expect(e.byKey?.performance_lighthouse).toEqual({
      enabled: true,
      performance_score: 72,
      seo_score: 88,
      requested_url: 'https://example.com',
      lcp: '2.1 s',
    });
    expect(e.byKey?.collector_keys_present).toEqual(['performance']);
  });

  it('returns empty enrichment when no lighthouse on performance', () => {
    const e = buildClientProjectEnrichmentFromCollectedData([
      { collector_key: 'crawler', data: { pages_crawled: [] } },
    ]);
    expect(e).toEqual({ byKey: { collector_keys_present: ['crawler'] } });
  });

  it('uses lighthouse_bootstrap when performance has a fatal error', () => {
    const e = buildClientProjectEnrichmentFromCollectedData([
      {
        collector_key: 'performance',
        data: { lighthouse: { enabled: true, error: 'Lighthouse failed' } },
      },
      {
        collector_key: 'lighthouse_bootstrap',
        data: {
          lighthouse: {
            enabled: true,
            performance_score: 90,
            seo_score: 85,
            requested_url: 'https://example.com',
          },
        },
      },
    ]);
    expect(e.byKey?.performance_lighthouse).toEqual({
      enabled: true,
      performance_score: 90,
      seo_score: 85,
      requested_url: 'https://example.com',
    });
  });

  it('embeds lighthouse from bootstrap when performance row is absent', () => {
    const e = buildClientProjectEnrichmentFromCollectedData([
      {
        collector_key: 'lighthouse_bootstrap',
        data: {
          lighthouse: {
            enabled: true,
            performance_score: 66,
            requested_url: 'https://a.example',
            lcp: '1.0 s',
          },
        },
      },
    ]);
    expect(e.byKey?.performance_lighthouse).toEqual({
      enabled: true,
      performance_score: 66,
      requested_url: 'https://a.example',
      lcp: '1.0 s',
    });
  });

  it('getLighthouseSummaryForIntelligenceSnapshot returns the same trimmed performance_lighthouse object', () => {
    const rows = [
      {
        collector_key: 'performance',
        data: {
          lighthouse: {
            performance_score: 70,
            requested_url: 'https://example.com',
          },
        },
      },
    ];
    const lh = getLighthouseSummaryForIntelligenceSnapshot(rows);
    const e = buildClientProjectEnrichmentFromCollectedData(rows);
    expect(lh).toEqual(e.byKey?.performance_lighthouse ?? null);
  });

  it('embeds a short site_scrape summary from new_audit_site_recon', () => {
    const e = buildClientProjectEnrichmentFromCollectedData([
      {
        collector_key: COLLECTOR_KEY_NEW_AUDIT_SITE_RECON,
        data: {
          summary: {
            short_label: 'ACME',
            industry_guess: 'Technology',
            overall_score: 62,
            degraded: false,
          },
        },
      },
    ]);
    expect(e.byKey?.site_scrape).toMatchObject({
      status: 'ready',
      short_label: 'ACME',
      industry_guess: 'Technology',
      overall_score: 62,
    });
  });
});
