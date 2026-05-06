import { describe, expect, it } from 'vitest';

import { PLAN_BOARD_COLUMN_DEFAULT_IDS } from '../config/plan-board-columns.js';
import {
  buildDefaultResolvedPlanBoardPolicy,
  buildResolvedPlanBoardPolicyFromPut,
  remapPlanBoardCardColumnIdBetweenPolicies,
  resolvePlanBoardPolicyFromSources,
} from '../services/plan-board/plan-board-column-policy.service.js';
import type { PlanBoardColumnPolicyPut } from '../schemas/plan-board-column-policy.js';

const sampleCustomPolicy = (): PlanBoardColumnPolicyPut => ({
  schema_version: 1,
  columns: [
    { id: 'icebox', title: 'Icebox' },
    { id: 'nq', title: 'Next' },
    { id: 'wip', title: 'Doing' },
    { id: 'qa', title: 'QA' },
    { id: 'shipped', title: 'Shipped' },
    { id: 'stuck', title: 'Stuck' },
  ],
  semantics: {
    backlog: 'icebox',
    next_up: 'nq',
    in_progress: 'wip',
    review: 'qa',
    done: 'shipped',
    blocked: 'stuck',
  },
});

describe('plan-board-column-policy.service', () => {
  it('defaults when feature or entitlement off or policy null', () => {
    const a = resolvePlanBoardPolicyFromSources({
      featureEnabled: false,
      ownerProfileEntitled: true,
      persistedPolicy: sampleCustomPolicy(),
    });
    expect(a.landingPackCardColumnId).toBe(PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog);

    const b = resolvePlanBoardPolicyFromSources({
      featureEnabled: true,
      ownerProfileEntitled: false,
      persistedPolicy: sampleCustomPolicy(),
    });
    expect(b.semanticsToColumnId.backlog).toBe('backlog');
  });

  it('parses entitled custom ids and resolves landing backlog', () => {
    const r = resolvePlanBoardPolicyFromSources({
      featureEnabled: true,
      ownerProfileEntitled: true,
      persistedPolicy: sampleCustomPolicy(),
    });
    expect(r.landingPackCardColumnId).toBe('icebox');
    expect(r.semanticsToColumnId.in_progress).toBe('wip');
    expect(r.clientVisibleColumnIds.has('nq')).toBe(true);
    expect(r.clientVisibleColumnIds.has('icebox')).toBe(false);
  });

  it('remaps via semantics between policies', () => {
    const oldR = buildDefaultResolvedPlanBoardPolicy();
    const newR = buildResolvedPlanBoardPolicyFromPut(sampleCustomPolicy());
    expect(
      remapPlanBoardCardColumnIdBetweenPolicies({
        oldResolved: oldR,
        newResolved: newR,
        columnId: PLAN_BOARD_COLUMN_DEFAULT_IDS.in_progress,
      }),
    ).toBe('wip');
    expect(
      remapPlanBoardCardColumnIdBetweenPolicies({
        oldResolved: newR,
        newResolved: oldR,
        columnId: 'wip',
      }),
    ).toBe('in_progress');
  });

  it('maps unknown legacy column id to backlog semantic on remap', () => {
    const oldR = buildDefaultResolvedPlanBoardPolicy();
    const newR = buildResolvedPlanBoardPolicyFromPut(sampleCustomPolicy());
    expect(
      remapPlanBoardCardColumnIdBetweenPolicies({
        oldResolved: oldR,
        newResolved: newR,
        columnId: 'totally_unknown',
      }),
    ).toBe('icebox');
  });
});
