import { describe, expect, it } from 'vitest';
import { computeMarketingBriefRecommendedRoute } from '@glc/intake-core';

describe('computeMarketingBriefRecommendedRoute', () => {
  it('unsure + no site → discovery', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: true,
        no_website: true,
        preferred_audit_depth: null,
      }),
    ).toBe('/discovery');
  });

  it('unsure + has site → snapshot', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: true,
        no_website: false,
        preferred_audit_depth: null,
      }),
    ).toBe('/snapshot');
  });

  it('not unsure + no site → discovery', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: true,
        preferred_audit_depth: null,
      }),
    ).toBe('/discovery');
  });

  it('has site + express depth → express-audit', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: false,
        preferred_audit_depth: 'express',
      }),
    ).toBe('/express-audit');
  });

  it('has site + full depth → audit', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: false,
        preferred_audit_depth: 'full',
      }),
    ).toBe('/audit');
  });

  it('has site + null depth defaults to full path', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: false,
        preferred_audit_depth: null,
      }),
    ).toBe('/audit');
  });
});
