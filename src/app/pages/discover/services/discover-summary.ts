import { choiceValueNeedsSpecify } from '@glc/intake-core';
import { DISCOVERY_TEAM_SIZE_PHRASES } from '../../../config/discovery-page-policy';
import type { DiscoveryAnswers } from '../../../lib/discovery-flow';
import { DISCOVER_PAGE_UI } from '../config/discover-page-ui';

export function isAnswered(val: DiscoveryAnswers[string]): boolean {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

export function summariseAnswer(
  val: DiscoveryAnswers[string],
  qId: string,
  all: DiscoveryAnswers,
): string {
  if (!isAnswered(val)) return DISCOVER_PAGE_UI.emptyAnswerFallback;
  let base = Array.isArray(val) ? val.join(', ') : String(val).trim();
  if (choiceValueNeedsSpecify(val)) {
    const key = `${qId}__other`;
    const specify = typeof all[key] === 'string' ? all[key].trim() : '';
    if (specify) base = `${base} (${specify})`;
  }
  return base;
}

export function splitFindingDetail(detail: string): string[] {
  const trimmed = detail.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split('. ')
    .map((segment, index, arr) =>
      index < arr.length - 1 && segment.length > 0 ? `${segment}.` : segment,
    )
    .filter(segment => segment.trim().length > 0);
  return parts.length > 0 ? parts : [trimmed];
}

export function teamOfPhrase(size: string | null): string {
  if (!size) return 'your team';
  return DISCOVERY_TEAM_SIZE_PHRASES[size] ?? 'your team';
}
