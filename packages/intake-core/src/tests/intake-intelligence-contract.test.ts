import { describe, expect, it } from 'vitest';

import {
  getIntakeIntelligenceContract,
  getIntakeIntelligenceCoverageSummary,
  getIntakeIntelligenceSprint2CoverageSummary,
  hasIntakeIntelligenceRequiredNow,
  INTAKE_INTELLIGENCE_P0_IDS,
  projectIntakeIntelligenceRequiredNow,
} from '../config/intake-intelligence-contract.js';
import {
  INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE,
  INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS,
  isIntakeIntelligenceSprint2Complete,
} from '../config/intake-intelligence-sprint2.js';
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

  it('requires full sprint2-complete contract shape for all questions', () => {
    for (const questionId of QUESTION_BANK_V1_IDS) {
      const contract = getIntakeIntelligenceContract(questionId);
      expect(
        isIntakeIntelligenceSprint2Complete(contract, hasIntakeIntelligenceRequiredNow),
        `question "${questionId}" must include full intelligence contract without todo fallback`,
      ).toBe(true);
    }
  });

  it('exposes deterministic baseline coverage summary', () => {
    const summary = getIntakeIntelligenceCoverageSummary();
    expect(summary.totalQuestions).toBe(78);
    expect(summary.p0Questions).toBe(INTAKE_INTELLIGENCE_P0_IDS.length);
    expect(summary.fullyCoveredQuestions).toBe(78);
    expect(summary.fullyCoveredP0Questions).toBe(summary.p0Questions);
    expect(summary.coverageRatio).toBeCloseTo(1, 8);
    expect(summary.p0CoverageRatio).toBe(1);
  });

  it('covers the full Sprint 2 gate with complete contracts', () => {
    const s2 = getIntakeIntelligenceSprint2CoverageSummary();
    expect(s2.gateQuestionCount).toBe(47);
    expect(s2.sprint2CompleteQuestions).toBeGreaterThanOrEqual(47);
    expect(s2.sprint2CompleteRatio).toBe(1);
  });

  it('tracks the deterministic remainder outside the Sprint 2 gate for the next enrichment wave', () => {
    expect(INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE.length).toBe(31);
    const outside = new Set(INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE);
    expect(INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS.length).toBe(47);
    for (const id of INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS) {
      expect(outside.has(id)).toBe(false);
    }
    expect(new Set([...outside, ...INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS]).size).toBe(78);
  });

  it('projects required_now payload only for complete contracts', () => {
    const p0Projected = projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract('f1'));
    expect(p0Projected).toBeDefined();
    expect(p0Projected?.whyAsked).toBeTruthy();
    expect(Array.isArray(p0Projected?.decisionImpact)).toBe(true);

    const nonP0Projected = projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract('e4'));
    expect(nonP0Projected).toBeDefined();
    expect(nonP0Projected?.semanticDomain).toBe('risks');
  });

  it('keeps all bank questions on full contract metadata without todo deferrals', () => {
    for (const questionId of QUESTION_BANK_V1_IDS) {
      const contract = getIntakeIntelligenceContract(questionId);
      expect(contract.todo, `question "${questionId}" should not rely on todo fallback`).toBeUndefined();
      expect(
        hasIntakeIntelligenceRequiredNow(contract),
        `question "${questionId}" must keep required_now fields`,
      ).toBe(true);
    }
  });
});
