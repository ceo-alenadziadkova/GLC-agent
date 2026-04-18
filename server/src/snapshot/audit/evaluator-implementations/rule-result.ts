import type { RuleResult, SnapshotAuditCategory } from '../../types.js';
import type { AuditRuleRow } from '../parse-audit-rules.js';
import { scoreStatus, type EvaluatorStatus } from './scoring.js';

export type IssueKeyAttachment = 'never' | 'unlessPass' | 'onFail';

export function buildRuleResult(
  rule: AuditRuleRow,
  args: {
    status: EvaluatorStatus;
    evidence: string[];
    issueKeys: IssueKeyAttachment;
    /** When set, replaces `scoreStatus(rule.maxPoints, status)` (e.g. N/A pass at full points). */
    scoreOverride?: number;
  },
): RuleResult {
  const maxScore = rule.maxPoints;
  const score = args.scoreOverride !== undefined ? args.scoreOverride : scoreStatus(maxScore, args.status);

  let issueKey: string | undefined;
  let quickWinKey: string | undefined;
  if (args.issueKeys === 'unlessPass' && args.status !== 'pass') {
    issueKey = rule.issueKey;
    quickWinKey = rule.quickWinKey;
  } else if (args.issueKeys === 'onFail' && args.status === 'fail') {
    issueKey = rule.issueKey;
    quickWinKey = rule.quickWinKey;
  }

  return {
    id: rule.id,
    category: rule.category as SnapshotAuditCategory,
    status: args.status,
    score,
    maxScore,
    evidence: args.evidence,
    issueKey,
    quickWinKey,
    impactTier: rule.impactTier,
  };
}
