function envFlagEnabled(raw: string | undefined, defaultWhenUnset: boolean): boolean {
  if (raw === undefined || raw.trim() === '') return defaultWhenUnset;
  const v = raw.trim().toLowerCase();
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  return defaultWhenUnset;
}

/**
 * Internal Question Bank Studio (Settings tab + `/admin/question-bank-studio`).
 * Opt-out via `VITE_QUESTION_BANK_STUDIO=0`. Unset defaults to enabled (consultant-only routes).
 */
export function isQuestionBankStudioEnabled(): boolean {
  const raw = import.meta.env.VITE_QUESTION_BANK_STUDIO;
  const s = typeof raw === 'string' ? raw : undefined;
  return envFlagEnabled(s, true);
}
