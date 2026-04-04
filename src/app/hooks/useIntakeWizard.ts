import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BriefResponses } from '../data/briefQuestions';
import { calcDataQualityScore, DEFAULT_DATA_QUALITY_WEIGHTS } from '../../../server/src/intake/data-quality';
import { filterVisibleQuestions } from '../../../server/src/intake/is-visible';
import { mergeLegacyResponsesIntoBankV1 } from '../../../server/src/intake/legacy-to-bank';
import { QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import type { CollectionMode, IntakeQuestionStub } from '../../../server/src/intake/types';

/** Map UI brief state to engine input (cells may be flat or `{ value, source }`). */
export function briefResponsesToIntakeMap(brief: BriefResponses): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(brief)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in v) {
      out[k] = v;
    } else {
      out[k] = v as unknown;
    }
  }
  return out;
}

/** Canonical bank JSON order for stable wizard sequencing. */
export function sortStubsByBankOrder(stubs: IntakeQuestionStub[]): IntakeQuestionStub[] {
  const order = new Map(QUESTION_BANK_V1_STUBS.map((q, i) => [q.id, i] as const));
  return [...stubs].sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
}

/**
 * Question-bank v1 coverage for the current legacy+brief UI (branch-aware visible set).
 * Uses the same merge/scoring as the API (`mergeLegacyResponsesIntoBankV1`, §10 QUESTION_BANK).
 */
export function useIntakeBankMetrics(
  briefResponses: BriefResponses,
  collectionMode?: CollectionMode,
) {
  return useMemo(() => {
    const merged = mergeLegacyResponsesIntoBankV1({ ...briefResponsesToIntakeMap(briefResponses) });
    const dq = calcDataQualityScore(
      QUESTION_BANK_V1_STUBS,
      merged,
      DEFAULT_DATA_QUALITY_WEIGHTS,
      { collectionMode },
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
  }, [briefResponses, collectionMode]);
}

export interface UseIntakeWizardOptions {
  /** Initial map when uncontrolled (only read on first mount). */
  initialMap?: Record<string, unknown>;
  collectionMode?: CollectionMode;
  /** Controlled: parent-owned responses map (after briefResponsesToIntakeMap). */
  value?: Record<string, unknown>;
  onChange?: (next: Record<string, unknown>) => void;
}

/**
 * Full-bank wizard: branching visibility, canonical step order, data quality.
 * Controlled mode keeps `responses` in the parent (e.g. New Audit brief).
 */
export function useIntakeWizard(options: UseIntakeWizardOptions) {
  const { initialMap = {}, collectionMode, value, onChange } = options;
  const controlled = value !== undefined && onChange !== undefined;

  const [internal, setInternal] = useState(() => mergeLegacyResponsesIntoBankV1({ ...initialMap }));

  const responses = useMemo(() => {
    if (controlled) return mergeLegacyResponsesIntoBankV1({ ...value });
    return internal;
  }, [controlled, value, internal]);

  const visibleStubs = useMemo(
    () =>
      sortStubsByBankOrder(
        filterVisibleQuestions(QUESTION_BANK_V1_STUBS, responses, { collectionMode }),
      ),
    [responses, collectionMode],
  );

  const dataQuality = useMemo(
    () => calcDataQualityScore(
      QUESTION_BANK_V1_STUBS,
      responses,
      DEFAULT_DATA_QUALITY_WEIGHTS,
      { collectionMode },
    ),
    [responses, collectionMode],
  );

  const setField = useCallback(
    (id: string, val: unknown) => {
      const base = { ...responses, [id]: val };
      const next = mergeLegacyResponsesIntoBankV1(base);
      if (controlled) onChange(next);
      else setInternal(next);
    },
    [controlled, onChange, responses],
  );

  const setResponses = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      if (controlled) {
        const next = mergeLegacyResponsesIntoBankV1(updater({ ...responses }));
        onChange(next);
      } else {
        setInternal(prev => mergeLegacyResponsesIntoBankV1(updater({ ...prev })));
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
