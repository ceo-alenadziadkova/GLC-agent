/**
 * buildIntakePlan — resolver (canon, policy, optional layout surface).
 */
import type { IntakeResponsesMap } from '../types.js';

import { evaluateCanonEligibility } from './evaluate-canon.js';
import { applySurfaceLayout } from './evaluate-layout.js';
import { computeRequiredBankIdsFromPolicy } from './evaluate-policy.js';
import { computeIntakePlanDerived } from './plan-derived.js';
import { resolveIntakeArtifacts } from './resolve-intake-artifacts.js';
import { INTAKE_RESOLVER_VERSION } from './versions.js';

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
  const artifacts = resolveIntakeArtifacts(input.intakeVersionTuple ?? null);
  const policy = artifacts.policy;
  const stubs = artifacts.stubs;
  const r = input.responses as IntakeResponsesMap;
  const collectionMode = input.collectionMode;
  const discoveryIncluded = new Set(policy.modes.discovery.included);
  const preBriefBankIncluded =
    input.collectionMode === 'pre_brief' &&
    policy.modes.pre_brief.bankIncluded &&
    policy.modes.pre_brief.bankIncluded.length > 0
      ? new Set(policy.modes.pre_brief.bankIncluded)
      : null;

  const debugTrace: DebugTraceEntry[] = [];

  const canon = evaluateCanonEligibility(stubs, r);
  const eligibleIds = canon.eligibleIds;
  const eligibleSet = new Set(eligibleIds);
  const reasonsById: Record<string, QuestionReason[]> = {};
  for (const [id, entries] of Object.entries(canon.reasonsById)) {
    reasonsById[id] = entries.map(e => ({ ...e }));
  }

  /** Bank ids that count toward SLA / required (discovery-filtered; pre_brief does not narrow SLA). */
  const slaVisibleOrdered: string[] = [];
  /** Bank ids shown on this collection surface (pre_brief narrows when policy has bankIncluded). */
  const uiPolicyVisibleOrdered: string[] = [];

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

    slaVisibleOrdered.push(q.id);

    if (preBriefBankIncluded && !preBriefBankIncluded.has(q.id)) {
      mergeReasonEntry(reasonsById, q.id, {
        questionId: q.id,
        layer: 'policy',
        state: 'hidden',
        code: 'PRE_BRIEF_BANK_NOT_INCLUDED',
      });
      continue;
    }

    uiPolicyVisibleOrdered.push(q.id);
    mergeReasonEntry(reasonsById, q.id, {
      questionId: q.id,
      layer: 'policy',
      state: 'visible',
      code: 'PARTICIPATION_OK',
    });
  }

  const slaVisibleSet = new Set(slaVisibleOrdered);
  const uiPolicyVisibleSet = new Set(uiPolicyVisibleOrdered);
  /** ADR: eligible = canon + policy participation for this surface (before layout). */
  const eligibleAfterPolicy = sortUniqueIds(uiPolicyVisibleOrdered);
  const visibleStubsForSla = stubs.filter(s => slaVisibleSet.has(s.id));

  const req = computeRequiredBankIdsFromPolicy(
    policy,
    input.productMode,
    slaVisibleSet,
    visibleStubsForSla,
    collectionMode,
  );
  debugTrace.push(...req.debugTrace);

  const allBankIds = stubs.map(s => s.id);
  const hiddenIds = sortUniqueIds(allBankIds.filter(id => !uiPolicyVisibleSet.has(id)));

  const layoutArtifact = artifacts.layoutRules;
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

  let finalVisible = sortUniqueIds(uiPolicyVisibleOrdered);
  let deferred: string[] = [];
  let stepPlan: IntakePlan['stepPlan'] = null;
  let layoutSlots: IntakePlan['layoutSlots'] = {};

  if (layoutSurfaceKey) {
    const surfaceCfg = surfaces[layoutSurfaceKey];
    const applied = applySurfaceLayout(
      uiPolicyVisibleOrdered,
      uiPolicyVisibleSet,
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
    const slot: Record<string, string[]> = {};
    for (const step of applied.stepPlan) {
      slot[step.stepId] = [...step.questionIds];
    }
    layoutSlots = slot;
  }

  const derived = computeIntakePlanDerived({
    responses: r,
    slaVisibleBankIds: sortUniqueIds(slaVisibleOrdered),
    visibleBankIds: finalVisible,
    stubs,
  });

  return {
    eligible: eligibleAfterPolicy,
    visible: finalVisible,
    required: sortUniqueIds(req.ids),
    hidden: hiddenIds,
    deferred,
    slaVisibleBankIds: sortUniqueIds(slaVisibleOrdered),
    layoutSlots,
    stepPlan,
    reasonsById,
    debugTrace,
    derivedFacts: derived.derivedFacts,
    coverage: derived.coverage,
    confidence: derived.confidence,
    versions: {
      questionBankVersion: artifacts.questionBankVersion,
      policyVersion: policy.version,
      layoutVersion: layoutArtifact.version,
      resolverVersion: input.intakeVersionTuple?.resolverVersion ?? INTAKE_RESOLVER_VERSION,
    },
  };
}
