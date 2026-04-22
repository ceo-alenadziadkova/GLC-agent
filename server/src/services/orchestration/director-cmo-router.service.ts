import type { DirectorOperatingMode } from '../../config/director-operating-modes.js';
import { DIRECTOR_CMO_ROUTING_POLICY } from '../../config/director-cmo-routing-policy.js';

export function routeCmoOperatingMode(input: {
  goals: string[];
  constraints: string[];
  requestedMode?: DirectorOperatingMode;
}): DirectorOperatingMode {
  if (input.requestedMode) return input.requestedMode;
  const hasLaunchSignals = input.goals.some((g) => /launch|mvp|go-live/i.test(g));
  if (hasLaunchSignals) return 'launch';
  const hasDefenseSignals = input.constraints.some((c) => /risk|compliance|legal|budget/i.test(c));
  if (hasDefenseSignals) return 'defense';
  return DIRECTOR_CMO_ROUTING_POLICY.defaultMode as DirectorOperatingMode;
}
