import type { PipelineEvent } from '../../../data/auditTypes';
import type { LogEntry } from '../types';

export function mapPhaseEventsToLogEntries(events: PipelineEvent[]): LogEntry[] {
  return events
    .filter(event => Boolean(event.message))
    .map(
      (event): LogEntry => ({
        eventType: event.event_type,
        text: event.message ?? '',
      }),
    );
}
