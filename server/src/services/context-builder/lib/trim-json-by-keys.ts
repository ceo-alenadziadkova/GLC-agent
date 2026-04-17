import {
  CONTEXT_BUILDER_TRIM_ARRAY_HALVE_MIN_LENGTH,
  CONTEXT_BUILDER_TRIM_ARRAY_SIZE_FRACTION_OF_MAX,
  CONTEXT_BUILDER_TRIM_MIN_OBJECT_CHARS,
} from '../../../config/context-builder-limits.js';

/**
 * Reduce a JSON-serialisable object to fit within `maxChars` by removing
 * top-level keys, largest-serialised-value first.
 *
 * Unlike slicing the JSON string, this always produces valid JSON.
 * Array-typed top-level keys (e.g. pages_crawled) are trimmed by halving
 * the array length before removing the key entirely.
 */
export function trimJsonByTopLevelKeys(
  obj: Record<string, unknown>,
  maxChars: number,
): { obj: Record<string, unknown>; removed: number; removedKeys: string[] } {
  if (maxChars <= CONTEXT_BUILDER_TRIM_MIN_OBJECT_CHARS) {
    const allKeys = Object.keys(obj);
    return { obj: {}, removed: allKeys.length, removedKeys: allKeys };
  }

  const result: Record<string, unknown> = { ...obj };
  const removedKeys: string[] = [];

  const arrayHalveMinLen = CONTEXT_BUILDER_TRIM_ARRAY_HALVE_MIN_LENGTH;
  const arraySizeFraction = CONTEXT_BUILDER_TRIM_ARRAY_SIZE_FRACTION_OF_MAX;

  for (const [k, v] of Object.entries(result)) {
    if (Array.isArray(v) && v.length > arrayHalveMinLen) {
      const serialised = JSON.stringify(v);
      if (serialised.length > maxChars * arraySizeFraction) {
        result[k] = v.slice(0, Math.ceil(v.length / 2));
      }
    }
  }

  while (JSON.stringify(result).length > maxChars) {
    const before = JSON.stringify(result).length;
    const entries = Object.entries(result);
    if (entries.length === 0) break;

    let largestKey = entries[0][0];
    let largestSize = JSON.stringify(entries[0][1]).length;
    for (const [k, v] of entries.slice(1)) {
      const size = JSON.stringify(v).length;
      if (size > largestSize) {
        largestKey = k;
        largestSize = size;
      }
    }

    const candidate = { ...result };
    delete candidate[largestKey];
    const after = JSON.stringify(candidate).length;
    if (after < before) {
      delete result[largestKey];
      removedKeys.push(largestKey);
      continue;
    }
    if (after >= before) {
      break;
    }
  }

  return { obj: result, removed: removedKeys.length, removedKeys };
}
