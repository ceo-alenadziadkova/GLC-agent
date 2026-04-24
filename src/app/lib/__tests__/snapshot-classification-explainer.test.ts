import { describe, expect, it } from 'vitest';
import type { FreeSnapshotPreview } from '../../data/auditTypes';
import { snapshotClassificationExplainerLine } from '../snapshot-landing-helpers';

function baseResult(over: Partial<FreeSnapshotPreview> = {}): FreeSnapshotPreview {
  return {
    audit_id: 'a',
    snapshot_token: 't',
    status: 'completed',
    company_url: 'https://example.com',
    company_name: null,
    tech_stack: {},
    location: null,
    ux_score: 4,
    ux_label: 'Good',
    ux_summary: 'ok',
    issues: [],
    quick_wins: [],
    site_profile: {
      siteType: 'saas',
      industry: 'unknown',
      conversionModel: 'unknown',
      primaryOffer: 'x',
      shortLabel: 'x',
      audienceGuess: 'unknown',
      businessSignals: [],
      classificationConfidence: 0.5,
      classificationConfidenceBand: 'high',
      companyNameGuess: null,
      locationGuess: null,
    },
    ...over,
  } as FreeSnapshotPreview;
}

describe('snapshotClassificationExplainerLine', () => {
  it('returns null when API omits classification_transparency', () => {
    expect(snapshotClassificationExplainerLine(baseResult())).toBeNull();
  });

  it('returns null when confidence is high and not a tie', () => {
    const r = baseResult({
      classification_transparency: {
        matched_signals: [],
        runner_up_site_type: 'ecommerce',
        runner_up_match_count: 1,
        tie_ambiguous: false,
        score_top_two: [
          ['saas', 3],
          ['ecommerce', 1],
        ],
      },
    });
    expect(snapshotClassificationExplainerLine(r)).toBeNull();
  });

  it('shows tie copy when tie_ambiguous', () => {
    const r = baseResult({
      classification_transparency: {
        matched_signals: [],
        runner_up_site_type: 'ecommerce',
        runner_up_match_count: 3,
        tie_ambiguous: true,
        score_top_two: [
          ['saas', 3],
          ['ecommerce', 3],
        ],
      },
    });
    const line = snapshotClassificationExplainerLine(r);
    expect(line).toContain('saas');
    expect(line).toContain('ecommerce');
    expect(line).toContain('rough hint');
  });

  it('shows low-confidence copy when band is low', () => {
    const r = baseResult({
      classification_confidence_band: 'low',
      site_profile: {
        siteType: 'saas',
        industry: 'unknown',
        conversionModel: 'unknown',
        primaryOffer: 'x',
        shortLabel: 'x',
        audienceGuess: 'unknown',
        businessSignals: [],
        classificationConfidence: 0.35,
        classificationConfidenceBand: 'low',
        companyNameGuess: null,
        locationGuess: null,
      },
      classification_transparency: {
        matched_signals: [],
        runner_up_site_type: null,
        runner_up_match_count: null,
        tie_ambiguous: false,
        score_top_two: [
          ['saas', 2],
          ['unknown', 0],
        ],
      },
    });
    const line = snapshotClassificationExplainerLine(r);
    expect(line).toMatch(/[Ll]ow|Confidence is low/i);
    expect(line).toMatch(/sampled|deeper workspace/i);
  });
});
