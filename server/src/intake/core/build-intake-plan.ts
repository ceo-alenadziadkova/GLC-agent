/**
 * buildIntakePlan — resolver (canon, policy, optional layout surface).
 */
import { evalBranchCondition } from '../branch-rules.js';
import { QUESTION_BANK_V1_STUBS, QUESTION_BANK_VERSION } from '../question-bank.js';
import type { IntakeResponsesMap } from '../types.js';

import { applyPublicDiscoveryLayout } from './evaluate-layout.js';
import { computeRequiredBankIdsFromPolicy } from './evaluate-policy.js';
import { loadLayoutRules } from './load-layout.js';
import { loadIntakePolicy } from './load-policy.js';
import { INTAKE_LAYOUT_VERSION, INTAKE_RESOLVER_VERSION } from './versions.js';

import type { BuildIntakePlanInput, DebugTraceEntry, IntakePlan, QuestionReason } from './types.js';

function sortUniqueIds(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function mergeReasonEntry(
  target: Record<string, QuestionReason[]>,
  id: string,
  entry: QuestionReason,
): void {
  const prev = target[id] ?? [];
  target[id] = [...prev, entry];
}

export function buildIntakePlan(input: BuildIntakePlanInput): IntakePlan {
  const policy = loadIntakePolicy();
  const stubs = QUESTION_BANK_V1_STUBS;
  const r = input.responses as IntakeResponsesMap;
  const collectionMode = input.collectionMode;
  const discoveryIncluded = new Set(policy.modes.discovery.included);

  const debugTrace: DebugTraceEntry[] = [];

  const eligibleIds: string[] = [];
  const policyVisibleOrdered: string[] = [];
  const reasonsById: Record<string, QuestionReason[]> = {};

  for (const q of stubs) {
    const branchOk = evalBranchCondition(q.branchCondition, r);
    if (!branchOk) {
      mergeReasonEntry(reasonsById, q.id, {
        questionId: q.id,
        layer: 'canon',
        state: 'hidden',
        code: 'BRANCH_FALSE',
        detail: q.branchCondition,
      });
      continue;
    }

    eligibleIds.push(q.id);
    mergeReasonEntry(reasonsById, q.id, {
      questionId: q.id,
      layer: 'canon',
      state: 'eligible',
      code: 'BRANCH_OK',
    });

    if (collectionMode === 'discovery' && !discoveryIncluded.has(q.id)) {
      mergeReasonEntry(reasonsById, q.id, {
        questionId: q.id,
        layer: 'policy',
        state: 'hidden',
        code: 'DISCOVERY_NOT_INCLUDED',
      });
      continue;
    }

    policyVisibleOrdered.push(q.id);
    mergeReasonEntry(reasonsById, q.id, {
      questionId: q.id,
      layer: 'policy',
      state: 'visible',
      code: 'PARTICIPATION_OK',
    });
  }

  const policyVisibleSet = new Set(policyVisibleOrdered);
  const visibleStubsOrdered = stubs.filter(s => policyVisibleSet.has(s.id));

  const req = computeRequiredBankIdsFromPolicy(
    policy,
    input.productMode,
    policyVisibleSet,
    visibleStubsOrdered,
  );
  debugTrace.push(...req.debugTrace);

  const allBankIds = stubs.map(s => s.id);
  const hiddenIds = sortUniqueIds(allBankIds.filter(id => !policyVisibleSet.has(id)));

  const usePublicDiscoveryLayout =
    input.surface === 'public_discovery' && collectionMode === 'discovery';

  let finalVisible = sortUniqueIds(policyVisibleOrdered);
  let deferred: string[] = [];
  let stepPlan: IntakePlan['stepPlan'] = null;
  let layoutSlots: IntakePlan['layoutSlots'] = {};

  if (usePublicDiscoveryLayout) {
    const layoutArtifact = loadLayoutRules();
    const applied = applyPublicDiscoveryLayout(
      policyVisibleOrdered,
      policyVisibleSet,
      layoutArtifact.surfaces.public_discovery,
    );
    finalVisible = applied.visible;
    deferred = applied.deferred;
    stepPlan = applied.stepPlan;
    debugTrace.push(...applied.debugTrace);
    for (const id of deferred) {
      mergeReasonEntry(reasonsById, id, {
        questionId: id,
        layer: 'layout',
        state: 'deferred',
        code: 'LAYOUT_DEFER_REMAINING',
      });
    }
    const slot: Record<string, string | null> = {};
    for (const step of applied.stepPlan) {
      slot[step.stepId] = step.questionIds[0] ?? null;
    }
    layoutSlots = slot;
  }

  return {
    eligible: sortUniqueIds(eligibleIds),
    visible: finalVisible,
    required: sortUniqueIds(req.ids),
    hidden: hiddenIds,
    deferred,
    layoutSlots,
    stepPlan,
    reasonsById,
    debugTrace,
    versions: {
      questionBankVersion: QUESTION_BANK_VERSION,
      policyVersion: policy.version,
      layoutVersion: INTAKE_LAYOUT_VERSION,
      resolverVersion: INTAKE_RESOLVER_VERSION,
    },
  };
}
