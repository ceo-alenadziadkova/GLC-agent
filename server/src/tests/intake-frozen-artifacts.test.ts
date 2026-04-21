/**
 * Frozen intake artifact tuples (policy/layout/bank snapshots per ADR version matrix).
 */
import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '@glc/intake-core';
import {
  currentIntakeVersionTuple,
  INTAKE_POLICY_VERSION,
  INTAKE_RESOLVER_VERSION,
  INTAKE_SEQUENCING_VERSION,
} from '@glc/intake-core';
import type { IntakeVersionTuple } from '../types/audit.js';

const FROZEN_LEGACY: IntakeVersionTuple = {
  questionBankVersion: '1.0.0',
  policyVersion: '1.0.0',
  layoutVersion: '1.1.0',
  resolverVersion: '1.0.0',
  sequencingVersion: INTAKE_SEQUENCING_VERSION,
};

describe('frozen intake artifacts', () => {
  it('loads policy 1.0.0 without pre_brief.bankIncluded (no surface narrowing)', () => {
    const responses = {
      a2: 'professional services',
      a3: 'Barcelona',
      a5: 'no_website',
      a10: ['Recurring services (retainers)'],
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
    expect(legacy.versions.sequencingVersion).toBe(INTAKE_SEQUENCING_VERSION);
  });

  it('current tuple uses live policy artifact version', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website', a10: ['Product sales (online or offline)'] },
      productMode: 'full',
    });
    expect(plan.versions.policyVersion).toBe(INTAKE_POLICY_VERSION);
    expect(plan.versions.resolverVersion).toBe(INTAKE_RESOLVER_VERSION);
  });
});
