import { describe, it, expect } from 'vitest';
import {
  BRANCH_RULES,
  buildDomainToQuestionsRawFromRoles,
  calcAiReadinessScore,
  calcDataQualityScore,
  DOMAIN_TO_QUESTION_IDS,
  deriveBankV1DataQuality,
  filterVisibleQuestions,
  getDomainsForQuestionId,
  getQuestionBankPromptLabel,
  isPrimaryFeedForDomain,
  isSecondaryFeedForDomain,
  mergeLegacyResponsesIntoBankV1,
  normalizeWebsiteGate,
  QUESTION_BANK_V1_IDS,
  QUESTION_BANK_V1_STUBS,
  QUESTION_FEED_ROLES,
  QUESTION_FEEDS_BY_ID,
  responsesUseQuestionBankV1,
  sliceResponsesForDomain,
} from '../intake/index.js';
import type { IntakeQuestionStub } from '../intake/types.js';

describe('normalizeWebsiteGate', () => {
  it('treats multi-page and landing as has_website', () => {
    expect(normalizeWebsiteGate({ a5: 'Yes, multi-page site' })).toBe('multi');
    expect(normalizeWebsiteGate({ a5: 'Yes, single landing page' })).toBe('single_landing');
  });

  it('treats under construction and no site as no_website branch bucket', () => {
    expect(normalizeWebsiteGate({ a5: 'Under construction' })).toBe('under_construction');
    expect(normalizeWebsiteGate({ a5: 'No website yet' })).toBe('no_website');
  });
});

describe('BRANCH_RULES', () => {
  it('has_website is true only for live site shapes', () => {
    const r1 = { a5: 'Yes, multi-page site' };
    expect(BRANCH_RULES.has_website(r1)).toBe(true);
    expect(BRANCH_RULES.no_website(r1)).toBe(false);

    const r2 = { a5: 'No website yet' };
    expect(BRANCH_RULES.has_website(r2)).toBe(false);
    expect(BRANCH_RULES.no_website(r2)).toBe(true);
  });

  it('maps Hospitality industry label to is_hospitality', () => {
    expect(BRANCH_RULES.is_hospitality({ a2: 'Hospitality' })).toBe(true);
    expect(BRANCH_RULES.is_hospitality({ a2: 'SaaS / Software' })).toBe(false);
  });

  it('detects CRM in d1 multi', () => {
    expect(BRANCH_RULES.has_crm({ d1: ['Spreadsheet', 'CRM (HubSpot)'] })).toBe(true);
    expect(BRANCH_RULES.no_crm({ d1: ['Spreadsheet'] })).toBe(true);
  });
});

describe('calcDataQualityScore', () => {
  const qs: IntakeQuestionStub[] = [
    { id: 'a1', priority: 'required' },
    { id: 'c6', priority: 'required', branchCondition: 'has_website' },
    { id: 'x1', priority: 'recommended' },
  ];

  it('uses 0.55/0.35/0.10 weights and empty tier as 1.0', () => {
    const emptyOpt: IntakeQuestionStub[] = [...qs, { id: 'o1', priority: 'optional', branchCondition: 'is_marine' }];
    const r = calcDataQualityScore(
      emptyOpt,
      { a1: 'ok', x1: 'yes', a5: 'Yes, multi-page site' },
    );
    expect(r.visibleOptional).toBe(0);
    expect(r.optionalWeight).toBe(1);
    expect(r.visibleRequired).toBe(2);
    expect(r.answeredRequired).toBe(1);
    expect(r.requiredWeight).toBeCloseTo(0.5);
    expect(r.answeredRecommended).toBe(1);
    expect(r.recommendedWeight).toBe(1);
    const expected =
      0.55 * r.requiredWeight + 0.35 * r.recommendedWeight + 0.1 * r.optionalWeight;
    expect(r.score).toBeCloseTo(expected);
  });

  it('hides branched required when gated out', () => {
    const r = calcDataQualityScore(qs, {
      a1: 'x',
      x1: '',
      a5: 'No website yet',
    });
    expect(r.visibleRequired).toBe(1);
    expect(r.answeredRequired).toBe(1);
    expect(r.requiredWeight).toBe(1);
  });
});

