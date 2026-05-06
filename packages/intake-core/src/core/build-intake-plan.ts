/**
 * buildIntakePlan — resolver (canon, policy, optional layout surface).
 */
import type { IntakeResponsesMap } from '../types.js';
import {
  isIntakeIncrementalEngineEnabled,
  isIntakeNextRecommendedEnabled,
  isIntakePolicyRichnessEnabled,
} from '../config/intake-flags.js';
import {
  getIntakeIntelligenceContract,
  projectIntakeIntelligenceRequiredNow,
} from '../config/intake-intelligence-contract.js';

import { evaluateCanonEligibility, recomputeCanonEligibilityIncremental } from './evaluate-canon.js';
import { applySurfaceLayout } from './evaluate-layout.js';
import { computeRequiredBankIdsFromPolicy } from './evaluate-policy.js';
import { computeIntakePlanDerived } from './plan-derived.js';
import { computeNextRecommended } from './plan-next-recommended.js';
import { evaluateCriticalSignalsPilot } from './evaluate-critical-signals.js';
import { runSequencingEvaluator } from './intake-plan/resolver-pipeline.js';
import { reorderNextRecommendedForSignalPriorityRespectingTiers } from './reorder-next-recommended-for-signal-priority.js';
import { assembleIntakePlanDiagnostics } from './assemble-intake-plan-diagnostics.js';
import { resolveIntakeArtifacts } from './resolve-intake-artifacts.js';
import { INTAKE_RESOLVER_VERSION, currentIntakeVersionTuple } from './versions.js';
import casePatternCatalog from '../artifacts/intake-case-patterns.v1.json' with { type: 'json' };
import { matchCasePatterns } from './case-matcher.js';
import {
  mergeOverlayIntoNextRecommended,
  pruneNextRecommendedForSatisfiedCaseStops,
  resolveCaseOverlay,
} from './case-overlay-resolver.js';
import { evaluateFollowupPolicy, pruneNextRecommendedAfterFollowupStops } from './followup-policy-executor.js';
import type { IntakeCasePatternCatalogV1, IntakeCasePatternV1 } from './case-pattern-types.js';

import type { LayoutRulesV1 } from './layout-types.js';
import type {
  BuildIntakePlanInput,
  DebugTraceEntry,
  IntakePlan,
  IntakePlanRuntimeState,
  QuestionReason,
} from './types.js';

const ADMIN_PRESALE_STAGE2_CURATED_DEFER_IDS = [
  'd3',
  'd4',
  'd4b',
  'd6',
  'e3',
  'e4',
  'f5',
  'f6',
] as const;

