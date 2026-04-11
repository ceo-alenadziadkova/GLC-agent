import { describe, expect, it } from 'vitest';

import {
  C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS,
  DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET,
  DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE,
} from '@glc/intake-core';
import bank from '@glc/intake-core/question-bank.v1.json';
import fallbacks from '@glc/intake-core/discovery-brief-fallbacks.v1.json';

type BankQuestion = {
  id: string;
  answer?: { options?: string[] };
};

function optionsFor(id: string): string[] {
  const q = (bank as { questions: BankQuestion[] }).questions.find(x => x.id === id);
  const opts = q?.answer?.options;
  return Array.isArray(opts) ? opts : [];
}

describe('discovery brief mapping vs question bank', () => {
  it('DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET is an exact a5 option', () => {
    const opts = optionsFor('a5');
    expect(opts.length).toBeGreaterThan(0);
    expect(opts).toContain(DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET);
  });

  it('DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE is an exact c3 option', () => {
    const opts = optionsFor('c3');
    expect(opts.length).toBeGreaterThan(0);
    expect(opts).toContain(DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE);
  });

  it('discovery-brief fallbacks JSON is self-consistent', () => {
    const a5re = new RegExp(fallbacks.a5NoWebsiteYet.matchPattern, 'i');
    expect(a5re.test(fallbacks.a5NoWebsiteYet.fallbackOption)).toBe(true);
    expect(fallbacks.c3AnalyticsNotOnSite.fallbackOption.trim().toLowerCase()).toBe(
      fallbacks.c3AnalyticsNotOnSite.equalsNormalized,
    );
    const a5opts = optionsFor('a5');
    const c3opts = optionsFor('c3');
    expect(a5opts.includes(fallbacks.a5NoWebsiteYet.fallbackOption)).toBe(true);
    expect(c3opts.includes(fallbacks.c3AnalyticsNotOnSite.fallbackOption)).toBe(true);
  });

  it('legacy c_nosite_1 labels are non-empty, unique, and match JSON canon', () => {
    expect(C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS.length).toBeGreaterThan(0);
    expect(new Set(C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS).size).toBe(
      C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS.length,
    );
    expect([...C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS]).toEqual(
      fallbacks.cNosite1LegacyFirstPartyWebLabels,
    );
  });
});
