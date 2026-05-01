import { describe, expect, it } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/audits-orchestration';
import { buildIcalFromProjection } from '../roadmap-gantt-ical';
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
      { id: 'near', node_ids: ['t1'] },
      { id: 'mid', node_ids: [] },
      { id: 'far', node_ids: [] },
    ],
    lanes: [
      {
        lane_id: 'tech_delivery',
        items: [
          {
            id: 't1',
            title: 'Core API',
            domain: 'tech_infrastructure',
            lane: 'tech_delivery',
            season_index: 0,
            time_bucket: 'now',
          },
        ],
      },
    ],
    dependencies: [],
    milestones: [{ id: 'm1', label: 'Gate 1', target_window_days: 10, unlocks: [] }],
    waiting_list_domains: [],
    data_gaps: null,
  };
}

describe('buildIcalFromProjection', () => {
  it('outputs VCALENDAR with VEVENT and VTODO using CRLF', () => {
    const projection = buildRoadmapGanttProjection(minimalTimeline());
    const ics = buildIcalFromProjection(projection, { auditId: 'audit-ical-1', auditTitle: 'Test audit' });
    expect(ics.includes('\r\n')).toBe(true);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Core API');
    expect(ics).toContain('BEGIN:VTODO');
    expect(ics).toContain('SUMMARY:Gate 1');
    expect(ics).toContain('CATEGORIES:MILESTONE');
  });
});
