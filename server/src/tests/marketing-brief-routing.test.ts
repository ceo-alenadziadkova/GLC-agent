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

  it('has site + express depth → starter', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: false,
        preferred_audit_depth: 'express',
      }),
    ).toBe('/starter');
  });

  it('has site + full depth → complete', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: false,
        preferred_audit_depth: 'full',
      }),
    ).toBe('/complete');
  });

  it('has site + null depth defaults to complete path', () => {
    expect(
      computeMarketingBriefRecommendedRoute({
        unsure_choice: false,
        no_website: false,
        preferred_audit_depth: null,
      }),
    ).toBe('/complete');
  });
});