function applyAdminPresaleStage2Curation(args: {
  visible: string[];
  deferred: string[];
  requiredSet: Set<string>;
  responses: IntakeResponsesMap;
  reasonsById: Record<string, QuestionReason[]>;
}): { visible: string[]; deferred: string[] } {
  const deferSet = new Set(args.deferred);
  const curatedSet = new Set(ADMIN_PRESALE_STAGE2_CURATED_DEFER_IDS);
  const nextVisible: string[] = [];
  for (const id of args.visible) {
    const isCurated = curatedSet.has(id as (typeof ADMIN_PRESALE_STAGE2_CURATED_DEFER_IDS)[number]);
    if (!isCurated) {
      nextVisible.push(id);
      continue;
    }
    if (args.requiredSet.has(id) || isAnsweredValue(args.responses[id])) {
      nextVisible.push(id);
      continue;
    }
    deferSet.add(id);
    mergeReasonEntry(args.reasonsById, id, {
      questionId: id,
      layer: 'policy',
      state: 'deferred',
      code: 'ADMIN_PRESALE_STAGE2_CURATED',
      detail: 'proposal_overview_focus',
    });
  }
  return { visible: nextVisible, deferred: sortUniqueIds([...deferSet]) };
}

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
  const r = { ...input.responses } as IntakeResponsesMap;
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

  if (
    input.executionContext === 'admin_presale' &&
    input.surface === 'consultant_interview'
  ) {
    const curated = applyAdminPresaleStage2Curation({
      visible: finalVisible,
      deferred,
      requiredSet: new Set(req.ids),
      responses: r,
      reasonsById,
    });
    finalVisible = curated.visible;
    deferred = curated.deferred;
  }

  const derived = computeIntakePlanDerived({
    responses: r,
    slaVisibleBankIds: sortUniqueIds(slaVisibleOrdered),
    visibleBankIds: finalVisible,
    stubs,
  });

  // Sequencing precedence is evaluated before layout masking:
  // - sequencing uses policy-visible candidates (participation ceiling after policy),
  // - layout then projects the visible subset for this surface.
  const sequencingEligibleVisible = stubs
    .filter(s => uiPolicyVisibleSet.has(s.id))
    .map(s => s.id);

  const nextRecommendedRaw = isIntakeNextRecommendedEnabled()
    ? computeNextRecommended({
        visibleOrdered: sequencingEligibleVisible,
        stubs,
        responses: r,
        missingForReport: derived.missingForReport,
      })
    : [];

  const versionsObj = {
    questionBankVersion: artifacts.questionBankVersion,
    policyVersion: policy.version,
    layoutVersion: layoutArtifact.version,
    resolverVersion: INTAKE_RESOLVER_VERSION,
    sequencingVersion: input.intakeVersionTuple?.sequencingVersion ?? currentIntakeVersionTuple().sequencingVersion,
  };

  const seqApplied = runSequencingEvaluator({
    sequencingVersion: versionsObj.sequencingVersion,
    nextRecommended: nextRecommendedRaw,
    visible: sequencingEligibleVisible,
    responses: r,
  });
  for (const te of seqApplied.sequencingTrace) {
    debugTrace.push({
      layer: 'resolver',
      level: 'info',
      code: te.code,
      message: te.semanticCause,
    });
  }

  const finalVisibleSet = new Set(finalVisible);
  let layoutProjectedRecommended = seqApplied.nextRecommended.filter(id => finalVisibleSet.has(id));
  let casePatternMatch: import('./types.js').IntakePlan['casePatternMatch'];
  let lastCriticalForPilot: ReturnType<typeof evaluateCriticalSignalsPilot> | null = null;
  let casePatternMatchesForPrune: IntakeCasePatternV1[] | null = null;

  if (isIntakeNextRecommendedEnabled() && layoutProjectedRecommended.length > 0) {
    const criticalForOrder = evaluateCriticalSignalsPilot({
      responses: r,
      plan: { eligible: sortUniqueIds(eligibleAfterPolicy) },
    });
    lastCriticalForPilot = criticalForOrder;
    const pilotSkipsRegistry = criticalForOrder.trace.some(t => t.code === 'pilot_signals_skipped');
    const casePatternsOn = policy.intelligence?.casePatternsEnabled !== false;
    if (casePatternsOn) {
      const matches = matchCasePatterns({
        responses: r,
        confidenceByKey: criticalForOrder.confidenceByKey,
        catalog: casePatternCatalog as IntakeCasePatternCatalogV1,
      });
      if (matches.length > 0) {
        casePatternMatchesForPrune = matches;
        const overlay = resolveCaseOverlay({
          matches,
          confidenceByKey: criticalForOrder.confidenceByKey,
        });
        const beforeCase = layoutProjectedRecommended.join('\u0000');
        layoutProjectedRecommended = mergeOverlayIntoNextRecommended({
          nextRecommended: layoutProjectedRecommended,
          overlayQuestionIds: overlay.overlayQuestionIds,
          visibleOrEligible: finalVisibleSet,
          responses: r,
        });
        if (beforeCase !== layoutProjectedRecommended.join('\u0000')) {
          debugTrace.push({
            layer: 'resolver',
            level: 'info',
            code: 'next_recommended_case_overlay_applied',
            message: `Case patterns matched: ${overlay.matchedCaseKeys.join(
              ', ',
            )}; overlay order applied before signal reorder.`,
          });
        }
        casePatternMatch = {
          caseKeys: overlay.matchedCaseKeys,
          activeOverlayQuestionIds: overlay.overlayQuestionIds,
          stopConditionMetByCase: overlay.stopConditionMetByCase,
        };
      }
    }
    if (!pilotSkipsRegistry) {
      const before = layoutProjectedRecommended.join('\u0000');
      const reordered = reorderNextRecommendedForSignalPriorityRespectingTiers({
        nextRecommended: layoutProjectedRecommended,
        responses: r,
        confidenceByKey: criticalForOrder.confidenceByKey,
        stubs,
      });
      layoutProjectedRecommended = reordered.nextRecommended;
      if (before !== layoutProjectedRecommended.join('\u0000')) {
        debugTrace.push({
          layer: 'resolver',
          level: 'info',
          code: 'next_recommended_reordered_by_signal_priority',
          message: `Reordered nextRecommended using pilot signal priority (nextSignalKeys: ${reordered.nextSignalKeys.join(
            ', ',
          )})`,
        });
      }
    }

    const requiredBankIds = new Set(req.ids);
    const intel = policy.intelligence;
    const casePruneOn = intel?.caseStopPrunesOptionalOverlay !== false;
    if (
      casePruneOn &&
      casePatternMatchesForPrune &&
      casePatternMatchesForPrune.length > 0 &&
      casePatternMatch?.stopConditionMetByCase
    ) {
      const pr = pruneNextRecommendedForSatisfiedCaseStops({
        nextRecommended: layoutProjectedRecommended,
        matches: casePatternMatchesForPrune,
        stopConditionMetByCase: casePatternMatch.stopConditionMetByCase,
        responses: r,
        requiredBankIds,
        enabled: true,
      });
      if (pr.prunedIds.length > 0) {
        layoutProjectedRecommended = pr.nextRecommended;
        debugTrace.push({
          layer: 'resolver',
          level: 'info',
          code: 'next_recommended_case_stop_pruned',
          message: `Optional overlay bank ids pruned after satisfied case stop: ${pr.prunedIds.join(', ')}`,
        });
      }
    }
    const fuPruneOn = intel?.followupStopPrunesSameSignalOptional !== false;
    if (fuPruneOn && lastCriticalForPilot) {
      const pr2 = pruneNextRecommendedAfterFollowupStops({
        nextRecommended: layoutProjectedRecommended,
        responses: r,
        requiredBankIds,
        confidenceByKey: lastCriticalForPilot.confidenceByKey,
        ruleDefinitions: intel?.followupRuleDefinitions,
        enabled: true,
      });
      if (pr2.prunedIds.length > 0) {
        layoutProjectedRecommended = pr2.nextRecommended;
        debugTrace.push({
          layer: 'resolver',
          level: 'info',
          code: 'next_recommended_followup_stop_pruned',
          message: `Unanswered same-signal optional ids pruned after follow-up stop: ${pr2.prunedIds.join(
            ', ',
          )}`,
        });
      }
    }
  }

  if (layoutProjectedRecommended.length > 0) {
    const followupDefs = policy.intelligence?.followupRuleDefinitions;
    const forFollowup =
      lastCriticalForPilot ??
      evaluateCriticalSignalsPilot({
        responses: r,
        plan: { eligible: sortUniqueIds(eligibleAfterPolicy) },
      });
    for (const id of layoutProjectedRecommended.slice(0, 5)) {
      const c = getIntakeIntelligenceContract(id);
      const fp = c.followupPolicy;
      if (fp?.stopIf?.trim() || fp?.deeperIf?.trim()) {
        const outcome = evaluateFollowupPolicy({
          contract: c,
          lastAnswer: r[id],
          confidenceByKey: forFollowup.confidenceByKey,
          ruleDefinitions: followupDefs,
        });
        debugTrace.push({
          layer: 'resolver',
          level: 'info',
          code: 'followup_policy_evaluated',
          message: `Follow-up for "${id}": ref=${fp.followupRuleRef ?? 'pilot_default'} -> ${outcome}; stopIf=${fp.stopIf ?? ''}; deeperIf=${fp.deeperIf ?? ''}`,
        });
      }
    }
  }

  const planCore: IntakePlan = {
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
    nextRecommended: layoutProjectedRecommended,
    casePatternMatch,
    runtimeState: {
      responses: r as Record<string, unknown>,
      canon: {
        branchPassByCondition: canon.branchPassByCondition,
        passById: canon.passById,
      },
    },
    versions: versionsObj,
  };

  const diagnostics = assembleIntakePlanDiagnostics({
    plan: planCore,
    responses: r,
    collectionMode,
    surface: input.surface,
  });

  for (const questionId of finalVisible) {
    const projected = projectIntakeIntelligenceRequiredNow(getIntakeIntelligenceContract(questionId));
    if (!projected) {
      debugTrace.push({
        layer: 'resolver',
        level: 'warn',
        code: 'intelligence_metadata_incomplete',
        message: `Intelligence metadata is incomplete for "${questionId}"; runtime fallback keeps question visible.`,
      });
    }
  }

  for (const te of diagnostics.remediation.trace) {
    debugTrace.push({
      layer: 'resolver',
      level: 'info',
      code: te.code,
      message: te.semanticCause,
    });
  }

  return {
    ...planCore,
    criticalSignals: diagnostics.criticalSignals,
    remediation: diagnostics.remediation,
    debugTrace,
  };
}

export function buildIntakePlan(input: BuildIntakePlanInput): IntakePlan {
  return buildPlanFromScratch(input);
}
