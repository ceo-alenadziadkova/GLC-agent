import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/audits-orchestration';
import { ROADMAP_GANTT_BASELINE_STORAGE_PREFIX } from '../../config/roadmap-gantt-view-preferences';
import {
  baselineDeltaDays,
  clearRoadmapGanttBaseline,
  purgeInvalidRoadmapGanttBaselineIfNeeded,
  readRoadmapGanttBaseline,
  writeRoadmapGanttBaseline,
} from '../roadmap-gantt-baseline-storage';
import { buildRoadmapGanttProjection } from '../roadmap-gantt-mapper';

function minimalTimeline(): AuditTimelineDto {
  return {
    status: 'ready',
    version: {
      roadmap_version: 1,
      manifest_snapshot_id: 'snap-1',
      latest_manifest_snapshot_id: 'snap-1',
      stale_manifest: false,
      manifest_state: 'confirmed',
      season_preset: 'rolling_90d',
      plan_horizon: { start_date: '2026-01-01', end_date: '2026-03-31' },
    },
    seasons: [
      { id: 'near', node_ids: ['a'] },
      { id: 'mid', node_ids: [] },
      { id: 'far', node_ids: [] },
    ],
    lanes: [
      {
        lane_id: 'tech_delivery',
        items: [
          {
            id: 'a',
            title: 'Task A',
            domain: 'tech_infrastructure',
            lane: 'tech_delivery',
            season_index: 0,
            time_bucket: 'now',
          },
        ],
      },
    ],
    dependencies: [],
    waiting_list_domains: [],
    data_gaps: null,
  };
}

describe('roadmap-gantt-baseline-storage', () => {
  const auditId = 'audit-baseline-test';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes and reads baseline keyed by audit id', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      } satisfies Storage,
    );

    const projection = buildRoadmapGanttProjection(minimalTimeline());
    writeRoadmapGanttBaseline(auditId, projection);
    const read = readRoadmapGanttBaseline(auditId);
    expect(read?.tasks['a']).toEqual({
      startMs: projection.tasks.find((t) => t.id === 'a')!.start_time,
      endMs: projection.tasks.find((t) => t.id === 'a')!.end_time,
    });
    clearRoadmapGanttBaseline(auditId);
    expect(readRoadmapGanttBaseline(auditId)).toBeNull();
  });

  it('baselineDeltaDays rounds to whole days', () => {
    expect(baselineDeltaDays(86_400_000, 0)).toBe(1);
    expect(baselineDeltaDays(0, 86_400_000)).toBe(-1);
  });

  it('purgeInvalidRoadmapGanttBaselineIfNeeded removes persisted JSON when schema mismatches', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      } satisfies Storage,
    );

    const key = `${ROADMAP_GANTT_BASELINE_STORAGE_PREFIX}${auditId}`;
    window.localStorage.setItem(key, JSON.stringify({ schemaVersion: 999, takenAtMs: 1, tasks: {} }));
    expect(purgeInvalidRoadmapGanttBaselineIfNeeded(auditId)).toBe(true);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('purgeInvalidRoadmapGanttBaselineIfNeeded is a no-op when baseline is valid', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      } satisfies Storage,
    );

    const projection = buildRoadmapGanttProjection(minimalTimeline());
    writeRoadmapGanttBaseline(auditId, projection);
    expect(purgeInvalidRoadmapGanttBaselineIfNeeded(auditId)).toBe(false);
    expect(readRoadmapGanttBaseline(auditId)).not.toBeNull();
  });
});
