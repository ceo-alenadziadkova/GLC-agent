import { describe, expect, it } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/orchestration-types';
import { buildIcalFromProjection, foldIcalContent } from '../roadmap-gantt-ical';
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

describe('foldIcalContent', () => {
  it('folds long lines with space continuation per RFC 5545', () => {
    const long = `${'x'.repeat(80)}`;
    const folded = foldIcalContent(`BEGIN:PROP\r\nLABEL:${long}\r\nEND:PROP`);
    expect(folded).toContain('\r\n ');
    expect(folded.split(/\r\n/)[1]!.length).toBeLessThanOrEqual(75);
  });
});

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
    expect(ics.match(/UID:.*@invalid/g)?.length ?? 0).toBeGreaterThan(0);
  });

  it('maps underscores in ids to hyphen so UID matches strict token charset', () => {
    const projection = buildRoadmapGanttProjection(minimalTimeline());
    projection.tasks = projection.tasks.map((row) =>
      row.id === 't1' ? { ...row, id: 'task_with_underscore', title: row.title } : row,
    );
    const ics = buildIcalFromProjection(projection, { auditId: 'audit_underscore_test' });
    const uidLines = ics.split(/\r?\n/).filter((line) => line.startsWith('UID:'));
    expect(uidLines.length).toBeGreaterThan(0);
    expect(uidLines.every((line) => /^UID:[A-Za-z0-9-]+@invalid$/u.test(line))).toBe(true);
    expect(ics).toContain('audit-underscore-test-task-with-underscore@invalid');
  });

  it('sanitizes UID segments when task ids contain punctuation', () => {
    const projection = buildRoadmapGanttProjection(minimalTimeline());
    projection.tasks = projection.tasks.map((row) =>
      row.id === 't1' ? { ...row, id: 'task/with.space@test!', title: row.title } : row,
    );
    const ics = buildIcalFromProjection(projection, { auditId: 'audit@#$-weird' });
    const uidLines = ics.split(/\r?\n/).filter((line) => line.startsWith('UID:'));
    expect(uidLines.every((line) => /^UID:[A-Za-z0-9-]+@invalid$/u.test(line))).toBe(true);
    expect(ics).not.toContain('task/with');
  });

  it('folds DESCRIPTION when concatenated lines exceed folded width', () => {
    const longBody = `${'y'.repeat(120)}`;
    const projection = buildRoadmapGanttProjection(minimalTimeline());
    projection.tasks = projection.tasks.map((row) =>
      row.id === 't1' ? { ...row, description: longBody } : row,
    );
    const ics = buildIcalFromProjection(projection, { auditId: 'audit-ical-long-desc' });
    expect(ics).toContain('\r\n ');
  });

  it('strips control characters from DESCRIPTION before escaping', () => {
    const projection = buildRoadmapGanttProjection(minimalTimeline());
    projection.tasks = projection.tasks.map((row) =>
      row.id === 't1' ? { ...row, description: `Hello\u0007World` } : row,
    );
    const ics = buildIcalFromProjection(projection, { auditId: 'audit-ical-ctrl' });
    expect(ics).toContain('HelloWorld');
    expect(ics).not.toContain('\u0007');
  });

  it('folds long calendar name lines from X-WR-CALNAME via global fold step', () => {
    const projection = buildRoadmapGanttProjection(minimalTimeline());
    const longTitle = `${'L'.repeat(85)} corp`;
    const ics = buildIcalFromProjection(projection, { auditId: 'audit-x', auditTitle: longTitle });
    expect(ics).toContain('X-WR-CALNAME');
    expect(ics).toMatch(/\r\n /);
    const longestPhysical = Math.max(...ics.split(/\r\n/).map((line) => line.length));
    expect(longestPhysical).toBeLessThanOrEqual(75);
  });
});
