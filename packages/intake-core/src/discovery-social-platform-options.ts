/**
 * Social / messaging channel options for nosite discovery (`c_nosite_3`).
 * Delegates to bank UI overrides so labels stay aligned with the wizard.
 */

import { getBankQuestionUiOptions } from './bank-question-ui-overrides.js';

const opts = getBankQuestionUiOptions('c_nosite_3');
if (opts == null || opts.length === 0) {
  throw new Error('@glc/intake-core: missing bank UI options for c_nosite_3');
}

export const DISCOVERY_SOCIAL_PLATFORM_OPTIONS: readonly string[] = opts;
