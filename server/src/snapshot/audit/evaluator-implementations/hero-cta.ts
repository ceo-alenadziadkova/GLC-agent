import type { SnapshotFacts } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import { getHeroPrimaryCtaCount, getGenericMarketingHero } from '../../extract-facts.js';
import {
  SNAPSHOT_AUDIT_EVALUATOR_REGEX,
  SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS,
} from '../../../config/snapshot-audit-evaluator-policy.js';
import type { RuleResult } from '../../types.js';
import { buildRuleResult } from './rule-result.js';
import type { EvaluatorStatus } from './scoring.js';

const T = SNAPSHOT_AUDIT_EVALUATOR_THRESHOLDS;

export function h1ServiceIntent(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const h1 = facts.siteText.h1.trim();
  let status: EvaluatorStatus = 'fail';
  if (!h1) status = 'fail';
  else if (facts.siteText.h1Count > 1) status = 'partial';
  else if (getGenericMarketingHero(facts) && !SNAPSHOT_AUDIT_EVALUATOR_REGEX.serviceWords.test(h1)) status = 'partial';
  else if (SNAPSHOT_AUDIT_EVALUATOR_REGEX.serviceWords.test(h1) && h1.length > T.h1ServiceIntent.passWithServiceWordMinLen)
    status = 'pass';
  else if (h1.length > T.h1ServiceIntent.partialMinLen) status = 'partial';
  else status = 'fail';

  return buildRuleResult(rule, {
    status,
    evidence: [`h1Count=${facts.siteText.h1Count}`, `h1Len=${h1.length}`, `genericHero=${getGenericMarketingHero(facts)}`],
    issueKeys: 'unlessPass',
  });
}

export function heroPrimaryCta(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const n = getHeroPrimaryCtaCount(facts);
  let status: EvaluatorStatus = 'fail';
  if (n >= T.heroPrimaryCta.passMinCount) status = 'pass';
  else if (facts.siteText.ctaTexts.length > 0) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`heroIntentCtas=${n}`, `ctaTexts=${facts.siteText.ctaTexts.length}`],
    issueKeys: 'unlessPass',
  });
}

export function primaryCtaStrong(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const ctas = facts.siteText.ctaTexts;
  const strong = ctas.some(t => SNAPSHOT_AUDIT_EVALUATOR_REGEX.strongCta.test(t));
  let status: EvaluatorStatus = 'fail';
  if (strong) status = 'pass';
  else if (ctas.length > 0) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`ctaCount=${ctas.length}`, `strong=${strong}`],
    issueKeys: 'unlessPass',
  });
}

export function ctaNoiseLevel(facts: SnapshotFacts, rule: AuditRuleRow): RuleResult {
  const hero = getHeroPrimaryCtaCount(facts);
  const total = facts.siteText.ctaTexts.length;
  let status: EvaluatorStatus = 'fail';
  if (hero <= T.ctaNoise.passMaxHeroCtas && total <= T.ctaNoise.passMaxTotalCtas) status = 'pass';
  else if (hero <= T.ctaNoise.partialMaxHeroCtas && total <= T.ctaNoise.partialMaxTotalCtas) status = 'partial';
  return buildRuleResult(rule, {
    status,
    evidence: [`heroCtas=${hero}`, `ctaTexts=${total}`],
    issueKeys: 'unlessPass',
  });
}
