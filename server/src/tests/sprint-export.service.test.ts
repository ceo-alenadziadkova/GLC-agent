import { describe, expect, it } from 'vitest';

import { buildSprintExportRows, sprintExportToCsv } from '../services/orchestration/sprint-export.service.js';
import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import type { StrategyExecutionPackOutput } from '../schemas/domain-output.js';

describe('sprint-export.service', () => {
  it('flattens graph nodes with execution pack tasks and outcome fields', () => {
    const pack = {
      graph: {
        nodes: [
          {
            id: 'i1',
            title: 'Epic A',
            domain: 'sales',
            lane: 'gtm_sales',
            time_bucket: 'now' as const,
            season_index: 1,
          },
        ],
        edges: [],
      },
    } as unknown as GlcOrchestrationPack;

    const executionPack: StrategyExecutionPackOutput = {
      packs: [
        {
          initiative_id: 'i1',
          tasks: ['Task one', 'Task two'],
          architecture: 'Ship in two steps',
          outcome_measurement: {
            success_metric: 'SQLs per week',
            baseline: 'unknown',
            review_cadence: 'weekly',
          },
        },
      ],
    };

    const rows = buildSprintExportRows({ pack, executionPack });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.task_title).toBe('Task one');
    expect(rows[0]?.dri).toBe('RevOps / Sales');
    expect(rows[0]?.success_metric).toBe('SQLs per week');
    expect(rows[1]?.task_title).toBe('Task two');
    expect(rows[1]?.success_metric).toBe('');
  });

  it('emits csv with header', () => {
    const csv = sprintExportToCsv([
      {
        epic_id: 'i1',
        epic_title: 'T',
        lane: 'product_change',
        sprint_bucket: 'now',
        season_index: 1,
        task_order: 1,
        task_title: 'Do',
        dri: '',
        success_metric: '',
        baseline: '',
        review_cadence: '',
      },
    ]);
    expect(csv.split('\n')[0]).toContain('epic_id');
    expect(csv).toContain('Do');
  });
});