describe('filterVisibleQuestions', () => {
  it('filters by branchCondition', () => {
    const qs: IntakeQuestionStub[] = [
      { id: 'c6', priority: 'required', branchCondition: 'has_website' },
      { id: 'c_nosite_1', priority: 'recommended', branchCondition: 'no_website' },
    ];
    const site = filterVisibleQuestions(qs, { a5: 'Yes, multi-page site' });
    expect(site.map(q => q.id)).toEqual(['c6']);
    const nosite = filterVisibleQuestions(qs, { a5: 'No website yet' });
    expect(nosite.map(q => q.id)).toEqual(['c_nosite_1']);
  });
});

describe('discovery collection mode', () => {
  it('restricts visible questions to discovery surface', () => {
    const visible = filterVisibleQuestions(
      QUESTION_BANK_V1_STUBS,
      {
        a5: 'No website yet',
        a2: 'Hospitality',
      },
      { collectionMode: 'discovery' },
    );
    const ids = visible.map(q => q.id);
    expect(ids).toContain('a1');
    expect(ids).toContain('c_nosite_1');
    expect(ids).not.toContain('b3');
  });

  it('shows c_nosite_3 only when c_nosite_1 includes Social media (nosite_social branch)', () => {
    const base = { a5: 'No website yet' as const };
    const withoutSocial = filterVisibleQuestions(QUESTION_BANK_V1_STUBS, {
      ...base,
      c_nosite_1: ['Mostly word of mouth, offline, or referrals'],
    });
    expect(withoutSocial.map(q => q.id)).not.toContain('c_nosite_3');

    const withSocial = filterVisibleQuestions(QUESTION_BANK_V1_STUBS, {
      ...base,
      c_nosite_1: ['Social media', 'Marketplaces, directories, or other online platforms'],
    });
    expect(withSocial.map(q => q.id)).toContain('c_nosite_3');
  });
});

describe('sliceResponsesForDomain', () => {
  it('returns only keys present in responses', () => {
    const responses = { a1: 'Biz', f1: 'Goal', noise: 1 } as Record<string, unknown>;
    const recon = sliceResponsesForDomain('recon', responses);
    expect(recon).toEqual({ a1: 'Biz' });
    const strategy = sliceResponsesForDomain('strategy', responses);
    expect(strategy).toEqual({ f1: 'Goal' });
    expect(strategy).not.toHaveProperty('a4');
    expect(DOMAIN_TO_QUESTION_IDS.strategy).toContain('f1');
  });
});

describe('question feed roles', () => {
  it('rebuilds DOMAIN_TO_QUESTIONS_RAW without duplicate ids per domain', () => {
    const raw = buildDomainToQuestionsRawFromRoles(QUESTION_FEED_ROLES);
    for (const [, ids] of Object.entries(raw)) {
      const set = new Set(ids);
      expect(set.size).toBe(ids.length);
    }
  });

  it('QUESTION_FEEDS_BY_ID matches getDomainsForQuestionId for every bank id', () => {
    for (const id of QUESTION_BANK_V1_IDS) {
      const fromInverted = QUESTION_FEEDS_BY_ID[id] ?? [];
      const fromRoles = getDomainsForQuestionId(id);
      expect([...fromInverted].sort()).toEqual([...fromRoles].sort());
    }
  });

  it('marks c6 seo as secondary and ux as primary', () => {
    expect(isPrimaryFeedForDomain('c6', 'ux_conversion')).toBe(true);
    expect(isSecondaryFeedForDomain('c6', 'seo_digital')).toBe(true);
    expect(isPrimaryFeedForDomain('c6', 'seo_digital')).toBe(false);
  });

  it('marks b_restaurant_1 marketing primary and ux secondary', () => {
    expect(isPrimaryFeedForDomain('b_restaurant_1', 'marketing_utp')).toBe(true);
    expect(isSecondaryFeedForDomain('b_restaurant_1', 'ux_conversion')).toBe(true);
  });
});

