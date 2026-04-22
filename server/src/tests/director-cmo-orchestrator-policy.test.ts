import { describe, expect, it } from 'vitest';
import { DIRECTOR_CMO_ORCHESTRATOR_POLICY } from '../config/director-cmo-orchestrator-policy.js';

describe('DIRECTOR_CMO_ORCHESTRATOR_POLICY deterministic defaults', () => {
  it('keeps CMO-INSTRUCTIONS minimum idea/hypothesis counts for fallback output', () => {
    expect(DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.contentIdeasMinCount).toBe(50);
    expect(DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.trafficHypothesesMinCount).toBe(20);
    expect(DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.positioning.differentiationAxes.length).toBeGreaterThanOrEqual(2);
  });
});
