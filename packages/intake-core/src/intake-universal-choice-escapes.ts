/**
 * Universal choice “escapes” appended to every intake single-/multi-select stem
 * so clients can clarify (Other) or defer (explicit unknown) consistently.
 *
 * UI that uses `source: 'unknown'` should not persist the defer label as the
 * canonical value; Discovery (flat answers) may store the label as a string/array item.
 */
export const INTAKE_UNIVERSAL_CHOICE_OTHER_LABEL = 'Other' as const;

export const INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL = "I don't know for now" as const;

/** Option set used for server-side allowlists on top of bank canon options. */
export function appendUniversalIntakeChoiceEscapes(canonicalOptions: readonly string[]): string[] {
  const out = [...canonicalOptions];
  if (!out.includes(INTAKE_UNIVERSAL_CHOICE_OTHER_LABEL)) {
    out.push(INTAKE_UNIVERSAL_CHOICE_OTHER_LABEL);
  }
  if (!out.includes(INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL)) {
    out.push(INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL);
  }
  return out;
}

export function isUniversalIntakeDeferChoiceLabel(value: unknown): value is string {
  return typeof value === 'string' && value === INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL;
}
