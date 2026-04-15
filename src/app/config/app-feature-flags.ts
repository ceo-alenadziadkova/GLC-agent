/**
 * Product feature toggles (static front config). Change here + redeploy; no `VITE_*` env.
 * For infrastructure (API URL, Supabase, support email) use build-time env as documented in FRONTEND.md.
 */

import { INTAKE_TRACE_IA_V2_ENABLED_DEFAULT } from './intake-trace-defaults';
import { QUESTION_BANK_STUDIO_ENABLED_DEFAULT } from './question-bank-studio-defaults';

export const APP_FEATURE_FLAGS = {
  questionBankStudioEnabled: QUESTION_BANK_STUDIO_ENABLED_DEFAULT,
  intakeTraceIaV2Enabled: INTAKE_TRACE_IA_V2_ENABLED_DEFAULT,
  /**
   * Public `/brief` session + submissions flow (vs legacy intake-only path).
   * Static product toggle — change here and redeploy; do not use `VITE_*` for feature flags.
   */
  publicBriefSessionFlowEnabled: true,
} as const;
