/**
 * Shared clause evaluation for ordered string rules (used by branch + answer normalizers).
 */
export type ResponseStringClause =
  | { kind: 'string_empty' }
  | { kind: 'string_eq'; value: string }
  | { kind: 'string_includes'; value: string }
  | { kind: 'string_not_includes'; value: string }
  | { kind: 'string_starts_with'; value: string }
  | { kind: 'raw_boolean_true' }
  | { kind: 'all'; of: ResponseStringClause[] }
  | { kind: 'any'; of: ResponseStringClause[] }
  | { kind: 'always' };

export type ResponseStringRuleRow = { then: string; if: ResponseStringClause[] };

export function evalResponseStringClause(s: string, rawVal: unknown, c: ResponseStringClause): boolean {
  switch (c.kind) {
    case 'string_empty':
      return !s;
    case 'string_eq':
      return s === c.value;
    case 'string_includes':
      return s.includes(c.value);
    case 'string_not_includes':
      return !s.includes(c.value);
    case 'string_starts_with':
      return s.startsWith(c.value);
    case 'raw_boolean_true':
      return rawVal === true;
    case 'all':
      return c.of.every(x => evalResponseStringClause(s, rawVal, x));
    case 'any':
      return c.of.some(x => evalResponseStringClause(s, rawVal, x));
    case 'always':
      return true;
    default:
      return false;
  }
}

function evalRuleRow(row: ResponseStringRuleRow, s: string, rawVal: unknown): boolean {
  return row.if.every(c => evalResponseStringClause(s, rawVal, c));
}

/** First matching rule wins; `rawVal` is only needed for `raw_boolean_true` clauses. */
export function firstMatchingResponseStringOutcome(
  rules: ResponseStringRuleRow[],
  s: string,
  rawVal: unknown = undefined,
): string | undefined {
  for (const row of rules) {
    if (evalRuleRow(row, s, rawVal)) {
      return row.then;
    }
  }
  return undefined;
}
