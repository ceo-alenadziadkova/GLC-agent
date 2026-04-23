import {
  getIntakeIntelligenceContract,
  hasIntakeIntelligenceRequiredNow,
  isValidIntakeIntelligenceTodo,
  INTAKE_INTELLIGENCE_P0_IDS,
  type IntakeIntelligenceContract,
} from '../../config/intake-intelligence-contract.js';
import {
  INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS,
  isIntakeIntelligenceSprint2Complete,
} from '../../config/intake-intelligence-sprint2.js';
import { QUESTION_BANK_V1_IDS, getQuestionBankSchemaMeta } from '../../question-bank.js';
import { DIAGNOSTIC_SPINE_CATEGORIES } from '../../audit-contract.js';

import type { LintFinding } from './types.js';

const CORE_SPINE = new Set(DIAGNOSTIC_SPINE_CATEGORIES);
const LOW_GAIN_WHY_ASKED_FRAGMENTS = [
  'just for context',
  'for context only',
  'nice to know',
  'general background',
];
const OUTSIDE_SCOPE_WHY_ASKED_FRAGMENTS = ['anything else', 'general overview', 'catch-all context'];
const EMBEDDING_DUPLICATE_THRESHOLD = 0.92;

const OWNER_DOMAIN_SET = new Set([
  'recon',
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
  'strategy',
]);

function deriveOwnerDomainFromDecisionTarget(target: string | undefined): string | null {
  if (!target) return null;
  const [domain] = target.split('.');
  if (domain && OWNER_DOMAIN_SET.has(domain)) return domain;
  return null;
}

function normalizeIntentText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactIntentFingerprint(raw: string): string {
  const tokens = normalizeIntentText(raw)
    .split(' ')
    .filter(Boolean)
    .filter(token => token.length > 2);
  return [...new Set(tokens)].sort().join(' ');
}

function toTokenVector(raw: string): Map<string, number> {
  const vec = new Map<string, number>();
  for (const token of normalizeIntentText(raw).split(' ').filter(Boolean)) {
    if (token.length <= 2) continue;
    vec.set(token, (vec.get(token) ?? 0) + 1);
  }
  return vec;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const v of a.values()) normA += v * v;
  for (const v of b.values()) normB += v * v;
  for (const [token, av] of a.entries()) {
    const bv = b.get(token) ?? 0;
    dot += av * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

function warnForAntiPatternHeuristics(questionId: string, label: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const text = label.toLowerCase();
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (text.includes('tell us about your business') || text.includes('anything else')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_GENERIC',
      severity: 'error',
      message: `question "${questionId}" may be too generic; ensure decision impact is explicit.`,
      detail: label,
    });
  }
  if (text.includes('do you agree') || text.includes('is it important')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_LEADING',
      severity: 'error',
      message: `question "${questionId}" may be leading; wording should remain neutral.`,
      detail: label,
    });
  }
  if (text.includes('how important is importance') || text.includes('important importance')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_TAUTOLOGICAL',
      severity: 'error',
      message: `question "${questionId}" may be tautological and not add diagnostic signal.`,
      detail: label,
    });
  }
  if (text.includes('likes') || text.includes('followers') || text.includes('vanity')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_VANITY',
      severity: 'error',
      message: `question "${questionId}" may optimize vanity metrics instead of decision signal.`,
      detail: label,
    });
  }
  if (
    normalized === 'what do you do?' ||
    normalized === 'tell us more' ||
    normalized === 'describe your company'
  ) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_OUTSIDE_SCOPE',
      severity: 'error',
      message: `question "${questionId}" may be outside Core Diagnostic Spine scope.`,
      detail: label,
    });
  }
  if (text.includes('any comments') || text.includes('other notes')) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_LOW_GAIN',
      severity: 'error',
      message: `question "${questionId}" may have low information gain without explicit decision impact.`,
      detail: label,
    });
  }
  if (text.includes(' and ') && (text.includes('?') || text.includes(','))) {
    findings.push({
      code: 'INTELLIGENCE_ANTIPATTERN_DOUBLE_BARRELED',
      severity: 'error',
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
      severity: 'warn',
      message: `question "${questionId}" is outside P0 but missing todo metadata (ownerDomain/reviewByIsoDate/todoReason).`,
      detail: questionId,
    });
    return findings;
  }
  if (!todo.ownerDomain || !todo.reviewByIsoDate || !todo.todoReason) {
    findings.push({
      code: 'INTELLIGENCE_TODO_METADATA_INCOMPLETE',
      severity: 'warn',
      message: `question "${questionId}" has incomplete todo metadata.`,
      detail: questionId,
    });
  }
  if (!isValidIntakeIntelligenceTodo(todo)) {
    findings.push({
      code: 'INTELLIGENCE_TODO_REVIEW_DATE_INVALID',
      severity: 'warn',
      message: `question "${questionId}" todo.reviewByIsoDate must use YYYY-MM-DD format.`,
      detail: todo.reviewByIsoDate,
    });
  }
  return findings;
}

