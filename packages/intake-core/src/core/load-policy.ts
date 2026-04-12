import raw from '../intake-policy.v1.json' with { type: 'json' };

import type { IntakePolicyV1 } from './policy-types.js';

export const INTAKE_POLICY_V1 = raw as IntakePolicyV1;

/** Bank ids shown on pre-brief (public link) — same slice as `modes.pre_brief.bankIncluded` in policy. */
export const PRE_BRIEF_BANK_INCLUDED_IDS: readonly string[] =
  INTAKE_POLICY_V1.modes.pre_brief.bankIncluded ?? [];

export function loadIntakePolicy(): IntakePolicyV1 {
  return INTAKE_POLICY_V1;
}
