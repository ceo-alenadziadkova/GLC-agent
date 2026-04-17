import { Callout } from '../../../components/ui/callout';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import type { PipelineStateLite } from '../types-pipeline-state';

export function PipelineSummaryFooter({ pipelineState }: { pipelineState: PipelineStateLite | null }) {
  if (!pipelineState) return null;
  return (
    <Callout intent="neutral" className="mt-6">
      <div className="flex items-center gap-4 text-xs text-[var(--text-quaternary)]">
        <span>
          {PM.detail.tokensUsedPrefix}
          <strong className="font-mono">{pipelineState.tokens_used.toLocaleString()}</strong>
          {PM.detail.tokensBudgetSeparator}
          {pipelineState.token_budget.toLocaleString()}
        </span>
      </div>
    </Callout>
  );
}
