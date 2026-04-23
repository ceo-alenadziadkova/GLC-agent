/**
 * Follow-up policy evaluation (pure). Runtime semantics vs queue control are documented in
 * docs/adrs/ADR-INTAKE-FOLLOWUP-POLICY-RUNTIME-V1.md (trace/prune; not a full per-turn “ask_deeper” UX gate).
 * F1 next-question (ADR-INTAKE-NEXT-QUESTION-V1) consumes the resulting `nextRecommended` from `buildIntakePlan`.
 */
import type { IntakeCriticalSignalConfidence } from '../audit-contract.js';
import { getIntakeIntelligenceContract } from '../config/intake-intelligence-contract.js';
import type { IntakeIntelligenceContract } from '../config/intake-intelligence-types.js';
import { INTAKE_UNKNOWN_SOURCE_VALUE } from '../config/intake-readiness-policy.js';
import type { IntakePolicyFollowupRuleDefinitionV1 } from './policy-types.js';
import { isIntakeAnswered, unwrapIntakeValue } from '../unwrap.js';

export type FollowupEvaluationOutcome = 'ask_deeper' | 'stop' | 'continue';

function responseIsExplicitlyUnknown(value: unknown): boolean {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'source' in (value as object)) {
    return (value as { source?: string }).source === INTAKE_UNKNOWN_SOURCE_VALUE;
  }
  return false;
}

/**
 * Interprets policy JSON + contract against live signal state (no string parsing; no LLM).
 */
export function evaluateFollowupPolicy(args: {
  contract: IntakeIntelligenceContract;
  lastAnswer: unknown;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  ruleDefinitions: Record<string, IntakePolicyFollowupRuleDefinitionV1> | undefined;
}): FollowupEvaluationOutcome {
  const ref = args.contract.followupPolicy?.followupRuleRef ?? 'pilot_default';
  const def = args.ruleDefinitions?.[ref];
  if (!def) {
    return 'continue';
  }
  const sc = args.contract.signalContribution?.[0];
  if (!sc?.signalKey) {
    return 'continue';
  }
  if (def.treatEmptyOrUnknownResponseAsStop && responseIsExplicitlyUnknown(args.lastAnswer)) {
    return 'stop';
  }
  const unwrapped = unwrapIntakeValue(args.lastAnswer) ?? args.lastAnswer;
  if (def.treatEmptyOrUnknownResponseAsStop) {
    const s = String(unwrapped ?? '').trim();
    if (s === 'unknown' || s.toLowerCase() === 'not sure') {
      return 'stop';
    }
  }

  const conf = args.confidenceByKey[sc.signalKey] ?? 'unknown';

  const stopSet = new Set(def.stopWhenSignalConfidenceIn ?? []);
  if (stopSet.size > 0 && stopSet.has(conf)) {
    return 'stop';
  }
  const deeperSet = new Set(def.deeperWhenSignalConfidenceIn ?? []);
  if (deeperSet.size > 0 && deeperSet.has(conf)) {
    return 'ask_deeper';
  }
  return 'continue';
}

/**
 * After an answered row returns follow-up `stop`, remove subsequent unanswered questions that only
 * clarify the same primary pilot signal (unless required by product policy).
 */
export function pruneNextRecommendedAfterFollowupStops(args: {
  nextRecommended: string[];
  responses: Record<string, unknown>;
  requiredBankIds: Set<string>;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  ruleDefinitions: Record<string, IntakePolicyFollowupRuleDefinitionV1> | undefined;
  enabled: boolean;
}): { nextRecommended: string[]; prunedIds: string[] } {
  if (!args.enabled) {
    return { nextRecommended: args.nextRecommended, prunedIds: [] };
  }
  const toRemove = new Set<string>();
  for (let i = 0; i < args.nextRecommended.length; i++) {
    const id = args.nextRecommended[i]!;
    if (!isIntakeAnswered(args.responses[id])) continue;
    const contract = getIntakeIntelligenceContract(id);
    const fp = contract.followupPolicy;
    if (!fp?.stopIf?.trim() && !fp?.deeperIf?.trim()) continue;
    const outcome = evaluateFollowupPolicy({
      contract,
      lastAnswer: args.responses[id],
      confidenceByKey: args.confidenceByKey,
      ruleDefinitions: args.ruleDefinitions,
    });
    if (outcome !== 'stop') continue;
    const sk = contract.signalContribution?.[0]?.signalKey;
    if (!sk) continue;
    for (let j = i + 1; j < args.nextRecommended.length; j++) {
      const qid = args.nextRecommended[j]!;
      if (isIntakeAnswered(args.responses[qid])) continue;
      if (args.requiredBankIds.has(qid)) continue;
      const c2 = getIntakeIntelligenceContract(qid);
      if (c2.signalContribution?.[0]?.signalKey === sk) toRemove.add(qid);
    }
  }
  if (toRemove.size === 0) {
    return { nextRecommended: args.nextRecommended, prunedIds: [] };
  }
  const prunedIds: string[] = [];
  const out: string[] = [];
  for (const id of args.nextRecommended) {
    if (toRemove.has(id)) {
      prunedIds.push(id);
      continue;
    }
    out.push(id);
  }
  return { nextRecommended: out, prunedIds };
}
