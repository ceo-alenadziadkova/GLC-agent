const TRUE_QUERY_VALUES = new Set(['1', 'true'] as const);

export function isTruthyQueryValue(value: unknown): boolean {
  return typeof value === 'string' && TRUE_QUERY_VALUES.has(value.toLowerCase() as '1' | 'true');
}
