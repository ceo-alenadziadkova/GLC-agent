import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { StrategyExecutionPackOutput } from '../../schemas/domain-output.js';

export type SprintExportRow = {
  epic_id: string;
  epic_title: string;
  lane: string;
  sprint_bucket: string;
  season_index: number | '';
  task_order: number;
  task_title: string;
  success_metric: string;
  baseline: string;
  review_cadence: string;
};

function packTasksByInitiative(payload: StrategyExecutionPackOutput | null): Map<string, { tasks: string[]; metrics?: { success?: string; baseline?: string; review?: string } }> {
  const m = new Map<string, { tasks: string[]; metrics?: { success?: string; baseline?: string; review?: string } }>();
  if (!payload) return m;
  for (const p of payload.packs) {
    const om = p.outcome_measurement;
    m.set(p.initiative_id, {
      tasks: p.tasks,
      metrics: om
        ? {
            success: om.success_metric,
            baseline: om.baseline,
            review: om.review_cadence,
          }
        : undefined,
    });
  }
  return m;
}

/**
 * Flattens saved orchestration graph nodes into sprint-export rows, optionally joined with
 * the latest on-demand strategy execution pack tasks and outcome fields.
 */
export function buildSprintExportRows(args: {
  pack: GlcOrchestrationPack;
  executionPack: StrategyExecutionPackOutput | null;
}): SprintExportRow[] {
  const taskMap = packTasksByInitiative(args.executionPack);
  const nodes = [...args.pack.graph.nodes].sort((a, b) => {
    const sa = a.season_index ?? 99;
    const sb = b.season_index ?? 99;
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });

  const rows: SprintExportRow[] = [];
  for (const n of nodes) {
    const bucket = n.time_bucket ?? 'next';
    const season = n.season_index ?? '';
    const packed = taskMap.get(n.id);
    const tasks = packed?.tasks ?? [];
    const metrics = packed?.metrics;

    if (tasks.length === 0) {
      rows.push({
        epic_id: n.id,
        epic_title: n.title,
        lane: n.lane,
        sprint_bucket: bucket,
        season_index: season,
        task_order: 0,
        task_title: '',
        success_metric: metrics?.success ?? '',
        baseline: metrics?.baseline ?? '',
        review_cadence: metrics?.review ?? '',
      });
      continue;
    }

    tasks.forEach((t, idx) => {
      rows.push({
        epic_id: n.id,
        epic_title: n.title,
        lane: n.lane,
        sprint_bucket: bucket,
        season_index: season,
        task_order: idx + 1,
        task_title: t,
        success_metric: idx === 0 ? (metrics?.success ?? '') : '',
        baseline: idx === 0 ? (metrics?.baseline ?? '') : '',
        review_cadence: idx === 0 ? (metrics?.review ?? '') : '',
      });
    });
  }
  return rows;
}

const CSV_HEADER: (keyof SprintExportRow)[] = [
  'epic_id',
  'epic_title',
  'lane',
  'sprint_bucket',
  'season_index',
  'task_order',
  'task_title',
  'success_metric',
  'baseline',
  'review_cadence',
];

function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function sprintExportToCsv(rows: SprintExportRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    lines.push(
      CSV_HEADER.map((k) => escapeCsvField(r[k] as string | number)).join(','),
    );
  }
  return lines.join('\n') + '\n';
}