function lintOwnerDomainConsistency(questionId: string, contract: IntakeIntelligenceContract): LintFinding[] {
  const findings: LintFinding[] = [];
  const target = contract.decisionImpact?.[0]?.target;
  const expectedOwnerDomain = deriveOwnerDomainFromDecisionTarget(target);
  if (!expectedOwnerDomain) return findings;
  const currentOwnerDomain = contract.stewardship?.ownerDomain ?? contract.todo?.ownerDomain;
  if (!currentOwnerDomain) return findings;
  if (currentOwnerDomain !== expectedOwnerDomain) {
    findings.push({
      code: 'INTELLIGENCE_OWNER_DOMAIN_MISMATCH',
      severity: 'error',
      message:
        `question "${questionId}" ownerDomain "${currentOwnerDomain}" is inconsistent with decisionImpact target "${target}".` +
        ` Expected "${expectedOwnerDomain}".`,
      detail: questionId,
    });
  }
  return findings;
}

function hasAntiPatternExemption(contract: IntakeIntelligenceContract, code: string): boolean {
  return Array.isArray(contract.antiPatternExemptions) && contract.antiPatternExemptions.includes(code);
}

/**
 * Intake Intelligence Contract lint:
 * - P0 questions must include required_now fields (whyAsked + semanticDomain + decisionImpact[0])
 * - semanticDomain must map to Core Diagnostic Spine
 * - Sprint 2 gate ids must satisfy full contract (stewardship, signalContribution, follow-up, no todo)
 * - anti-pattern heuristics are enforced as errors except duplicate-intent.
 */
