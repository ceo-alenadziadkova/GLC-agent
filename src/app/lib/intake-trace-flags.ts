import { INTAKE_TRACE_IA_V2_ENABLED_DEFAULT } from '../config/intake-trace-defaults';

function envFlagEnabled(raw: string | undefined, defaultWhenUnset: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultWhenUnset;
  const v = raw.trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  return defaultWhenUnset;
}

/**
 * Intake trace IA v2 (workspace split, presets, separate wording route).
 * Set `VITE_INTAKE_TRACE_IA_V2=0` to roll back to legacy flat tabs.
 * When unset, defaults to **enabled** (safe rollout: opt-out kill switch).
 */
export function isIntakeTraceIaV2Enabled(): boolean {
  const raw = import.meta.env.VITE_INTAKE_TRACE_IA_V2;
  const s = typeof raw === 'string' ? raw : undefined;
  return envFlagEnabled(s, INTAKE_TRACE_IA_V2_ENABLED_DEFAULT);
}
