import { describe, expect, it } from 'vitest';
import {
  listAnsweredPipelineRequiredIds,
  listMissingPipelineRequiredIds,
  newAuditStep1CollectionMode,
} from './newAuditValidation';

describe('listMissingPipelineRequiredIds', () => {
  it('returns non-empty when brief is empty', () => {
    const missing = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
    });
    expect(missing.length).toBeGreaterThan(0);
  });

  it('shrinks as required fields are filled', () => {
    const base = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
    });
    const withIndustry = listMissingPipelineRequiredIds({
      responses: {
        a2: { value: 'Healthcare', source: 'client' },
      },
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
    });
    expect(withIndustry.length).toBeLessThanOrEqual(base.length);
  });

  it('counts Step 0 Basics toward pipeline gates when brief responses omit a11/a12/a2', () => {
    const withoutStep0 = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
    });
    const withStep0Only = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
      step0Basics: {
        url: 'https://example.com',
        name: 'Acme',
        industry: 'Healthcare',
        industrySpecify: '',
        answerSource: 'client',
      },
    });
    for (const id of ['a11', 'a12', 'a2']) {
      expect(withoutStep0).toContain(id);
      expect(withStep0Only).not.toContain(id);
    }
    expect(withStep0Only.length).toBeLessThan(withoutStep0.length);
  });

  it('uses full-bank required set after tailored phase unlock for consultant flow', () => {
    const locked = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: false,
      tailoredPhaseUnlocked: false,
    });
    const unlocked = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: false,
      tailoredPhaseUnlocked: true,
    });
    expect(unlocked.length).toBeGreaterThanOrEqual(locked.length);
  });

  it('uses pre-brief required set for no-site before tailored unlock', () => {
    const locked = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: true,
      briefProductMode: 'full',
      isClientSelfServe: false,
      tailoredPhaseUnlocked: false,
    });
    const unlocked = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: true,
      briefProductMode: 'full',
      isClientSelfServe: false,
      tailoredPhaseUnlocked: true,
    });
    expect(locked.length).toBeLessThanOrEqual(unlocked.length);
  });
});

describe('listAnsweredPipelineRequiredIds', () => {
  it('includes ids that are answered for pipeline gates', () => {
    const answered = listAnsweredPipelineRequiredIds({
      responses: {
        a2: { value: 'Healthcare', source: 'client' },
      },
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
    });
    expect(answered).toContain('a2');
  });

  it('includes Step 0 basics as answered when brief cells are empty', () => {
    const answered = listAnsweredPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
      isClientSelfServe: true,
      step0Basics: {
        url: 'https://example.com',
        name: 'Acme',
        industry: 'Healthcare',
        industrySpecify: '',
        answerSource: 'client',
      },
    });
    expect(answered).toEqual(expect.arrayContaining(['a11', 'a12', 'a2']));
  });
});

describe('newAuditStep1CollectionMode', () => {
  it('starts no-site Step1 in pre-brief mode before tailored unlock', () => {
    expect(
      newAuditStep1CollectionMode({
        noPublicWebsite: true,
        isClientSelfServe: false,
        tailoredPhaseUnlocked: false,
      }),
    ).toBe('pre_brief');
  });

  it('returns discovery for consultant no-site after tailored unlock', () => {
    expect(
      newAuditStep1CollectionMode({
        noPublicWebsite: true,
        isClientSelfServe: false,
        tailoredPhaseUnlocked: true,
      }),
    ).toBe('discovery');
  });
});
