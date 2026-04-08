/**
 * Public Discovery funnel analytics (ADR Phase G). Batches POSTs to /api/discover/analytics-events.
 */
import type { IntakeVersionTuple } from '../data/auditTypes';
import { discoverApi } from '../data/api/discover';

/** Must match server `INTAKE_ANALYTICS_EVENT_TYPES` (ADR Phase G). */
export type DiscoveryAnalyticsEventType =
  | 'question_shown'
  | 'question_answered'
  | 'question_skipped'
  | 'wizard_completed'
  | 'results_viewed';

const SESSION_KEY = 'glc_discover_analytics_v1';
const FLUSH_MS = 3200;
const MAX_BATCH = 24;

type QueuedEvent = {
  event_type: DiscoveryAnalyticsEventType;
  question_id?: string;
  step_index?: number;
  client_ts: string;
};

export function getOrCreateDiscoveryClientSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s || s.length < 8) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return crypto.randomUUID();
  }
}

export interface DiscoveryAnalyticsSink {
  enqueue(event: Omit<QueuedEvent, 'client_ts'> & { client_ts?: string }): void;
  flush(): Promise<void>;
}

export function createDiscoveryAnalyticsSink(deps: {
  getIntakeVersions: () => IntakeVersionTuple | null;
  getDiscoveryToken: () => string | null;
}): DiscoveryAnalyticsSink {
  const clientSessionId = getOrCreateDiscoveryClientSessionId();
  const queue: QueuedEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush() {
    if (flushTimer != null) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_MS);
  }

  async function flush(): Promise<void> {
    if (!queue.length) return;
    const batch = queue.splice(0, MAX_BATCH);
    const intake_versions = deps.getIntakeVersions();
    const discovery_session_token = deps.getDiscoveryToken() ?? undefined;
    const payload = {
      surface: 'public_discovery' as const,
      client_session_id: clientSessionId,
      ...(discovery_session_token ? { discovery_session_token } : {}),
      ...(intake_versions ? { intake_versions } : {}),
      events: batch.map(e => ({
        event_type: e.event_type,
        ...(e.question_id != null ? { question_id: e.question_id } : {}),
        ...(e.step_index != null ? { step_index: e.step_index } : {}),
        ...(e.client_ts ? { client_ts: e.client_ts } : {}),
      })),
    };
    try {
      await discoverApi.postAnalyticsEvents(payload);
    } catch {
      // Non-blocking: funnel telemetry must not affect UX
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
    window.addEventListener('pagehide', () => {
      void flush();
    });
  }

  return {
    enqueue(event) {
      const client_ts = event.client_ts ?? new Date().toISOString();
      queue.push({ ...event, client_ts } as QueuedEvent);
      if (queue.length >= MAX_BATCH) void flush();
      else scheduleFlush();
    },
    flush,
  };
}

export function discoveryTrackQuestionShown(
  sink: DiscoveryAnalyticsSink,
  p: { questionId: string; stepIndex: number },
): void {
  sink.enqueue({
    event_type: 'question_shown',
    question_id: p.questionId,
    step_index: p.stepIndex,
  });
}

export function discoveryTrackQuestionAnswered(
  sink: DiscoveryAnalyticsSink,
  p: { questionId: string; stepIndex: number },
): void {
  sink.enqueue({
    event_type: 'question_answered',
    question_id: p.questionId,
    step_index: p.stepIndex,
  });
}

export function discoveryTrackQuestionSkipped(
  sink: DiscoveryAnalyticsSink,
  p: { questionId: string; stepIndex: number },
): void {
  sink.enqueue({
    event_type: 'question_skipped',
    question_id: p.questionId,
    step_index: p.stepIndex,
  });
}

export function discoveryTrackWizardCompleted(sink: DiscoveryAnalyticsSink): void {
  sink.enqueue({ event_type: 'wizard_completed' });
}

export function discoveryTrackResultsViewed(sink: DiscoveryAnalyticsSink): void {
  sink.enqueue({ event_type: 'results_viewed' });
}
