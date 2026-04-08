/**
 * Heuristic next recommended bank ids for adaptive UX (ADR Phase F stub).
 * Picks visible, recommended-priority, still-unanswered questions in wizard order.
 */
import type { IntakeQuestionStub, IntakeResponsesMap } from '../types.js';
import { isIntakeAnswered } from '../unwrap.js';

const DEFAULT_MAX = 5;

export function computeNextRecommended(args: {
  visibleOrdered: string[];
  stubs: IntakeQuestionStub[];
  responses: IntakeResponsesMap;
  max?: number;
}): string[] {
  const max = args.max ?? DEFAULT_MAX;
  const priorityById = new Map(args.stubs.map(s => [s.id, s.priority]));
  const out: string[] = [];
  for (const id of args.visibleOrdered) {
    if (priorityById.get(id) !== 'recommended') continue;
    if (isIntakeAnswered(args.responses[id])) continue;
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}
