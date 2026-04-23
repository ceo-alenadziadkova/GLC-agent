import { describe, expect, it } from 'vitest';

import {
  getIntakeIntelligenceContract,
  INTAKE_INTELLIGENCE_P0_IDS,
} from '../config/intake-intelligence-contract.js';
import { lintIntelligenceContractV1 } from '../core/lint-bank-policy/lint-intelligence-contract.js';

describe('lintIntelligenceContractV1', () => {
  it('reports no intelligence contract errors for the current bank', () => {
    const findings = lintIntelligenceContractV1();
    const errors = findings.filter(f => f.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('fails when a P0 question misses required_now fields', () => {
    const targetId = INTAKE_INTELLIGENCE_P0_IDS[0];
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === targetId) return {};
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_REQUIRED_NOW_MISSING')).toBe(true);
  });

  it('fails when semanticDomain is outside the diagnostic spine', () => {
    const targetId = INTAKE_INTELLIGENCE_P0_IDS[0];
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === targetId) {
          return {
            ...getIntakeIntelligenceContract(questionId),
            semanticDomain: 'not_a_spine_domain' as never,
          };
        }
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_SEMANTIC_DOMAIN_INVALID')).toBe(true);
  });

  it('warns when non-P0 todo review date format is invalid', () => {
    const targetNonP0 = 'a1';
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === targetNonP0) {
          return {
            ...getIntakeIntelligenceContract(questionId),
            todo: {
              ownerDomain: 'product',
              reviewByIsoDate: '2026/07/31',
              todoReason: 'test-invalid-date',
            },
          };
        }
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(
      findings.some(
        f => f.code === 'INTELLIGENCE_TODO_REVIEW_DATE_INVALID' && f.severity === 'warn',
      ),
    ).toBe(true);
  });

  it('warns when non-P0 todo metadata is missing', () => {
    const targetNonP0 = 'a1';
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === targetNonP0) {
          return {};
        }
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_TODO_METADATA_MISSING')).toBe(true);
  });

  it('treats generic anti-pattern checks as errors', () => {
    const findings = lintIntelligenceContractV1({
      labelOverrides: { f1: 'Anything else we should know?' },
    });
    const genericFindings = findings.filter(f => f.code === 'INTELLIGENCE_ANTIPATTERN_GENERIC');
    expect(genericFindings.length).toBeGreaterThan(0);
    expect(genericFindings.every(f => f.severity === 'error')).toBe(true);
  });

  it('treats leading labels as errors when the heuristic matches', () => {
    const findings = lintIntelligenceContractV1({
      labelOverrides: { f1: 'Do you agree this is important?' },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_ANTIPATTERN_LEADING' && f.severity === 'error')).toBe(true);
  });

  it('warns about duplicate intent when semantic domain and impact target are indistinguishable', () => {
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === 'f1' || questionId === 'f2') {
          return {
            whyAsked: 'This decides the same roadmap path for the same goal.',
            semanticDomain: 'value',
            decisionImpact: [
              {
                target: 'strategy.primary_problem',
                weight: 'high',
                effectDescription: 'same effect',
              },
            ],
          };
        }
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_DUPLICATE_INTENT' && f.severity === 'warn')).toBe(
      true,
    );
  });

  it('fails when ownerDomain mismatches decisionImpact target domain', () => {
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === 'f1') {
          return {
            ...getIntakeIntelligenceContract(questionId),
            stewardship: {
              ownerDomain: 'seo_digital',
              reviewByIsoDate: '2026-06-01',
            },
          };
        }
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_OWNER_DOMAIN_MISMATCH' && f.severity === 'error')).toBe(
      true,
    );
  });

  it('treats low-gain whyAsked phrases as errors', () => {
    const findings = lintIntelligenceContractV1({
      contractResolver: questionId => {
        if (questionId === 'f1') {
          return {
            ...getIntakeIntelligenceContract(questionId),
            whyAsked: 'This is just for context only.',
          };
        }
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(findings.some(f => f.code === 'INTELLIGENCE_LOW_GAIN_WHY_ASKED' && f.severity === 'error')).toBe(
      true,
    );
  });
});
