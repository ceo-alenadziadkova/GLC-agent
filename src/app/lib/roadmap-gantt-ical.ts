import dayjs from 'dayjs';

import type { RoadmapGanttProjection } from './roadmap-gantt-mapper';

const CRLF = '\r\n';

function escapeIcalText(s: string): string {
  return s
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** DTSTAMP in UTC (`YYYYMMDDTHHmmssZ`) without extra dayjs plugins. */
function formatIcalDtStampUtc(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${day}T${h}${mi}${s}Z`;
}

/** All-day DATE form (local calendar day of instant). */
function formatIcalLocalDateValue(ms: number): string {
  return dayjs(ms).format('YYYYMMDD');
}

/** Exclusive end date for all-day event (iCal DTEND with VALUE=DATE is exclusive). */
function exclusiveEndLocalDate(startMs: number, endMs: number): string {
  const first = dayjs(startMs).startOf('day');
  const last = dayjs(endMs).startOf('day');
  const inclusiveDays = Math.max(1, last.diff(first, 'day') + 1);
  return first.add(inclusiveDays, 'day').format('YYYYMMDD');
}

/**
 * Produce a deterministic, host-shaped UID with strict sanitation (RFC 5545 tolerant).
 * Replaces disallowed chars; guarantees non-empty host and local-part.
 */
function uidFor(taskId: string, auditId: string): string {
  const rawLocal = `${auditId}-${taskId}`.trim() || 'task-item';
  const safeLocal =
    rawLocal
      .replace(/[^A-Za-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200) || 'item';
  return `${safeLocal}@invalid`;
}

/** Fold iCal content lines longer than 75 octets per RFC 5545 (continuation = CRLF + single space). */
export function foldIcalContent(blob: string): string {
  const physicalLines = blob.split(/\r?\n/);
  const out: string[] = [];
  for (const logical of physicalLines) {
    let line = logical;
    if (line === '') {
      out.push('');
      continue;
    }
    while (line.length > 75) {
      out.push(line.slice(0, 75));
      line = ` ${line.slice(75)}`;
    }
    out.push(line);
  }
  return out.join(CRLF);
}

function veventBlock(opts: {
  uid: string;
  summary: string;
  description?: string;
  dtStartDate: string;
  dtEndDateExclusive: string;
}): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${formatIcalDtStampUtc()}`,
    `DTSTART;VALUE=DATE:${opts.dtStartDate}`,
    `DTEND;VALUE=DATE:${opts.dtEndDateExclusive}`,
    `SUMMARY:${escapeIcalText(opts.summary)}`,
  ];
  if (opts.description && opts.description.trim()) {
    lines.push(`DESCRIPTION:${escapeIcalText(opts.description.trim())}`);
  }
  lines.push('END:VEVENT');
  return lines.join(CRLF);
}

function vtodoMilestone(opts: { uid: string; summary: string; dueDate: string }): string {
  return [
    'BEGIN:VTODO',
    `UID:${opts.uid}`,
    `DTSTAMP:${formatIcalDtStampUtc()}`,
    `DUE;VALUE=DATE:${opts.dueDate}`,
    `SUMMARY:${escapeIcalText(opts.summary)}`,
    'CATEGORIES:MILESTONE',
    'END:VTODO',
  ].join(CRLF);
}

export type BuildIcalFromProjectionOpts = {
  auditId: string;
  auditTitle?: string;
};

export function buildIcalFromProjection(projection: RoadmapGanttProjection, opts: BuildIcalFromProjectionOpts): string {
  const calName = opts.auditTitle?.trim() || `GLC roadmap ${opts.auditId.slice(0, 8)}`;
  const blocks: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GLC//Roadmap Gantt//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcalText(calName)}`,
  ];

  const tasks = [...projection.tasks].sort((a, b) => a.start_time - b.start_time);

  for (const t of tasks) {
    if (t.kind === 'milestone') {
      const due = formatIcalLocalDateValue(t.start_time);
      blocks.push(
        vtodoMilestone({
          uid: uidFor(t.id, opts.auditId),
          summary: t.title,
          dueDate: due,
        }),
      );
      continue;
    }

    const dtStart = formatIcalLocalDateValue(t.start_time);
    const dtEndExcl = exclusiveEndLocalDate(t.start_time, t.end_time);
    const descParts = [t.description, t.owner ? `Owner: ${t.owner}` : '', t.impact ? `Impact: ${t.impact}` : ''].filter(Boolean);
    blocks.push(
      veventBlock({
        uid: uidFor(t.id, opts.auditId),
        summary: t.title,
        description: descParts.join('\n'),
        dtStartDate: dtStart,
        dtEndDateExclusive: dtEndExcl,
      }),
    );
  }

  blocks.push('END:VCALENDAR');
  return foldIcalContent(blocks.join(CRLF)) + CRLF;
}

export function icsFilenameForAudit(auditId: string): string {
  return `glc-gantt-${auditId.slice(0, 12)}.ics`;
}
