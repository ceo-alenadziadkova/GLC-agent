/**
 * Phase 1 — Policy JSON reproduces brief-gates / discovery.ts behavior.
 */
import { describe, expect, it } from 'vitest';

import {
  getVisibleBankStubs,
  resolveExpressSlaRequiredIds,
  resolveFullSlaRequiredIds,
  resolveSlaRequiredIds,
} from '../intake/brief-gates.js';
import { DISCOVERY_BANK_IDS } from '../intake/discovery.js';
import { INTAKE_POLICY_V1, computeRequiredBankIdsFromPolicy, loadIntakePolicy } from '../intake/core/index.js';
import { QUESTION_BANK_V1_STUBS } from '../intake/question-bank.js';
import { INTAKE_PLAN_FIXTURES } from './fixtures/intake-plan-fixtures.js';

describe('intake-policy v1 parity', () => {
  it('discovery included set matches DISCOVERY_BANK_IDS', () => {
    const fromPolicy = new Set(INTAKE_POLICY_V1.modes.discovery.included);
    expect(fromPolicy.size).toBe(DISCOVERY_BANK_IDS.size);
    for (const id of DISCOVERY_BANK_IDS) {
      expect(fromPolicy.has(id)).toBe(true);
    }
    for (const id of fromPolicy) {
      expect(DISCOVERY_BANK_IDS.has(id)).toBe(true);
    }
  });

  it('loadIntakePolicy returns the same artifact', () => {
    expect(loadIntakePolicy().version).toBe('1.0.0');
  });

  it('required bank ids from policy match resolveSlaRequiredIds for every fixture', () => {
    const policy = INTAKE_POLICY_V1;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const visible = getVisibleBankStubs(f.responses, f.collectionMode);
      const visibleSet = new Set(visible.map(q => q.id));
      const visibleStubsOrdered = QUESTION_BANK_V1_STUBS.filter(q => visibleSet.has(q.id));
      const fromPolicy = computeRequiredBankIdsFromPolicy(
        policy,
        f.productMode,
        visibleSet,
        visibleStubsOrdered,
      ).ids;
      const fromGates = resolveSlaRequiredIds(f.productMode, f.responses, f.collectionMode);
      expect(fromPolicy, f.id).toEqual(fromGates);
    }
  });

  it('express slice matches resolveExpressSlaRequiredIds for fixtures', () => {
    const policy = INTAKE_POLICY_V1;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const visible = getVisibleBankStubs(f.responses, f.collectionMode);
      const visibleSet = new Set(visible.map(q => q.id));
      const visibleStubsOrdered = QUESTION_BANK_V1_STUBS.filter(q => visibleSet.has(q.id));
      const expressFromPolicy = computeRequiredBankIdsFromPolicy(
        policy,
        'express',
        visibleSet,
        visibleStubsOrdered,
      ).ids;
      const expressFromGates = resolveExpressSlaRequiredIds(f.responses, f.collectionMode);
      expect(expressFromPolicy, `${f.id} express`).toEqual(expressFromGates);
    }
  });

  it('full slice matches resolveFullSlaRequiredIds for fixtures', () => {
    const policy = INTAKE_POLICY_V1;
    for (const f of INTAKE_PLAN_FIXTURES) {
      const visible = getVisibleBankStubs(f.responses, f.collectionMode);
      const visibleSet = new Set(visible.map(q => q.id));
      const visibleStubsOrdered = QUESTION_BANK_V1_STUBS.filter(q => visibleSet.has(q.id));
      const fullFromPolicy = computeRequiredBankIdsFromPolicy(
        policy,
        'full',
        visibleSet,
        visibleStubsOrdered,
      ).ids;
      const fullFromGates = resolveFullSlaRequiredIds(f.responses, f.collectionMode);
      expect(fullFromPolicy, `${f.id} full`).toEqual(fullFromGates);
    }
  });

  it('free_snapshot yields empty required from policy', () => {
    const visible = getVisibleBankStubs({ a5: 'no_website' }, undefined);
    const visibleSet = new Set(visible.map(q => q.id));
    const stubsOrdered = QUESTION_BANK_V1_STUBS.filter(q => visibleSet.has(q.id));
    const out = computeRequiredBankIdsFromPolicy(
      INTAKE_POLICY_V1,
      'free_snapshot',
      visibleSet,
      stubsOrdered,
    ).ids;
    expect(out).toEqual([]);
  });
});
