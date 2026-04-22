import {
  getIntakeIntelligenceCoverageSummary,
  type IntakeIntelligenceContract,
} from '../../config/intake-intelligence-contract.js';
import { lintIntelligenceContractV1 } from '../lint-bank-policy/lint-intelligence-contract.js';

export interface IntakeQuestionQualityBaseline {
  totalQuestions: number;
  p0Questions: number;
  fullyCoveredQuestions: number;
  fullyCoveredP0Questions: number;
  errorCount: number;
  warningCount: number;
}

export interface IntakeQuestionQualityDelta {
  totalQuestionsDelta: number;
  p0QuestionsDelta: number;
  fullyCoveredQuestionsDelta: number;
  fullyCoveredP0QuestionsDelta: number;
  errorCountDelta: number;
  warningCountDelta: number;
}

export interface IntakeQuestionQualityReport {
  baseline: IntakeQuestionQualityBaseline;
  findingsByCode: Record<string, { error: number; warn: number }>;
  deltaFromBaseline?: IntakeQuestionQualityDelta;
}

export const INTAKE_QUESTION_QUALITY_BASELINE_V1: IntakeQuestionQualityBaseline = {
  totalQuestions: 78,
  p0Questions: 17,
  fullyCoveredQuestions: 17,
  fullyCoveredP0Questions: 17,
  errorCount: 0,
  warningCount: 2,
};

function toDelta(
  current: IntakeQuestionQualityBaseline,
  baseline: IntakeQuestionQualityBaseline,
): IntakeQuestionQualityDelta {
  return {
    totalQuestionsDelta: current.totalQuestions - baseline.totalQuestions,
    p0QuestionsDelta: current.p0Questions - baseline.p0Questions,
    fullyCoveredQuestionsDelta: current.fullyCoveredQuestions - baseline.fullyCoveredQuestions,
    fullyCoveredP0QuestionsDelta: current.fullyCoveredP0Questions - baseline.fullyCoveredP0Questions,
    errorCountDelta: current.errorCount - baseline.errorCount,
    warningCountDelta: current.warningCount - baseline.warningCount,
  };
}

export function buildIntakeQuestionQualityReport(args?: {
  contractResolver?: (questionId: string) => IntakeIntelligenceContract;
  baseline?: IntakeQuestionQualityBaseline;
}): IntakeQuestionQualityReport {
  const coverage = getIntakeIntelligenceCoverageSummary();
  const findings = lintIntelligenceContractV1({
    ...(args?.contractResolver ? { contractResolver: args.contractResolver } : {}),
  });
  const findingsByCode: Record<string, { error: number; warn: number }> = {};
  for (const item of findings) {
    const row = findingsByCode[item.code] ?? { error: 0, warn: 0 };
    if (item.severity === 'error') row.error += 1;
    else row.warn += 1;
    findingsByCode[item.code] = row;
  }

  const errorCount = findings.filter(item => item.severity === 'error').length;
  const warningCount = findings.filter(item => item.severity === 'warn').length;
  const baseline: IntakeQuestionQualityBaseline = {
    totalQuestions: coverage.totalQuestions,
    p0Questions: coverage.p0Questions,
    fullyCoveredQuestions: coverage.fullyCoveredQuestions,
    fullyCoveredP0Questions: coverage.fullyCoveredP0Questions,
    errorCount,
    warningCount,
  };

  return {
    baseline,
    findingsByCode,
    ...(args?.baseline ? { deltaFromBaseline: toDelta(baseline, args.baseline) } : {}),
  };
}

