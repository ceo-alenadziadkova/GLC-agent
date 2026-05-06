import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import type { PipelineEvent } from '../../data/auditTypes';
import { usePipeline } from '../../hooks/usePipeline';
import { UI_POLICY } from '../../config/ui-policy';
import { PIPELINE_UI_COPY } from '../../config/pipeline-ui-copy.en';
import { formatAppMediumDateTime } from '../../lib/date-format';
import { useProfile } from '../../hooks/useProfile';
import {
  readNotifyPrefs,
  subscribeNotifyPrefsChanged,
} from '../../pages/settings/services/settings-local-preferences.service';

type ExecutionLogPanelProps = {
  auditId: string | undefined;
  title?: string;
  compact?: boolean;
  unavailableMessage?: string;
};

export function ExecutionLogPanel({
  auditId,
  title = PIPELINE_UI_COPY.executionLog.defaultTitle,
  compact = false,
  unavailableMessage,
}: ExecutionLogPanelProps) {
  const { isAdmin } = useProfile();
  const [showExecutionTracePanels, setShowExecutionTracePanels] = useState(
    () => readNotifyPrefs().showExecutionTracePanels,
  );

  useEffect(() => subscribeNotifyPrefsChanged(() => {
    setShowExecutionTracePanels(readNotifyPrefs().showExecutionTracePanels);
  }), []);

  const canViewExecutionTrace = isAdmin && showExecutionTracePanels;
  if (!canViewExecutionTrace) {
    if (!unavailableMessage) {
      return null;
    }
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <p className="text-xs text-[var(--text-secondary)]">{unavailableMessage}</p>
      </div>
    );
  }

  return <ExecutionLogPanelContent auditId={auditId} title={title} compact={compact} />;
}

function ExecutionLogPanelContent({
  auditId,
  title,
  compact,
}: Required<ExecutionLogPanelProps>) {
  const [detailLevel, setDetailLevel] = useState<'default' | 'debug'>(UI_POLICY.pipeline.defaultEventDetailLevel);
  const { state, loading, loadMoreEvents } = usePipeline(auditId, {
    detailLevel,
    eventLimit:
      detailLevel === UI_POLICY.pipeline.debugEventDetailLevel
        ? UI_POLICY.pipeline.debugEventPageSize
        : UI_POLICY.pipeline.defaultEventPageSize,
  });

  const events = useMemo(() => state?.events ?? [], [state?.events]);

  return (
    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={detailLevel === 'default' ? 'default' : 'outline'}
            onClick={() => setDetailLevel('default')}
          >
            {PIPELINE_UI_COPY.executionLog.detailLevelDefault}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={detailLevel === 'debug' ? 'default' : 'outline'}
            onClick={() => setDetailLevel('debug')}
          >
            {PIPELINE_UI_COPY.executionLog.detailLevelDebug}
          </Button>
        </div>
      </div>

      <div className={compact ? 'max-h-56 overflow-auto space-y-2' : 'max-h-80 overflow-auto space-y-2'}>
        {!loading && events.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">{PIPELINE_UI_COPY.executionLog.emptyState}</p>
        ) : null}
        {events.map((event: PipelineEvent) => (
          <article key={event.id} className="rounded border border-[var(--border-subtle)] p-2 text-xs">
            <p className="font-medium text-[var(--text-primary)]">
              {event.event_type} · phase {event.phase}
            </p>
            <p className="text-[var(--text-secondary)]">{event.message ?? PIPELINE_UI_COPY.executionLog.noMessage}</p>
            <p className="text-[var(--text-muted)]">{formatAppMediumDateTime(event.created_at)}</p>
            {detailLevel === 'debug' ? (
              <pre className="mt-2 overflow-auto rounded bg-[var(--bg-muted)] p-2 text-[10px]">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            ) : null}
          </article>
        ))}
        {loading ? <p className="text-xs text-[var(--text-secondary)]">{PIPELINE_UI_COPY.executionLog.loadingEvents}</p> : null}
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={() => void loadMoreEvents()}>
          {PIPELINE_UI_COPY.executionLog.loadOlderEvents}
        </Button>
      </div>
    </section>
  );
}
