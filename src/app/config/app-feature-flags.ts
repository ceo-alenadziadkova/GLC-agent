/**
 * Product feature toggles (static front config). Change here + redeploy; no `VITE_*` env.
 * For infrastructure (API URL, Supabase, support email) use build-time env as documented in FRONTEND.md.
 */

import { INTAKE_TRACE_IA_V2_ENABLED_DEFAULT } from './intake-trace-defaults';
import { QUESTION_BANK_STUDIO_ENABLED_DEFAULT } from './question-bank-studio-defaults';

export const FEATURE_ROLLOUT_MODES = ['shadow', 'internal', 'pilot', 'ga'] as const;
export type FeatureRolloutMode = (typeof FEATURE_ROLLOUT_MODES)[number];
const PLAN_WORKSPACE_PRIMARY_UX_ENABLED_DEFAULT = true;
const CLIENT_PLAN_WORKSPACE_ENABLED_DEFAULT = true;
const CLIENT_EXECUTION_PACKS_SURFACE_ENABLED_DEFAULT = true;
const ORCHESTRATION_ROADMAP_ROLLOUT_MODE_DEFAULT = 'ga' as FeatureRolloutMode;

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
  clientExecutionPackWorkspaceSurfaceEnabled: CLIENT_EXECUTION_PACKS_SURFACE_ENABLED_DEFAULT,
  /**
   * Client-facing Plan workspace primary surface rollout.
   */
  clientPlanWorkspaceEnabled: CLIENT_PLAN_WORKSPACE_ENABLED_DEFAULT,
  /**
   * Plan-workspace-first orchestration program (nav order, manifest CTAs). Server mirrors via FEATURE_ORCHESTRATION_TIMELINE_PRIMARY_UX.
   */
  orchestrationPlanWorkspacePrimaryUxEnabled: PLAN_WORKSPACE_PRIMARY_UX_ENABLED_DEFAULT,
  /** Delivery Board rollout; mirrors `SYSTEM_DEFAULTS_FEATURE_FLAGS.planDeliveryBoardRolloutMode`. Env: FEATURE_PLAN_DELIVERY_BOARD_ROLLOUT_MODE. */
  planDeliveryBoardRolloutMode: 'ga' as FeatureRolloutMode,
  /**
   * Delivery Board lane/owner hints queue for signed manifest snapshots (Epic 2.1-C).
   * Mirrors server `FEATURE_MANIFEST_DRAFT_REVISIONS_FROM_BOARD` (default on in SYSTEM_DEFAULTS); set false in both layers to rollback.
   */
  manifestDraftRevisionsFromBoard: true,
  /**
   * Client roadmap narrative enhancements (lane promises, milestones, priority reasons).
   * Staged promotion: see `orchestrationRoadmapRolloutMode` + `orchestration-client-feature-gates.ts` allowlist; rollback in `docs/DEPLOYMENT.md` (Roadmap narrative rollback).
   */
  orchestrationRoadmapNarrativeEnabled: true,
  /** Client roadmap narrative staged rollout mode. */
  orchestrationRoadmapRolloutMode: ORCHESTRATION_ROADMAP_ROLLOUT_MODE_DEFAULT,
  /** On-demand director deep-dive from plan/report surfaces. */
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
   * Public `/intake/:token` — show optional NL “Describe your business” + Send to `/nl-describe` (non-authoritative assist; audit-first contract unchanged).
   * Client-only; turn on when the NL→brief product flow is ready. Default off.
   */
  intakePublicNlDescribeEnabled: false,
  /**
   * Public intake: after pre-brief slots, load `GET .../tailored-questions` and show planner-driven follow-ups (full `nextRecommended` minus baseline).
   * Default off; enable with staged QA.
   */
  intakeTwoPhasePublicEnabled: false,
  /**
   * When true with `intakeTwoPhasePublicEnabled`, load follow-ups via `POST .../intelligence-snapshot` (F2 + optional narrative) instead of `GET .../tailored-questions` alone.
   */
  intakeIntelligenceSnapshotEnabled: true,
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
  /**
   * New Audit step 1: show **Project context** side readout (`GET /api/audits/:id/client-project-context`) when `draftAuditId` exists.
   */
  newAuditClientProjectContextPanelEnabled: true,
  /**
   * Consultant New Audit: after required brief, **save** + `POST /api/audits/:id/brief/intelligence-snapshot` and a short confirm screen
   * (bank + F2/narrative preview; same contract as public intake — not B2 generative).
   */
  newAuditIntelligenceSnapshotStepEnabled: true,
  /**
   * Early `POST …/brief/intelligence-snapshot` with `{ early_capture: true }` (Basics + Lighthouse only).
   * Mirrors `SYSTEM_DEFAULTS_FEATURE_FLAGS.briefEarlyIntelligenceSnapshotEnabled` — `orchestration-contract-parity.test.ts`.
   */
  briefEarlyIntelligenceSnapshotEnabled: true,
  /**
   * `POST …/brief/clone-from` — copy brief answers from a sibling audit (same `client_id`, including both null).
   * Mirrors `SYSTEM_DEFAULTS_FEATURE_FLAGS.briefCloneFromAuditEnabled`.
   */
  briefCloneFromAuditEnabled: true,
  /**
   * Pipeline Monitor: after approving a mid-pipeline review gate with substantive notes, offer optional
   * multi-select Auto Wing domain re-runs before Continue. Disable to only use per-phase “Re-run this phase”.
   */
  pipelineMonitorPostReviewDomainRerunPromptEnabled: true,
  /**
   * Delivery Board: `POST …/plan/board/reconcile/preview` dry-run diff before reconcile.
   * Mirrors `SYSTEM_DEFAULTS_FEATURE_FLAGS.planBoardReconcileDiffPreviewEnabled` — `FEATURE_PLAN_BOARD_RECONCILE_DIFF_PREVIEW` on server.
   */
  planBoardReconcileDiffPreviewEnabled: false,
  /**
   * Delivery Board per-audit custom columns (PATCH `…/plan/board/column-policy`). Server: `FEATURE_PLAN_BOARD_CUSTOM_COLUMNS` + owner `profiles.plan_board_custom_columns_entitled`.
   */
  planBoardCustomColumnsEnabled: false,
  /**
   * Master switch for the Collaborative Director Protocol UI surfaces (Approve-Coalition gate,
   * ClientSituationCard, ConflictMatrix). Server-authoritative — pipeline behavior is driven by
   * `SYSTEM_DEFAULTS_FEATURE_FLAGS.coalitionProtocolEnabled`. SPA mirror is parity-tested via
   * `orchestration-contract-parity.test.ts`.
   */
  coalitionProtocolEnabled: false,
  /**
   * Coalition rollout mode mirror (`shadow | internal | pilot | ga`). Used to gate UI affordances
   * (e.g. show Approve-Coalition gate only when rollout mode is `internal+`). Server SSOT:
   * `SYSTEM_DEFAULTS_FEATURE_FLAGS.coalitionProtocolRolloutMode`.
   */
  coalitionProtocolRolloutMode: 'shadow' as const,
  /**
   * Mirror of server `FEATURE_COALITION_PHASE3_ITERATIVE` (V2+, default off in V1).
   * UI-only gate for iterative resolver affordances; server remains authoritative.
   */
  coalitionPhase3IterativeEnabled: false,
  /**
   * Mirror of server `FEATURE_COALITION_AUTO_LOOP_ENABLED`.
   * UI-only gate for showing auto-loop escalation hints.
   */
  coalitionAutoLoopEnabled: false,
} as const;
