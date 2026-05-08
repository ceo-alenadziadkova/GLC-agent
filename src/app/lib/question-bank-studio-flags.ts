/**
 * LEGACY (TD-034 in docs/TECH_DEBT.md): Internal Question Bank Studio retired from the SPA.
 * Returns `false` permanently until the underlying modules are deleted; the function shape is kept
 * so the orphaned `QuestionBankStudioPage` source still compiles before its full removal.
 */
export function isQuestionBankStudioEnabled(): boolean {
  return false;
}
