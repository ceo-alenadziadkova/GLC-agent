import { INTAKE_TRACE_PUBLICATION_LOG_DEFAULT_LIMIT } from '@glc/intake-core';
import { apiIntakeTracePublicationLog } from '../../config/api-paths';
import { apiFetch } from '../../data/api-http';
import {
  flushIntakeWorkspaceTelemetrySync,
  trackIntakeWorkspaceSessionCompleted,
  trackIntakeWorkspaceTabOpened,
  trackIntakeWordingDraftSaved,
  trackIntakeWordingPublished,
  trackIntakeWordingRollback,
} from '../../lib/intake-workspace-telemetry';
import { INTAKE_WORDING_ROUTE, WORKSPACE_PANEL } from './config';
import type { PublicationLogEntry } from './types';

export async function fetchPublicationLog(): Promise<PublicationLogEntry[]> {
  const response = await apiFetch<{ ok: true; entries: PublicationLogEntry[] }>(
    apiIntakeTracePublicationLog(INTAKE_TRACE_PUBLICATION_LOG_DEFAULT_LIMIT),
  );
  return response.entries;
}

export function emitWorkspaceOpened(): void {
  trackIntakeWorkspaceTabOpened({
    route: INTAKE_WORDING_ROUTE,
    workspace_mode: WORKSPACE_PANEL,
    panel: WORKSPACE_PANEL,
  });
}

export function emitWorkspaceClosed(durationMs: number): void {
  trackIntakeWorkspaceSessionCompleted({
    route: INTAKE_WORDING_ROUTE,
    duration_ms: durationMs,
  });
  flushIntakeWorkspaceTelemetrySync();
}

export function emitDraftSaved(questionId: string): void {
  trackIntakeWordingDraftSaved({ route: INTAKE_WORDING_ROUTE, question_id: questionId });
}

export function emitPublished(count: number): void {
  trackIntakeWordingPublished({ route: INTAKE_WORDING_ROUTE, count });
}

export function emitRollback(count: number): void {
  trackIntakeWordingRollback({ route: INTAKE_WORDING_ROUTE, count });
}
