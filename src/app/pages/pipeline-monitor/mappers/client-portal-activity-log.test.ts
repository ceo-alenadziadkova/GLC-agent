import { describe, expect, it } from 'vitest';
import { PIPELINE_MONITOR_COPY } from '../../../config/pipeline-monitor-copy';
import type { PipelineEvent } from '../../../data/auditTypes';
import { resolveClientPortalActivityLine } from './client-portal-activity-log';
import { mapPhaseEventsToClientPortalLogEntries, mapPhaseEventsToLogEntries } from './pipeline-events.mapper';

const activityLog = PIPELINE_MONITOR_COPY.clientPortal.activityLog;

function ev(partial: Partial<PipelineEvent> & Pick<PipelineEvent, 'event_type' | 'phase'>): PipelineEvent {
  return {
    id: 1,
    audit_id: 'a',
    phase: partial.phase,
    event_type: partial.event_type,
    message: partial.message ?? null,
    data: partial.data ?? {},
    created_at: new Date().toISOString(),
  };
}

describe('resolveClientPortalActivityLine', () => {
  it('hides token_usage', () => {
    expect(
      resolveClientPortalActivityLine(
        ev({ phase: 1, event_type: 'token_usage', message: 'x' }),
        activityLog,
      ),
    ).toBeNull();
  });

  it('maps crawl log line by message hint', () => {
    expect(
      resolveClientPortalActivityLine(
        ev({ phase: 0, event_type: 'log', message: '✓ Crawled 12 pages' }),
        activityLog,
      ),
    ).toBe('Website scan finished.');
  });

  it('maps started by event type when no hint matches', () => {
    expect(
      resolveClientPortalActivityLine(
        ev({ phase: 2, event_type: 'started', message: 'Phase 2 started: tech_infrastructure' }),
        activityLog,
      ),
    ).toBe('This step started.');
  });

  it('uses fallback for unknown log message', () => {
    expect(
      resolveClientPortalActivityLine(ev({ phase: 3, event_type: 'log', message: 'Custom internal note' }), activityLog),
    ).toBe(activityLog.fallbackLog);
  });
});

describe('mapPhaseEventsToClientPortalLogEntries', () => {
  it('drops hidden events and rewrites lines', () => {
    const events: PipelineEvent[] = [
      ev({ phase: 1, event_type: 'started', message: 'Phase 1 started: x' }),
      ev({ phase: 1, event_type: 'token_usage', message: null, data: { total_tokens: 100, cost_usd: 0 } }),
      ev({ phase: 1, event_type: 'log', message: '✓ Collected: headers' }),
    ];
    const technical = mapPhaseEventsToLogEntries(events);
    expect(technical.some(e => e.eventType === 'token_usage')).toBe(true);

    const client = mapPhaseEventsToClientPortalLogEntries(events);
    expect(client.map(c => c.text)).toEqual([
      'This step started.',
      'Saved results from an automated check.',
    ]);
  });
});
