import { QUESTION_BANK_VERSION } from '../question-bank.js';
import type { IntakeVersionTuple } from './types.js';

/** Policy artifact version; 0.0.0 until intake-policy.v1.json ships (Phase 1). */
export const INTAKE_POLICY_VERSION = '0.0.0';

/** Layout artifact version; 0.0.0 until layout-rules ship (Phase 5b+). */
export const INTAKE_LAYOUT_VERSION = '0.0.0';

/** Resolver semver — bump on breaking plan shape or evaluation order. */
export const INTAKE_RESOLVER_VERSION = '1.0.0';

export function currentIntakeVersionTuple(): IntakeVersionTuple {
  return {
    questionBankVersion: QUESTION_BANK_VERSION,
    policyVersion: INTAKE_POLICY_VERSION,
    layoutVersion: INTAKE_LAYOUT_VERSION,
    resolverVersion: INTAKE_RESOLVER_VERSION,
  };
}
