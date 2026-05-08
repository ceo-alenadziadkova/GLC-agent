/**
 * Deterministic repairs for phase-7 Strategy Claude `tool_use` payloads before `StrategyOutputSchema`.
 * Handles common slips: JSON delivered as a string, or a single initiative object instead of an array.
 */
import { coerceStrategyCompanyStageForTool } from '../../config/strategy-initiative-policy.js';

export type NormalizeStrategyToolInputResult = {
  value: unknown;
  mutated: boolean;
  mutationCodes: readonly string[];
};

const STRATEGY_TOP_LEVEL_ARRAY_KEYS = ['quick_wins', 'medium_term', 'strategic', 'scorecard'] as const;
/** Initiative buckets (`scorecard` has no `stage`). */
const STRATEGY_INITIATIVE_BUCKET_KEYS = ['quick_wins', 'medium_term', 'strategic'] as const;

function cloneJson<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function coerceTopLevelJsonArrayField(
  raw: unknown,
  fieldKey: (typeof STRATEGY_TOP_LEVEL_ARRAY_KEYS)[number],
  mutationCodes: string[],
): unknown {
  if (Array.isArray(raw)) return raw;
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    mutationCodes.push(`${fieldKey}_single_object_wrapped`);
    return [raw];
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return raw;
    try {
      const parsed: unknown = JSON.parse(t);
      if (Array.isArray(parsed)) {
        mutationCodes.push(`${fieldKey}_json_string_array`);
        return parsed;
      }
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        mutationCodes.push(`${fieldKey}_json_string_single_object_wrapped`);
        return [parsed];
      }
    } catch {
      // leave as-is for Zod to surface a validation error
    }
  }
  return raw;
}

function coerceInitiativeStagesInBucket(
  raw: unknown,
  bucketKey: (typeof STRATEGY_INITIATIVE_BUCKET_KEYS)[number],
  mutationCodes: string[],
): void {
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    if (!('stage' in obj)) continue;
    const next = coerceStrategyCompanyStageForTool(obj.stage);
    if (next !== obj.stage) {
      mutationCodes.push(`${bucketKey}_initiative_stage_coerced`);
      obj.stage = next;
    }
  }
}

/**
 * Returns a cloned payload with repairs suitable for feeding into `StrategyOutputSchema.safeParse`.
 */
export function normalizeStrategyToolInputForSchema(toolInput: unknown): NormalizeStrategyToolInputResult {
  if (toolInput === null || typeof toolInput !== 'object' || Array.isArray(toolInput)) {
    return { value: toolInput, mutated: false, mutationCodes: [] };
  }

  const root = cloneJson(toolInput) as Record<string, unknown>;
  const mutationCodes: string[] = [];

  for (const key of STRATEGY_TOP_LEVEL_ARRAY_KEYS) {
    if (!(key in root)) continue;
    const next = coerceTopLevelJsonArrayField(
      root[key],
      key,
      mutationCodes,
    );
    if (next !== root[key]) {
      root[key] = next;
    }
  }

  for (const key of STRATEGY_INITIATIVE_BUCKET_KEYS) {
    coerceInitiativeStagesInBucket(root[key], key, mutationCodes);
  }

  const originalSnapshot = JSON.stringify(toolInput);
  const outSnapshot = JSON.stringify(root);
  const mutated = originalSnapshot !== outSnapshot;

  return {
    value: root,
    mutated,
    mutationCodes: [...new Set(mutationCodes)],
  };
}
