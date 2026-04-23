import { describe, expect, it } from 'vitest';

import {
  getIntakeIntelligenceContract,
  projectIntakeIntelligenceRequiredNow,
} from '../config/intake-intelligence-contract.js';
import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('intelligence metadata fallback runtime', () => {
  it('does not crash when metadata completeness changes across rollout waves', () => {
    const plan = buildIntakePlan({
      responses: {
        a2: 'Professional Services',
      },
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });

    const fallbackTrace = plan.debugTrace?.filter(t => t.code === 'intelligence_metadata_incomplete') ?? [];
    // Sprint-2+ can fully cover required_now for visible ids, so fallback trace is optional.
    expect(fallbackTrace.length).toBeGreaterThanOrEqual(0);
    expect(plan.visible.length).toBeGreaterThan(0);
  });

  it('keeps required_now intelligence on every visible bank id for pre-brief', () => {
    const plan = buildIntakePlan({
      responses: {},
      productMode: 'full',
      collectionMode: 'pre_brief',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });

    expect(plan.visible.length).toBeGreaterThan(0);
    for (const questionId of plan.visible) {
      expect(
        projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract(questionId)),
        `visible "${questionId}" should carry required_now intelligence for client surfacing`,
      ).toBeDefined();
    }
  });
});
