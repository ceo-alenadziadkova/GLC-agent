import type { SnapshotFacts, RuleResult } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import {
  SNAPSHOT_AUDIT_EVALUATOR_EVIDENCE,
  SNAPSHOT_AUDIT_EVALUATOR_REGEX,
  SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS,
} from '../../../config/snapshot-audit-evaluator-policy.js';
import { buildRuleResult } from './rule-result.js';
import type { EvaluatorStatus } from './scoring.js';

const T = SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS;
const E = T.evidence;

export function metaDescriptionUseful(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const d = facts.siteText.metaDescription.trim();
  const md = T.metaDescription;
  let status: EvaluatorStatus = 'fail';
  if (d.length >= md.passMinLen && d.length <= md.passMaxLen) status = 'pass';
  else if (d.length >= md.partialBandMinLen && d.length < md.partialBandBelowPass) status = 'partial';
  else if (d.length > md.passMaxLen && d.length <= md.longPartialMaxLen) status = 'partial';
  else if (d.length > 0 && d.length <= md.shortPartialMaxLen) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`metaDescriptionLen=${d.length}`],
    issueKeys: 'unlessPass',
  });
}

export function viewportMetaPresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.meta.viewportPresent;
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`viewportPresent=${ok}`],
    issueKeys: 'onFail',
  });
}

export function imageAltCoverage(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const total = facts.images.total;
  if (total === 0) {
    return buildRuleResult(rule, {
      status: 'pass',
      evidence: [SNAPSHOT_AUDIT_EVALUATOR_EVIDENCE.imageAltNoImages],
      issueKeys: 'never',
      scoreOverride: rule.maxPoints,
    });
  }
  const ratio = facts.images.withAlt / total;
  let status: EvaluatorStatus = 'fail';
  if (ratio >= T.imageAlt.passMinRatio) status = 'pass';
  else if (ratio >= T.imageAlt.partialMinRatio) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`images=${total}`, `withAlt=${facts.images.withAlt}`, `ratio=${ratio.toFixed(2)}`],
    issueKeys: 'unlessPass',
  });
}

export function publicIndexableHome(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const blocked = facts.meta.hasNoindex;
  const status: EvaluatorStatus = blocked ? 'fail' : 'pass';
  return buildRuleResult(rule, {
    status,
    evidence: [`robotsMeta=${facts.meta.robotsMeta.slice(0, E.robotsMetaMax)}`, `hasNoindex=${blocked}`],
    issueKeys: 'onFail',
  });
}

export function titlePresent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const t = facts.siteText.title.trim();
  const tt = T.title;
  let status: EvaluatorStatus = 'fail';
  if (t.length >= tt.passMinLen && t.length <= tt.passMaxLen) status = 'pass';
  else if (t.length >= tt.partialMinLen) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`titleLen=${t.length}`],
    issueKeys: 'onFail',
  });
}

export function canonicalHealthy(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const c = facts.meta.canonical.trim();
  const home = facts.site.homepageUrl.replace(/\/$/, '');
  let status: EvaluatorStatus = 'fail';
  if (!c) status = 'fail';
  else if (c.replace(/\/$/, '') === home || c.replace(/\/$/, '') === `${home}/`) status = 'pass';
  else if (SNAPSHOT_AUDIT_EVALUATOR_REGEX.absoluteHttpUrl.test(c)) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`canonical=${c.slice(0, E.canonicalUrlMax)}`, `home=${home}`],
    issueKeys: 'unlessPass',
  });
}

export function httpsHomepage(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.site.homepageUrl.startsWith('https:');
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`homepage=${facts.site.homepageUrl.slice(0, E.homepageUrlMax)}`],
    issueKeys: 'onFail',
  });
}

export function openGraphBasics(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ok = facts.meta.openGraphTitlePresent;
  const status: EvaluatorStatus = ok ? 'pass' : 'fail';
  return buildRuleResult(rule, {
    status,
    evidence: [`ogTitlePresent=${ok}`],
    issueKeys: 'onFail',
  });
}
