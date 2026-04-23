/**
 * Product feature toggles (static front config). Change here + redeploy; no `VITE_*` env.
 * For infrastructure (API URL, Supabase, support email) use build-time env as documented in FRONTEND.md.
 */

import { INTAKE_TRACE_IA_V2_ENABLED_DEFAULT } from './intake-trace-defaults';
import { QUESTION_BANK_STUDIO_ENABLED_DEFAULT } from './question-bank-studio-defaults';

export const FEATURE_ROLLOUT_MODES = ['shadow', 'internal', 'pilot', 'ga'] as const;
export type FeatureRolloutMode = (typeof FEATURE_ROLLOUT_MODES)[number];

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
  /**
   * Client timeline narrative enhancements (lane promises, milestones, priority reasons).
   * Staged promotion: see `orchestrationRoadmapNarrativeRolloutMode` + `orchestration-client-feature-gates.ts` allowlist; rollback in `docs/DEPLOYMENT.md` (Roadmap narrative rollback).
   */
  orchestrationRoadmapNarrativeEnabled: true,
  /** Client timeline narrative staged rollout mode. */
  orchestrationRoadmapNarrativeRolloutMode: 'ga' as FeatureRolloutMode,
  /** On-demand director deep-dive from timeline/report surfaces. */
  directorDeepDiveOnDemandEnabled: true,
  /** Director deep-dive staged rollout mode. */
  directorDeepDiveRolloutMode: 'ga' as FeatureRolloutMode,
  /** Sub-agent selection for director deep-dive (CMO MVP). */
  directorSubAgentsEnabled: true,
  /** Director sub-agent staged rollout mode. */
  directorSubAgentsRolloutMode: 'ga' as FeatureRolloutMode,
  /**
   * Non-CMO director LLM deep-dive mirrors (CDO → CAO → CSO promotion order on the server — see `DEPLOYMENT.md` + rollout ADR).
   * Keep defaults identical to `SYSTEM_DEFAULTS_FEATURE_FLAGS` in `feature-flags-defaults.ts`; `orchestration-contract-parity.test.ts` enforces alignment.
   * `cdoDeepDiveLlmEnabled` / `caoDeepDiveLlmEnabled` / `csoDeepDiveLlmEnabled`: UI gating only; dispatch is **server-authoritative** (`FEATURE_CDO_DEEP_DIVE_LLM`, `FEATURE_CAO_DEEP_DIVE_LLM`, `FEATURE_CSO_DEEP_DIVE_LLM` on Railway).
   */
  cdoDeepDiveLlmEnabled: true,
  caoDeepDiveLlmEnabled: true,
  csoDeepDiveLlmEnabled: true,
  /**
   * CTO / SEO deep-dive mirrors (UI gating only; dispatch remains server-authoritative).
   */
  ctoDeepDiveLlmEnabled: true,
  seoDeepDiveLlmEnabled: true,
  /** Full-graph canvas in Strategy Lab dependencies tab (see server `FEATURE_PACK_GRAPH_CONSULTANT_CANVAS`). */
  packGraphConsultantCanvasEnabled: true,
  /** Node evidence drill-down side panel (see server `FEATURE_EVIDENCE_DRILLDOWN`). */
  evidenceDrilldownEnabled: true,
  /** Rich cross-lane pair copy from pack graph (config-driven; no server flag). */
  laneCrossNarrativesEnabled: true,
  /** Confirm dialog when requesting another execution pack for the same initiative (see `FEATURE_EXECUTION_PACK_REPEAT_FLOW`). */
  executionPackRepeatFlowEnabled: true,
  /** Consultant `/audit/:id/orchestration` cockpit (see `FEATURE_CONSULTANT_ORCHESTRATION_COCKPIT`). */
  consultantOrchestrationCockpitEnabled: true,
  /** Strategy Lab revision history panel (client-only UI). */
  revisionHistoryPanelEnabled: true,
  /**
   * Mirrors server `SYSTEM_DEFAULTS_FEATURE_FLAGS.diagnosticIntakePilotEnabled` (FEATURE_DIAGNOSTIC_INTAKE_PILOT).
   * Intake KPI + NL route gating; keep aligned — `orchestration-contract-parity.test.ts`.
   */
  diagnosticIntakePilotEnabled: true,
  /**
   * When true with `diagnosticIntakePilotEnabled`, public intake may call F1 `POST /api/intake/:token/next-question` for plan-head sync + telemetry.
   * Mirrors `intakeNextQuestionEndpointEnabled` (FEATURE_INTAKE_NEXT_QUESTION). Default off until the route is enabled server-side.
   */
  intakeNextQuestionClientEnabled: true,
  /**
   * Public `/intake/:token` — show optional NL “Describe your business” + Send to `/nl-describe`.
   * Client-only; turn on when the NL→brief product flow is ready. Default off.
   */
  intakePublicNlDescribeEnabled: false,
  /**
   * Portal timeline: Now / Next / Later board (grouped by `time_bucket`). Client-only; see `orchestration-contract-parity` for other pairs.
   */
  nowNextLaterBoardEnabled: true,
  /**
   * Set-level effort/impact/risk summary for selected actions in wizard + cockpit.
   */
  orchestrationSetAggregatorEnabled: true,
  /**
   * Dual `POST /roadmap/manifest-preview` what-if compare dialog. Server: `FEATURE_MANIFEST_SCENARIO_COMPARE`.
   */
  manifestScenarioCompareEnabled: true,
  /**
   * Consultant governance CTAs on POST pack (`govern_action`). Server: `FEATURE_CONSULTANT_GOVERNANCE_CTAS`.
   */
  consultantGovernanceCtasEnabled: true,
  /**
   * Plan control object panel (ADR V4). Server: `FEATURE_PLAN_CONTROL_OBJECT`.
   */
  planControlObjectUiEnabled: false,
} as const;
