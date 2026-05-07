/**
 * Unified Plan workspace mode — Define / Shape on `/lab/:id?mode=` (or legacy `/plan/:id/studio?mode=`), Execute on delivery path segments
 * `/plan/:id/board|roadmap|table` (ADR Plan Workspace).
 */
export const PLAN_WORKSPACE_MODE_QUERY_KEY = 'mode' as const;

export type PlanWorkspaceMode = 'define' | 'shape' | 'execute';

export function parsePlanWorkspaceModeParam(raw: string | null | undefined): PlanWorkspaceMode {
  const t = raw != null ? String(raw).trim().toLowerCase() : '';
  if (t === 'define' || t === 'shape' || t === 'execute') return t;
  return 'execute';
}

/** Default when query omits `mode` — execution surfaces (Board / Roadmap / Table). */
export function defaultPlanWorkspaceMode(): PlanWorkspaceMode {
  return 'execute';
}

/** Dispatched by Plan command palette to trigger compile when Shape surface is mounted. */
export const PLAN_WORKSPACE_COMPILE_REQUEST_EVENT = 'glc-plan-workspace-request-compile' as const;
