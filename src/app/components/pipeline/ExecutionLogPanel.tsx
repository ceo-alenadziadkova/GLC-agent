import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

function PipelineExecutionLogRow({
  event,
  detailLevel,
}: {
  event: PipelineEvent;
  detailLevel: 'default' | 'debug';
}) {
  return (
    <article className="rounded border border-[var(--border-subtle)] p-2 text-xs">
      <p className="font-medium text-[var(--text-primary)]">
        {event.event_type} · phase {event.phase}
      </p>
      <p className="text-[var(--text-secondary)]">{event.message ?? PIPELINE_UI_COPY.executionLog.noMessage}</p>
      <p className="text-[var(--text-muted)]">{formatAppMediumDateTime(event.created_at)}</p>
      {detailLevel === 'debug' ? (
        <pre className="mt-2 overflow-auto rounded bg-[var(--bg-muted)] p-2 text-[length:var(--text-2xs)]">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      ) : null}
    </article>
  );
}

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

/** Initial row height guess; virtualizer measures with `measureElement` for accuracy. */
function executionLogEstimateRowHeightPx(detailLevel: 'default' | 'debug') {
  return detailLevel === 'debug' ? 180 : 92;
}

function ExecutionLogPanelContent({
  auditId,
  title,
  compact,
}: Required<ExecutionLogPanelProps>) {
  const [detailLevel, setDetailLevel] = useState<'default' | 'debug'>(UI_POLICY.pipeline.defaultEventDetailLevel);
  const scrollParentRef = useRef<HTMLDivElement>(null);

  const pipelineOptions = useMemo(
    () => ({
      detailLevel,
      eventLimit:
        detailLevel === UI_POLICY.pipeline.debugEventDetailLevel
          ? UI_POLICY.pipeline.debugEventPageSize
          : UI_POLICY.pipeline.defaultEventPageSize,
    }),
    [detailLevel],
  );
  const { state, loading, loadMoreEvents } = usePipeline(auditId, pipelineOptions);

  const events = useMemo(() => state?.events ?? [], [state?.events]);

  const threshold = UI_POLICY.pipeline.executionLogVirtualizeRowThreshold;
  const useVirtualList = events.length >= threshold;

  const rowVirtualizer = useVirtualizer({
    count: useVirtualList ? events.length : 0,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: (index: number) => {
      void index;
      return executionLogEstimateRowHeightPx(detailLevel);
    },
    overscan: 6,
  });

  useLayoutEffect(() => {
    if (!useVirtualList) {
      return;
    }
    rowVirtualizer.measure();
    // Virtualizer instance from useVirtualizer is stable for the component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasure on layout-affecting inputs only
  }, [detailLevel, useVirtualList, events.length]);

  const logBody = !useVirtualList ? (
    events.map((event: PipelineEvent) => (
      <PipelineExecutionLogRow key={event.id} event={event} detailLevel={detailLevel} />
    ))
  ) : (
    <div
      role="presentation"
      className="relative w-full"
      style={{ height: rowVirtualizer.getTotalSize(), minHeight: '1px' }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const event = events[virtualRow.index];
        if (!event) {
          return null;
        }
        return (
          <div
            key={virtualRow.key}
            className="absolute left-0 top-0 w-full pb-2 pe-2"
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <PipelineExecutionLogRow event={event} detailLevel={detailLevel} />
          </div>
        );
      })}
    </div>
  );

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

      <div
        ref={scrollParentRef}
        className={
          compact
            ? 'relative max-h-56 overflow-auto space-y-2'
            : 'relative max-h-80 overflow-auto space-y-2'
        }
      >
        {!loading && events.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)]">{PIPELINE_UI_COPY.executionLog.emptyState}</p>
        ) : null}
        {events.length > 0 ? logBody : null}
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
