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
  /**
   * Strategy Lab: roadmap manifest + orchestration timeline (consultant-only surfaces).
   * Static toggle — redeploy to change.
   */
  orchestrationRoadmapUiEnabled: true,
  /**
   * Client portal: post-audit cockpit (coverage, summary, CTAs) on the audit home screen.
   */
  clientPostAuditCockpitEnabled: true,
  /**
   * Strategy Lab: orchestrator-first tabs (Now / Next / Dependencies / Risks) when a pack exists.
   */
  strategyLabOrchestratorDetailTabsEnabled: true,
  /**
   * Strategy Lab: persist stage-2 deep director intent (domain checklist) via lab-context PATCH.
   */
  strategyLabDirectorStage2IntentEnabled: true,
  /**
   * Client portal Strategy Lab: replace “consultant-only manifest” banner with a link to the full timeline in the report.
   */
  clientOrchestrationLabReadOnlyEnabled: true,
  /**
   * Client portal: standalone `/portal/audit/:id/roadmap-manifest` guided manifest flow (V2).
   * Requires `orchestrationRoadmapUiEnabled` and orchestration pack API on the server.
   */
  clientRoadmapManifestWizardEnabled: true,
  /**
   * Client portal timeline: list saved execution packs + link to Strategy Lab (V8 surface).
   * Server must allow `FEATURE_STRATEGY_EXECUTION_PACK`; when disabled, the list query may fail and UI shows a short error line.
   */
  clientExecutionPackTimelineSurfaceEnabled: true,
  /**
   * Client-facing timeline primary surface rollout.
   */
  clientTimelineEnabled: true,
  /**
   * Timeline-first orchestration program (nav order, manifest CTAs). Server mirrors via FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX.
   */
  orchestrationTimelinePrimaryUxEnabled: true,
  /** Client timeline narrative enhancements (lane promises, milestones, priority reasons). */
  orchestrationRoadmapNarrativeEnabled: false,
  /** On-demand director deep-dive from timeline/report surfaces. */
  directorDeepDiveOnDemandEnabled: false,
  /** Sub-agent selection for director deep-dive (CMO MVP). */
  directorSubAgentsEnabled: false,
} as const;
