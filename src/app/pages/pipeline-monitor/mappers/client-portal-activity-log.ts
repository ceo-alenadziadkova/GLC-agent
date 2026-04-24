import type { PipelineEvent } from '../../../data/auditTypes';
import type { PipelineMonitorCopy } from '../../../config/pipeline-monitor-copy';

export type ClientPortalActivityLogCopy = PipelineMonitorCopy['clientPortal']['activityLog'];

export function resolveClientPortalActivityLine(
  event: PipelineEvent,
  activityLog: ClientPortalActivityLogCopy,
): string | null {
  if (activityLog.hiddenEventTypes.includes(event.event_type)) {
    return null;
  }

  const msg = (event.message ?? '').trim();

  for (const row of activityLog.logMessageContains) {
    if (msg.includes(row.contains)) {
      return row.text;
    }
  }

  const byType = activityLog.byEventType[event.event_type as keyof typeof activityLog.byEventType];
  if (typeof byType === 'string' && byType.length > 0) {
    return byType;
  }

  if (msg.length > 0) {
    return activityLog.fallbackLog;
  }

  return null;
}
