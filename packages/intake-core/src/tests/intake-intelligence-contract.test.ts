import { describe, expect, it } from 'vitest';

import {
  getIntakeIntelligenceContract,
  getIntakeIntelligenceCoverageSummary,
  hasIntakeIntelligenceRequiredNow,
  INTAKE_INTELLIGENCE_P0_IDS,
  isValidIntakeIntelligenceTodo,
  projectIntakeIntelligenceRequiredNow,
} from '../config/intake-intelligence-contract.js';
import { QUESTION_BANK_V1_IDS } from '../question-bank.js';

describe('intake intelligence contract', () => {
  it('has required_now fields for all P0 questions', () => {
    for (const questionId of INTAKE_INTELLIGENCE_P0_IDS) {
      const contract = getIntakeIntelligenceContract(questionId);
      expect(
        hasIntakeIntelligenceRequiredNow(contract),
        `P0 question "${questionId}" must define whyAsked, semanticDomain, and decisionImpact`,
      ).toBe(true);
    }
  });

  it('requires valid todo metadata for non-P0 questions in sprint 1 mode', () => {
    const p0Set = new Set(INTAKE_INTELLIGENCE_P0_IDS);
    for (const questionId of QUESTION_BANK_V1_IDS) {
      if (p0Set.has(questionId)) continue;
      const contract = getIntakeIntelligenceContract(questionId);
      expect(
        isValidIntakeIntelligenceTodo(contract.todo),
        `non-P0 question "${questionId}" must keep todo metadata with ownerDomain/reviewByIsoDate/todoReason`,
      ).toBe(true);
    }
  });

  it('exposes deterministic baseline coverage summary', () => {
    const summary = getIntakeIntelligenceCoverageSummary();
    expect(summary.totalQuestions).toBe(78);
    expect(summary.p0Questions).toBe(INTAKE_INTELLIGENCE_P0_IDS.length);
    expect(summary.fullyCoveredQuestions).toBe(17);
    expect(summary.fullyCoveredP0Questions).toBe(summary.p0Questions);
    expect(summary.coverageRatio).toBeCloseTo(17 / 78, 8);
    expect(summary.p0CoverageRatio).toBe(1);
  });

  it('projects required_now payload only for complete contracts', () => {
    const p0Projected = projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract('f1'));
    expect(p0Projected).toBeDefined();
    expect(p0Projected?.whyAsked).toBeTruthy();
    expect(Array.isArray(p0Projected?.decisionImpact)).toBe(true);

    const nonP0Projected = projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract('a1'));
    expect(nonP0Projected).toBeUndefined();
  });
});