export function lintIntelligenceContractV1(args?: {
  contractResolver?: (questionId: string) => IntakeIntelligenceContract;
  /** Test-only: override bank label text for anti-pattern heuristics without mutating JSON. */
  labelOverrides?: Record<string, string>;
}): LintFinding[] {
  const findings: LintFinding[] = [];
  const p0Set = new Set(INTAKE_INTELLIGENCE_P0_IDS);
  const sprint2Gate = new Set(INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS);
  const knownIds = new Set(QUESTION_BANK_V1_IDS);
  const resolver = args?.contractResolver ?? getIntakeIntelligenceContract;
  const labelOverrides = args?.labelOverrides;
  const completeContracts: Array<{ questionId: string; contract: IntakeIntelligenceContract }> = [];

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
    findings.push(...lintOwnerDomainConsistency(questionId, contract));

    if (!isP0) {
      const sprint2Done = isIntakeIntelligenceSprint2Complete(contract, hasIntakeIntelligenceRequiredNow);
      if (!(sprint2Gate.has(questionId) && sprint2Done)) {
        findings.push(...lintNonP0TodoMetadata(questionId, contract));
      }
    }

    if (sprint2Gate.has(questionId) && !isIntakeIntelligenceSprint2Complete(contract, hasIntakeIntelligenceRequiredNow)) {
      findings.push({
        code: 'INTELLIGENCE_SPRINT2_INCOMPLETE',
        severity: 'error',
        message: `question "${questionId}" is in the Sprint 2 gate set but is missing the full intelligence contract (stewardship, signalContribution with info-gain floor, follow-up policy, stop rule, and no todo deferral).`,
        detail: questionId,
      });
    }

    const labelForLint = labelOverrides?.[questionId] ?? meta?.label;
    if (labelForLint) {
      for (const finding of warnForAntiPatternHeuristics(questionId, labelForLint)) {
        if (hasAntiPatternExemption(contract, finding.code)) continue;
        findings.push(finding);
      }
    }

    if (
      typeof contract.whyAsked === 'string' &&
      LOW_GAIN_WHY_ASKED_FRAGMENTS.some(fragment =>
        normalizeIntentText(contract.whyAsked as string).includes(fragment),
      )
    ) {
      findings.push({
        code: 'INTELLIGENCE_LOW_GAIN_WHY_ASKED',
        severity: 'error',
        message: `question "${questionId}" whyAsked may be too generic and low-information.`,
        detail: contract.whyAsked,
      });
    }
    if (
      typeof contract.whyAsked === 'string' &&
      OUTSIDE_SCOPE_WHY_ASKED_FRAGMENTS.some(fragment =>
        normalizeIntentText(contract.whyAsked as string).includes(fragment),
      )
    ) {
      findings.push({
        code: 'INTELLIGENCE_OUTSIDE_SCOPE_WHY_ASKED',
        severity: 'error',
        message: `question "${questionId}" whyAsked appears outside diagnostic scope and must be tightened.`,
        detail: contract.whyAsked,
      });
    }

    if (hasIntakeIntelligenceRequiredNow(contract)) {
      completeContracts.push({ questionId, contract });
    }
  }

  const seenDuplicateIntentPairs = new Set<string>();
  const seenEmbeddingPairs = new Set<string>();
  for (let i = 0; i < completeContracts.length; i += 1) {
    const left = completeContracts[i];
    if (!left) continue;
    const leftTarget = left.contract.decisionImpact?.[0]?.target;
    const leftWhy = left.contract.whyAsked;
    if (!leftTarget || !leftWhy || !left.contract.semanticDomain) continue;
    const leftFingerprint = compactIntentFingerprint(leftWhy);
    if (!leftFingerprint) continue;

    for (let j = i + 1; j < completeContracts.length; j += 1) {
      const right = completeContracts[j];
      if (!right) continue;
      const rightTarget = right.contract.decisionImpact?.[0]?.target;
      const rightWhy = right.contract.whyAsked;
      if (!rightTarget || !rightWhy || !right.contract.semanticDomain) continue;
      if (left.contract.semanticDomain !== right.contract.semanticDomain) continue;
      const rightFingerprint = compactIntentFingerprint(rightWhy);
      if (!rightFingerprint) continue;
      const pair = [left.questionId, right.questionId].sort((a, b) => a.localeCompare(b)).join('::');
      if (leftTarget === rightTarget && leftFingerprint === rightFingerprint) {
        if (!seenDuplicateIntentPairs.has(pair)) {
          seenDuplicateIntentPairs.add(pair);
          findings.push({
            code: 'INTELLIGENCE_DUPLICATE_INTENT',
            severity: 'warn',
            message:
              `questions "${left.questionId}" and "${right.questionId}" have indistinguishable intent` +
              ` for semanticDomain="${left.contract.semanticDomain}" and target="${leftTarget}".`,
            detail: pair,
          });
        }
      }
      const sim = cosineSimilarity(toTokenVector(leftWhy), toTokenVector(rightWhy));
      if (sim >= EMBEDDING_DUPLICATE_THRESHOLD && leftTarget === rightTarget && !seenEmbeddingPairs.has(pair)) {
        seenEmbeddingPairs.add(pair);
        findings.push({
          code: 'INTELLIGENCE_EMBEDDING_DUPLICATE',
          severity: 'error',
          message:
            `questions "${left.questionId}" and "${right.questionId}" exceed semantic similarity threshold` +
            ` (${sim.toFixed(2)} >= ${EMBEDDING_DUPLICATE_THRESHOLD}) for target "${leftTarget}".`,
          detail: pair,
        });
      }
    }
  }

  return findings;
}
