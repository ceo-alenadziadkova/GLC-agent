/**
 * Authenticated brief wizard analytics (ADR Phase G) — POST /api/audits/:id/brief/analytics-events
 */
import type { IntakeVersionTuple } from '../data/auditTypes';
import { briefProfilePlatformApi } from '../data/api/brief-profile-platform';

export type BriefIntakeAnalyticsSurface = 'consultant_interview' | 'client_form' | 'client_portal';

export type BriefIntakeAnalyticsEventType =
  | 'question_shown'
  | 'question_answered'
  | 'question_skipped'
  | 'wizard_completed'
  | 'results_viewed';

const FLUSH_MS = 3200;
const MAX_BATCH = 24;

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
}

export function createBriefIntakeAnalyticsSink(deps: {
  auditId: string;
  surface: BriefIntakeAnalyticsSurface;
  getIntakeVersions: () => IntakeVersionTuple | null;
}): BriefIntakeAnalyticsSink {
  const clientSessionId = getOrCreateBriefWizardClientSessionId(deps.auditId);
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
    const payload = {
      surface: deps.surface,
      client_session_id: clientSessionId,
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
