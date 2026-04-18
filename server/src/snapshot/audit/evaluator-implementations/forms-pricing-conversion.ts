import type { SnapshotFacts, RuleResult } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import { getHeroPrimaryCtaCount } from '../../extract-facts.js';
import {
  SNAPSHOT_AUDIT_EVALUATOR_EVIDENCE,
  SNAPSHOT_AUDIT_EVALUATOR_REGEX,
  SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS,
} from '../../../config/snapshot-audit-evaluator-policy.js';
import { buildRuleResult } from './rule-result.js';
import type { EvaluatorStatus } from './scoring.js';

const T = SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS;

export function formFriction(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  if (!facts.forms.present) {
    return buildRuleResult(rule, {
      status: 'pass',
      evidence: [SNAPSHOT_AUDIT_EVALUATOR_EVIDENCE.formFrictionNoPrimaryForm],
      issueKeys: 'never',
      scoreOverride: rule.maxPoints,
    });
  }
  const f = facts.forms.primaryFieldCount;
  const r = facts.forms.primaryRequiredCount;
  let status: EvaluatorStatus = 'pass';
  if (f > T.formFriction.failFieldCount || r > T.formFriction.failRequiredCount) status = 'fail';
  else if (f > T.formFriction.partialFieldCount || r > T.formFriction.partialRequiredCount) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`fields=${f}`, `required=${r}`, `labels=${facts.forms.primaryHasLabels}`],
    issueKeys: 'unlessPass',
  });
}

export function trustNearConversion(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const trust = facts.blocks.testimonialLike || facts.blocks.faqLike || facts.blocks.pricingMention;
  const conv = facts.forms.present || getHeroPrimaryCtaCount(facts) > 0 || facts.siteText.ctaTexts.length > 0;
  let status: EvaluatorStatus = 'fail';
  if (trust && conv) status = 'pass';
  else if (trust || conv) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`trustSignals=${trust}`, `conversionSignals=${conv}`],
    issueKeys: 'onFail',
  });
}

export function formLabelsPresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  if (!facts.forms.present) {
    return buildRuleResult(rule, {
      status: 'pass',
      evidence: [SNAPSHOT_AUDIT_EVALUATOR_EVIDENCE.formLabelsNoForm],
      issueKeys: 'never',
      scoreOverride: rule.maxPoints,
    });
  }
  const ok = facts.forms.primaryHasLabels;
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`hasLabels=${ok}`],
    issueKeys: 'onFail',
  });
}

export function pricingPathDiscoverable(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const nav = facts.siteText.navItems.join(' ').toLowerCase();
  const slugBlob = facts.urls.slugs.join(' ');
  const ok =
    SNAPSHOT_AUDIT_EVALUATOR_REGEX.pricingNavHints.test(nav) ||
    SNAPSHOT_AUDIT_EVALUATOR_REGEX.pricingSlugHints.test(slugBlob);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`pricingPathHints=${ok}`],
    issueKeys: 'onFail',
  });
}

export function conversionContextDepth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const meaty = facts.siteText.topParagraphs.filter(p => p.length > T.conversionContextDepth.meatyParagraphMinLen).length;
  let status: EvaluatorStatus = 'fail';
  if (meaty >= T.conversionContextDepth.passMeatyCount) status = 'pass';
  else if (meaty === T.conversionContextDepth.partialMeatyCount) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`substantiveParagraphs=${meaty}`],
    issueKeys: 'unlessPass',
  });
}
