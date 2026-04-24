import { Callout } from '../../../components/ui/callout';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { formatAppInteger } from '../../../lib/number-format';
import type { PipelineStateLite } from '../types-pipeline-state';

export function PipelineSummaryFooter({
  pipelineState,
  isClient = false,
}: {
  pipelineState: PipelineStateLite | null;
  /** Portal clients do not see internal token budgets. */
  isClient?: boolean;
}) {
  if (!pipelineState || isClient) return null;
  return (
    <Callout intent="neutral" className="mt-6">
      <div className="flex items-center gap-4 text-xs text-[var(--text-quaternary)]">
        <span>
          {PM.detail.tokensUsedPrefix}
          <strong className="font-mono">{formatAppInteger(pipelineState.tokens_used)}</strong>
          {PM.detail.tokensBudgetSeparator}
          {formatAppInteger(pipelineState.token_budget)}
        </span>
      </div>
    </Callout>
  );
}
