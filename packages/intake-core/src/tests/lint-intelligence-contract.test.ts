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
});
