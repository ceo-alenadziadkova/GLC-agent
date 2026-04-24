import type { PipelineEvent } from '../../../data/auditTypes';
import { PIPELINE_MONITOR_COPY } from '../../../config/pipeline-monitor-copy';
import type { LogEntry } from '../types';
import { resolveClientPortalActivityLine } from './client-portal-activity-log';

export function mapPhaseEventsToLogEntries(events: PipelineEvent[]): LogEntry[] {
  return events
    .filter(event => Boolean(event.message) || event.event_type === 'token_usage')
    .map(
      (event): LogEntry => ({
        eventType: event.event_type,
        text:
          event.message ??
          `Token usage: ${String(event.data.total_tokens ?? 0)} tokens, cost ${String(event.data.cost_usd ?? 0)} USD`,
      }),
    );
}

/** Client portal: same timeline, plain-language lines; technical/token events hidden. */
export function mapPhaseEventsToClientPortalLogEntries(events: PipelineEvent[]): LogEntry[] {
  const activityLog = PIPELINE_MONITOR_COPY.clientPortal.activityLog;
  return events.flatMap((event): LogEntry[] => {
    const text = resolveClientPortalActivityLine(event, activityLog);
    if (text == null) {
      return [];
    }
    return [{ eventType: event.event_type, text }];
  });
}
