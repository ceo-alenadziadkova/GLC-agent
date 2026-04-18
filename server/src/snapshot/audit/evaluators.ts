import type { RuleResult, SnapshotFacts } from '../types.js';
import type { AuditRuleRow } from './parse-audit-rules.js';
import { SNAPSHOT_AUDIT_EVALUATOR_REGISTRY } from './evaluator-implementations/registry.js';

/** Evaluator names registered in code — YAML `evaluator` must reference one of these. */
export const SNAPSHOT_AUDIT_EVALUATOR_NAMES = Object.freeze(Object.keys(SNAPSHOT_AUDIT_EVALUATOR_REGISTRY));

export function runEvaluator(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const fn = SNAPSHOT_AUDIT_EVALUATOR_REGISTRY[rule.evaluator];
  if (!fn) {
    throw new Error(`Unknown snapshot evaluator: ${rule.evaluator}`);
  }
  return fn(facts, rule);
}
