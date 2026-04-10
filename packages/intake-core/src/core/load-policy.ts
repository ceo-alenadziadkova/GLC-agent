import raw from '../intake-policy.v1.json' with { type: 'json' };

import type { IntakePolicyV1 } from './policy-types.js';

export const INTAKE_POLICY_V1 = raw as IntakePolicyV1;

export function loadIntakePolicy(): IntakePolicyV1 {
  return INTAKE_POLICY_V1;
}
