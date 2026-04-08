/**
 * buildIntakePlan — resolver (canon, policy, optional layout surface).
 */
import { QUESTION_BANK_V1_STUBS, QUESTION_BANK_VERSION } from '../question-bank.js';
import type { IntakeResponsesMap } from '../types.js';

import { evaluateCanonEligibility } from './evaluate-canon.js';
import { applySurfaceLayout } from './evaluate-layout.js';
import { computeRequiredBankIdsFromPolicy } from './evaluate-policy.js';
import { loadLayoutRules } from './load-layout.js';
import { loadIntakePolicy } from './load-policy.js';
import { INTAKE_LAYOUT_VERSION, INTAKE_RESOLVER_VERSION } from './versions.js';

import type { LayoutRulesV1 } from './layout-types.js';
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

  const canon = evaluateCanonEligibility(stubs, r);
  const eligibleIds = canon.eligibleIds;
  const eligibleSet = new Set(eligibleIds);
  const reasonsById: Record<string, QuestionReason[]> = {};
  for (const [id, entries] of Object.entries(canon.reasonsById)) {
    reasonsById[id] = entries.map(e => ({ ...e }));
  }

  const policyVisibleOrdered: string[] = [];

  for (const q of stubs) {
    if (!eligibleSet.has(q.id)) continue;

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
  /** ADR: eligible = canon + policy participation (before layout deferral / suppression). */
  const eligibleAfterPolicy = sortUniqueIds(policyVisibleOrdered);
  const visibleStubsOrdered = stubs.filter(s => policyVisibleSet.has(s.id));

  const req = computeRequiredBankIdsFromPolicy(
    policy,
    input.productMode,
    policyVisibleSet,
    visibleStubsOrdered,
    collectionMode,
  );
  debugTrace.push(...req.debugTrace);

  const allBankIds = stubs.map(s => s.id);
  const hiddenIds = sortUniqueIds(allBankIds.filter(id => !policyVisibleSet.has(id)));

  const layoutArtifact = loadLayoutRules();
  const surfaces = layoutArtifact.surfaces as LayoutRulesV1['surfaces'];

  let layoutSurfaceKey: keyof LayoutRulesV1['surfaces'] | null = null;
  if (input.surface === 'public_discovery' && collectionMode === 'discovery') {
    layoutSurfaceKey = 'public_discovery';
  } else if (
    input.surface &&
    input.surface !== 'public_discovery' &&
    input.surface in surfaces
  ) {
    layoutSurfaceKey = input.surface as keyof LayoutRulesV1['surfaces'];
  }

  let finalVisible = sortUniqueIds(policyVisibleOrdered);
  let deferred: string[] = [];
  let stepPlan: IntakePlan['stepPlan'] = null;
  let layoutSlots: IntakePlan['layoutSlots'] = {};

  if (layoutSurfaceKey) {
    const surfaceCfg = surfaces[layoutSurfaceKey];
    const applied = applySurfaceLayout(
      policyVisibleOrdered,
      policyVisibleSet,
      surfaceCfg,
      `${String(layoutSurfaceKey)}_`,
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
    for (const id of applied.suppressedEligibleIds) {
      mergeReasonEntry(reasonsById, id, {
        questionId: id,
        layer: 'layout',
        state: 'hidden',
        code: 'LAYOUT_SURFACE_SUPPRESSED',
        detail: String(layoutSurfaceKey),
      });
    }
    const slot: Record<string, string | null> = {};
    for (const step of applied.stepPlan) {
      slot[step.stepId] = step.questionIds[0] ?? null;
    }
    layoutSlots = slot;
  }

  return {
    eligible: eligibleAfterPolicy,
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
