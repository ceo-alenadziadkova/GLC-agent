/**
 * Phase 1 — Policy JSON reproduces buildIntakePlan / brief-gates SLA behavior.
 */
import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../intake/core/build-intake-plan.js';
import {
  computeRequiredBankIdsFromPolicy,
  INTAKE_POLICY_V1,
  loadIntakePolicy,
} from '../intake/core/index.js';
import {
  resolveExpressSlaRequiredIds,
  resolveFullSlaRequiredIds,
  resolveSlaRequiredIds,
} from '../intake/brief-gates.js';
import { QUESTION_BANK_V1_IDS, QUESTION_BANK_V1_STUBS } from '../intake/question-bank.js';
import { INTAKE_PLAN_FIXTURES } from './fixtures/intake-plan-fixtures.js';

describe('intake-policy v1 parity', () => {
  it('discovery.included references only real bank ids (no orphans)', () => {
    for (const id of INTAKE_POLICY_V1.modes.discovery.included) {
      expect(QUESTION_BANK_V1_IDS.has(id), id).toBe(true);
    }
  });

  it('pre_brief.bankIncluded references only real bank ids (no orphans)', () => {
    for (const id of INTAKE_POLICY_V1.modes.pre_brief.bankIncluded ?? []) {
      expect(QUESTION_BANK_V1_IDS.has(id), id).toBe(true);
    }
  });

  it('loadIntakePolicy returns the same artifact', () => {
    expect(loadIntakePolicy().version).toBe('1.1.0');
  });

  it('required bank ids from policy match plan.required for every fixture', () => {
    const policy = INTAKE_POLICY_V1;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const plan = buildIntakePlan({
        responses: f.responses,
        productMode: f.productMode,
        collectionMode: f.collectionMode,
      });
      const slaSet = new Set(plan.slaVisibleBankIds);
      const slaStubs = QUESTION_BANK_V1_STUBS.filter(q => slaSet.has(q.id));
      const fromPolicy = computeRequiredBankIdsFromPolicy(
        policy,
        f.productMode,
        slaSet,
        slaStubs,
        f.collectionMode,
      ).ids;
      expect(fromPolicy, f.id).toEqual(plan.required);
      expect(resolveSlaRequiredIds(f.productMode, f.responses, f.collectionMode), f.id).toEqual(plan.required);
    }
  });

  it('express slice matches resolveExpressSlaRequiredIds for fixtures', () => {
    const policy = INTAKE_POLICY_V1;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const plan = buildIntakePlan({
        responses: f.responses,
        productMode: 'express',
        collectionMode: f.collectionMode,
      });
      const slaSet = new Set(plan.slaVisibleBankIds);
      const slaStubs = QUESTION_BANK_V1_STUBS.filter(q => slaSet.has(q.id));
      const expressFromPolicy = computeRequiredBankIdsFromPolicy(
        policy,
        'express',
        slaSet,
        slaStubs,
        f.collectionMode,
      ).ids;
      const expressFromGates = resolveExpressSlaRequiredIds(f.responses, f.collectionMode);
      expect(expressFromPolicy, `${f.id} express`).toEqual(expressFromGates);
    }
  });

  it('full slice matches resolveFullSlaRequiredIds for fixtures', () => {
    const policy = INTAKE_POLICY_V1;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const plan = buildIntakePlan({
        responses: f.responses,
        productMode: 'full',
        collectionMode: f.collectionMode,
      });
      const slaSet = new Set(plan.slaVisibleBankIds);
      const slaStubs = QUESTION_BANK_V1_STUBS.filter(q => slaSet.has(q.id));
      const fullFromPolicy = computeRequiredBankIdsFromPolicy(
        policy,
        'full',
        slaSet,
        slaStubs,
        f.collectionMode,
      ).ids;
      const fullFromGates = resolveFullSlaRequiredIds(f.responses, f.collectionMode);
      expect(fullFromPolicy, `${f.id} full`).toEqual(fullFromGates);
    }
  });

  it('free_snapshot yields empty required from policy', () => {
    const plan = buildIntakePlan({
      responses: { a5: 'no_website' },
      productMode: 'free_snapshot',
    });
    const slaSet = new Set(plan.slaVisibleBankIds);
    const stubsOrdered = QUESTION_BANK_V1_STUBS.filter(q => slaSet.has(q.id));
    const out = computeRequiredBankIdsFromPolicy(
      INTAKE_POLICY_V1,
      'free_snapshot',
      slaSet,
      stubsOrdered,
    ).ids;
    expect(out).toEqual([]);
  });

  it('pre_brief narrows eligible bank ids but keeps wider SLA visibility', () => {
    const f = INTAKE_PLAN_FIXTURES.find(x => x.id === 'services_spain_pre_brief');
    expect(f).toBeDefined();
    const plan = buildIntakePlan({
      responses: f!.responses,
      productMode: 'full',
      collectionMode: 'pre_brief',
    });
    expect(plan.slaVisibleBankIds.length).toBeGreaterThan(plan.eligible.length);
    const sla = new Set(plan.slaVisibleBankIds);
    expect(plan.eligible.every(id => sla.has(id))).toBe(true);
  });
});
