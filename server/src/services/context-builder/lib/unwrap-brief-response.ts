import { CONTEXT_BUILDER_DEFAULT_BRIEF_RESPONSE_SOURCE } from '../../../config/context-builder-limits.js';

export function unwrapBriefResponse(value: unknown): {
  value: string | string[] | number | boolean | null;
  source: string;
} {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    const v = (value as { value: unknown }).value;
    const source = String((value as { source?: unknown }).source ?? CONTEXT_BUILDER_DEFAULT_BRIEF_RESPONSE_SOURCE);
    return { value: (v as string | string[] | number | boolean | null) ?? null, source };
  }
  return {
    value: (value as string | string[] | number | boolean | null) ?? null,
    source: CONTEXT_BUILDER_DEFAULT_BRIEF_RESPONSE_SOURCE,
  };
}
