/**
 * Authenticated brief wizard analytics (ADR Phase G) — POST /api/audits/:id/brief/analytics-events
 */
import type { IntakeVersionTuple } from '../data/auditTypes';
import { briefProfilePlatformApi } from '../data/api/brief-profile-platform';
import {
  CLIENT_ANALYTICS_FLUSH_MS_DEFAULT,
  CLIENT_ANALYTICS_MAX_BATCH_DEFAULT,
} from '../config/client-analytics-batching';

export type BriefIntakeAnalyticsSurface = 'consultant_interview' | 'client_form' | 'client_portal';
export type BriefIntakeAnalyticsExperimentVariant = 'A' | 'B';

export type BriefIntakeAnalyticsEventType =
  | 'question_shown'
  | 'question_answered'
  | 'question_skipped'
  | 'wizard_completed'
  | 'results_viewed';

const FLUSH_MS = CLIENT_ANALYTICS_FLUSH_MS_DEFAULT;
const MAX_BATCH = CLIENT_ANALYTICS_MAX_BATCH_DEFAULT;

function sessionKey(auditId: string): string {
  return `glc_brief_analytics_v1_${auditId}`;
}

export function getOrCreateBriefWizardClientSessionId(auditId: string): string {
  try {
    const k = sessionKey(auditId);
    let s = sessionStorage.getItem(k);
    if (!s || s.length < 8) {
      s = crypto.randomUUID();
      sessionStorage.setItem(k, s);
    }
    return s;
  } catch {
    return crypto.randomUUID();
  }
}

type QueuedEvent = {
  event_type: BriefIntakeAnalyticsEventType;
  question_id?: string;
  step_index?: number;
  client_ts: string;
};

function intakeMapValueAnswered(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'object' && !Array.isArray(v) && v !== null && 'value' in v) {
    return intakeMapValueAnswered((v as { value: unknown }).value);
  }
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return true;
  return false;
}

export { intakeMapValueAnswered };

export interface BriefIntakeAnalyticsSink {
  enqueue(event: Omit<QueuedEvent, 'client_ts'> & { client_ts?: string }): void;
  flush(): Promise<void>;
  dispose(): void;
}

function pickVariantFromSessionId(sessionId: string): BriefIntakeAnalyticsExperimentVariant {
  let h = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    h = (h + sessionId.charCodeAt(i)) & 1;
  }
  return h === 0 ? 'A' : 'B';
}

export function createBriefIntakeAnalyticsSink(deps: {
  auditId: string;
  surface: BriefIntakeAnalyticsSurface;
  getIntakeVersions: () => IntakeVersionTuple | null;
  getExperimentVariant?: () => BriefIntakeAnalyticsExperimentVariant | null;
}): BriefIntakeAnalyticsSink {
  const clientSessionId = getOrCreateBriefWizardClientSessionId(deps.auditId);
  const experimentVariant = deps.getExperimentVariant?.() ?? pickVariantFromSessionId(clientSessionId);
  const queue: QueuedEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function scheduleFlush() {
    if (flushTimer != null) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_MS);
  }

  async function flush(): Promise<void> {
    if (disposed || !queue.length) return;
    const batch = queue.splice(0, MAX_BATCH);
    const intake_versions = deps.getIntakeVersions();
    const payload = {
      surface: deps.surface,
      client_session_id: clientSessionId,
      experiment_variant: experimentVariant,
      ...(intake_versions ? { intake_versions } : {}),
      events: batch.map(e => ({
        event_type: e.event_type,
        ...(e.question_id != null ? { question_id: e.question_id } : {}),
        ...(e.step_index != null ? { step_index: e.step_index } : {}),
        ...(e.client_ts ? { client_ts: e.client_ts } : {}),
      })),
    };
    try {
      await briefProfilePlatformApi.postBriefAnalyticsEvents(deps.auditId, payload);
    } catch {
      // Non-blocking telemetry
    }
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const onPageHide = () => {
    void flush();
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
  }

  return {
    enqueue(event) {
      if (disposed) return;
      const client_ts = event.client_ts ?? new Date().toISOString();
      queue.push({ ...event, client_ts } as QueuedEvent);
      if (queue.length >= MAX_BATCH) void flush();
      else scheduleFlush();
    },
    flush,
    dispose() {
      disposed = true;
      if (flushTimer != null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
      }
    },
  };
}

export function briefTrackQuestionShown(
  sink: BriefIntakeAnalyticsSink,
  p: { questionId: string; stepIndex: number },
): void {
  sink.enqueue({
    event_type: 'question_shown',
    question_id: p.questionId,
    step_index: p.stepIndex,
  });
}

export function briefTrackQuestionAnswered(
  sink: BriefIntakeAnalyticsSink,
  p: { questionId: string; stepIndex: number },
): void {
  sink.enqueue({
    event_type: 'question_answered',
    question_id: p.questionId,
    step_index: p.stepIndex,
  });
}

export function briefTrackQuestionSkipped(
  sink: BriefIntakeAnalyticsSink,
  p: { questionId: string; stepIndex: number },
): void {
  sink.enqueue({
    event_type: 'question_skipped',
    question_id: p.questionId,
    step_index: p.stepIndex,
  });
}
