import type { SnapshotFacts, RuleResult } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import { SNAPSHOT_AUDIT_EVALUATOR_REGEX } from '../../../config/snapshot-audit-evaluator-policy.js';
import { buildRuleResult } from './rule-result.js';
import type { EvaluatorStatus } from './scoring.js';

export function contactDiscoverable(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const navBlob = facts.siteText.navItems.join(' ').toLowerCase();
  const hasContactNav = SNAPSHOT_AUDIT_EVALUATOR_REGEX.contactNavHints.test(navBlob);
  const ok =
    facts.contact.phonePresent ||
    facts.contact.emailPresent ||
    hasContactNav ||
    facts.urls.slugs.some(s => SNAPSHOT_AUDIT_EVALUATOR_REGEX.contactSlugHints.test(s));
  let status: EvaluatorStatus = ok ? 'pass' : 'fail';
  if (ok && !facts.contact.phonePresent && !facts.contact.emailPresent) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [
      `phone=${facts.contact.phonePresent}`,
      `email=${facts.contact.emailPresent}`,
      `contactNav=${hasContactNav}`,
    ],
    issueKeys: 'onFail',
  });
}

export function trustBlocksPresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.blocks.testimonialLike || facts.blocks.pricingMention;
  let status: EvaluatorStatus = ok ? 'pass' : 'fail';
  if (facts.blocks.testimonialLike && !facts.blocks.pricingMention) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`testimonialLike=${facts.blocks.testimonialLike}`, `pricingMention=${facts.blocks.pricingMention}`],
    issueKeys: 'onFail',
  });
}

export function faqOrObjections(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.blocks.faqLike;
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`faqLike=${ok}`],
    issueKeys: 'onFail',
  });
}

export function processStepsVisible(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.blocks.processLike;
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`processLike=${ok}`],
    issueKeys: 'onFail',
  });
}

export function reassuranceLanguage(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const t = facts.siteText.bodyTextSample.toLowerCase();
  const ok = SNAPSHOT_AUDIT_EVALUATOR_REGEX.reassuranceLanguage.test(t);
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`reassuranceCue=${ok}`],
    issueKeys: 'onFail',
  });
}
