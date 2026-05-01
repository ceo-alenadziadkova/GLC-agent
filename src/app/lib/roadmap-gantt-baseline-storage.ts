import { ROADMAP_GANTT_BASELINE_STORAGE_PREFIX } from '../config/roadmap-gantt-view-preferences';
import type { RoadmapGanttProjection } from './roadmap-gantt-mapper';

const BASELINE_SCHEMA_VERSION = 1 as const;

export type RoadmapGanttBaselineSnapshot = {
  schemaVersion: typeof BASELINE_SCHEMA_VERSION;
  takenAtMs: number;
  tasks: Record<string, { startMs: number; endMs: number }>;
};

function storageKey(auditId: string): string {
  return `${ROADMAP_GANTT_BASELINE_STORAGE_PREFIX}${auditId}`;
}

function parseStored(raw: string | null): RoadmapGanttBaselineSnapshot | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (o.schemaVersion !== BASELINE_SCHEMA_VERSION) return null;
    if (typeof o.takenAtMs !== 'number' || !Number.isFinite(o.takenAtMs)) return null;
    if (o.tasks == null || typeof o.tasks !== 'object') return null;
    const tasks: Record<string, { startMs: number; endMs: number }> = {};
    for (const [id, v] of Object.entries(o.tasks as Record<string, unknown>)) {
      if (v == null || typeof v !== 'object') continue;
      const row = v as Record<string, unknown>;
      if (typeof row.startMs !== 'number' || typeof row.endMs !== 'number') continue;
      if (!Number.isFinite(row.startMs) || !Number.isFinite(row.endMs)) continue;
      tasks[id] = { startMs: row.startMs, endMs: row.endMs };
    }
    return { schemaVersion: BASELINE_SCHEMA_VERSION, takenAtMs: o.takenAtMs, tasks };
  } catch {
    return null;
  }
}

/** Read baseline from localStorage (browser only). */
export function readRoadmapGanttBaseline(auditId: string): RoadmapGanttBaselineSnapshot | null {
  if (typeof window === 'undefined') return null;
  return parseStored(window.localStorage.getItem(storageKey(auditId)));
}

/** Persist current projection windows as baseline snapshot. */
export function writeRoadmapGanttBaseline(auditId: string, projection: RoadmapGanttProjection): void {
  if (typeof window === 'undefined') return;
  const takenAtMs = Date.now();
  const tasks: Record<string, { startMs: number; endMs: number }> = {};
  for (const t of projection.tasks) {
    tasks[t.id] = { startMs: t.start_time, endMs: t.end_time };
  }
  const payload: RoadmapGanttBaselineSnapshot = {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    takenAtMs,
    tasks,
  };
  window.localStorage.setItem(storageKey(auditId), JSON.stringify(payload));
}

export function clearRoadmapGanttBaseline(auditId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(auditId));
}

/** Calendar-day delta (rounded toward zero for small skew). */
export function baselineDeltaDays(currentMs: number, baselineMs: number): number {
  const DAY_MS = 86_400_000;
  return Math.round((currentMs - baselineMs) / DAY_MS);
}
