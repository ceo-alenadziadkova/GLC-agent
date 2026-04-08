/**
 * Load policy / layout / bank stubs for a persisted intake version tuple (frozen artifacts).
 */
import type { IntakeQuestionStub } from '../types.js';
import type { IntakePolicyV1 } from './policy-types.js';
import type { LayoutRulesV1 } from './layout-types.js';
import type { IntakeVersionTuple } from '../../types/audit.js';

import policy_1_0_0 from '../artifacts/intake-policy-1.0.0.json' with { type: 'json' };
import { QUESTION_BANK_V1_STUBS, QUESTION_BANK_VERSION } from '../question-bank.js';
import { LAYOUT_RULES_V1 } from './load-layout.js';
import { INTAKE_POLICY_V1 } from './load-policy.js';
import { currentIntakeVersionTuple } from './versions.js';
import { intakeTupleArtifactKey, tuplesEqual } from './intake-version-tuple.js';

export interface ResolvedIntakeArtifacts {
  policy: IntakePolicyV1;
  stubs: IntakeQuestionStub[];
  layoutRules: LayoutRulesV1;
  /** Versions of loaded artifacts (resolver always runs current server code). */
  questionBankVersion: string;
  policyVersion: string;
  layoutVersion: string;
}

/** Registry keys = full `IntakeVersionTuple` join. Extend when shipping new frozen bundles. */
const FROZEN_ARTIFACT_REGISTRY: Record<string, () => Omit<ResolvedIntakeArtifacts, 'layoutRules' | 'questionBankVersion' | 'layoutVersion'> & { layoutRules: LayoutRulesV1; questionBankVersion: string; layoutVersion: string }> = {
  '1.0.0|1.0.0|1.1.0|1.0.0': () => ({
    policy: policy_1_0_0 as IntakePolicyV1,
    stubs: QUESTION_BANK_V1_STUBS,
    layoutRules: LAYOUT_RULES_V1,
    questionBankVersion: QUESTION_BANK_VERSION,
    policyVersion: (policy_1_0_0 as IntakePolicyV1).version,
    layoutVersion: LAYOUT_RULES_V1.version,
  }),
};

export function listSupportedFrozenArtifactKeys(): string[] {
  return Object.keys(FROZEN_ARTIFACT_REGISTRY);
}

export function isFrozenArtifactTuple(t: IntakeVersionTuple): boolean {
  return intakeTupleArtifactKey(t) in FROZEN_ARTIFACT_REGISTRY;
}

export function isSupportedIntakeArtifactTuple(t: IntakeVersionTuple): boolean {
  return tuplesEqual(t, currentIntakeVersionTuple()) || isFrozenArtifactTuple(t);
}

/**
 * Resolve JSON artifacts for validation/plan building.
 * Resolver **code** is always current; only bundled policy/layout/bank files differ by tuple.
 */
export function resolveIntakeArtifacts(intakeVersionTuple?: IntakeVersionTuple | null): ResolvedIntakeArtifacts {
  const cur = currentIntakeVersionTuple();
  if (!intakeVersionTuple || tuplesEqual(intakeVersionTuple, cur)) {
    return {
      policy: INTAKE_POLICY_V1,
      stubs: QUESTION_BANK_V1_STUBS,
      layoutRules: LAYOUT_RULES_V1,
      questionBankVersion: QUESTION_BANK_VERSION,
      policyVersion: INTAKE_POLICY_V1.version,
      layoutVersion: LAYOUT_RULES_V1.version,
    };
  }

  const key = intakeTupleArtifactKey(intakeVersionTuple);
  const loader = FROZEN_ARTIFACT_REGISTRY[key];
  if (!loader) {
    throw new UnsupportedIntakeArtifactTupleError(intakeVersionTuple);
  }
  return loader();
}

export class UnsupportedIntakeArtifactTupleError extends Error {
  readonly tuple: IntakeVersionTuple;

  constructor(tuple: IntakeVersionTuple) {
    super(`Unsupported intake artifact tuple: ${intakeTupleArtifactKey(tuple)}`);
    this.name = 'UnsupportedIntakeArtifactTupleError';
    this.tuple = tuple;
  }
}
