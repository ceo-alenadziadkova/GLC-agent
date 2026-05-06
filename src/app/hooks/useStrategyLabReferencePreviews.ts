import { useMemo } from 'react';

import { DOMAIN_KEYS } from '../data/auditTypes';
import type { DomainBenchmarkSnapshot } from '../data/api/benchmarks';
import { STRATEGY_LAB_COPY } from '../config/strategy-lab-copy';
import type { StrategyRoadmap } from '../data/audit/contracts/report/report-domain.types';

export type DomainBenchmarksMap = Partial<Record<(typeof DOMAIN_KEYS)[number], DomainBenchmarkSnapshot | null>>;

/**
 * Builds human-readable preview strings for Strategy Lab reference disclosure
 * (benchmark availability + effective constraints summary).
 */
export function useStrategyLabReferencePreviews(args: {
  domainBenchmarks: DomainBenchmarksMap;
  strategy: StrategyRoadmap | null | undefined;
}): { referencePreviewBenchmarks: string; referencePreviewConstraints: string } {
  const { domainBenchmarks, strategy } = args;

  return useMemo(() => {
    const benchmarksAvailableCount = DOMAIN_KEYS.reduce(
      (acc, dk) => (domainBenchmarks[dk] ? acc + 1 : acc),
      0,
    );
    const referencePreviewBenchmarks = STRATEGY_LAB_COPY.referenceDisclosure.previewBenchmarks
      .replace('{available}', String(benchmarksAvailableCount))
      .replace('{total}', String(DOMAIN_KEYS.length));

    if (!strategy) {
      return {
        referencePreviewBenchmarks,
        referencePreviewConstraints: STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsUnknown,
      };
    }

    const labContextOverrides = strategy.strategy_lab_context;
    const hasOverride =
      !!labContextOverrides &&
      (typeof labContextOverrides.company_stage === 'string' ||
        typeof labContextOverrides.budget_band === 'string' ||
        typeof labContextOverrides.team_scale === 'string');
    const effectiveConstraints = strategy.effective_constraints;
    const constraintsSummary = effectiveConstraints
      ? [
          STRATEGY_LAB_COPY.constraints.optionLabels.stage[
            effectiveConstraints.company_stage as keyof typeof STRATEGY_LAB_COPY.constraints.optionLabels.stage
          ] ?? effectiveConstraints.company_stage,
          STRATEGY_LAB_COPY.constraints.optionLabels.budget[
            effectiveConstraints.budget_band as keyof typeof STRATEGY_LAB_COPY.constraints.optionLabels.budget
          ] ?? effectiveConstraints.budget_band,
          STRATEGY_LAB_COPY.constraints.optionLabels.team[
            effectiveConstraints.team_scale as keyof typeof STRATEGY_LAB_COPY.constraints.optionLabels.team
          ] ?? effectiveConstraints.team_scale,
        ].join(' / ')
      : null;
    const referencePreviewConstraints = !constraintsSummary
      ? STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsUnknown
      : (hasOverride
          ? STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsOverridden
          : STRATEGY_LAB_COPY.referenceDisclosure.previewConstraintsFromBrief
        ).replace('{summary}', constraintsSummary);

    return { referencePreviewBenchmarks, referencePreviewConstraints };
  }, [domainBenchmarks, strategy]);
}

