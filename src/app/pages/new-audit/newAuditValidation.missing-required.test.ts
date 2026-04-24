import { describe, expect, it } from 'vitest';
import { listAnsweredPipelineRequiredIds, listMissingPipelineRequiredIds } from './newAuditValidation';

describe('listMissingPipelineRequiredIds', () => {
  it('returns non-empty when brief is empty', () => {
    const missing = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
    });
    expect(missing.length).toBeGreaterThan(0);
  });

  it('shrinks as required fields are filled', () => {
    const base = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
    });
    const withIndustry = listMissingPipelineRequiredIds({
      responses: {
        a2: { value: 'Healthcare', source: 'client' },
      },
      noPublicWebsite: false,
      briefProductMode: 'full',
    });
    expect(withIndustry.length).toBeLessThanOrEqual(base.length);
  });

  it('counts Step 0 Basics toward pipeline gates when brief responses omit a11/a12/a2', () => {
    const withoutStep0 = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
    });
    const withStep0Only = listMissingPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
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
});

describe('listAnsweredPipelineRequiredIds', () => {
  it('includes ids that are answered for pipeline gates', () => {
    const answered = listAnsweredPipelineRequiredIds({
      responses: {
        a2: { value: 'Healthcare', source: 'client' },
      },
      noPublicWebsite: false,
      briefProductMode: 'full',
    });
    expect(answered).toContain('a2');
  });

  it('includes Step 0 basics as answered when brief cells are empty', () => {
    const answered = listAnsweredPipelineRequiredIds({
      responses: {},
      noPublicWebsite: false,
      briefProductMode: 'full',
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
