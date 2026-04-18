import { INTAKE_REVENUE_BANK_ID } from '../../intake-revenue.js';
import { QUESTION_BANK_V1_IDS } from '../../question-bank.js';

import { INTAKE_POLICY_V1 } from '../load-policy.js';
import type { IntakePolicyV1 } from '../policy-types.js';

import { ALLOWED_SYNTHETIC_BANK_OVERLAP } from './canon-constants.js';
import type { LintFinding } from './types.js';

/**
 * Synthetic / SLA ids must not reuse an arbitrary bank question id as a policy key.
 */
export function lintSyntheticCollision(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const synthetics = new Set([
    ...policy.modes.full.syntheticRequired,
    ...policy.modes.discovery.syntheticRequired,
  ]);
  for (const id of synthetics) {
    if (ALLOWED_SYNTHETIC_BANK_OVERLAP.has(id)) continue;
    if (bankIds.has(id)) {
      findings.push({
        code: 'SYNTHETIC_COLLISION',
        severity: 'error',
        message: `Synthetic required id "${id}" collides with a bank question id.`,
        detail: id,
      });
    }
  }
  for (const id of policy.modes.express.requiredAlways) {
    if (id !== INTAKE_REVENUE_BANK_ID && !bankIds.has(id)) {
      findings.push({
        code: 'EXPRESS_REQUIRED_ORPHAN',
        severity: 'error',
        message: `Express requiredAlways "${id}" is not a bank id.`,
        detail: id,
      });
    }
  }
  for (const id of policy.modes.express.requiredIfVisible) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'EXPRESS_IF_VISIBLE_ORPHAN',
        severity: 'error',
        message: `Express requiredIfVisible "${id}" is not a bank question id.`,
        detail: id,
      });
    }
  }
  return findings;
}
