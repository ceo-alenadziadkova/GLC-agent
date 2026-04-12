import { APP_FEATURE_FLAGS } from '../config/app-feature-flags';

/**
 * Internal Question Bank Studio (Settings tab + `/admin/question-bank-studio`).
 * Toggle via `APP_FEATURE_FLAGS` in `src/app/config/app-feature-flags.ts` (consultant-only routes).
 */
export function isQuestionBankStudioEnabled(): boolean {
  return APP_FEATURE_FLAGS.questionBankStudioEnabled;
}
