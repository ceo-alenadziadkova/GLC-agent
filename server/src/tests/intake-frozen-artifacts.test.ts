/**
 * Frozen intake artifact tuples (policy/layout/bank snapshots per ADR version matrix).
 */
import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../intake/core/build-intake-plan.js';
import {
  currentIntakeVersionTuple,
  INTAKE_POLICY_VERSION,
  INTAKE_RESOLVER_VERSION,
} from '../intake/core/versions.js';
import type { IntakeVersionTuple } from '../types/audit.js';

const FROZEN_LEGACY: IntakeVersionTuple = {
  questionBankVersion: '1.0.0',
  policyVersion: '1.0.0',
  layoutVersion: '1.1.0',
  resolverVersion: '1.0.0',
};

describe('frozen intake artifacts', () => {
  it('loads policy 1.0.0 without pre_brief.bankIncluded (no surface narrowing)', () => {
    const responses = {
      a2: 'professional services',
      a3: 'Barcelona',
      a5: 'no_website',
      revenue_model: 'b2b',
    };
    const legacy = buildIntakePlan({
      responses,
      productMode: 'full',
      collectionMode: 'pre_brief',
      intakeVersionTuple: FROZEN_LEGACY,
    });
    const live = buildIntakePlan({
      responses,
      productMode: 'full',
      collectionMode: 'pre_brief',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect(legacy.eligible.length).toBeGreaterThan(live.eligible.length);
    expect(legacy.versions.policyVersion).toBe('1.0.0');
    // ADR: resolver code is always current — resolverVersion in plan output is the running
    // resolver, not the stored tuple's version (Issue 6 fix).
    expect(legacy.versions.resolverVersion).toBe(INTAKE_RESOLVER_VERSION);
  });

  it('current tuple uses live policy artifact version', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website', revenue_model: 'b2c' },
      productMode: 'full',
    });
    expect(plan.versions.policyVersion).toBe(INTAKE_POLICY_VERSION);
    expect(plan.versions.resolverVersion).toBe(INTAKE_RESOLVER_VERSION);
  });
});
