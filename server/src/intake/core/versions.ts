import { QUESTION_BANK_VERSION } from '../question-bank.js';
import { LAYOUT_RULES_V1 } from './load-layout.js';
import { INTAKE_POLICY_V1 } from './load-policy.js';
import type { IntakeVersionTuple } from './types.js';

/** Re-export policy artifact semver (see intake-policy.v1.json). */
export const INTAKE_POLICY_VERSION = INTAKE_POLICY_V1.version;

/** Layout artifact semver (see layout-rules.v1.json). */
export const INTAKE_LAYOUT_VERSION = LAYOUT_RULES_V1.version;

/** Resolver semver — bump on breaking plan shape or evaluation order. */
export const INTAKE_RESOLVER_VERSION = '1.0.0';

export function currentIntakeVersionTuple(): IntakeVersionTuple {
  return {
    questionBankVersion: QUESTION_BANK_VERSION,
    policyVersion: INTAKE_POLICY_V1.version,
    layoutVersion: INTAKE_LAYOUT_VERSION,
    resolverVersion: INTAKE_RESOLVER_VERSION,
  };
}

/**
 * Rows missing `intake_versions` (pre-migration). Validation still uses the current resolver;
 * this tuple is for logging and future client/server mismatch checks only.
 */
export function syntheticIntakeVersionsBeforeMatrix(): IntakeVersionTuple {
  return {
    questionBankVersion: QUESTION_BANK_VERSION,
    policyVersion: '0.0.0',
    layoutVersion: '0.0.0',
    resolverVersion: '0.0.0',
  };
}
