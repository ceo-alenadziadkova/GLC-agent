import type { PipelineEvent } from '../../../data/auditTypes';
import type { LogEntry } from '../types';

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
