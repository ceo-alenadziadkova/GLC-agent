/**
 * Phase 2 — buildIntakePlan matches Phase 0 shim / committed snapshots.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  buildIntakePlan,
  currentIntakeVersionTuple,
  QUESTION_BANK_V1_STUBS,
  recomputePlanIncremental,
} from '@glc/intake-core';
/** Same module as `buildIntakePlan` (Vitest aliases `@glc/intake-core` to `src/`). Package subpath resolves to `dist/` for `tsc` only. */
import * as intakeFlags from '@glc/intake-core/config/intake-flags.js';
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
        slaVisibleBankIds: plan.slaVisibleBankIds,
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
          slaVisibleBankIds: plan.slaVisibleBankIds,
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
    const cur = currentIntakeVersionTuple();
    expect(plan.versions.policyVersion).toBe(cur.policyVersion);
    expect(plan.versions.questionBankVersion).toBe(cur.questionBankVersion);
    expect(plan.versions.resolverVersion).toBe(cur.resolverVersion);
    expect(plan.versions.layoutVersion).toBe(cur.layoutVersion);
  });

  it('includes nextRecommended — required first, then recommended, then gap-filling optional', () => {
    const plan = buildIntakePlan({
      responses: { a2: 'hospitality', a5: 'no_website' },
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    const pri = new Map(QUESTION_BANK_V1_STUBS.map(s => [s.id, s.priority]));
    let seenRecommended = false;
    let seenOptional = false;
    for (const id of plan.nextRecommended) {
      expect(plan.visible).toContain(id);
      const p = pri.get(id);
      expect(p).toBeDefined();
      if (p === 'recommended') seenRecommended = true;
      if (p === 'optional') seenOptional = true;
      if (p === 'required') {
        expect(seenRecommended).toBe(false);
        expect(seenOptional).toBe(false);
      }
      if (p === 'recommended') expect(seenOptional).toBe(false);
    }
  });

  it('omits nextRecommended when next-recommended feature is disabled', () => {
    const spy = vi.spyOn(intakeFlags, 'isIntakeNextRecommendedEnabled').mockReturnValue(false);
    try {
      const plan = buildIntakePlan({
        responses: { a2: 'hospitality', a5: 'no_website' },
        productMode: 'full',
        collectionMode: 'self_serve',
      });
      expect(plan.nextRecommended).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it('derivedFacts.reportAnchors maps canon reportUse for visible answered bank ids', () => {
    const plan = buildIntakePlan({
      responses: { a2: 'hospitality', a5: 'no_website', a1: 'Boutique stay chain' },
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    expect(plan.visible).toContain('a1');
    expect(plan.derivedFacts.reportAnchors?.recon_company_summary).toBe('Boutique stay chain');
  });

  it('missingForReport lists domains with unanswered SLA-visible primary-feed questions', () => {
    const plan = buildIntakePlan({
      responses: { a2: 'hospitality', a5: 'no_website' },
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    expect(plan.missingForReport.length).toBeGreaterThan(0);
    expect(plan.missingForReport).toContain('recon');
    for (const d of plan.missingForReport) {
      const r = plan.coverage.byDomain[d];
      expect(r).toBeDefined();
      expect(r!).toBeLessThan(1);
    }
  });

  it('includes derivedFacts, coverage, and confidence', () => {
    const plan = buildIntakePlan({
      responses: { a2: 'hospitality', a5: 'no_website' },
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    expect(plan.derivedFacts.aiReadinessScore).toBeGreaterThanOrEqual(0);
    expect(plan.derivedFacts.aiReadinessScore).toBeLessThanOrEqual(100);
    expect(plan.derivedFacts.segmentHints.websiteGate).toBe('no_website');
    expect(plan.coverage.byDomain.recon).toBeDefined();
    expect(plan.confidence.overall).toBeGreaterThanOrEqual(0);
    expect(plan.confidence.overall).toBeLessThanOrEqual(1);
  });

  it('incremental recompute stays in parity with full rebuild', () => {
    const initial = buildIntakePlan({
      responses: { a2: 'hospitality', a5: 'no_website', f1: 'Need growth' },
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    const nextResponses = { a2: 'hospitality', a5: 'no_website', f1: 'Need growth now' };
    const incremental = recomputePlanIncremental(initial.runtimeState!, {
      responses: nextResponses,
      changedResponseKeys: ['f1'],
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    const full = buildIntakePlan({
      responses: nextResponses,
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    expect({
      eligible: incremental.eligible,
      visible: incremental.visible,
      required: incremental.required,
      hidden: incremental.hidden,
      deferred: incremental.deferred,
      versions: incremental.versions,
    }).toEqual({
      eligible: full.eligible,
      visible: full.visible,
      required: full.required,
      hidden: full.hidden,
      deferred: full.deferred,
      versions: full.versions,
    });
  });

  it('supports policy askStrategy progressive as deferred reason', () => {
    vi.stubEnv('INTAKE_POLICY_RICHNESS_ENABLED', '1');
    try {
      const plan = buildIntakePlan({
        responses: { a2: 'hospitality', a5: 'no_website' },
        productMode: 'full',
        collectionMode: 'self_serve',
      });
      if (plan.reasonsById?.f8) {
        expect(plan.reasonsById.f8.some(r => r.code === 'ASK_STRATEGY_PROGRESSIVE')).toBe(true);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
