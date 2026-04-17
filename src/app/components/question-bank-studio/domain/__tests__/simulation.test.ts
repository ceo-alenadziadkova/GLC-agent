import { describe, expect, it } from 'vitest';

import { buildSelectedQuestionDependencies, buildUserStepSimulation } from '../simulation';

describe('simulation helpers', () => {
  it('returns empty payload when no selected question exists', () => {
    expect(buildUserStepSimulation(null, null)).toEqual({
      nextIds: [],
      addedNext: [],
      removedNext: [],
      nowVisible: [],
    });
  });

  it('builds dependencies for known question ids', () => {
    const dependencies = buildSelectedQuestionDependencies('business_model.type');
    expect(Array.isArray(dependencies.dependsOn)).toBe(true);
    expect(Array.isArray(dependencies.enables)).toBe(true);
  });
});
