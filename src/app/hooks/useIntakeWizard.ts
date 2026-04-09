import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BriefResponses } from '../data/briefQuestions';
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from '../data/auditTypes';
import { briefResponsesToIntakeMap } from '../data/intakeBriefMap';
import {
  briefTrackQuestionAnswered,
  briefTrackQuestionShown,
  briefTrackQuestionSkipped,
  createBriefIntakeAnalyticsSink,
  intakeMapValueAnswered,
  type BriefIntakeAnalyticsExperimentVariant,
  type BriefIntakeAnalyticsSurface,
} from '../lib/brief-intake-analytics';
import { buildIntakePlan, recomputePlanIncremental } from '../../../server/src/intake/core/build-intake-plan';
import { listBankStubIdsInvalidatedByResponseKeys } from '../../../server/src/intake/core/branch-condition-deps';
import { isIntakeNextRecommendedEnabled } from '../../../server/src/config/intake-flags';
import { computeIntakePlanDerived } from '../../../server/src/intake/core/plan-derived';
import { computeNextRecommended } from '../../../server/src/intake/core/plan-next-recommended';
import type { IntakeSurface } from '../../../server/src/intake/core/types';
import { calcDataQualityScoreFromVisible, DEFAULT_DATA_QUALITY_WEIGHTS } from '../../../server/src/intake/data-quality';
import { QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import type { IntakeQuestionStub, IntakeResponsesMap } from '../../../server/src/intake/types';

export { briefResponsesToIntakeMap };

/** Canonical bank JSON order for stable wizard sequencing. */
export function sortStubsByBankOrder(stubs: IntakeQuestionStub[]): IntakeQuestionStub[] {
  const order = new Map(QUESTION_BANK_V1_STUBS.map((q, i) => [q.id, i] as const));
  return [...stubs].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
}

/**
 * Question-bank v1 coverage (branch-aware visible set + same scoring as API `calcDataQualityScore`).
 */
export function useIntakeBankMetrics(
  briefResponses: BriefResponses,
  collectionMode?: IntakeBriefCollectionMode,
  surface?: IntakeSurface,
  productMode: ProductMode = 'full',
) {
  return useMemo(() => {
    const merged = { ...briefResponsesToIntakeMap(briefResponses) };
    const plan = buildIntakePlan({
      responses: merged,
      productMode,
      collectionMode,
      surface,
    });
    const visibleSet = new Set(plan.visible);
    const visibleStubs = QUESTION_BANK_V1_STUBS.filter(q => visibleSet.has(q.id));
    const dq = calcDataQualityScoreFromVisible(
      visibleStubs,
      merged as IntakeResponsesMap,
      DEFAULT_DATA_QUALITY_WEIGHTS,
    );
    return {
      mergedResponses: merged,
      dataQuality: dq,
      dataQualityPct: Math.round(dq.score * 100),
      visibleRequiredTotal: dq.visibleRequired,
      visibleRequiredAnswered: dq.answeredRequired,
      visibleRecommendedTotal: dq.visibleRecommended,
      visibleRecommendedAnswered: dq.answeredRecommended,
      nextRecommended: plan.nextRecommended,
      missingForReport: plan.missingForReport,
    };
  }, [briefResponses, collectionMode, surface, productMode]);
}

export interface UseIntakeWizardOptions {
  /** Initial map when uncontrolled (only read on first mount). */
  initialMap?: Record<string, unknown>;
  collectionMode?: IntakeBriefCollectionMode;
  /** Audit product mode (express narrows SLA vs full). */
  productMode?: ProductMode;
  /** Layout surface (consultant interview vs client form / portal). Omit when unknown. */
  surface?: IntakeSurface;
  /** Controlled: parent-owned responses map (after briefResponsesToIntakeMap). */
  value?: Record<string, unknown>;
  onChange?: (next: Record<string, unknown>) => void;
  /** Batched funnel analytics (ADR Phase G); requires authenticated audit context. */
  intakeAnalytics?: {
    auditId: string;
    surface: BriefIntakeAnalyticsSurface;
    getIntakeVersions: () => IntakeVersionTuple | null;
    getExperimentVariant?: () => BriefIntakeAnalyticsExperimentVariant | null;
  };
}

/**
 * Full-bank wizard: branching visibility, canonical step order, data quality.
 * Controlled mode keeps `responses` in the parent (e.g. New Audit brief).
 */
export function useIntakeWizard(options: UseIntakeWizardOptions) {
  const { initialMap = {}, collectionMode, productMode = 'full', surface, value, onChange, intakeAnalytics } =
    options;
  const controlled = value !== undefined && onChange !== undefined;
  const analyticsOptRef = useRef(intakeAnalytics);
  analyticsOptRef.current = intakeAnalytics;

  const analyticsSink = useMemo(() => {
    if (!intakeAnalytics) return null;
    return createBriefIntakeAnalyticsSink({
      auditId: intakeAnalytics.auditId,
      surface: intakeAnalytics.surface,
      getIntakeVersions: () => analyticsOptRef.current?.getIntakeVersions() ?? null,
      getExperimentVariant: () => analyticsOptRef.current?.getExperimentVariant?.() ?? null,
    });
  }, [intakeAnalytics?.auditId, intakeAnalytics?.surface]);

  const [internal, setInternal] = useState(() => ({ ...initialMap }));

  const responses = useMemo(() => {
    if (controlled) return { ...value };
    return internal;
  }, [controlled, value, internal]);

  const prevPlanInputRef = useRef<{
    responses: Record<string, unknown>;
    collectionMode?: IntakeBriefCollectionMode;
    surface?: IntakeSurface;
    productMode: ProductMode;
  } | null>(null);
  const prevPlanOutputRef = useRef<{
    visibleStubs: IntakeQuestionStub[];
    nextRecommended: string[];
    missingForReport: string[];
  } | null>(null);
  const prevRuntimeStateRef = useRef<ReturnType<typeof buildIntakePlan>['runtimeState'] | null>(null);

  const getChangedResponseKeys = useCallback(
    (prev: Record<string, unknown>, next: Record<string, unknown>): string[] => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      const changed: string[] = [];
      for (const k of keys) {
        if (prev[k] !== next[k]) changed.push(k);
      }
      return changed;
    },
    [],
  );

  const intakePlan = useMemo(() => {
    const prevInput = prevPlanInputRef.current;
    const prevOutput = prevPlanOutputRef.current;
    const stableContext =
      prevInput &&
      prevInput.collectionMode === collectionMode &&
      prevInput.surface === surface &&
      prevInput.productMode === productMode;
    const changedKeys = prevInput ? getChangedResponseKeys(prevInput.responses, responses) : [];
    const invalidated = stableContext
      ? listBankStubIdsInvalidatedByResponseKeys(changedKeys)
      : ['__force_full__'];
    const canPartial = Boolean(stableContext && prevOutput && invalidated.length === 0);
    const canIncremental = Boolean(
      stableContext &&
      prevRuntimeStateRef.current &&
      invalidated.length > 0 &&
      invalidated[0] !== '__force_full__',
    );

    if (canPartial && prevOutput) {
      const visibleStubs = prevOutput.visibleStubs;
      const visibleIds = visibleStubs.map(s => s.id);
      const derived = computeIntakePlanDerived({
        responses: responses as IntakeResponsesMap,
        slaVisibleBankIds: visibleIds,
        visibleBankIds: visibleIds,
        stubs: QUESTION_BANK_V1_STUBS,
      });
      const nextRecommended = isIntakeNextRecommendedEnabled()
        ? computeNextRecommended({
            visibleOrdered: visibleIds,
            stubs: QUESTION_BANK_V1_STUBS,
            responses: responses as IntakeResponsesMap,
            missingForReport: derived.missingForReport,
          })
        : [];
      const out = {
        visibleStubs,
        nextRecommended,
        missingForReport: derived.missingForReport,
      };
      prevPlanInputRef.current = { responses, collectionMode, surface, productMode };
      prevPlanOutputRef.current = out;
      return out;
    }

    const plan = canIncremental
      ? recomputePlanIncremental(prevRuntimeStateRef.current!, {
          responses,
          productMode,
          collectionMode,
          surface,
          changedResponseKeys: changedKeys,
        })
      : buildIntakePlan({
          responses,
          productMode,
          collectionMode,
          surface,
        });
    const visible = new Set(plan.visible);
    const visibleStubs = sortStubsByBankOrder(QUESTION_BANK_V1_STUBS.filter(q => visible.has(q.id)));
    const out = {
      visibleStubs,
      nextRecommended: plan.nextRecommended,
      missingForReport: plan.missingForReport,
    };
    prevPlanInputRef.current = { responses, collectionMode, surface, productMode };
    prevPlanOutputRef.current = out;
    prevRuntimeStateRef.current = plan.runtimeState ?? null;
    return out;
  }, [responses, collectionMode, surface, productMode, getChangedResponseKeys]);

  const visibleStubs = intakePlan.visibleStubs;
  const nextRecommended = intakePlan.nextRecommended;
  const missingForReport = intakePlan.missingForReport;

  const dataQuality = useMemo(
    () =>
      calcDataQualityScoreFromVisible(
        visibleStubs,
        responses as IntakeResponsesMap,
        DEFAULT_DATA_QUALITY_WEIGHTS,
      ),
    [visibleStubs, responses],
  );

  const setField = useCallback(
    (id: string, val: unknown) => {
      const base = { ...responses, [id]: val };
      const next = { ...base };
      if (controlled) onChange(next);
      else setInternal(next);
    },
    [controlled, onChange, responses],
  );

  const setResponses = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      if (controlled) {
        const next = { ...updater({ ...responses }) };
        onChange(next);
      } else {
        setInternal(prev => ({ ...updater({ ...prev }) }));
      }
    },
    [controlled, onChange, responses],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const totalSteps = visibleStubs.length;
  const maxIndex = Math.max(0, totalSteps - 1);
  const safeIndex = Math.min(Math.max(0, stepIndex), maxIndex);
  const currentStub = visibleStubs[safeIndex];
  const lastShownKeyRef = useRef('');
  const visibleStubsRef = useRef(visibleStubs);
  visibleStubsRef.current = visibleStubs;
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  useEffect(() => {
    setStepIndex(i => Math.min(i, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (!analyticsSink || !currentStub) return;
    const key = `${safeIndex}:${currentStub.id}`;
    if (lastShownKeyRef.current === key) return;
    lastShownKeyRef.current = key;
    briefTrackQuestionShown(analyticsSink, { questionId: currentStub.id, stepIndex: safeIndex });
  }, [analyticsSink, currentStub?.id, safeIndex]);

  useEffect(() => {
    const s = analyticsSink;
    return () => {
      void s?.flush();
    };
  }, [analyticsSink]);

  const goNext = useCallback(() => {
    setStepIndex(i => {
      const stubs = visibleStubsRef.current;
      const maxIdx = Math.max(0, stubs.length - 1);
      const prevIdx = Math.min(Math.max(0, i), maxIdx);
      const stub = stubs[prevIdx];
      const res = responsesRef.current;
      if (analyticsSink && stub) {
        const answered = intakeMapValueAnswered(res[stub.id]);
        if (!answered) {
          if (stub.priority === 'optional') {
            briefTrackQuestionSkipped(analyticsSink, { questionId: stub.id, stepIndex: prevIdx });
          }
        } else {
          briefTrackQuestionAnswered(analyticsSink, { questionId: stub.id, stepIndex: prevIdx });
        }
      }
      return Math.min(i + 1, maxIdx);
    });
  }, [analyticsSink]);

  const goPrev = useCallback(() => {
    setStepIndex(i => Math.max(i - 1, 0));
  }, []);

  const goToStep = useCallback(
    (n: number) => {
      setStepIndex(Math.min(Math.max(0, n), maxIndex));
    },
    [maxIndex],
  );

  return {
    responses,
    setResponses,
    setField,
    visibleQuestionStubs: visibleStubs,
    nextRecommended,
    missingForReport,
    dataQuality,
    stepIndex: safeIndex,
    setStepIndex,
    totalSteps,
    currentStub,
    goNext,
    goPrev,
    goToStep,
    isFirstStep: safeIndex <= 0,
    isLastStep: totalSteps > 0 && safeIndex >= maxIndex,
  };
}
