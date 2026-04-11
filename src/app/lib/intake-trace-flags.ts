import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';

/**
 * Intake trace IA v2 (workspace split, presets, separate wording route).
 * Toggle via `APP_FEATURE_FLAGS` in `src/app/config/app-feature-flags.ts`.
 */
export function isIntakeTraceIaV2Enabled(): boolean {
  return APP_FEATURE_FLAGS.intakeTraceIaV2Enabled;
}
