/**
 * Phase 0 — Intake plan snapshot regression.
 *
 * Deferred is always [] here: layout / askStrategy are not implemented yet. When Phase 5b adds
 * layout, deferred may become non-empty and this snapshot must be updated intentionally.
 *
 * Update snapshots: UPDATE_INTAKE_PLAN_SNAPSHOT=1 npx vitest run server/src/tests/intake-plan-snapshot.test.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BRANCH_RULES } from '../intake/branch-rules.js';
import rawBank from '../intake/question-bank.v1.json';
import type { IntakeResponsesMap } from '../intake/types.js';
import { INTAKE_PLAN_FIXTURES } from './fixtures/intake-plan-fixtures.js';
import { type IntakePlanSnapshotPayload, computeIntakePlanSnapshotShim } from './intake-plan-shim.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP_PATH = join(__dirname, 'fixtures', '__snapshots__', 'intake-plan.snap.json');

function bankBranchKeys(): Set<string> {
  const bank = rawBank as { questions: Array<{ branch?: string }> };
  const keys = new Set<string>();
  for (const q of bank.questions) {
    if (q.branch) keys.add(q.branch);
  }
  return keys;
}

describe('intake plan Phase 0 snapshots (current engine)', () => {
  it('matches committed snapshot', () => {
    const actual: Record<string, IntakePlanSnapshotPayload> = {};
    for (const f of INTAKE_PLAN_FIXTURES) {
      actual[f.id] = computeIntakePlanSnapshotShim(f.responses, f.productMode, f.collectionMode);
    }

    if (process.env.UPDATE_INTAKE_PLAN_SNAPSHOT === '1') {
      mkdirSync(dirname(SNAP_PATH), { recursive: true });
      writeFileSync(SNAP_PATH, `${JSON.stringify(actual, null, 2)}\n`, 'utf8');
      return;
    }

    const expected = JSON.parse(readFileSync(SNAP_PATH, 'utf8')) as Record<string, IntakePlanSnapshotPayload>;
    expect(actual).toEqual(expected);
  });

  it('exercises every branchCondition key from question-bank.v1.json', () => {
    const keys = bankBranchKeys();
    for (const key of keys) {
      const pred = BRANCH_RULES[key];
      expect(pred, `BRANCH_RULES missing "${key}"`).toBeDefined();
      const covered = INTAKE_PLAN_FIXTURES.some(f =>
        pred!(f.responses as IntakeResponsesMap),
      );
      expect(covered, `No fixture makes branch "${key}" true`).toBe(true);
    }
  });

  it('covers product modes full and express', () => {
    const productModes = new Set(INTAKE_PLAN_FIXTURES.map(f => f.productMode));
    expect(productModes.has('full')).toBe(true);
    expect(productModes.has('express')).toBe(true);
  });

  it('covers discovery and pre_brief collection modes', () => {
    expect(INTAKE_PLAN_FIXTURES.some(f => f.collectionMode === 'discovery')).toBe(true);
    expect(INTAKE_PLAN_FIXTURES.some(f => f.collectionMode === 'pre_brief')).toBe(true);
  });
});
