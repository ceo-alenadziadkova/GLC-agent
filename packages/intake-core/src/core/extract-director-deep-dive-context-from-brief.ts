import type { DomainKey } from '../audit-contract.js';
import { getDeepDiveExtractionIdLists } from '../config/deep-dive-context-extraction.js';

function normalizeAnswer(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => (typeof v === 'string' ? v.trim() : v != null ? String(v) : ''))
      .filter(Boolean);
    if (parts.length === 0) return null;
    return parts.join('; ');
  }
  if (typeof value === 'object' && 'label' in (value as { label?: string })) {
    const l = (value as { label?: string }).label;
    if (typeof l === 'string' && l.trim()) return l.trim();
  }
  return null;
}

function unwrapCell(value: unknown): unknown {
  if (value != null && typeof value === 'object' && 'value' in (value as { value?: unknown })) {
    return (value as { value: unknown }).value;
  }
  return value;
}

/**
 * Picks the first non-empty answer from the ordered list of question ids.
 */
function firstAnswerForIds(
  briefAnswers: Readonly<Record<string, unknown>>,
  ids: readonly string[],
): string | null {
  for (const id of ids) {
    const raw = unwrapCell(briefAnswers[id]);
    const t = normalizeAnswer(raw);
    if (t) return t;
  }
  return null;
}

/**
 * Parse timeframe answers into a number of days (rough heuristic for director context).
 */
function parseTimeframeDays(value: string | null): number | undefined {
  if (value == null) return undefined;
  const s = value.toLowerCase();
  const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (s.includes('week')) return n * 7;
  if (s.includes('month')) return n * 30;
  if (s.includes('year')) return n * 365;
  if (n <= 120) return n;
  return undefined;
}

export type DirectorDeepDiveBriefContext = {
  goals: string[];
  constraints: string[];
  timeframe_days?: number;
};

/**
 * Map saved brief responses into director deep-dive `client_context` fields.
 * Safe on partial data; returns at least empty arrays.
 */
export function extractDirectorDeepDiveContextFromBrief(
  domainKey: DomainKey | string | undefined,
  briefAnswers: Readonly<Record<string, unknown>> | null | undefined,
): DirectorDeepDiveBriefContext {
  const answers = briefAnswers ?? {};
  const { goals: goalIds, constraints: cIds, timeframe: tIds } = getDeepDiveExtractionIdLists(
    domainKey as DomainKey,
  );
  const goalLine = firstAnswerForIds(answers, goalIds);
  const constraintA = firstAnswerForIds(answers, cIds);
  const timeframeLine = firstAnswerForIds(answers, tIds);
  const goals = goalLine ? [goalLine] : [];
  const constraints: string[] = [];
  if (constraintA) constraints.push(constraintA);
  const extra = cIds
    .map((id) => normalizeAnswer(unwrapCell(answers[id])))
    .filter((s): s is string => s != null && s !== constraintA);
  for (const e of extra.slice(0, 4)) {
    if (!constraints.includes(e)) constraints.push(e);
  }
  const tf = parseTimeframeDays(timeframeLine ?? null);
  return {
    goals,
    constraints,
    ...(tf != null ? { timeframe_days: tf } : {}),
  };
}
