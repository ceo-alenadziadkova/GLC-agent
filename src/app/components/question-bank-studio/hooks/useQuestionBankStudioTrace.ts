import { useEffect, useState } from 'react';

import { buildIntakePlan } from '@glc/intake-core';
import type { IntakeBriefCollectionMode } from '@glc/intake-core';
import type { IntakePlan, IntakeSurface } from '@glc/intake-core';

import type { ProductMode } from '../../../data/auditTypes';

type UseQuestionBankStudioTraceInput = {
  debouncedCustomJson: string;
  customProductMode: ProductMode;
  customCollectionMode: IntakeBriefCollectionMode | '';
  customSurface: IntakeSurface | '';
};

export function useQuestionBankStudioTrace(
  input: UseQuestionBankStudioTraceInput,
): { tracePlan: IntakePlan | null; traceError: string | null } {
  const { debouncedCustomJson, customProductMode, customCollectionMode, customSurface } = input;

  const [tracePlan, setTracePlan] = useState<IntakePlan | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const responses = JSON.parse(debouncedCustomJson) as Record<string, unknown>;
      const plan = buildIntakePlan({
        responses,
        productMode: customProductMode,
        collectionMode: customCollectionMode || undefined,
        surface: customSurface || undefined,
      });
      setTracePlan(plan);
      setTraceError(null);
    } catch (e) {
      setTracePlan(null);
      setTraceError(e instanceof Error ? e.message : String(e));
    }
  }, [debouncedCustomJson, customProductMode, customCollectionMode, customSurface]);

  return { tracePlan, traceError };
}

