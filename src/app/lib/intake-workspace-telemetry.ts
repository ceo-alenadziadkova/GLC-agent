/**
 * Batched consultant telemetry for intake tooling workspaces.
 * POST /api/intake-trace-tool/analytics-events (non-blocking).
 */
import { API_PATHS } from '../config/api-paths';
import { apiFetch } from '../data/api-http';
import {
  CLIENT_ANALYTICS_FLUSH_MS_DEFAULT,
  CLIENT_ANALYTICS_MAX_BATCH_DEFAULT,
} from '../config/client-analytics-batching';
import { isIntakeTraceIaV2Enabled } from './intake-trace-flags';

const SESSION_STORAGE_KEY = 'glc_intake_workspace_session_v1';
const FLUSH_MS = CLIENT_ANALYTICS_FLUSH_MS_DEFAULT;
const MAX_BATCH = CLIENT_ANALYTICS_MAX_BATCH_DEFAULT;

export type IntakeWorkspaceTelemetryEventType =
  | 'intake_trace_tab_opened'
  | 'intake_trace_advanced_toggled'
  | 'intake_trace_graph_control_used'
  | 'intake_wording_draft_saved'
  | 'intake_wording_review_exported'
  | 'intake_wording_published'
  | 'intake_wording_rollback'
  | 'intake_trace_session_completed';

type QueuedEvent = {
  event_type: IntakeWorkspaceTelemetryEventType;
  client_ts: string;
  payload?: Record<string, unknown>;
};

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let tabSwitchCount = 0;

export function getOrCreateIntakeWorkspaceSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!s || s.length < 8) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_STORAGE_KEY, s);
    }
    return s;
  } catch {
    return crypto.randomUUID();
  }
}

function scheduleFlush(): void {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushIntakeWorkspaceTelemetry();
  }, FLUSH_MS);
}

export async function flushIntakeWorkspaceTelemetry(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    await apiFetch<{ ok: true; received: number }>(API_PATHS.intakeTraceToolAnalytics, {
      method: 'POST',
      body: JSON.stringify({
        client_session_id: getOrCreateIntakeWorkspaceSessionId(),
        ia_v2_enabled: isIntakeTraceIaV2Enabled(),
        events: batch.map(e => ({
          event_type: e.event_type,
          client_ts: e.client_ts,
          ...(e.payload ? { payload: e.payload } : {}),
        })),
      }),
    });
  } catch {
    // Non-blocking: tooling must work offline / without backend
    queue.unshift(...batch);
  }
}

function enqueue(event: QueuedEvent): void {
  queue.push(event);
  if (queue.length >= MAX_BATCH) {
    void flushIntakeWorkspaceTelemetry();
    return;
  }
  scheduleFlush();
}

export function trackIntakeWorkspaceTabOpened(payload: {
  route: string;
  workspace_mode?: string;
  panel: string;
}): void {
  tabSwitchCount += 1;
  enqueue({
    event_type: 'intake_trace_tab_opened',
    client_ts: new Date().toISOString(),
    payload: { ...payload, tab_switch_count: tabSwitchCount },
  });
}

export function trackIntakeWorkspaceAdvancedToggled(payload: {
  route: string;
  advanced_open: boolean;
}): void {
  enqueue({
    event_type: 'intake_trace_advanced_toggled',
    client_ts: new Date().toISOString(),
    payload,
  });
}

export function trackIntakeWorkspaceGraphControlUsed(payload: {
  route: string;
  control_id: string;
}): void {
  enqueue({
    event_type: 'intake_trace_graph_control_used',
    client_ts: new Date().toISOString(),
    payload,
  });
}

export function trackIntakeWordingDraftSaved(payload: { route: string; question_id: string }): void {
  enqueue({
    event_type: 'intake_wording_draft_saved',
    client_ts: new Date().toISOString(),
    payload,
  });
}

export function trackIntakeWordingReviewExported(payload: { route: string }): void {
  enqueue({
    event_type: 'intake_wording_review_exported',
    client_ts: new Date().toISOString(),
    payload,
  });
}

export function trackIntakeWordingPublished(payload: { route: string; count: number }): void {
  enqueue({
    event_type: 'intake_wording_published',
    client_ts: new Date().toISOString(),
    payload,
  });
}

export function trackIntakeWordingRollback(payload: { route: string; count: number }): void {
  enqueue({
    event_type: 'intake_wording_rollback',
    client_ts: new Date().toISOString(),
    payload,
  });
}

export function trackIntakeWorkspaceSessionCompleted(payload: {
  route: string;
  duration_ms?: number;
}): void {
  enqueue({
    event_type: 'intake_trace_session_completed',
    client_ts: new Date().toISOString(),
    payload: { ...payload, tab_switch_count: tabSwitchCount },
  });
}

export function resetIntakeWorkspaceTelemetrySession(): void {
  tabSwitchCount = 0;
}

/**
 * Best-effort flush when leaving workspace (still non-blocking).
 */
export function flushIntakeWorkspaceTelemetrySync(): void {
  if (queue.length === 0) return;
  void flushIntakeWorkspaceTelemetry();
}
