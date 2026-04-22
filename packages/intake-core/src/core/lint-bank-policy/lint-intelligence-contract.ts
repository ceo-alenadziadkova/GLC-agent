import {
  getIntakeIntelligenceContract,
  hasIntakeIntelligenceRequiredNow,
  isValidIntakeIntelligenceTodo,
  INTAKE_INTELLIGENCE_P0_IDS,
  type IntakeIntelligenceContract,
} from '../../config/intake-intelligence-contract.js';
import { QUESTION_BANK_V1_IDS, getQuestionBankSchemaMeta } from '../../question-bank.js';
import { DIAGNOSTIC_SPINE_CATEGORIES } from '../../audit-contract.js';

import type { LintFinding } from './types.js';

const CORE_SPINE = new Set(DIAGNOSTIC_SPINE_CATEGORIES);

function warnForAntiPatternHeuristics(questionId: string, label: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const text = label.toLowerCase();
  if (text.includes('tell us about your business') || text.includes('anything else')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_GENERIC',
      severity: 'warning',
      message: `question "${questionId}" may be too generic; ensure decision impact is explicit.`,
      detail: label,
    });
  }
  if (text.includes('do you agree') || text.includes('is it important')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_LEADING',
      severity: 'warning',
      message: `question "${questionId}" may be leading; wording should remain neutral.`,
      detail: label,
    });
  }
  if (text.includes(' and ') && (text.includes('?') || text.includes(','))) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_DOUBLE_BARRELED',
      severity: 'warning',
      message: `question "${questionId}" may include multiple prompts in one sentence.`,
      detail: label,
    });
  }
  return findings;
}

function lintNonP0TodoMetadata(questionId: string, contract: IntakeIntelligenceContract): LintFinding[] {
  const findings: LintFinding[] = [];
  const todo = contract.todo;
  if (!todo) {
    findings.push({
      code: 'INTELLIGENCE_TODO_METADATA_MISSING',
      severity: 'warning',
      message: `question "${questionId}" is outside P0 but missing todo metadata (ownerDomain/reviewByIsoDate/todoReason).`,
      detail: questionId,
    });
    return findings;
  }
  if (!todo.ownerDomain || !todo.reviewByIsoDate || !todo.todoReason) {
    findings.push({
      code: 'INTELLIGENCE_TODO_METADATA_INCOMPLETE',
      severity: 'warning',
      message: `question "${questionId}" has incomplete todo metadata.`,
      detail: questionId,
    });
  }
  if (!isValidIntakeIntelligenceTodo(todo)) {
    findings.push({
      code: 'INTELLIGENCE_TODO_REVIEW_DATE_INVALID',
      severity: 'warning',
      message: `question "${questionId}" todo.reviewByIsoDate must use YYYY-MM-DD format.`,
      detail: todo.reviewByIsoDate,
    });
  }
  return findings;
}

/**
 * Sprint 1 guardrails for Intake Intelligence Contract:
 * - P0 questions must include required_now fields (whyAsked + semanticDomain + decisionImpact[0])
 * - semanticDomain must map to Core Diagnostic Spine
 * - anti-pattern checks are warnings only in this phase
 */
export function lintIntelligenceContractV1(args?: {
  contractResolver?: (questionId: string) => IntakeIntelligenceContract;
}): LintFinding[] {
  const findings: LintFinding[] = [];
  const p0Set = new Set(INTAKE_INTELLIGENCE_P0_IDS);
  const knownIds = new Set(QUESTION_BANK_V1_IDS);
  const resolver = args?.contractResolver ?? getIntakeIntelligenceContract;

  for (const p0Id of INTAKE_INTELLIGENCE_P0_IDS) {
    if (!knownIds.has(p0Id)) {
      findings.push({
        code: 'INTELLIGENCE_P0_UNKNOWN_QUESTION_ID',
        severity: 'error',
        message: `P0 intelligence scope references unknown question id "${p0Id}".`,
        detail: p0Id,
      });
    }
  }

  for (const questionId of QUESTION_BANK_V1_IDS) {
    const meta = getQuestionBankSchemaMeta(questionId);
    const contract = resolver(questionId);
    const isP0 = p0Set.has(questionId);

    if (isP0 && !hasIntakeIntelligenceRequiredNow(contract)) {
      findings.push({
        code: 'INTELLIGENCE_REQUIRED_NOW_MISSING',
        severity: 'error',
        message: `P0 question "${questionId}" is missing required_now metadata (whyAsked, semanticDomain, decisionImpact).`,
        detail: questionId,
      });
    }

    if (contract.semanticDomain && !CORE_SPINE.has(contract.semanticDomain)) {
      findings.push({
        code: 'INTELLIGENCE_SEMANTIC_DOMAIN_INVALID',
        severity: 'error',
        message: `question "${questionId}" has semanticDomain "${contract.semanticDomain}" outside Core Diagnostic Spine.`,
        detail: questionId,
      });
    }

    if (!isP0) {
      findings.push(...lintNonP0TodoMetadata(questionId, contract));
    }

    if (meta?.label) {
      findings.push(...warnForAntiPatternHeuristics(questionId, meta.label));
    }
  }

  return findings;
}
