import { interpolateOrchestratorMessage, pipelineOrchestratorCopy } from '../../../config/pipeline-orchestrator-copy.js';
import { PIPELINE_EVENT_TYPES, PIPELINE_NOTIFY_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { emitStructuredNotification } from '../../notifications.js';

export type PipelineNotificationPublisherPayload = {
  auditId: string;
  phase: number;
  eventType: string;
  message: string;
  data: Record<string, unknown>;
};

/**
 * Emits in-app structured notifications for selected pipeline lifecycle changes.
 * Keeps logic consistent with the legacy `emitEvent` implementation.
 */
export async function maybePublishPipelineNotification(payload: PipelineNotificationPublisherPayload): Promise<void> {
  const { auditId, phase, eventType, message, data } = payload;

  if ((PIPELINE_NOTIFY_EVENT_TYPES as readonly string[]).includes(eventType)) {
    const ocN = pipelineOrchestratorCopy();
    const titles = ocN.notifications.pipelinePhaseTitles;

    const title =
      (titles as Record<string, string>)[eventType] ?? titles.default;

    await emitStructuredNotification({
      category: eventType === PIPELINE_EVENT_TYPES.reviewNeeded ? 'review' : 'pipeline',
      event: `pipeline_${eventType}`,
      priority: eventType === PIPELINE_EVENT_TYPES.error
        ? 'critical'
        : eventType === PIPELINE_EVENT_TYPES.reviewNeeded
          ? 'medium'
          : 'low',
      audience: 'audit_participants',
      auditId,
      title,
      message,
      payload: {
        phase,
        event_type: eventType,
        ...data,
      },
    });
  }

  if (eventType === PIPELINE_EVENT_TYPES.completed && phase === 7) {
    const ocArt = pipelineOrchestratorCopy();
    const n = ocArt.notifications;

    await emitStructuredNotification({
      category: 'pipeline',
      event: 'artifact_strategy_ready',
      priority: 'low',
      audience: 'audit_participants',
      auditId,
      title: n.artifactTitle,
      message: n.artifactStrategyMessage,
      route: interpolateOrchestratorMessage(n.artifactStrategyRouteTemplate, { audit_id: auditId }),
      payload: {
        audit_id: auditId,
        artifact: 'strategy',
        actor_role: 'system',
      },
    });

    await emitStructuredNotification({
      category: 'pipeline',
      event: 'artifact_report_ready',
      priority: 'low',
      audience: 'audit_participants',
      auditId,
      title: n.artifactTitle,
      message: n.artifactReportMessage,
      route: interpolateOrchestratorMessage(n.artifactReportRouteTemplate, { audit_id: auditId }),
      payload: {
        audit_id: auditId,
        artifact: 'report',
        actor_role: 'system',
      },
    });
  }
}

