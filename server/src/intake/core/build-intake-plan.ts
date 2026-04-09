/**
 * buildIntakePlan — resolver (canon, policy, optional layout surface).
 */
import type { IntakeResponsesMap } from '../types.js';
import {
  isIntakeIncrementalEngineEnabled,
  isIntakeNextRecommendedEnabled,
  isIntakePolicyRichnessEnabled,
} from '../../config/intake-flags.js';

import { evaluateCanonEligibility, recomputeCanonEligibilityIncremental } from './evaluate-canon.js';
import { applySurfaceLayout } from './evaluate-layout.js';
import { computeRequiredBankIdsFromPolicy } from './evaluate-policy.js';
import { computeIntakePlanDerived } from './plan-derived.js';
import { computeNextRecommended } from './plan-next-recommended.js';
import { resolveIntakeArtifacts } from './resolve-intake-artifacts.js';
import { INTAKE_RESOLVER_VERSION } from './versions.js';
import { mergeLegacyIntakeAliasesRead } from '../legacy-response-aliases.js';

import type { LayoutRulesV1 } from './layout-types.js';
import type {
  BuildIntakePlanInput,
  DebugTraceEntry,
  IntakePlan,
  IntakePlanRuntimeState,
  QuestionReason,
} from './types.js';

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

function isAnsweredValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function buildPlanFromScratch(input: BuildIntakePlanInput): IntakePlan {
  return buildIntakePlanInternal(input);
}

export function recomputePlanIncremental(
  previousState: IntakePlanRuntimeState,
  input: BuildIntakePlanInput,
): IntakePlan {
  return buildIntakePlanInternal(input, previousState);
}

function buildIntakePlanInternal(
  input: BuildIntakePlanInput,
  previousState?: IntakePlanRuntimeState,
): IntakePlan {
  const artifacts = resolveIntakeArtifacts(input.intakeVersionTuple ?? null);
  const policy = artifacts.policy;
  const stubs = artifacts.stubs;
  const r = mergeLegacyIntakeAliasesRead(input.responses as Record<string, unknown>) as IntakeResponsesMap;
  const collectionMode = input.collectionMode;
  const discoveryIncluded = new Set(policy.modes.discovery.included);
  const preBriefBankIncluded =
    input.collectionMode === 'pre_brief' &&
    policy.modes.pre_brief.bankIncluded &&
    policy.modes.pre_brief.bankIncluded.length > 0
      ? new Set(policy.modes.pre_brief.bankIncluded)
      : null;

  const debugTrace: DebugTraceEntry[] = [];

  const useIncrementalCanon =
    isIntakeIncrementalEngineEnabled() &&
    Array.isArray(input.changedResponseKeys) &&
    input.changedResponseKeys.length > 0 &&
    !!previousState?.canon;
  const canon = useIncrementalCanon
    ? recomputeCanonEligibilityIncremental({
        stubs,
        responses: r,
        changedResponseKeys: input.changedResponseKeys ?? [],
        previous: previousState.canon,
      })
    : evaluateCanonEligibility(stubs, r);
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
  const askStrategyById = isIntakePolicyRichnessEnabled()
    ? (policy.modes[input.productMode].askStrategyById ?? {})
    : {};
  const policyDeferred = new Set<string>();
  const policySuppressed = new Set<string>();

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

    const askStrategy = askStrategyById[q.id];
    if (askStrategy === 'consultant_only') {
      const consultantSurface =
        input.surface === 'consultant_interview' || input.surface === 'internal_review';
      if (!consultantSurface) {
        policySuppressed.add(q.id);
        mergeReasonEntry(reasonsById, q.id, {
          questionId: q.id,
          layer: 'policy',
          state: 'hidden',
          code: 'ASK_STRATEGY_CONSULTANT_ONLY',
        });
      }
    } else if (askStrategy === 'progressive' && !isAnsweredValue(r[q.id])) {
      policyDeferred.add(q.id);
      mergeReasonEntry(reasonsById, q.id, {
        questionId: q.id,
        layer: 'policy',
        state: 'deferred',
        code: 'ASK_STRATEGY_PROGRESSIVE',
      });
    }
  }

  const uiPolicyVisibleAfterAsk = uiPolicyVisibleOrdered.filter(
    id => !policySuppressed.has(id) && !policyDeferred.has(id),
  );
  const slaVisibleSet = new Set(slaVisibleOrdered);
  const uiPolicyVisibleSet = new Set(uiPolicyVisibleAfterAsk);
  /** ADR: eligible = canon + policy participation for this surface (before layout). */
  const eligibleAfterPolicy = sortUniqueIds(
    uiPolicyVisibleOrdered.filter(id => !policySuppressed.has(id)),
  );
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
  const eligibleAfterPolicySet = new Set(eligibleAfterPolicy);
  const hiddenIds = sortUniqueIds(allBankIds.filter(id => !eligibleAfterPolicySet.has(id)));

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

  let finalVisible = sortUniqueIds(uiPolicyVisibleAfterAsk);
  let deferred: string[] = sortUniqueIds([...policyDeferred]);
  let stepPlan: IntakePlan['stepPlan'] = null;
  let layoutSlots: IntakePlan['layoutSlots'] = {};

  if (layoutSurfaceKey) {
    const surfaceCfg = surfaces[layoutSurfaceKey];
    const applied = applySurfaceLayout(
      uiPolicyVisibleAfterAsk,
      uiPolicyVisibleSet,
      surfaceCfg,
      `${String(layoutSurfaceKey)}_`,
    );
    finalVisible = applied.visible;
    const layoutDeferred = applied.deferred;
    deferred = sortUniqueIds([...deferred, ...layoutDeferred]);
    stepPlan = applied.stepPlan;
    debugTrace.push(...applied.debugTrace);
    // Only tag ids newly deferred by layout — policy-deferred ids already have their own reason.
    for (const id of layoutDeferred) {
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

  // When no layout surface applies, finalVisible is alphabetically sorted.
  // nextRecommended iterates within priority tiers: bank-canonical order produces
  // more predictable "fill next" suggestions than alphabetical (ADR §nextRecommended).
  const visibleForNextRecommended = layoutSurfaceKey
    ? finalVisible
    : (() => {
        const vset = new Set(finalVisible);
        return stubs.filter(s => vset.has(s.id)).map(s => s.id);
      })();

  const nextRecommended = isIntakeNextRecommendedEnabled()
    ? computeNextRecommended({
        visibleOrdered: visibleForNextRecommended,
        stubs,
        responses: r,
        missingForReport: derived.missingForReport,
      })
    : [];

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
    missingForReport: derived.missingForReport,
    nextRecommended,
    runtimeState: {
      responses: r as Record<string, unknown>,
      canon: {
        branchPassByCondition: canon.branchPassByCondition,
        passById: canon.passById,
      },
    },
    versions: {
      questionBankVersion: artifacts.questionBankVersion,
      policyVersion: policy.version,
      layoutVersion: layoutArtifact.version,
      // Resolver code is always current (ADR); never echo a client-provided frozen version.
      resolverVersion: INTAKE_RESOLVER_VERSION,
    },
  };
}

export function buildIntakePlan(input: BuildIntakePlanInput): IntakePlan {
  return buildPlanFromScratch(input);
}
