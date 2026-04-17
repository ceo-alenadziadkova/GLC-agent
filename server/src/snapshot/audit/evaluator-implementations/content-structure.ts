import type { SnapshotFacts, RuleResult } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import { SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS } from '../../../config/snapshot-audit-evaluator-policy.js';
import { buildRuleResult } from './rule-result.js';
import type { EvaluatorStatus } from './scoring.js';

const T = SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS;

export function subheadingSupport(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.siteText.h2Texts.length;
  let status: EvaluatorStatus = 'fail';
  if (n >= T.subheadingSupport.passMinH2) status = 'pass';
  else if (n === T.subheadingSupport.partialH2Count) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`h2Count=${n}`],
    issueKeys: 'unlessPass',
  });
}

export function navBreadth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = facts.siteText.navItems.length;
  let status: EvaluatorStatus = 'fail';
  if (n >= T.navBreadth.passMinItems) status = 'pass';
  else if (n >= T.navBreadth.partialMinItems) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`navItems=${n}`],
    issueKeys: 'unlessPass',
  });
}

export function supportingCopyDepth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ps = facts.siteText.topParagraphs;
  const totalLen = ps.join(' ').length;
  const sc = T.supportingCopyDepth;
  let status: EvaluatorStatus = 'fail';
  if (ps.length >= sc.passMinParagraphs && totalLen >= sc.passMinTotalLen) status = 'pass';
  else if (totalLen >= sc.partialMinTotalLen) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`paragraphs=${ps.length}`, `sampleLen=${totalLen}`],
    issueKeys: 'unlessPass',
  });
}

export function htmlLangDeclared(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const lang = facts.document.lang?.trim() ?? '';
  const ok = lang.length >= T.htmlLang.minDeclaredLen;
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`declaredLang=${lang || 'none'}`],
    issueKeys: 'onFail',
  });
}

export function bodyContentDepth(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const len = facts.siteText.bodyTextSample.length;
  const bc = T.bodyContent;
  let status: EvaluatorStatus = 'fail';
  if (len >= bc.passMinLen) status = 'pass';
  else if (len >= bc.partialMinLen) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`bodyTextLen=${len}`],
    issueKeys: 'unlessPass',
  });
}
