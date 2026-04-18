import { QUESTION_BANK_VERSION } from '../question-bank.js';
import { LAYOUT_RULES_V1 } from './load-layout.js';
import { INTAKE_POLICY_V1 } from './load-policy.js';
import type { IntakeVersionTuple } from './types.js';

/** Re-export policy artifact semver (see intake-policy.v1.json). */
export const INTAKE_POLICY_VERSION = INTAKE_POLICY_V1.version;

/** Layout artifact semver (see layout-rules.v1.json). */
export const INTAKE_LAYOUT_VERSION = LAYOUT_RULES_V1.version;

/** Resolver semver — bump on breaking plan shape or evaluation order. */
export const INTAKE_RESOLVER_VERSION = '1.1.0';

export function currentIntakeVersionTuple(): IntakeVersionTuple {
  return {
    questionBankVersion: QUESTION_BANK_VERSION,
    policyVersion: INTAKE_POLICY_V1.version,
    layoutVersion: INTAKE_LAYOUT_VERSION,
    resolverVersion: INTAKE_RESOLVER_VERSION,
  };
}

/**
 * Sentinel tuple for rows that pre-date the version matrix (missing `intake_versions` column).
 * Validation for these rows still uses the current resolver — this tuple is for **logging and
 * mismatch diagnostics only**.
 *
 * **DO NOT pass this to `resolveIntakeArtifacts` or `buildIntakePlan`.**
 * It is not in FROZEN_ARTIFACT_REGISTRY and does not equal `currentIntakeVersionTuple()`, so
 * `resolveIntakeArtifacts` would throw `UnsupportedIntakeArtifactTupleError`. Call sites that
 * need to validate a pre-matrix brief must pass `null` (or omit the tuple) instead, which
 * resolves to the current artifact bundle.
 */
export function syntheticIntakeVersionsBeforeMatrix(): IntakeVersionTuple {
  return {
    questionBankVersion: QUESTION_BANK_VERSION,
    policyVersion: '0.0.0',
    layoutVersion: '0.0.0',
    resolverVersion: '0.0.0',
  };
}
