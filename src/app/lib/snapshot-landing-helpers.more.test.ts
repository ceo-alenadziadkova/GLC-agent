// Behaviour: snapshot landing score + competitor copy — config-driven from snapshot-landing-copy.en.
import { describe, expect, it } from 'vitest';
import { SCORE_COLORS } from '@glc/intake-core';
import type { SnapshotCompetitorComparison, SnapshotSiteProfile } from '../data/auditTypes';
import {
  competitorComparisonCaption,
  donutFillFromLegacyBand,
  donutFillFromOverall,
  fivePointBandExplanation,
  legacyUxBand,
  scoreColorFrom100,
  siteProfileSoftLine,
} from './snapshot-landing-helpers';

describe('snapshot-landing-helpers (scores and competitor copy)', () => {
  describe('competitorComparisonCaption', () => {
    it('handles https metric winners', () => {
      const base: SnapshotCompetitorComparison = {
        metric: 'https',
        client_val: true,
        comp_val: false,
        winner: 'tie',
        label: 'x',
      };
      expect(competitorComparisonCaption({ ...base, winner: 'tie' }, 'Other').kind).toBe('tie');
      expect(competitorComparisonCaption({ ...base, winner: 'client' }, 'Other').kind).toBe('client');
      const comp = competitorComparisonCaption({ ...base, winner: 'competitor' }, 'OtherSite');
      expect(comp.kind).toBe('competitor');
      expect(comp.text).toContain('OtherSite');
    });

    it('handles hreflang_count with numeric values', () => {
      const row: SnapshotCompetitorComparison = {
        metric: 'hreflang_count',
        client_val: 2,
        comp_val: 1,
        winner: 'client',
        label: 'x',
      };
      const cap = competitorComparisonCaption(row, 'Comp');
      expect(cap.kind).toBe('client');
      expect(cap.text.length).toBeGreaterThan(0);
    });

    it('falls back to label for unknown metric', () => {
      const cap = competitorComparisonCaption(
        {
          metric: 'unknown_metric',
          client_val: 0,
          comp_val: 0,
          winner: 'tie',
          label: 'Fallback label',
        },
        'X',
      );
      expect(cap).toEqual({ kind: 'tie', text: 'Fallback label' });
    });
  });

  describe('scoreColorFrom100', () => {
    it('maps bands to SCORE_COLORS indices', () => {
      expect(scoreColorFrom100(100)).toBe(SCORE_COLORS[5]);
      expect(scoreColorFrom100(79)).toBe(SCORE_COLORS[4]);
      expect(scoreColorFrom100(59)).toBe(SCORE_COLORS[3]);
      expect(scoreColorFrom100(39)).toBe(SCORE_COLORS[2]);
      expect(scoreColorFrom100(0)).toBe(SCORE_COLORS[1]);
    });
  });

  describe('legacyUxBand', () => {
    it('returns valid 1–5 key or default 3', () => {
      expect(legacyUxBand(5)).toBe(5);
      expect(legacyUxBand(1)).toBe(1);
      expect(legacyUxBand(null)).toBe(3);
      expect(legacyUxBand(99)).toBe(3);
    });
  });

  describe('donut fills', () => {
    it('clamps overall 0–100', () => {
      expect(donutFillFromOverall(-10)).toBe(0);
      expect(donutFillFromOverall(50)).toBe(50);
      expect(donutFillFromOverall(200)).toBe(100);
    });

    it('maps legacy band to proportional fill', () => {
      expect(donutFillFromLegacyBand(5)).toBe(100);
      expect(donutFillFromLegacyBand(1)).toBe(20);
    });
  });

  describe('fivePointBandExplanation', () => {
    it('uses overall-100 explainer when flag set', () => {
      const t = fivePointBandExplanation({
        band: 3,
        uxLabel: 'Good',
        hasOverall100: true,
      });
      expect(t.length).toBeGreaterThan(0);
    });

    it('builds five-point copy from label', () => {
      const t = fivePointBandExplanation({
        band: 4,
        uxLabel: '  ',
        hasOverall100: false,
      });
      expect(t.length).toBeGreaterThan(0);
    });
  });

  describe('siteProfileSoftLine', () => {
    const profile = (p: Partial<SnapshotSiteProfile>): SnapshotSiteProfile =>
      ({
        siteType: 'saas',
        industry: 'fintech',
        conversionModel: 'unknown',
        primaryOffer: 'x',
        shortLabel: 'x',
        audienceGuess: 'unknown',
        businessSignals: [],
        classificationConfidence: 0.9,
        classificationConfidenceBand: 'high',
        companyNameGuess: null,
        locationGuess: null,
        ...p,
      }) as SnapshotSiteProfile;

    it('returns null when profile missing', () => {
      expect(siteProfileSoftLine(undefined)).toBeNull();
    });

    it('formats both type and industry', () => {
      const line = siteProfileSoftLine(profile({ siteType: 'ecommerce', industry: 'retail' }));
      expect(line).toContain('ecommerce');
      expect(line).toContain('retail');
    });

    it('uses unknown copy when both unknown', () => {
      const line = siteProfileSoftLine(profile({ siteType: 'unknown', industry: 'unknown' }));
      expect(line).toBeTruthy();
    });
  });
});