describe('question-bank v1', () => {
  it('DOMAIN_TO_QUESTION_IDS references only ids present in bank JSON', () => {
    for (const [domain, ids] of Object.entries(DOMAIN_TO_QUESTION_IDS)) {
      for (const id of ids) {
        expect(QUESTION_BANK_V1_IDS.has(id), `${id} (domain ${domain})`).toBe(true);
      }
    }
  });

  it('every bank question id is referenced by at least one domain slice', () => {
    for (const id of QUESTION_BANK_V1_IDS) {
      const feeds = QUESTION_FEEDS_BY_ID[id];
      expect(feeds?.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  it('responsesUseQuestionBankV1 detects bank keys', () => {
    expect(responsesUseQuestionBankV1({ primary_goal: 'x' })).toBe(false);
    expect(responsesUseQuestionBankV1({ a1: 'Hotel' })).toBe(true);
  });

  it('deriveBankV1DataQuality returns null for legacy-only keys', () => {
    expect(deriveBankV1DataQuality({ primary_goal: 'grow' })).toBe(null);
  });

  it('getQuestionBankPromptLabel returns JSON label', () => {
    expect(getQuestionBankPromptLabel('a1')).toBe('Business description (one sentence)');
    expect(getQuestionBankPromptLabel('unknown_id')).toBeUndefined();
  });

  it('deriveBankV1DataQuality computes score for bank responses', () => {
    const dq = deriveBankV1DataQuality({
      a5: 'Yes, multi-page site',
      a1: 'Boutique hotel',
      c6: 'Slow mobile',
    });
    expect(dq).not.toBe(null);
    expect(dq!).toBeGreaterThan(0);
    expect(dq!).toBeLessThanOrEqual(1);
  });
});

describe('calcAiReadinessScore', () => {
  it('returns 0–100', () => {
    const { score } = calcAiReadinessScore({});
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('boosts when d4b and f7 look positive', () => {
    const low = calcAiReadinessScore({ d4b: 'no', f7: '' });
    const high = calcAiReadinessScore({
      d4b: 'Yes, we can export to CSV',
      f7: 'Owner',
      a8: '200–1,000',
      d6: 'Orders, customers, finance',
    });
    expect(high.score).toBeGreaterThan(low.score);
  });
});

describe('mergeLegacyResponsesIntoBankV1', () => {
  it('fills bank keys from legacy pre-brief / express fields', () => {
    const m = mergeLegacyResponsesIntoBankV1({
      intake_company_name: 'Acme',
      intake_industry: 'Hospitality',
      intake_company_website: 'https://acme.com',
      primary_goal: 'More direct bookings',
      biggest_pain: 'OTA fees eat margin',
      target_audience: 'Families',
      handles_payments: 'No — we use Stripe/PayPal/etc. hosted checkout',
      has_google_analytics: 'Yes, GA4',
    });
    expect(m.a1).toBe('Acme — Hospitality');
    expect(m.a2).toBe('Hospitality');
    expect(m.a5).toBe('Yes, multi-page site');
    expect(m.a6).toBe('Yes');
    expect(m.c3).toBe('Yes, GA4');
    expect(m.b1).toBe('Families');
    expect(m.f1).toBe('OTA fees eat margin');
  });

  it('does not overwrite explicit bank answers', () => {
    const m = mergeLegacyResponsesIntoBankV1({
      f1: 'Kept',
      primary_goal: 'ignored for f1',
      biggest_pain: 'also ignored',
    });
    expect(m.f1).toBe('Kept');
  });

  it('prefers biggest_pain over primary_goal for f1', () => {
    const m = mergeLegacyResponsesIntoBankV1({
      primary_goal: 'goal',
      biggest_pain: 'pain',
    });
    expect(m.f1).toBe('pain');
  });

  it('lets deriveBankV1DataQuality run on merged legacy-only payloads', () => {
    const merged = mergeLegacyResponsesIntoBankV1({
      intake_company_name: 'X',
      intake_industry: 'SaaS / Software',
      intake_company_website: 'none',
      primary_goal: 'grow',
      biggest_pain: 'manual work',
      target_audience: 'SMB',
      revenue_model: 'Subscription / SaaS',
      primary_cta: 'book',
      has_google_analytics: 'Yes, GA4',
      handles_payments: 'No payments on site',
      unique_value_prop: 'Fast',
    });
    expect(responsesUseQuestionBankV1(merged)).toBe(true);
    expect(deriveBankV1DataQuality(merged)).not.toBe(null);
  });
});

describe('question bank v1 vs QUESTION_FEED_ROLES contract', () => {
  it('question-bank.v1.json stub ids and QUESTION_FEED_ROLES keys are the same set', () => {
    const bankIds = new Set(QUESTION_BANK_V1_STUBS.map(q => q.id));
    const roleKeys = new Set(Object.keys(QUESTION_FEED_ROLES));
    const missingRoles = [...bankIds].filter(id => !roleKeys.has(id));
    const orphanRoles = [...roleKeys].filter(id => !bankIds.has(id));
    expect(missingRoles, `QUESTION_FEED_ROLES missing for JSON ids: ${missingRoles.join(', ')}`).toEqual([]);
    expect(orphanRoles, `QUESTION_FEED_ROLES has keys not in JSON: ${orphanRoles.join(', ')}`).toEqual([]);
  });
});
