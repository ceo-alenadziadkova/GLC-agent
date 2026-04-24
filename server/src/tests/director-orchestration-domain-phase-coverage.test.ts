import { describe, expect, it } from 'vitest';

import { DOMAIN_PHASES } from '../config/audit-phase-constants.js';
import {
  DIRECTOR_ORCHESTRATION_ALLOWED_PHASES,
  directorOrchestrationPersistenceModeForPhase,
  isDirectorOrchestrationPhaseAllowed,
} from '../config/director-orchestration-policy.js';

/**
 * Regression: every pipeline domain phase that can run a domain agent must be accounted for
 * in director orchestration policy (merge input persistence). SEO (phase 3) stays best-effort.
 */
describe('director orchestration domain phase coverage', () => {
  it('maps all six DOMAIN_PHASES entries to allowed director persistence phases', () => {
    const phases = Object.values(DOMAIN_PHASES);
    expect(phases).toHaveLength(6);
    for (const phase of phases) {
      expect(isDirectorOrchestrationPhaseAllowed(phase)).toBe(true);
      expect(DIRECTOR_ORCHESTRATION_ALLOWED_PHASES).toContain(phase);
    }
  });

  it('uses best-effort persistence only for SEO phase (3); strict for other domains', () => {
    expect(directorOrchestrationPersistenceModeForPhase(3)).toBe('best_effort');
    for (const phase of [1, 2, 4, 5, 6] as const) {
      expect(directorOrchestrationPersistenceModeForPhase(phase)).toBe('strict_for_selected_domains');
    }
  });
});
