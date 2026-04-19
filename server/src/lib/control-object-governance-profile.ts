import type { ControlObjectV1 } from '../schemas/control-object/index.js';

export function isNarrowGovernanceProfile(control: ControlObjectV1): boolean {
  return control.context.governance_profile === 'narrow';
}
