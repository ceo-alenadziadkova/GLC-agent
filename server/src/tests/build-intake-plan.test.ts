/**
 * Phase 2 — buildIntakePlan matches Phase 0 shim / committed snapshots.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../intake/core/build-intake-plan.js';
import { INTAKE_PLAN_FIXTURES } from './fixtures/intake-plan-fixtures.js';
import { type IntakePlanSnapshotPayload, computeIntakePlanSnapshotShim } from './intake-plan-shim.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP_PATH = join(__dirname, 'fixtures', '__snapshots__', 'intake-plan.snap.json');

describe('buildIntakePlan', () => {
  it('matches Phase 0 shim for every fixture', () => {
    for (const f of INTAKE_PLAN_FIXTURES) {
      const plan = buildIntakePlan({
        responses: f.responses,
        productMode: f.productMode,
        collectionMode: f.collectionMode,
      });
      const shim = computeIntakePlanSnapshotShim(f.responses, f.productMode, f.collectionMode);
      const slice: IntakePlanSnapshotPayload = {
        eligible: plan.eligible,
        visible: plan.visible,
        required: plan.required,
        hidden: plan.hidden,
        deferred: plan.deferred,
      };
      expect(slice, f.id).toEqual(shim);
    }
  });

  it('matches committed intake-plan.snap.json aggregate', () => {
    const expected = JSON.parse(readFileSync(SNAP_PATH, 'utf8')) as Record<string, IntakePlanSnapshotPayload>;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const plan = buildIntakePlan({
        responses: f.responses,
        productMode: f.productMode,
        collectionMode: f.collectionMode,
      });
      expect(
        {
          eligible: plan.eligible,
          visible: plan.visible,
          required: plan.required,
          hidden: plan.hidden,
          deferred: plan.deferred,
        },
        f.id,
      ).toEqual(expected[f.id]);
    }
  });

  it('reports policy and bank versions on the plan', () => {
    const plan = buildIntakePlan({
      responses: INTAKE_PLAN_FIXTURES[0].responses,
      productMode: 'full',
    });
    expect(plan.versions.policyVersion).toBe('1.0.0');
    expect(plan.versions.questionBankVersion).toBe('1.0.0');
    expect(plan.versions.resolverVersion).toBe('1.0.0');
    expect(plan.versions.layoutVersion).toBe('1.0.0');
  });
});
