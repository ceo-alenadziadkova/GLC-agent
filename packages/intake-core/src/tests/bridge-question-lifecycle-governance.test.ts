import { describe, expect, it } from 'vitest';

import { applySequencingPilotToPlan } from '../core/intake-plan/apply-sequencing-pilot.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('bridge question lifecycle governance', () => {
  it('emits lifecycle governance metadata in dependency trace details', () => {
    const result = applySequencingPilotToPlan({
      sequencingVersion: currentIntakeVersionTuple().sequencingVersion,
      nextRecommended: ['a2', 'a5', 'a1', 'f1', 'f2', 'd2', 'd_closing_flow'],
      visible: ['a2', 'a5', 'a1', 'f1', 'f2', 'd2', 'd_closing_flow'],
      responses: {
        a2: 'Healthcare',
        a5: 'multi_page_website',
        a1: 'https://example.com',
        f1: ['Operational delays'],
        d2: 'Managing team tasks and handoffs',
      },
    });
    const depEntry = result.sequencingTrace.find(
      entry =>
        (entry.code === 'sequencing_dep_prerequisite_pending' || entry.code === 'sequencing_dep_satisfied')
        && typeof entry.detail?.ruleId === 'string',
    );
    expect(depEntry).toBeDefined();
    expect(typeof depEntry?.detail?.owner).toBe('string');
    expect(typeof depEntry?.detail?.kpiMetric).toBe('string');
    expect(typeof depEntry?.detail?.lifecycleState).toBe('string');
    expect(typeof depEntry?.detail?.reviewByIsoDate).toBe('string');
  });
});
