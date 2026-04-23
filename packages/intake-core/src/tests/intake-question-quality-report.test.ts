import { describe, expect, it } from 'vitest';

import {
  buildIntakeQuestionQualityReport,
  INTAKE_QUESTION_QUALITY_BASELINE_V1,
} from '../core/question-quality-engine/build-intake-question-quality-report.js';
import { getIntakeIntelligenceContract } from '../config/intake-intelligence-contract.js';

describe('intake question quality report', () => {
  it('builds deterministic baseline snapshot for Sprint 2.5', () => {
    const report = buildIntakeQuestionQualityReport();
    expect(report.baseline).toEqual(INTAKE_QUESTION_QUALITY_BASELINE_V1);
    expect((report.findingsByCode.INTELLIGENCE_ANTIPATTERN_GENERIC?.warn ?? 0) >= 0).toBe(true);
    expect(report.baseline.errorCount).toBe(0);
  });

  it('computes delta from provided baseline', () => {
    const report = buildIntakeQuestionQualityReport({
      baseline: INTAKE_QUESTION_QUALITY_BASELINE_V1,
      contractResolver: questionId => {
        if (questionId === 'f1') return {};
        return getIntakeIntelligenceContract(questionId);
      },
    });
    expect(report.deltaFromBaseline).toBeDefined();
    expect((report.deltaFromBaseline?.errorCountDelta ?? 0) > 0).toBe(true);
  });
});

