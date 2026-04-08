import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BriefResponses } from '../data/briefQuestions';
import type { IntakeBriefCollectionMode } from '../data/auditTypes';
import { briefResponsesToIntakeMap } from '../data/intakeBriefMap';
import { buildIntakePlan } from '../../../server/src/intake/core/build-intake-plan';
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
) {
  return useMemo(() => {
    const merged = { ...briefResponsesToIntakeMap(briefResponses) };
    const plan = buildIntakePlan({
      responses: merged,
      productMode: 'full',
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
    };
  }, [briefResponses, collectionMode, surface]);
}

export interface UseIntakeWizardOptions {
  /** Initial map when uncontrolled (only read on first mount). */
  initialMap?: Record<string, unknown>;
  collectionMode?: IntakeBriefCollectionMode;
  /** Layout surface (consultant interview vs client form / portal). Omit when unknown. */
  surface?: IntakeSurface;
  /** Controlled: parent-owned responses map (after briefResponsesToIntakeMap). */
  value?: Record<string, unknown>;
  onChange?: (next: Record<string, unknown>) => void;
}

/**
 * Full-bank wizard: branching visibility, canonical step order, data quality.
 * Controlled mode keeps `responses` in the parent (e.g. New Audit brief).
 */
export function useIntakeWizard(options: UseIntakeWizardOptions) {
  const { initialMap = {}, collectionMode, surface, value, onChange } = options;
  const controlled = value !== undefined && onChange !== undefined;

  const [internal, setInternal] = useState(() => ({ ...initialMap }));

  const responses = useMemo(() => {
    if (controlled) return { ...value };
    return internal;
  }, [controlled, value, internal]);

  const visibleStubs = useMemo(() => {
    const plan = buildIntakePlan({
      responses,
      productMode: 'full',
      collectionMode,
      surface,
    });
    const visible = new Set(plan.visible);
    return sortStubsByBankOrder(QUESTION_BANK_V1_STUBS.filter(q => visible.has(q.id)));
  }, [responses, collectionMode, surface]);

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

  useEffect(() => {
    setStepIndex(i => Math.min(i, maxIndex));
  }, [maxIndex]);

  const goNext = useCallback(() => {
    setStepIndex(i => Math.min(i + 1, maxIndex));
  }, [maxIndex]);

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
