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
  | 'results_viewed'
  | 'signal_confidence_changed'
  | 'readiness_blocked'
  | 'remediation_asked'
  | 'sequencing_transition_taken'
  | 'guard_question_triggered';

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
  signal_key?: string;
  transition_rule_ref?: string;
  audit_readiness_status?: 'audit_ready' | 'blocked' | 'ready_with_caveats';
  flow_readiness_status?: 'flow_ready' | 'blocked';
  trace_codes?: string[];
  remediation_bank_ids?: string[];
  next_recommended?: string[];
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
        ...(e.signal_key != null ? { signal_key: e.signal_key } : {}),
        ...(e.transition_rule_ref != null ? { transition_rule_ref: e.transition_rule_ref } : {}),
        ...(e.audit_readiness_status != null ? { audit_readiness_status: e.audit_readiness_status } : {}),
        ...(e.flow_readiness_status != null ? { flow_readiness_status: e.flow_readiness_status } : {}),
        ...(e.trace_codes != null && e.trace_codes.length > 0 ? { trace_codes: e.trace_codes } : {}),
        ...(e.remediation_bank_ids != null && e.remediation_bank_ids.length > 0
          ? { remediation_bank_ids: e.remediation_bank_ids }
          : {}),
        ...(e.next_recommended != null && e.next_recommended.length > 0 ? { next_recommended: e.next_recommended } : {}),
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

export function briefTrackReadinessBlocked(
  sink: BriefIntakeAnalyticsSink,
  p: {
    auditReadinessStatus: 'audit_ready' | 'blocked' | 'ready_with_caveats';
    flowReadinessStatus: 'flow_ready' | 'blocked';
    traceCodes: string[];
  },
): void {
  sink.enqueue({
    event_type: 'readiness_blocked',
    audit_readiness_status: p.auditReadinessStatus,
    flow_readiness_status: p.flowReadinessStatus,
    ...(p.traceCodes.length > 0 ? { trace_codes: p.traceCodes } : {}),
  });
}

export function briefTrackRemediationAsked(
  sink: BriefIntakeAnalyticsSink,
  p: { bankIds: string[] },
): void {
  if (p.bankIds.length === 0) return;
  sink.enqueue({
    event_type: 'remediation_asked',
    remediation_bank_ids: p.bankIds.slice(0, 2),
  });
}

export function briefTrackSequencingTransitionTaken(
  sink: BriefIntakeAnalyticsSink,
  p: { transition_rule_ref: string; next_recommended: string[] },
): void {
  if (p.next_recommended.length === 0) return;
  sink.enqueue({
    event_type: 'sequencing_transition_taken',
    transition_rule_ref: p.transition_rule_ref,
    next_recommended: p.next_recommended,
  });
}

export function briefTrackSignalConfidenceChanged(
  sink: BriefIntakeAnalyticsSink,
  p: { signalKey: string },
): void {
  if (!p.signalKey) return;
  sink.enqueue({
    event_type: 'signal_confidence_changed',
    signal_key: p.signalKey,
  });
}

export function briefTrackGuardQuestionTriggered(
  sink: BriefIntakeAnalyticsSink,
  p: { questionId: string; signalKey?: string },
): void {
  if (!p.questionId) return;
  sink.enqueue({
    event_type: 'guard_question_triggered',
    question_id: p.questionId,
    ...(p.signalKey ? { signal_key: p.signalKey } : {}),
  });
}
