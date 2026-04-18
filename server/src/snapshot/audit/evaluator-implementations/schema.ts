import type { SnapshotFacts, RuleResult } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import {
  SNAPSHOT_AUDIT_EVALUATOR_REGEX,
  SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS,
} from '../../../config/snapshot-audit-evaluator-policy.js';
import { buildRuleResult } from './rule-result.js';
import type { EvaluatorStatus } from './scoring.js';

const T = SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS;
const E = T.evidence;

export function organizationSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const types = facts.schema.types.map(t => t.toLowerCase());
  const ok = types.some(t => SNAPSHOT_AUDIT_EVALUATOR_REGEX.organizationSchemaType.test(t));
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`schemaTypes=${facts.schema.types.slice(0, E.schemaTypesShort).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function faqOrArticleSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const types = facts.schema.types.join(' ').toLowerCase();
  const ok = SNAPSHOT_AUDIT_EVALUATOR_REGEX.faqOrArticleSchemaTypes.test(types);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`schema=${facts.schema.types.slice(0, E.schemaTypesMedium).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function websiteSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = SNAPSHOT_AUDIT_EVALUATOR_REGEX.websiteOrWebpageSchema.test(blob);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`types=${facts.schema.types.slice(0, E.schemaTypesShort).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function productOrOfferSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = SNAPSHOT_AUDIT_EVALUATOR_REGEX.productOfferServiceSchema.test(blob);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`types=${facts.schema.types.slice(0, E.schemaTypesMedium).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function howToOrCreativeSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = SNAPSHOT_AUDIT_EVALUATOR_REGEX.howToCreativeSchema.test(blob);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`types=${facts.schema.types.slice(0, E.schemaTypesMedium).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function reviewOrRatingSchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const ok = SNAPSHOT_AUDIT_EVALUATOR_REGEX.reviewRatingSchema.test(blob);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`types=${facts.schema.types.slice(0, E.schemaTypesMedium).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function schemaTypeBreadth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.schema.types.length;
  const sb = T.schemaTypeBreadth;
  let status: EvaluatorStatus = 'fail';
  if (n >= sb.passMinTypes) status = 'pass';
  else if (n >= sb.partialMinTypes) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`typeCount=${n}`],
    issueKeys: 'unlessPass',
  });
}

export function supplementalAiEntitySchema(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blob = facts.schema.types.join(' ').toLowerCase();
  const rich = SNAPSHOT_AUDIT_EVALUATOR_REGEX.supplementalRichSchema.test(blob);
  let status: EvaluatorStatus = 'fail';
  if (rich) status = 'pass';
  else if (facts.schema.types.length > 0) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`types=${facts.schema.types.slice(0, E.schemaTypesLong).join(',')}`],
    issueKeys: 'onFail',
  });
}

export function structuredDataShape(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.schema.types.length;
  const sd = T.structuredDataShape;
  let status: EvaluatorStatus = 'fail';
  if (n >= sd.passMinTypes) status = 'pass';
  else if (n === sd.partialTypesCount) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`jsonLdTypeCount=${n}`],
    issueKeys: 'unlessPass',
  });
}
