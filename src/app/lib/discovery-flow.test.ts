/**
 * Behaviour: public discovery branching and findings (see discovery-flow.ts, docs/QUESTION_BANK.md).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { DISCOVERY_BANK_IDS } from '@glc/intake-core';
import {
  DISCOVERY_WIZARD_BANK_IDS,
  buildQuestionSequence,
  computeFindings,
  computeScore,
  getQuestion,
  setDiscoveryUiFragmentQuestions,
} from './discovery-flow';

afterEach(() => {
  setDiscoveryUiFragmentQuestions(null);
});

describe('Discovery wizard vs intake policy', () => {
  it('every wizard bank id is in modes.discovery.included', () => {
    for (const id of DISCOVERY_WIZARD_BANK_IDS) {
      expect(DISCOVERY_BANK_IDS.has(id), `id ${id} not in discovery policy`).toBe(true);
    }
  });
});

describe('buildQuestionSequence', () => {
  it('includes d1b when CRM not selected in d1', () => {
    const seq = buildQuestionSequence({ d1: ['Email'] });
    expect(seq).toContain('d1b');
    expect(seq.indexOf('d1b')).toBeGreaterThan(seq.indexOf('d1'));
  });

  it('omits d1b when CRM is in d1', () => {
    const seq = buildQuestionSequence({ d1: ['CRM', 'Email'] });
    expect(seq).not.toContain('d1b');
  });

  it('puts a2 before a1 (layout order, not alphabetical)', () => {
    const seq = buildQuestionSequence({});
    expect(seq.indexOf('a2')).toBeLessThan(seq.indexOf('a1'));
  });

  it('has one more step without CRM than with CRM', () => {
    const noCrm = buildQuestionSequence({ d1: ['Email'] });
    const withCrm = buildQuestionSequence({ d1: ['CRM'] });
    expect(noCrm.length).toBe(withCrm.length + 1);
  });
});

describe('getQuestion', () => {
  it('returns known question', () => {
    const q = getQuestion('a2');
    expect(q?.id).toBe('a2');
    expect(q?.type).toBe('single_choice');
  });

  it('returns undefined for unknown id', () => {
    expect(getQuestion('nonexistent')).toBeUndefined();
  });
});

describe('computeFindings and computeScore', () => {
  it('emits no_crm_whatsapp finding when WhatsApp channel without CRM', () => {
    const answers = {
      a2: 'Retail',
      a4: 'Just me',
      a7: 'Growing fast',
      d1: ['Email'],
      c_nosite_1: ['Google / search'],
      c_nosite_4: ['WhatsApp'],
      d2: 'Following up with leads and prospects',
      f1: ['Not enough qualified leads or new customers'],
    };
    const findings = computeFindings(answers);
    expect(findings.some(f => f.id === 'no_crm_whatsapp')).toBe(true);
    expect(computeScore(answers)).toBeLessThanOrEqual(4);
  });

  it('returns score 5 when no findings (answers avoid all finding rules)', () => {
    const answers = {
      a2: 'Retail',
      a4: '11–50',
      a7: 'Mature and optimising',
      d1: ['CRM', 'Email', 'Project or task tool'],
      c_nosite_1: ['Google / search', 'Social media'],
      c_nosite_4: ['Email'],
      d2: 'Something else',
      f1: ['Other'],
    };
    expect(computeFindings(answers).length).toBe(0);
    expect(computeScore(answers)).toBe(5);
  });
});
