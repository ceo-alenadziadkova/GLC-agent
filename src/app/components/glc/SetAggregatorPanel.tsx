import { useMemo } from 'react';

import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { buildOrchestrationSetAggregator } from '../../lib/orchestration-set-aggregator';

export function SetAggregatorPanel(args: {
  pack: GlcOrchestrationPackView;
  /** Defaults to critical path when empty. */
  selectedActionIds?: string[];
}) {
  const ids = useMemo(() => {
    if (args.selectedActionIds && args.selectedActionIds.length > 0) return args.selectedActionIds;
    return args.pack.critical_path.length > 0 ? args.pack.critical_path : args.pack.graph.nodes.map(n => n.id).slice(0, 8);
  }, [args.pack, args.selectedActionIds]);

  const agg = useMemo(() => buildOrchestrationSetAggregator(ids, args.pack), [ids, args.pack]);

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 text-sm">
      <h3 className="font-semibold ds-text-primary">{ORCHESTRATION_UI_COPY.setAggregatorTitle}</h3>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase ds-text-tertiary">{ORCHESTRATION_UI_COPY.setAggregatorEffort}</dt>
          <dd className="ds-text-secondary">
            {agg.effortRange
              ? `${agg.effortRange.minDays}–${agg.effortRange.maxDays} d`
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase ds-text-tertiary">{ORCHESTRATION_UI_COPY.setAggregatorImpact}</dt>
          <dd className="ds-text-secondary">{agg.expectedImpact}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase ds-text-tertiary">{ORCHESTRATION_UI_COPY.setAggregatorMinConfidence}</dt>
          <dd className="ds-text-secondary">{agg.minConfidence}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase ds-text-tertiary">{ORCHESTRATION_UI_COPY.setAggregatorRisks}</dt>
          <dd className="ds-text-secondary">
            {agg.keyRisks.length === 0 ? '—' : agg.keyRisks.join(' · ')}
          </dd>
        </div>
      </dl>
    </div>
  );
}
